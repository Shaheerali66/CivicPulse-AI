/**
 * src/app/api/complaints/[id]/route.ts
 *
 * PRD-04 :: API — GET /api/complaints/[id]
 * Returns full complaint details including AI analysis, events, and duplicate candidates.
 * Access-scoped: citizen sees own, officers see department scope, admin sees all.
 */

import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUserWithProfile, getUserDepartmentIds } from "@/lib/auth/session";
import { errorResponse, handleRouteError, successResponse } from "@/lib/api/error-response";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getCurrentUserWithProfile();
    if (!auth?.user || !auth.profile) {
      return errorResponse("Authentication required.", 401, "UNAUTHORIZED");
    }

    const { user, profile } = auth;
    const { id } = await params;

    const supabase = await createSupabaseServerClient();

    // Fetch the complaint with relations
    const { data: complaint, error } = await supabase
      .from("complaints")
      .select(
        `
        *,
        department:departments(id, name, slug, is_active),
        assigned_officer:profiles!assigned_officer_id(id, full_name, role),
        submitter:profiles!user_id(id, full_name, role)
        `
      )
      .eq("id", id)
      .single();

    if (error || !complaint) {
      // Return 404 regardless of whether it doesn't exist or is forbidden
      // to avoid leaking information about inaccessible records
      return errorResponse("Complaint not found.", 404, "NOT_FOUND");
    }

    // Enforce access control
    const canAccess = await checkComplaintAccess({
      complaint,
      userId: user.id,
      role: profile.role,
    });

    if (!canAccess) {
      return errorResponse("Complaint not found.", 404, "NOT_FOUND");
    }

    // Fetch complaint events (timeline)
    const { data: events } = await supabase
      .from("complaint_events")
      .select(
        `*, actor:profiles!actor_id(id, full_name, role)`
      )
      .eq("complaint_id", id)
      .order("created_at", { ascending: true });

    // Fetch duplicate candidates — only minimum authorized info
    const { data: duplicates } = await supabase
      .from("complaint_duplicates")
      .select(
        `
        id,
        complaint_id,
        duplicate_of_id,
        similarity_score,
        review_state,
        reviewed_by,
        reviewed_at,
        related_complaint:complaints!duplicate_of_id(
          id, tracking_id, category, location_label, created_at,
          ai_analysis->summary
        )
        `
      )
      .eq("complaint_id", id)
      .order("similarity_score", { ascending: false });

    // Strip private fields for non-authorized roles
    const responseComplaint = sanitizeComplaintForRole(complaint, profile.role);

    return successResponse({
      ...responseComplaint,
      events: events ?? [],
      duplicate_candidates: duplicates ?? [],
    });
  } catch (err) {
    return handleRouteError(err);
  }
}

// ---------------------------------------------------------------------------
// Access control check — returns true if the user can view this complaint
// ---------------------------------------------------------------------------
async function checkComplaintAccess(params: {
  complaint: Record<string, unknown>;
  userId: string;
  role: string;
}): Promise<boolean> {
  const { complaint, userId, role } = params;

  if (role === "admin") return true;

  if (role === "citizen") {
    return complaint.user_id === userId;
  }

  if (role === "officer" || role === "reviewer") {
    // Officer can see complaints in their departments
    const supabase = await createSupabaseServerClient();
    const deptIds = await getUserDepartmentIds(userId);
    const complaintDeptId = complaint.department_id as string | null;
    if (!complaintDeptId) return false;
    return deptIds.includes(complaintDeptId);
  }

  return false;
}

// ---------------------------------------------------------------------------
// Strip private information based on role
// ---------------------------------------------------------------------------
function sanitizeComplaintForRole(
  complaint: Record<string, unknown>,
  role: string
): Record<string, unknown> {
  const result = { ...complaint };

  if (role === "citizen") {
    // Citizens cannot see internal notes, officer identity, or AI reasoning
    delete result.ai_analysis;
    delete result.assigned_officer;
  }

  // Never include photo_path (internal Supabase path) in response
  delete result.photo_path;

  return result;
}
