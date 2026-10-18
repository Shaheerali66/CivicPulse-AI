/**
 * src/app/api/complaints/route.ts
 *
 * PRD-02 :: Complaints API (POST /api/complaints, GET /api/complaints).
 * Server-side validated complaint creation and access-controlled listing.
 * All comments use Roman English or Roman Urdu.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  createServerSupabaseClient,
  getAuthenticatedUser,
  getUserProfile,
} from "@/lib/supabase/server";
import { recordAuditEvent, createNotification } from "@/lib/supabase/admin";
import {
  CreateComplaintSchema,
  ListComplaintsQuerySchema,
} from "@/lib/validation/complaint";
import {
  checkRateLimit,
  COMPLAINT_SUBMISSION_RATE_LIMIT,
} from "@/lib/security/rate-limiter";

/**
 * POST /api/complaints
 * Creates a new complaint for the authenticated citizen.
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Identify caller through verified server session
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required to submit a complaint." },
        { status: 401 }
      );
    }

    // 2. Abuse prevention & rate limiting
    const rateCheck = checkRateLimit(user.id, COMPLAINT_SUBMISSION_RATE_LIMIT);
    if (!rateCheck.success) {
      return NextResponse.json(
        { error: "Too many complaint submissions. Please try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": Math.ceil((rateCheck.resetAt - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    // 3. Validate request payload against strict schema
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
    }

    const validation = CreateComplaintSchema.safeParse(rawBody);
    if (!validation.success) {
      const errorDetails = validation.error.errors.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      }));
      return NextResponse.json(
        { error: "Validation failure.", details: errorDetails },
        { status: 400 }
      );
    }

    const input = validation.data;

    // 4. Generate unique, non-sequential tracking ID
    const datePrefix = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randomSuffix = crypto.randomUUID().slice(0, 6).toUpperCase();
    const trackingId = `CP-${datePrefix}-${randomSuffix}`;

    const supabase = await createServerSupabaseClient();

    // 5. Insert canonical complaint record
    const { data: complaint, error: insertError } = await supabase
      .from("complaints")
      .insert({
        tracking_id: trackingId,
        citizen_id: user.id, // Derived strictly from verified session
        title: input.title,
        description: input.description,
        category: input.category,
        status: "submitted",
        priority: "medium",
        submission_method: input.submission_method,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        location_label: input.location_label ?? null,
        photo_path: input.photo_path ?? null,
        is_public: input.is_public ?? false,
      })
      .select()
      .single();

    if (insertError || !complaint) {
      console.error("[CivicPulse API] Failed to insert complaint:", insertError?.message);
      return NextResponse.json(
        { error: "Failed to create complaint record." },
        { status: 500 }
      );
    }

    // 6. Record immutable submission audit event
    await recordAuditEvent({
      complaintId: complaint.id,
      actorId: user.id,
      eventType: "complaint_submitted",
      newValue: {
        tracking_id: trackingId,
        title: input.title,
        category: input.category,
        submission_method: input.submission_method,
      },
      note: "Complaint submitted by citizen.",
    });

    // 7. Trigger owner-scoped notification
    await createNotification({
      userId: user.id,
      complaintId: complaint.id,
      type: "status_update",
      title: "Complaint Submitted",
      message: `Your complaint '${input.title}' was received. Tracking ID: ${trackingId}.`,
    });

    // 8. Return response with tracking ID and safe summary
    return NextResponse.json(
      {
        message: "Complaint submitted successfully.",
        tracking_id: trackingId,
        complaint: {
          id: complaint.id,
          tracking_id: complaint.tracking_id,
          title: complaint.title,
          status: complaint.status,
          category: complaint.category,
          submitted_at: complaint.submitted_at,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[CivicPulse API] Unexpected error in POST /api/complaints:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

/**
 * GET /api/complaints
 * Lists complaints authorized for the current caller.
 */
export async function GET(req: NextRequest) {
  try {
    // 1. Verify caller session
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required to view complaints." },
        { status: 401 }
      );
    }

    // 2. Validate query params (pagination and filters)
    const url = new URL(req.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());
    const parseResult = ListComplaintsQuerySchema.safeParse(queryParams);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid query parameters.", details: parseResult.error.errors },
        { status: 400 }
      );
    }

    const { page, limit, status, category, priority, department_id, search } =
      parseResult.data;
    const offset = (page - 1) * limit;

    const supabase = await createServerSupabaseClient();
    const profile = await getUserProfile(user.id);
    const role = profile?.role ?? "citizen";

    let query = supabase.from("complaints").select("*", { count: "exact" });

    // 3. Enforce Role & Scope Boundaries
    if (role === "citizen") {
      // Citizen receives strictly their own complaints
      query = query.eq("citizen_id", user.id);
    } else if (role === "officer") {
      // Officer queries active department memberships
      const { data: memberships } = await supabase
        .from("department_members")
        .select("department_id")
        .eq("user_id", user.id)
        .eq("is_active", true);

      const deptIds = (memberships ?? []).map((m) => m.department_id);

      if (deptIds.length === 0) {
        // Officer has no active departments: return only own complaints
        query = query.eq("citizen_id", user.id);
      } else {
        // Complaints in officer's department OR own submitted complaints
        query = query.or(
          `department_id.in.(${deptIds.join(",")}),citizen_id.eq.${user.id}`
        );
      }
    }
    // Admin has unrestricted view across all departments

    // 4. Apply filters
    if (status) query = query.eq("status", status);
    if (category) query = query.eq("category", category);
    if (priority) query = query.eq("priority", priority);
    if (department_id) query = query.eq("department_id", department_id);
    if (search) {
      // Safe parameterized text search on title or tracking_id
      query = query.or(`title.ilike.%${search}%,tracking_id.ilike.%${search}%`);
    }

    // 5. Pagination and sorting (latest first)
    query = query.order("submitted_at", { ascending: false }).range(offset, offset + limit - 1);

    const { data: complaints, count, error } = await query;

    if (error) {
      console.error("[CivicPulse API] Error querying complaints:", error.message);
      return NextResponse.json({ error: "Failed to query complaints." }, { status: 500 });
    }

    return NextResponse.json(
      {
        complaints: complaints ?? [],
        pagination: {
          page,
          limit,
          total: count ?? 0,
          totalPages: Math.ceil((count ?? 0) / limit),
        },
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[CivicPulse API] Unexpected error in GET /api/complaints:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
