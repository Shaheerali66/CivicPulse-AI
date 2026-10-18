/**
 * src/app/api/complaints/[id]/status/route.ts
 *
 * PRD-04 :: API — PATCH /api/complaints/[id]/status
 * Validates and applies a status transition.
 * All transitions are validated against the server-side state machine.
 * Only permitted roles can make specific transitions.
 * Every change is recorded in complaint_events.
 */

import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUserWithProfile, getUserDepartmentIds } from "@/lib/auth/session";
import {
  errorResponse,
  handleRouteError,
  successResponse,
} from "@/lib/api/error-response";
import { UpdateStatusSchema } from "@/lib/validation/api-schemas";
import { STATUS_TRANSITIONS } from "@/types/database";
import type { ComplaintStatus } from "@/types/database";
import { notifyStatusChanged } from "@/lib/notifications/service";

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

    // Citizens cannot change status
    if (profile.role === "citizen") {
      return errorResponse("Insufficient permissions.", 403, "FORBIDDEN");
    }

    const body = await request.json();
    const parseResult = UpdateStatusSchema.safeParse(body);
    if (!parseResult.success) {
      const issues = parseResult.error.issues
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join("; ");
      return errorResponse(`Validation failed: ${issues}`, 400, "VALIDATION_ERROR");
    }

    const { status: newStatus, resolution_notes, note } = parseResult.data;
    const supabase = await createSupabaseServerClient();

    // Fetch current complaint (including department scoping check)
    const { data: complaint, error: fetchError } = await supabase
      .from("complaints")
      .select("id, status, department_id, user_id, tracking_id")
      .eq("id", id)
      .single();

    if (fetchError || !complaint) {
      return errorResponse("Complaint not found.", 404, "NOT_FOUND");
    }

    // Department scoping for officers/reviewers
    if (profile.role !== "admin") {
      const deptIds = await getUserDepartmentIds(user.id);
      if (complaint.department_id && !deptIds.includes(complaint.department_id)) {
        return errorResponse("Complaint not found.", 404, "NOT_FOUND");
      }
    }

    // Validate the status transition
    const currentStatus = complaint.status as ComplaintStatus;
    const allowedTransitions = STATUS_TRANSITIONS[currentStatus] ?? [];

    if (!allowedTransitions.includes(newStatus)) {
      return errorResponse(
        `Transition from "${currentStatus}" to "${newStatus}" is not permitted.`,
        409,
        "INVALID_TRANSITION"
      );
    }

    // Resolution-related timestamps
    const now = new Date().toISOString();
    const updatePayload: Record<string, unknown> = {
      status: newStatus,
      updated_at: now,
    };

    if (newStatus === "resolved") {
      updatePayload.resolved_at = now;
      if (resolution_notes) updatePayload.resolution_notes = resolution_notes;
    }
    if (newStatus === "closed") {
      updatePayload.closed_at = now;
    }

    // Apply the status update
    const { error: updateError } = await supabase
      .from("complaints")
      .update(updatePayload)
      .eq("id", id);

    if (updateError) {
      console.error("[CivicPulse API] Status update failed:", updateError.message);
      return errorResponse("Failed to update status.", 500, "DB_ERROR");
    }

    // Record the event in audit history
    await supabase.from("complaint_events").insert({
      complaint_id: id,
      actor_id: user.id,
      event_type: "status_changed",
      from_status: currentStatus,
      to_status: newStatus,
      metadata: { note: note ?? null },
    });

    // Notify the citizen (fire-and-forget — failure must not affect the response)
    notifyStatusChanged({
      citizen_user_id: complaint.user_id,
      complaint_id: id,
      tracking_id: complaint.tracking_id,
      new_status: newStatus,
    }).catch((e: unknown) => {
      console.warn("[CivicPulse API] Status notification failed:", e);
    });

    return successResponse({ id, status: newStatus });
  } catch (err) {
    return handleRouteError(err);
  }
}
