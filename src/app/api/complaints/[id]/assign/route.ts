/**
 * src/app/api/complaints/[id]/assign/route.ts
 *
 * PRD-02 :: Assignment API (POST /api/complaints/[id]/assign).
 * Validates target department status and officer active membership consistency.
 * Inconsistent department and officer combinations are strictly rejected.
 * All comments use Roman English or Roman Urdu.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  createServerSupabaseClient,
  getAuthenticatedUser,
  getUserProfile,
} from "@/lib/supabase/server";
import { recordAuditEvent, createNotification } from "@/lib/supabase/admin";
import { AssignComplaintSchema } from "@/lib/validation/complaint";
import { validateDepartmentAssignment } from "@/lib/auth/permissions";

export async function POST(
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
        { error: "Authentication required to assign complaints." },
        { status: 401 }
      );
    }

    const profile = await getUserProfile(user.id);
    const role = profile?.role ?? "citizen";

    // Citizens cannot assign complaints
    if (role === "citizen") {
      return NextResponse.json(
        { error: "Unauthorized: Citizens cannot assign complaints." },
        { status: 403 }
      );
    }

    // 2. Validate request payload
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
    }

    const validation = AssignComplaintSchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failure.", details: validation.error.errors },
        { status: 400 }
      );
    }

    const input = validation.data;
    const supabase = await createServerSupabaseClient();

    // 3. Load complaint
    const { data: complaint, error: complaintErr } = await supabase
      .from("complaints")
      .select("*")
      .eq("id", complaintId)
      .single();

    if (complaintErr || !complaint) {
      return NextResponse.json({ error: "Complaint not found." }, { status: 404 });
    }

    // 4. Verify target department exists and is active
    const { data: dept, error: deptErr } = await supabase
      .from("departments")
      .select("id, name, is_active")
      .eq("id", input.department_id)
      .single();

    if (deptErr || !dept) {
      return NextResponse.json({ error: "Target department does not exist." }, { status: 404 });
    }

    if (!dept.is_active) {
      return NextResponse.json(
        { error: "Target department is inactive. Cannot assign." },
        { status: 400 }
      );
    }

    // 5. If assigning an officer, verify active membership in target department
    if (input.assigned_to) {
      const { data: membership } = await supabase
        .from("department_members")
        .select("department_id, user_id, is_active")
        .eq("department_id", input.department_id)
        .eq("user_id", input.assigned_to)
        .eq("is_active", true)
        .single();

      const assignmentCheck = validateDepartmentAssignment({
        targetDepartment: dept,
        assignedOfficerId: input.assigned_to,
        officerActiveMemberships: membership ? [membership] : [],
      });

      if (!assignmentCheck.valid) {
        return NextResponse.json(
          { error: assignmentCheck.reason },
          { status: 400 }
        );
      }
    }

    // 6. Update complaint assignment and auto-advance status if submitted or analyzing
    const nextStatus =
      complaint.status === "submitted" || complaint.status === "needs_review"
        ? "assigned"
        : complaint.status;

    const { data: updatedComplaint, error: updateErr } = await supabase
      .from("complaints")
      .update({
        department_id: input.department_id,
        assigned_to: input.assigned_to ?? null,
        status: nextStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", complaintId)
      .select()
      .single();

    if (updateErr || !updatedComplaint) {
      console.error("[CivicPulse API] Failed to update assignment:", updateErr?.message);
      return NextResponse.json({ error: "Failed to update complaint assignment." }, { status: 500 });
    }

    // 7. Record audit history
    await recordAuditEvent({
      complaintId: complaint.id,
      actorId: user.id,
      eventType: "department_assigned",
      previousValue: {
        department_id: complaint.department_id,
        assigned_to: complaint.assigned_to,
        status: complaint.status,
      },
      newValue: {
        department_id: input.department_id,
        assigned_to: input.assigned_to ?? null,
        status: nextStatus,
      },
      note: input.note ?? `Assigned to department '${dept.name}'.`,
    });

    // 8. Notifications
    if (input.assigned_to) {
      await createNotification({
        userId: input.assigned_to,
        complaintId: complaint.id,
        type: "assignment",
        title: "Complaint Assigned To You",
        message: `You were assigned complaint '${complaint.title}' in ${dept.name}.`,
      });
    }

    if (complaint.citizen_id) {
      await createNotification({
        userId: complaint.citizen_id,
        complaintId: complaint.id,
        type: "assignment",
        title: "Complaint Routed To Department",
        message: `Your complaint has been assigned to ${dept.name}.`,
      });
    }

    return NextResponse.json(
      {
        message: "Assignment completed successfully.",
        complaint: {
          id: updatedComplaint.id,
          department_id: updatedComplaint.department_id,
          assigned_to: updatedComplaint.assigned_to,
          status: updatedComplaint.status,
          updated_at: updatedComplaint.updated_at,
        },
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[CivicPulse API] Unexpected error in POST /api/complaints/[id]/assign:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
