/**
 * src/app/api/complaints/[id]/assign/route.ts
 *
 * PRD-04 :: API — POST /api/complaints/[id]/assign
 * Assigns a complaint to a department and optionally an officer.
 * Validates: department exists & active, officer is a member, actor has permission.
 */

import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUserWithProfile, getUserDepartmentIds } from "@/lib/auth/session";
import {
  errorResponse,
  handleRouteError,
  successResponse,
} from "@/lib/api/error-response";
import { AssignComplaintSchema } from "@/lib/validation/api-schemas";
import { notifyComplaintAssigned } from "@/lib/notifications/service";

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

    // Only officers/reviewers/admins can assign
    if (profile.role === "citizen") {
      return errorResponse("Insufficient permissions.", 403, "FORBIDDEN");
    }

    const body = await request.json();
    const parseResult = AssignComplaintSchema.safeParse(body);
    if (!parseResult.success) {
      const issues = parseResult.error.issues
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join("; ");
      return errorResponse(`Validation failed: ${issues}`, 400, "VALIDATION_ERROR");
    }

    const { department_id, officer_id, note } = parseResult.data;
    const supabase = await createSupabaseServerClient();

    // Validate department exists and is active
    const { data: dept, error: deptError } = await supabase
      .from("departments")
      .select("id, name")
      .eq("id", department_id)
      .eq("is_active", true)
      .single();

    if (deptError || !dept) {
      return errorResponse("Department not found or not active.", 422, "INVALID_DEPARTMENT");
    }

    // Validate the current user has access to this department (non-admin)
    if (profile.role !== "admin") {
      const deptIds = await getUserDepartmentIds(user.id);
      if (!deptIds.includes(department_id)) {
        return errorResponse("You do not have permission to assign to this department.", 403, "FORBIDDEN");
      }
    }

    // If officer specified, validate they are an active member of the target department
    if (officer_id) {
      const { data: membership } = await supabase
        .from("department_members")
        .select("id")
        .eq("user_id", officer_id)
        .eq("department_id", department_id)
        .eq("is_active", true)
        .single();

      if (!membership) {
        return errorResponse(
          "The selected officer is not an active member of the target department.",
          422,
          "INVALID_OFFICER"
        );
      }
    }

    // Fetch current complaint
    const { data: complaint } = await supabase
      .from("complaints")
      .select("id, status, department_id, tracking_id")
      .eq("id", id)
      .single();

    if (!complaint) {
      return errorResponse("Complaint not found.", 404, "NOT_FOUND");
    }

    // Update the complaint
    const { error: updateError } = await supabase
      .from("complaints")
      .update({
        department_id,
        assigned_officer_id: officer_id ?? null,
        status: "assigned",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateError) {
      console.error("[CivicPulse API] Assignment failed:", updateError.message);
      return errorResponse("Failed to assign complaint.", 500, "DB_ERROR");
    }

    // Record in audit history
    await supabase.from("complaint_events").insert({
      complaint_id: id,
      actor_id: user.id,
      event_type: "assigned",
      from_status: complaint.status,
      to_status: "assigned",
      metadata: {
        department_id,
        department_name: dept.name,
        officer_id: officer_id ?? null,
        note: note ?? null,
      },
    });

    // Notify the assigned officer (fire-and-forget)
    if (officer_id) {
      notifyComplaintAssigned({
        officer_id,
        complaint_id: id,
        tracking_id: complaint.tracking_id,
        department_name: dept.name,
      }).catch((e: unknown) => {
        console.warn("[CivicPulse API] Assignment notification failed:", e);
      });
    }

    return successResponse({
      id,
      department_id,
      officer_id: officer_id ?? null,
      status: "assigned",
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
