/**
 * src/app/api/notifications/[id]/read/route.ts
 *
 * PRD-04 :: API — PATCH /api/notifications/[id]/read
 * Mark a notification as read. User can only mark their OWN notifications.
 */

import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";
import { errorResponse, handleRouteError, successResponse } from "@/lib/api/error-response";

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return errorResponse("Authentication required.", 401, "UNAUTHORIZED");
    }

    const { id } = await params;
    const supabase = await createSupabaseServerClient();

    // Update only if user_id matches — enforces ownership
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id)
      .eq("user_id", user.id); // Security: can only mark own notifications

    if (error) {
      return errorResponse("Failed to mark notification as read.", 500, "DB_ERROR");
    }

    return successResponse({ id, is_read: true });
  } catch (err) {
    return handleRouteError(err);
  }
}
