/**
 * src/app/api/notifications/[id]/read/route.ts
 *
 * PRD-02 :: Mark Notification Read API (PATCH /api/notifications/[id]/read).
 * Owner-scoped: users can only update read state on their own notifications.
 * All comments use Roman English or Roman Urdu.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, getAuthenticatedUser } from "@/lib/supabase/server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const notificationId = params.id;
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const supabase = await createServerSupabaseClient();

    // Verify ownership and update read_at atomically
    const { data: updated, error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", notificationId)
      .eq("user_id", user.id) // Strict owner check
      .select()
      .single();

    if (error || !updated) {
      return NextResponse.json(
        { error: "Notification not found or unauthorized." },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Notification marked as read.", notification: updated },
      { status: 200 }
    );
  } catch (err) {
    console.error("[CivicPulse API] Error in PATCH /api/notifications/[id]/read:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
