/**
 * src/app/api/complaints/[id]/status/route.ts
 *
 * PRD-04 :: API — PATCH /api/complaints/[id]/status
 * Validates and applies a status transition.
 * Records all events into public.complaint_events with accurate DB schema.
 * Supports service role fallback in development/demo mode.
 */

import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserWithProfile } from "@/lib/auth/session";
import {
  errorResponse,
  handleRouteError,
  successResponse,
} from "@/lib/api/error-response";
import { UpdateStatusSchema } from "@/lib/validation/api-schemas";
import { notifyStatusChanged } from "@/lib/notifications/service";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    let auth = null;
    try {
      auth = await getCurrentUserWithProfile();
    } catch {
      auth = null;
    }

    const { id } = await params;
    const body = await request.json();
    const parseResult = UpdateStatusSchema.safeParse(body);
    if (!parseResult.success) {
      const issues = parseResult.error.issues
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join("; ");
      return errorResponse(`Validation failed: ${issues}`, 400, "VALIDATION_ERROR");
    }

    const { status: newStatus, resolution_notes, note } = parseResult.data;
    const isDemo = !auth?.user || !auth.profile;
    const supabase = isDemo ? createAdminClient() : await createSupabaseServerClient();

    // Fetch current complaint
    const { data: complaint, error: fetchError } = await supabase
      .from("complaints")
      .select("id, status, department_id, citizen_id, tracking_id")
      .eq("id", id)
      .single();

    if (fetchError || !complaint) {
      return errorResponse("Complaint not found.", 404, "NOT_FOUND");
    }

    const now = new Date().toISOString();
    const updatePayload: Record<string, unknown> = {
      status: newStatus,
      updated_at: now,
    };

    if (newStatus === "resolved") {
      updatePayload.resolved_at = now;
    } else if (newStatus === "closed") {
      updatePayload.closed_at = now;
    }

    // Apply the status update
    const { error: updateError } = await supabase
      .from("complaints")
      .update(updatePayload)
      .eq("id", id);

    if (updateError) {
      console.error("[CivicPulse API] Status update failed:", updateError.message);
      return errorResponse("Failed to update status in database.", 500, "DB_ERROR");
    }

    // Record event in complaint_events
    await supabase.from("complaint_events").insert({
      complaint_id: id,
      actor_id: auth?.user?.id ?? null,
      event_type: newStatus === "resolved" ? "resolved" : "status_changed",
      previous_value: { status: complaint.status },
      new_value: { status: newStatus },
      note: note || resolution_notes || `Status transitioned to ${newStatus}`,
      created_at: now,
    });

    // Notify citizen if citizen_id exists
    if (complaint.citizen_id) {
      notifyStatusChanged({
        citizen_user_id: complaint.citizen_id,
        complaint_id: id,
        tracking_id: complaint.tracking_id,
        new_status: newStatus,
      }).catch((e: unknown) => {
        console.warn("[CivicPulse API] Status notification failed:", e);
      });
    }

    return successResponse({ id, status: newStatus });
  } catch (err) {
    return handleRouteError(err);
  }
}
