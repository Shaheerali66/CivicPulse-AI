/**
 * src/app/api/complaints/[id]/review/route.ts
 *
 * PRD-04 :: API — POST /api/complaints/[id]/review
 * Human review decisions — accept, override category, change department,
 * confirm/reject duplicates, mark needs info.
 *
 * Only authorized reviewers and admins may submit decisions.
 * Every decision is recorded with actor ID and timestamp.
 * The original complaint is NEVER deleted by a review decision.
 */

import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUserWithProfile, getUserDepartmentIds } from "@/lib/auth/session";
import {
  errorResponse,
  handleRouteError,
  successResponse,
} from "@/lib/api/error-response";
import { ReviewDecisionSchema } from "@/lib/validation/api-schemas";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getCurrentUserWithProfile();
    if (!auth?.user || !auth.profile) {
      return errorResponse("Authentication required.", 401, "UNAUTHORIZED");
    }

    const { user, profile } = auth;
    const { id } = await params;

    // Only reviewers and admins can submit review decisions
    if (profile.role === "citizen" || profile.role === "officer") {
      return errorResponse("Insufficient permissions for review decisions.", 403, "FORBIDDEN");
    }

    const body = await request.json();
    const parseResult = ReviewDecisionSchema.safeParse(body);
    if (!parseResult.success) {
      const issues = parseResult.error.issues
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join("; ");
      return errorResponse(`Validation failed: ${issues}`, 400, "VALIDATION_ERROR");
    }

    const decision = parseResult.data;
    const supabase = await createSupabaseServerClient();

    // Fetch the complaint
    const { data: complaint } = await supabase
      .from("complaints")
      .select("id, status, department_id, ai_analysis, category")
      .eq("id", id)
      .single();

    if (!complaint) {
      return errorResponse("Complaint not found.", 404, "NOT_FOUND");
    }

    // Non-admin reviewers must be in the complaint's department
    if (profile.role !== "admin" && complaint.department_id) {
      const deptIds = await getUserDepartmentIds(user.id);
      if (!deptIds.includes(complaint.department_id)) {
        return errorResponse("You are not authorized to review this complaint.", 403, "FORBIDDEN");
      }
    }

    const updatePayload: Record<string, unknown> = {
      needs_human_review: false,
      updated_at: new Date().toISOString(),
    };

    // Handle specific review actions
    switch (decision.action) {
      case "accept_classification":
        // Keep current AI classification, just clear the review flag
        updatePayload.status = "assigned";
        break;

      case "change_category":
        if (!decision.new_category) {
          return errorResponse("new_category is required for change_category action.", 400, "VALIDATION_ERROR");
        }
        updatePayload.category = decision.new_category;
        updatePayload.status = "assigned";
        break;

      case "change_department":
        if (!decision.new_department_id) {
          return errorResponse("new_department_id is required for change_department action.", 400, "VALIDATION_ERROR");
        }
        // Validate department exists
        const { data: dept } = await supabase
          .from("departments")
          .select("id, name")
          .eq("id", decision.new_department_id)
          .eq("is_active", true)
          .single();

        if (!dept) {
          return errorResponse("Target department not found or not active.", 422, "INVALID_DEPARTMENT");
        }
        updatePayload.department_id = decision.new_department_id;
        updatePayload.status = "assigned";
        break;

      case "mark_needs_info":
        // Keep in review state, just record the decision
        updatePayload.needs_human_review = true;
        break;

      case "return_to_workflow":
        updatePayload.status = "assigned";
        break;
    }

    // Handle duplicate action if present
    if (decision.duplicate_action) {
      const { relationship_id, decision: dupDecision } = decision.duplicate_action;

      const { error: dupError } = await supabase
        .from("complaint_duplicates")
        .update({
          review_state: dupDecision,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", relationship_id)
        .eq("complaint_id", id); // Safety check

      if (dupError) {
        console.error("[CivicPulse API] Duplicate review update failed:", dupError.message);
      }

      // If confirmed duplicate, mark the complaint
      if (dupDecision === "confirmed_duplicate") {
        updatePayload.is_duplicate = true;
      }
    }

    // Apply updates to the complaint
    const { error: updateError } = await supabase
      .from("complaints")
      .update(updatePayload)
      .eq("id", id);

    if (updateError) {
      console.error("[CivicPulse API] Review decision update failed:", updateError.message);
      return errorResponse("Failed to save review decision.", 500, "DB_ERROR");
    }

    // Record in audit history — original complaint history is preserved
    await supabase.from("complaint_events").insert({
      complaint_id: id,
      actor_id: user.id,
      event_type: "human_reviewed",
      from_status: complaint.status,
      to_status: (updatePayload.status as string) ?? complaint.status,
      metadata: {
        action: decision.action,
        notes: decision.notes ?? null,
        new_category: decision.new_category ?? null,
        new_department_id: decision.new_department_id ?? null,
        duplicate_action: decision.duplicate_action ?? null,
      },
    });

    return successResponse({
      id,
      action: decision.action,
      status: updatePayload.status ?? complaint.status,
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
