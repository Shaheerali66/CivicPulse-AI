/**
 * src/app/api/notifications/route.ts
 *
 * PRD-02 :: Notifications Listing API (GET /api/notifications).
 * Owner-scoped retrieval: users can only view their own notifications.
 * All comments use Roman English or Roman Urdu.
 */

import { NextResponse } from "next/server";
import { createServerSupabaseClient, getAuthenticatedUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const supabase = await createServerSupabaseClient();

    // Query notifications strictly for authenticated user
    const { data: notifications, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("[CivicPulse API] Error fetching notifications:", error.message);
      return NextResponse.json({ error: "Failed to retrieve notifications." }, { status: 500 });
    }

    const unreadCount = (notifications ?? []).filter((n) => n.read_at === null).length;

    return NextResponse.json(
      {
        notifications: notifications ?? [],
        unread_count: unreadCount,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[CivicPulse API] Unexpected error in GET /api/notifications:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
