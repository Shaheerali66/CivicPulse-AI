/**
 * src/app/api/complaints/[id]/review/route.ts
 *
 * PRD-04 :: API — POST /api/complaints/[id]/review
 * Human review decisions — accept, override category, change department.
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
import { ReviewDecisionSchema } from "@/lib/validation/api-schemas";

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
    const parseResult = ReviewDecisionSchema.safeParse(body);
    if (!parseResult.success) {
      const issues = parseResult.error.issues
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join("; ");
      return errorResponse(`Validation failed: ${issues}`, 400, "VALIDATION_ERROR");
    }

    const decision = parseResult.data;

    // Fetch complaint
    const { data: complaint } = await supabase
      .from("complaints")
      .select("id, status, department_id, category")
      .eq("id", id)
      .single();

    if (!complaint) {
      return errorResponse("Complaint not found.", 404, "NOT_FOUND");
    }

    const now = new Date().toISOString();
    const updatePayload: Record<string, unknown> = {
      updated_at: now,
    };

    switch (decision.action) {
      case "accept_classification":
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
        updatePayload.department_id = decision.new_department_id;
        updatePayload.status = "assigned";
        break;

      case "mark_needs_info":
        updatePayload.status = "needs_review";
        break;

      case "return_to_workflow":
        updatePayload.status = "assigned";
        break;
    }

    // Apply updates to complaint
    const { error: updateError } = await supabase
      .from("complaints")
      .update(updatePayload)
      .eq("id", id);

    if (updateError) {
      console.error("[CivicPulse API] Review decision update failed:", updateError.message);
      return errorResponse("Failed to save review decision.", 500, "DB_ERROR");
    }

    // Record in complaint_events
    await supabase.from("complaint_events").insert({
      complaint_id: id,
      actor_id: auth?.user?.id ?? null,
      event_type: "human_reviewed",
      previous_value: { status: complaint.status, category: complaint.category, department_id: complaint.department_id },
      new_value: { status: updatePayload.status ?? complaint.status, category: updatePayload.category ?? complaint.category, department_id: updatePayload.department_id ?? complaint.department_id },
      note: decision.notes || `Human review action: ${decision.action}`,
      created_at: now,
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
