/**
 * src/app/api/complaints/[id]/status/route.ts
 *
 * PATCH / POST /api/complaints/[id]/status
 * Uses Service Role client to bypass RLS and writes status updates directly to Supabase.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserWithProfile } from "@/lib/auth/session";
import { errorResponse, handleRouteError, successResponse } from "@/lib/api/error-response";
import { UpdateStatusSchema } from "@/lib/validation/api-schemas";
import { notifyStatusChanged } from "@/lib/notifications/service";

async function handleStatusUpdate(
  request: NextRequest,
  params: Promise<{ id: string }> | { id: string }
) {
  try {
    let auth = null;
    try {
      auth = await getCurrentUserWithProfile();
    } catch {
      auth = null;
    }

    const resolvedParams = await Promise.resolve(params);
    const rawId = resolvedParams?.id;
    const cleanId = decodeURIComponent(rawId || "").trim();

    if (!cleanId) {
      return errorResponse("Missing complaint identifier", 400, "BAD_REQUEST");
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

    // Use Service Role client to bypass RLS restrictions
    const admin = createAdminClient();

    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId);

    // Fetch complaint by UUID or tracking code
    let complaint: any = null;
    if (isUUID) {
      const { data } = await admin
        .from("complaints")
        .select("id, status, department_id, citizen_id, tracking_id")
        .eq("id", cleanId)
        .maybeSingle();
      complaint = data;
    }

    if (!complaint) {
      const { data } = await admin
        .from("complaints")
        .select("id, status, department_id, citizen_id, tracking_id")
        .or(`tracking_id.eq.${cleanId},tracking_code.eq.${cleanId}`)
        .maybeSingle();
      complaint = data;
    }

    if (!complaint) {
      return errorResponse(`Complaint "${cleanId}" not found.`, 404, "NOT_FOUND");
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

    // Apply the status update directly to Supabase complaints table
    const { error: updateError } = await admin
      .from("complaints")
      .update(updatePayload)
      .eq("id", complaint.id);

    if (updateError) {
      console.error("[CivicPulse API] Status update failed:", updateError.message);
      return errorResponse("Failed to update status in database.", 500, "DB_ERROR");
    }

    // Record audit event in complaint_events
    try {
      await admin.from("complaint_events").insert({
        complaint_id: complaint.id,
        actor_id: auth?.user?.id ?? null,
        event_type: newStatus === "resolved" ? "resolved" : "status_changed",
        previous_value: { status: complaint.status },
        new_value: { status: newStatus },
        note: note || resolution_notes || `Status transitioned to ${newStatus}`,
        created_at: now,
      });
    } catch (e) {
      console.warn("[CivicPulse API] Could not record status change event:", e);
    }

    // Notify citizen if citizen_id exists
    if (complaint.citizen_id) {
      notifyStatusChanged({
        citizen_user_id: complaint.citizen_id,
        complaint_id: complaint.id,
        tracking_id: complaint.tracking_id || cleanId,
        new_status: newStatus,
      }).catch(() => {});
    }

    return successResponse({
      complaint_id: complaint.id,
      tracking_id: complaint.tracking_id || cleanId,
      status: newStatus,
      updated_at: now,
    });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleStatusUpdate(request, params);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleStatusUpdate(request, params);
}
