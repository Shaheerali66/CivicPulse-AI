/**
 * src/app/api/complaints/route.ts
 *
 * PRD-04 :: API — GET /api/complaints (paginated list with filters)
 *                  POST /api/complaints (create a new complaint)
 *
 * Both endpoints enforce authentication and apply RLS-compatible scoping.
 * Officers see their department's complaints; citizens see only their own.
 */

import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUserWithProfile } from "@/lib/auth/session";
import { getUserDepartmentIds } from "@/lib/auth/session";
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
import { resolveDepartmentFromAnalysis } from "@/lib/routing/department-mapping";
import { calculatePriorityScore } from "@/lib/priority/scoring";
import { createNotification } from "@/lib/notifications/service";

// ---------------------------------------------------------------------------
// GET /api/complaints — list complaints with server-side filtering
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  try {
    const auth = await getCurrentUserWithProfile();
    if (!auth?.user || !auth.profile) {
      return errorResponse("Authentication required.", 401, "UNAUTHORIZED");
    }

    const { user, profile } = auth;
    const { searchParams } = request.nextUrl;

    // Parse and validate query parameters
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
    const supabase = await createSupabaseServerClient();

    // Build the base query
    let query = supabase
      .from("complaints")
      .select(
        `
        id, tracking_id, title, category, status, priority_score, priority_band,
        needs_human_review, safety_concern, is_duplicate, created_at, updated_at,
        location_label, latitude, longitude,
        ai_analysis->summary,
        department:departments(id, name, slug),
        assigned_officer:profiles!assigned_officer_id(id, full_name)
        `,
        { count: "exact" }
      );

    // Role-based scoping — officers see department complaints, citizens see own
    if (profile.role === "citizen") {
      query = query.eq("user_id", user.id);
    } else if (profile.role === "officer" || profile.role === "reviewer") {
      const deptIds = await getUserDepartmentIds(user.id);
      if (deptIds.length === 0) {
        return paginatedResponse({ items: [], total: 0, page: filters.page, pageSize: filters.pageSize });
      }
      query = query.in("department_id", deptIds);
    }
    // Admins see all — no additional scoping needed (RLS handles it)

    // Apply optional filters
    if (filters.status)        query = query.eq("status", filters.status);
    if (filters.category)      query = query.eq("category", filters.category);
    if (filters.priority)      query = query.eq("priority_band", filters.priority);
    if (filters.department_id) query = query.eq("department_id", filters.department_id);
    if (filters.officer_id)    query = query.eq("assigned_officer_id", filters.officer_id);
    if (filters.needs_review !== undefined) query = query.eq("needs_human_review", filters.needs_review);
    if (filters.is_duplicate !== undefined) query = query.eq("is_duplicate", filters.is_duplicate);
    if (filters.date_from)     query = query.gte("created_at", filters.date_from);
    if (filters.date_to)       query = query.lte("created_at", filters.date_to);
    if (filters.search) {
      query = query.or(
        `title.ilike.%${filters.search}%,tracking_id.ilike.%${filters.search}%`
      );
    }

    // Pagination
    const from = (filters.page - 1) * filters.pageSize;
    const to = from + filters.pageSize - 1;
    query = query.order("created_at", { ascending: false }).range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error("[CivicPulse API] complaints GET error:", error.message);
      return errorResponse("Failed to fetch complaints.", 500, "DB_ERROR");
    }

    return paginatedResponse({
      items: data ?? [],
      total: count ?? 0,
      page: filters.page,
      pageSize: filters.pageSize,
    });
  } catch (err) {
    return handleRouteError(err);
  }
}

// ---------------------------------------------------------------------------
// POST /api/complaints — create a new complaint
// AI analysis is attempted but complaint is ALWAYS saved even if AI fails.
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  try {
    const auth = await getCurrentUserWithProfile();
    if (!auth?.user) {
      return errorResponse("Authentication required.", 401, "UNAUTHORIZED");
    }

    const { user } = auth;
    const body = await request.json();

    // Validate input
    const parseResult = CreateComplaintSchema.safeParse(body);
    if (!parseResult.success) {
      const issues = parseResult.error.errors
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join("; ");
      return errorResponse(`Validation failed: ${issues}`, 400, "VALIDATION_ERROR");
    }

    const input = parseResult.data;
    const supabase = await createSupabaseServerClient();

    // Generate a unique tracking ID (e.g., CP-20261017-XXXX)
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
    const trackingId = `CP-${datePart}-${randomPart}`;

    // Step 1: Insert complaint with "submitted" status — this MUST succeed
    const { data: complaint, error: insertError } = await supabase
      .from("complaints")
      .insert({
        tracking_id: trackingId,
        user_id: user.id,
        title: input.title,
        description: input.description,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        location_label: input.location_label ?? null,
        status: "submitted",
        needs_human_review: false,
        safety_concern: false,
        is_duplicate: false,
        ai_from_model: false,
      })
      .select("id, tracking_id")
      .single();

    if (insertError || !complaint) {
      console.error("[CivicPulse API] Complaint insert failed:", insertError?.message);
      return errorResponse("Failed to save complaint. Please try again.", 500, "DB_ERROR");
    }

    // Step 2: Attempt AI analysis — failure here must NOT affect the saved complaint
    try {
      const aiResult = await analyzeComplaint({
        text: input.description,
        timeoutMs: 20_000,
      });

      const analysis = aiResult.analysis;

      // Calculate priority score
      const priorityResult = calculatePriorityScore({
        severity: analysis.severity,
        safetyConcern: analysis.safetyConcern,
        relatedCount: 0,
        submittedAt: new Date().toISOString(),
      });

      // Resolve department
      const departmentName = resolveDepartmentFromAnalysis({
        category: analysis.category,
        needsHumanReview: analysis.needsHumanReview,
      });

      // Look up department ID from name
      const { data: dept } = await supabase
        .from("departments")
        .select("id")
        .eq("name", departmentName)
        .eq("is_active", true)
        .single();

      // Update complaint with AI results
      await supabase
        .from("complaints")
        .update({
          category: analysis.category,
          status: analysis.needsHumanReview ? "needs_review" : "analyzing",
          priority_score: priorityResult.score,
          priority_band: priorityResult.band,
          department_id: dept?.id ?? null,
          ai_analysis: {
            category: analysis.category,
            summary: analysis.summary,
            severity: analysis.severity,
            confidence: analysis.confidence,
            suggested_department_category: analysis.suggestedDepartmentCategory,
            safety_concern: analysis.safetyConcern,
            needs_human_review: analysis.needsHumanReview,
            reasoning: analysis.reasoning,
          },
          ai_from_model: aiResult.fromAI,
          ai_processed_at: new Date().toISOString(),
          needs_human_review: analysis.needsHumanReview,
          safety_concern: analysis.safetyConcern,
        })
        .eq("id", complaint.id);

      // Record AI analysis event
      await supabase.from("complaint_events").insert({
        complaint_id: complaint.id,
        actor_id: null, // System action
        event_type: "ai_analyzed",
        metadata: {
          from_ai: aiResult.fromAI,
          category: analysis.category,
          confidence: analysis.confidence,
          needs_review: analysis.needsHumanReview,
        },
      });
    } catch (aiErr) {
      // AI failed — complaint is already saved with "submitted" status
      // Update to mark for human review
      console.error("[CivicPulse API] AI analysis failed:", aiErr);
      await supabase
        .from("complaints")
        .update({
          status: "needs_review",
          needs_human_review: true,
        })
        .eq("id", complaint.id);
    }

    return successResponse(
      { id: complaint.id, tracking_id: complaint.tracking_id },
      201
    );
  } catch (err) {
    return handleRouteError(err);
  }
}
