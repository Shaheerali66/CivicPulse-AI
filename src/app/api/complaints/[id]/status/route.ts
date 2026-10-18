/**
 * src/app/api/complaints/[id]/status/route.ts
 *
 * PRD-02 :: Status Transition API (PATCH /api/complaints/[id]/status).
 * Enforces role-based permission checks and state transition rules.
 * Records immutable audit events and triggers owner notifications.
 * All comments use Roman English or Roman Urdu.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  createServerSupabaseClient,
  getAuthenticatedUser,
  getUserProfile,
} from "@/lib/supabase/server";
import { recordAuditEvent, createNotification } from "@/lib/supabase/admin";
import { UpdateStatusSchema } from "@/lib/validation/complaint";
import { isValidStatusTransition } from "@/lib/auth/permissions";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const complaintId = params.id;
    if (!complaintId) {
      return NextResponse.json({ error: "Complaint identifier required." }, { status: 400 });
    }

    // 1. Identify caller through verified server session
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required to update complaint status." },
        { status: 401 }
      );
    }

    // 2. Validate payload
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
    }

    const validation = UpdateStatusSchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failure.", details: validation.error.errors },
        { status: 400 }
      );
    }

    const input = validation.data;
    const supabase = await createServerSupabaseClient();
    const profile = await getUserProfile(user.id);
    const role = profile?.role ?? "citizen";

    // 3. Load complaint record
    const { data: complaint, error: fetchErr } = await supabase
      .from("complaints")
      .select("*")
      .eq("id", complaintId)
      .single();

    if (fetchErr || !complaint) {
      return NextResponse.json({ error: "Complaint not found." }, { status: 404 });
    }

    // 4. Officer department boundary check
    if (role === "officer") {
      if (!complaint.department_id) {
        return NextResponse.json(
          { error: "Complaint has not been assigned to a department yet." },
          { status: 403 }
        );
      }

      const { data: membership } = await supabase
        .from("department_members")
        .select("is_active")
        .eq("department_id", complaint.department_id)
        .eq("user_id", user.id)
        .eq("is_active", true)
        .single();

      if (!membership) {
        return NextResponse.json(
          { error: "Unauthorized: You are not an active officer in this department." },
          { status: 403 }
        );
      }
    }

    // 5. State Machine Validation
    const transitionCheck = isValidStatusTransition(complaint.status, input.status, role);
    if (!transitionCheck.valid) {
      return NextResponse.json(
        { error: transitionCheck.reason ?? "Invalid status transition requested." },
        { status: 400 }
      );
    }

    // 6. Prepare update payload
    const now = new Date().toISOString();
    const updatePayload = {
      status: input.status,
      updated_at: now,
      ...(input.status === "resolved" ? { resolved_at: now } : {}),
      ...(input.status === "closed" ? { closed_at: now } : {}),
    };

    // 7. Perform update
    const { data: updatedComplaint, error: updateErr } = await supabase
      .from("complaints")
      .update(updatePayload)
      .eq("id", complaintId)
      .select()
      .single();

    if (updateErr || !updatedComplaint) {
      console.error("[CivicPulse API] Failed to update status:", updateErr?.message);
      return NextResponse.json({ error: "Failed to update complaint status." }, { status: 500 });
    }

    // 8. Record audit event
    await recordAuditEvent({
      complaintId: complaint.id,
      actorId: user.id,
      eventType: "status_changed",
      previousValue: { status: complaint.status },
      newValue: { status: input.status },
      note: input.note ?? `Status transitioned from ${complaint.status} to ${input.status}.`,
    });

    // 9. Trigger notification to citizen (if attached)
    if (complaint.citizen_id) {
      await createNotification({
        userId: complaint.citizen_id,
        complaintId: complaint.id,
        type: "status_update",
        title: `Complaint Status Updated: ${input.status.toUpperCase()}`,
        message: `Your complaint '${complaint.title}' is now marked as '${input.status}'.`,
      });
    }

    return NextResponse.json(
      {
        message: "Status updated successfully.",
        complaint: {
          id: updatedComplaint.id,
          status: updatedComplaint.status,
          resolved_at: updatedComplaint.resolved_at,
          closed_at: updatedComplaint.closed_at,
          updated_at: updatedComplaint.updated_at,
        },
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[CivicPulse API] Unexpected error in PATCH /api/complaints/[id]/status:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
