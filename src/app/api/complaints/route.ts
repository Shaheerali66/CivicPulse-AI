/**
 * src/app/api/complaints/route.ts
 *
 * PRD-04 :: API — GET /api/complaints (paginated list with filters)
 *                  POST /api/complaints (create a new complaint)
 *
 * Columns used match 001_initial_schema.sql exactly:
 *   complaints: id, tracking_id, citizen_id, title, description, category,
 *               status, priority, submission_method, department_id,
 *               assigned_to, latitude, longitude, location_label, photo_path,
 *               is_public, submitted_at, updated_at, resolved_at, closed_at
 *
 *   complaint_events: id, complaint_id, actor_id, event_type,
 *                     previous_value, new_value, note, created_at
 *
 * AI analysis is stored in the ai_analyses table (separate from complaints row).
 */

import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser, getCurrentUserWithProfile, getUserDepartmentIds } from "@/lib/auth/session";
import {
  errorResponse,
  handleRouteError,
  paginatedResponse,
  successResponse,
} from "@/lib/api/error-response";
import {
  ComplaintListFiltersSchema,
  CreateComplaintSchema,
} from "@/lib/validation/api-schemas";
import { analyzeComplaint } from "@/lib/ai/analyze-complaint";
import {
  resolveDepartmentFromAnalysis,
  resolveDepartmentSlugFromAnalysis,
} from "@/lib/routing/department-mapping";
import { calculatePriorityScore } from "@/lib/priority/scoring";
import {
  generateSafeStoragePath,
  STORAGE_BUCKET_NAME,
  uploadComplaintPhotoSafely,
} from "@/lib/storage/complaint-storage";
import { ensureSampleComplaintsSynced } from "@/lib/storage/seed-complaints";

// ---------------------------------------------------------------------------
// GET /api/complaints — list complaints with server-side filtering
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  try {
    let auth = null;
    try {
      auth = await getCurrentUserWithProfile();
    } catch {
      auth = null;
    }

    let user = auth?.user ?? null;
    let profile = auth?.profile ?? null;
    const isDemoOfficer = !user || !profile;

    if (isDemoOfficer) {
      // Demo / development fallback for Officer Dashboard operations
      user = { id: "demo-officer" } as any;
      profile = {
        id: "demo-officer",
        role: "admin", // Admin view loads all departments in operations queue
        display_name: "Operations Officer",
        phone: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }

    const activeUser = user ?? ({ id: "demo-officer" } as any);
    const activeProfile = profile ?? {
      id: "demo-officer",
      role: "admin" as const,
      display_name: "Operations Officer",
      phone: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { searchParams } = request.nextUrl;

    const parseResult = ComplaintListFiltersSchema.safeParse(
      Object.fromEntries(searchParams)
    );
    if (!parseResult.success) {
      const issues = parseResult.error.errors
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join("; ");
      return errorResponse(`Invalid filters: ${issues}`, 400, "VALIDATION_ERROR");
    }

    const filters = parseResult.data;
    ensureSampleComplaintsSynced().catch(() => {});
    const supabase = isDemoOfficer ? createAdminClient() : await createSupabaseServerClient();

    // Select valid schema columns
    let query = supabase
      .from("complaints")
      .select(
        `id, tracking_id, title, description, category, status, priority,
         submitted_at, updated_at, location_label, latitude, longitude,
         is_public, citizen_id, department_id, assigned_to, photo_path,
         department:departments(id, name, slug)`,
        { count: "exact" }
      );

    // Role-based scoping (admin/demo sees all)
    if (activeProfile.role === "citizen") {
      query = query.eq("citizen_id", activeUser.id);
    } else if (activeProfile.role === "officer" && !isDemoOfficer) {
      const deptIds = await getUserDepartmentIds(activeUser.id);
      if (deptIds.length === 0) {
        return paginatedResponse({
          items: [],
          total: 0,
          page: filters.page,
          pageSize: filters.pageSize,
        });
      }
      query = query.in("department_id", deptIds);
    }

    // Apply filters that match actual columns
    if (filters.status)        query = query.eq("status", filters.status);
    if (filters.category)      query = query.eq("category", filters.category);
    if (filters.priority)      query = query.eq("priority", filters.priority);
    if (filters.department_id) query = query.eq("department_id", filters.department_id);
    if (filters.officer_id)    query = query.eq("assigned_to", filters.officer_id);
    if (filters.date_from)     query = query.gte("submitted_at", filters.date_from);
    if (filters.date_to)       query = query.lte("submitted_at", filters.date_to);
    if (filters.search) {
      query = query.or(
        `title.ilike.%${filters.search}%,tracking_id.ilike.%${filters.search}%`
      );
    }

    const from = (filters.page - 1) * filters.pageSize;
    const to = from + filters.pageSize - 1;
    query = query.order("submitted_at", { ascending: false }).range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error("[CivicPulse API] complaints GET error:", error.message);
      return errorResponse("Failed to fetch complaints.", 500, "DB_ERROR");
    }

    // Map items to include all UI expected compatibility fields
    const items = (data ?? []).map((item: any) => ({
      ...item,
      trackingId: item.tracking_id,
      priority_band: item.priority,
      priority_score:
        item.priority === "critical"
          ? 95
          : item.priority === "high"
          ? 75
          : item.priority === "medium"
          ? 50
          : 25,
      created_at: item.submitted_at || new Date().toISOString(),
      needs_human_review: item.status === "needs_review",
      safety_concern: item.priority === "critical" || item.priority === "high",
      is_duplicate: false,
    }));

    return paginatedResponse({
      items,
      total: count ?? items.length,
      page: filters.page,
      pageSize: filters.pageSize,
    });
  } catch (err) {
    return handleRouteError(err);
  }
}

// ---------------------------------------------------------------------------
// POST /api/complaints — create a new complaint
// Supports authenticated citizens or guest reporting.
// AI analysis is attempted but complaint is ALWAYS saved even if AI fails.
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  try {
    // Parse request body safely
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse("Invalid JSON in request body.", 400, "INVALID_JSON");
    }

    // Validate input
    const parseResult = CreateComplaintSchema.safeParse(body);
    if (!parseResult.success) {
      const issues = parseResult.error.errors
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join("; ");
      return errorResponse(`Validation failed: ${issues}`, 400, "VALIDATION_ERROR");
    }

    const input = parseResult.data;

    // Attempt to get auth — optional for complaint submission
    let user: Awaited<ReturnType<typeof getCurrentUser>> = null;
    try {
      const auth = await getCurrentUserWithProfile();
      user = auth?.user ?? null;
    } catch {
      // Auth failure is non-fatal for guest submissions
      user = null;
    }

    // Derive fields
    const title =
      input.title?.trim() ||
      (input.description.slice(0, 60).trim() +
        (input.description.length > 60 ? "..." : ""));
    const latitude = input.latitude ?? input.location?.latitude ?? null;
    const longitude = input.longitude ?? input.location?.longitude ?? null;
    const location_label =
      input.location_label ?? input.location?.addressDescription ?? null;

    // Always use admin (service role) client for INSERT to bypass RLS completely
    const supabase = createAdminClient();
    // Keep a user-scoped client for reads if authenticated
    const userSupabase = user ? await createSupabaseServerClient() : supabase;

    // Generate unique tracking ID
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
    const trackingId = `CP-${datePart}-${randomPart}`;

    // ── Step 1: Insert complaint ─────────────────────────────────────────────
    // Only use columns that exist in the schema (001_initial_schema.sql)
    const insertPayload: Record<string, unknown> = {
      tracking_id: trackingId,
      title,
      description: input.description,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
      location_label: location_label ?? null,
      status: "needs_review",       // default — officer must review before acting
      category: input.category || "unknown",
      priority: "medium",           // default; updated after AI runs
      submission_method:
        input.reportingMode === "ai_assisted" ? "ai" : "manual",
      is_public: true,
      submitted_at: new Date().toISOString(),
    };

    // Attach citizen_id only if authenticated
    if (user?.id) {
      insertPayload.citizen_id = user.id;
    }

    const { data: complaint, error: insertError } = await supabase
      .from("complaints")
      .insert(insertPayload)
      .select("id, tracking_id")
      .single();

    if (insertError || !complaint) {
      console.error("[CivicPulse API] Complaint insert failed:", insertError?.message, insertError?.details);

      // Detect auth-related DB errors for guest users
      if (
        !user &&
        (insertError?.message?.includes("citizen_id") ||
          insertError?.message?.includes("null value") ||
          insertError?.message?.includes("violates not-null"))
      ) {
        return errorResponse(
          "Please sign in or create an account to submit your complaint.",
          401,
          "AUTH_REQUIRED"
        );
      }

      return errorResponse(
        "Failed to save your complaint. Please try again.",
        500,
        "DB_ERROR"
      );
    }

    // ── Optional: Store image in Supabase storage if provided ─────────────
    let photoPath: string | null = null;
    if (input.imageBase64) {
      try {
        const mime = input.imageMimeType || "image/jpeg";
        const buffer = Buffer.from(input.imageBase64, "base64");
        const uploadResult = await uploadComplaintPhotoSafely(complaint.id, buffer, mime);
        photoPath = uploadResult.photoPath;

        if (photoPath) {
          await supabase
            .from("complaints")
            .update({ photo_path: photoPath })
            .eq("id", complaint.id);
        }
      } catch (storageErr) {
        console.warn("[CivicPulse API] Storage upload exception:", storageErr);
      }
    }

    // ── Step 2: AI analysis OR direct department assignment ──────────────────
    let finalCategory: string = input.category || "unknown";
    let finalPriority = "medium";
    let needsReview = false;
    let departmentName = "Municipal Services";
    let resolvedDept: any = null;
    let aiSummaryText: string | undefined = undefined;

    const isManualWithDepartment =
      input.reportingMode === "manual" && input.department_id;

    if (isManualWithDepartment) {
      // ── Manual mode: use citizen-selected department directly ─────────────
      // Skip AI entirely — resolve the selected department from DB and assign.
      try {
        const { data: dept } = await supabase
          .from("departments")
          .select("id, name, slug")
          .eq("id", input.department_id!)
          .eq("is_active", true)
          .maybeSingle();

        if (dept) {
          resolvedDept = dept;
          departmentName = dept.name;
        }

        finalPriority = "medium";
        finalCategory = input.category || "unknown";

        await supabase
          .from("complaints")
          .update({
            category: finalCategory,
            priority: "medium",
            status: "submitted",
            department_id: input.department_id,
          })
          .eq("id", complaint.id);

        // Record manual routing audit event
        try {
          await supabase.from("complaint_events").insert({
            complaint_id: complaint.id,
            actor_id: null,
            event_type: "status_changed",
            previous_value: null,
            new_value: {
              department_id: input.department_id,
              routing: "manual_citizen_selected",
            },
            note: `Directly routed to ${departmentName} by citizen selection.`,
          });
        } catch (auditErr) {
          console.warn("[CivicPulse API] Manual routing audit event failed:", auditErr);
        }
      } catch (deptErr) {
        console.warn("[CivicPulse API] Manual department lookup failed:", deptErr);
      }
    } else {
      // ── AI-assisted mode (or manual without department): run full triage ───
      try {
        const aiResult = await analyzeComplaint({
          description: input.description,
          timeoutMs: 20_000,
        });

        const analysis = aiResult.analysis;
        aiSummaryText = analysis.summary;

        // Map priority band from scoring
        const priorityResult = calculatePriorityScore({
          severity: analysis.severity,
          safetyConcern: analysis.safetyConcern,
          relatedCount: 0,
          submittedAt: new Date().toISOString(),
        });

        if (input.category && input.category !== "unknown" && analysis.category === "unknown") {
          finalCategory = input.category;
        } else {
          finalCategory = analysis.category;
        }
        finalPriority = priorityResult.band;
        needsReview = analysis.needsHumanReview;

        // Resolve target department name via AI category
        departmentName = resolveDepartmentFromAnalysis({
          category: finalCategory as any,
          needsHumanReview: analysis.needsHumanReview,
        });
        const targetSlug = resolveDepartmentSlugFromAnalysis(finalCategory as any);

        // Look up department ID by slug or name in Supabase
        let deptId: string | null = input.department_id ?? null;
        try {
          let { data: dept } = await supabase
            .from("departments")
            .select("id, name, slug")
            .eq("slug", targetSlug)
            .eq("is_active", true)
            .maybeSingle();

          if (!dept) {
            const res = await supabase
              .from("departments")
              .select("id, name, slug")
              .eq("name", departmentName)
              .eq("is_active", true)
              .maybeSingle();
            dept = res.data;
          }

          if (dept) {
            deptId = dept.id;
            resolvedDept = dept;
            departmentName = dept.name;
          }
        } catch (deptErr) {
          console.warn("[CivicPulse API] Department lookup failed:", deptErr);
        }

        // Update complaint with AI-derived fields (only schema columns)
        const { error: updateError } = await supabase
          .from("complaints")
          .update({
            category: analysis.category,
            priority: priorityResult.band,
            status: analysis.needsHumanReview ? "needs_review" : "analyzing",
            department_id: deptId,
          })
          .eq("id", complaint.id);

        if (updateError) {
          console.warn("[CivicPulse API] AI update patch failed:", updateError.message);
        }

        // Store AI analysis in ai_analyses table
        try {
          const adminClient = createAdminClient();
          await adminClient.from("ai_analyses").insert({
            complaint_id: complaint.id,
            model_name: aiResult.modelName ?? null,
            category: analysis.category,
            summary: analysis.summary,
            severity: analysis.severity,
            confidence: analysis.confidence,
            suggested_department_category: analysis.suggestedDepartmentCategory ?? null,
            safety_concern: analysis.safetyConcern,
            needs_human_review: analysis.needsHumanReview,
            reasoning_summary: analysis.reasoning ?? null,
            created_by: user?.id ?? null,
          });
        } catch (aiStoreErr) {
          console.warn("[CivicPulse API] ai_analyses insert failed:", aiStoreErr);
        }

        // Record audit event
        try {
          await supabase.from("complaint_events").insert({
            complaint_id: complaint.id,
            actor_id: null,
            event_type: "ai_analyzed",
            previous_value: null,
            new_value: {
              from_ai: aiResult.fromAI,
              category: analysis.category,
              confidence: analysis.confidence,
              needs_review: analysis.needsHumanReview,
            },
            note: aiResult.fromAI ? "AI triage completed." : "AI fallback applied.",
          });
        } catch (auditErr) {
          console.warn("[CivicPulse API] Audit event insert failed:", auditErr);
        }
      } catch (aiErr) {
        console.error("[CivicPulse API] AI analysis block failed:", aiErr);
        try {
          await supabase
            .from("complaints")
            .update({ status: "needs_review" })
            .eq("id", complaint.id);
        } catch {
          // Best-effort only
        }
        needsReview = true;
      }
    }

    return successResponse(
      {
        id: complaint.id,
        tracking_id: complaint.tracking_id,
        tracking_code: complaint.tracking_id,
        trackingId: complaint.tracking_id,
        status: needsReview ? "needs_review" : "submitted",
        category: finalCategory,
        priority: finalPriority,
        department: resolvedDept || {
          name: departmentName,
          slug: departmentName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        },
        aiSummary: aiSummaryText,
        needsHumanReview: needsReview,
        photo_path: photoPath,
        success: true,
      },
      201
    );
  } catch (err) {
    return handleRouteError(err);
  }
}
