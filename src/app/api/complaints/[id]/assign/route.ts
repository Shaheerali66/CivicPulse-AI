/**
 * src/app/api/complaints/[id]/assign/route.ts
 *
 * PRD-04 :: API — POST /api/complaints/[id]/assign
 * Assigns a complaint to a department and optionally an officer.
 * Persists to public.complaints (department_id, assigned_to) and public.complaint_events.
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
import { AssignComplaintSchema } from "@/lib/validation/api-schemas";
import { notifyComplaintAssigned } from "@/lib/notifications/service";

export async function POST(
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
    const isDemo = !auth?.user || !auth.profile;
    const supabase = isDemo ? createAdminClient() : await createSupabaseServerClient();

    const body = await request.json();
    const parseResult = AssignComplaintSchema.safeParse(body);
    if (!parseResult.success) {
      const issues = parseResult.error.issues
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join("; ");
      return errorResponse(`Validation failed: ${issues}`, 400, "VALIDATION_ERROR");
    }

    const { department_id, officer_id, note } = parseResult.data;

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

    // Fetch current complaint
    const { data: complaint } = await supabase
      .from("complaints")
      .select("id, status, department_id, tracking_id")
      .eq("id", id)
      .single();

    if (!complaint) {
      return errorResponse("Complaint not found.", 404, "NOT_FOUND");
    }

    const now = new Date().toISOString();

    // Update the complaint
    const { error: updateError } = await supabase
      .from("complaints")
      .update({
        department_id,
        assigned_to: officer_id ?? null,
        status: "assigned",
        updated_at: now,
      })
      .eq("id", id);

    if (updateError) {
      console.error("[CivicPulse API] Assignment failed:", updateError.message);
      return errorResponse("Failed to assign complaint.", 500, "DB_ERROR");
    }

    // Record in audit history
    await supabase.from("complaint_events").insert({
      complaint_id: id,
      actor_id: auth?.user?.id ?? null,
      event_type: "assigned",
      previous_value: { status: complaint.status, department_id: complaint.department_id },
      new_value: { status: "assigned", department_id, assigned_to: officer_id ?? null },
      note: note || `Assigned to ${dept.name}`,
      created_at: now,
    });

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
