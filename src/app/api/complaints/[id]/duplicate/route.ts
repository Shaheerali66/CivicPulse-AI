/**
 * src/app/api/complaints/[id]/duplicate/route.ts
 *
 * PRD-04 :: API — PATCH /api/complaints/[id]/duplicate
 * Review an individual duplicate candidate relationship.
 * Allows confirming, rejecting, or marking reports as related but distinct.
 * Crucial rule: original complaints are ALWAYS preserved regardless of decision.
 */

import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUserWithProfile, getUserDepartmentIds } from "@/lib/auth/session";
import {
  errorResponse,
  handleRouteError,
  successResponse,
} from "@/lib/api/error-response";
import { DuplicateReviewSchema } from "@/lib/validation/api-schemas";

export async function PATCH(
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

    if (profile.role === "citizen") {
      return errorResponse("Insufficient permissions.", 403, "FORBIDDEN");
    }

    const body = await request.json();
    const parseResult = DuplicateReviewSchema.safeParse(body);
    if (!parseResult.success) {
      const issues = parseResult.error.issues
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join("; ");
      return errorResponse(`Validation failed: ${issues}`, 400, "VALIDATION_ERROR");
    }

    const { relationship_id, decision, notes } = parseResult.data;
    const supabase = await createSupabaseServerClient();

    // Fetch complaint to check department scope
    const { data: complaint } = await supabase
      .from("complaints")
      .select("id, department_id, tracking_id")
      .eq("id", id)
      .single();

    if (!complaint) {
      return errorResponse("Complaint not found.", 404, "NOT_FOUND");
    }

    if (profile.role !== "admin" && complaint.department_id) {
      const deptIds = await getUserDepartmentIds(user.id);
      if (!deptIds.includes(complaint.department_id)) {
        return errorResponse("Unauthorized for this department's complaints.", 403, "FORBIDDEN");
      }
    }

    // Update the duplicate candidate record
    const { data: updatedRel, error: relError } = await supabase
      .from("complaint_duplicates")
      .update({
        review_state: decision,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", relationship_id)
      .eq("complaint_id", id)
      .select()
      .single();

    if (relError || !updatedRel) {
      console.error("[CivicPulse API] Duplicate update error:", relError?.message);
      return errorResponse("Failed to update duplicate relationship.", 500, "DB_ERROR");
    }

    // If confirmed duplicate, update the complaint flag
    if (decision === "confirmed_duplicate") {
      await supabase
        .from("complaints")
        .update({
          is_duplicate: true,
          duplicate_of_id: updatedRel.duplicate_of_id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
    } else if (decision === "rejected_duplicate") {
      await supabase
        .from("complaints")
        .update({
          is_duplicate: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
    }

    // Audit event
    await supabase.from("complaint_events").insert({
      complaint_id: id,
      actor_id: user.id,
      event_type:
        decision === "confirmed_duplicate"
          ? "duplicate_confirmed"
          : decision === "rejected_duplicate"
          ? "duplicate_rejected"
          : "duplicate_flagged",
      metadata: {
        relationship_id,
        decision,
        notes: notes ?? null,
      },
    });

    return successResponse({
      id,
      relationship_id,
      decision,
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
