/**
 * src/app/api/notifications/route.ts
 *
 * PRD-04 :: API — GET /api/notifications
 * Returns the current user's notifications only.
 * Users can NEVER read other users' notifications (enforced by user_id filter).
 */

import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";
import { errorResponse, handleRouteError, successResponse } from "@/lib/api/error-response";

export async function GET(_request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return errorResponse("Authentication required.", 401, "UNAUTHORIZED");
    }

    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("notifications")
      .select("id, type, title, body, is_read, complaint_id, created_at")
      .eq("user_id", user.id) // ALWAYS filter by the authenticated user
      .order("created_at", { ascending: false })
      .limit(50); // Reasonable cap

    if (error) {
      console.error("[CivicPulse API] notifications GET error:", error.message);
      return errorResponse("Failed to fetch notifications.", 500, "DB_ERROR");
    }

    return successResponse({
      notifications: data ?? [],
      unread_count: (data ?? []).filter((n: { is_read: boolean }) => !n.is_read).length,
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
