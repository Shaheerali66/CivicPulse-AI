/**
 * src/app/api/complaints/[id]/route.ts
 *
 * PRD-01 :: Tracking and Detail API Route.
 * Fetches citizen-safe details for a complaint by trackingId or internal ID.
 * Strict data minimization: no officer internal notes or sensitive data exposed.
 */

import { NextRequest, NextResponse } from "next/server";
import { complaintStore } from "@/lib/storage/mock-db";
import { COMPLAINT_CATEGORIES, COMPLAINT_STATUS_LABELS, type PublicTrackingResponse } from "@/types/complaint";
 * PRD-02 :: Single Complaint Retrieval (GET /api/complaints/[id]).
 * Verifies caller authorization and role-based department scope.
 * Generates short-lived signed photo URLs only for authorized callers.
 * Never treats UUID knowledge as authorization.
 * All comments use Roman English or Roman Urdu.
 */

import {
  createServerSupabaseClient,
  getAuthenticatedUser,
  getUserProfile,
} from "@/lib/supabase/server";
import { canViewComplaint, filterCitizenAuditEvents } from "@/lib/auth/permissions";
import { getSignedPhotoUrl } from "@/lib/storage/complaint-storage";

export async function GET(
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
        { error: "Authentication required to view complaint details." },
        { status: 401 }
      );
    }

    const supabase = await createServerSupabaseClient();
    const profile = await getUserProfile(user.id);
    const role = profile?.role ?? "citizen";

    // 2. Fetch complaint record (by ID or tracking_id)
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      complaintId
    );

    let query = supabase.from("complaints").select("*");
    if (isUuid) {
      query = query.eq("id", complaintId);
    } else {
      query = query.eq("tracking_id", complaintId);
    }

    const { data: complaint, error: fetchErr } = await query.single();

    if (fetchErr || !complaint) {
      // 404 returned for missing or intentionally concealed records
      return NextResponse.json({ error: "Complaint not found." }, { status: 404 });
    }

    // 3. Load active department memberships for officer scope validation
    const { data: memberships } = await supabase
      .from("department_members")
      .select("department_id")
      .eq("user_id", user.id)
      .eq("is_active", true);

    const activeDeptIds = (memberships ?? []).map((m) => m.department_id);

    // 4. Validate Access Permissions
    const isAuthorized = canViewComplaint(
      { userId: user.id, role, activeDepartmentIds: activeDeptIds },
      complaint
    );

    if (!isAuthorized) {
      // Intentionally concealed to prevent disclosure of private existence
      return NextResponse.json({ error: "Complaint not found." }, { status: 404 });
    }

    // 5. Generate short-lived signed photo URL if photo exists
    let signedPhotoUrl: string | null = null;
    if (complaint.photo_path) {
      signedPhotoUrl = await getSignedPhotoUrl(complaint.photo_path, 300);
    }

    // 6. Fetch audit timeline events
    const { data: rawEvents } = await supabase
      .from("complaint_events")
      .select("*")
      .eq("complaint_id", complaint.id)
      .order("created_at", { ascending: true });

    const events = rawEvents ?? [];
    const sanitizedEvents =
      role === "citizen" ? filterCitizenAuditEvents(events) : events;

    return NextResponse.json(
      {
        complaint: {
          ...complaint,
          photo_url: signedPhotoUrl,
        },
        timeline: sanitizedEvents,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[CivicPulse API] Unexpected error in GET /api/complaints/[id]:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
