/**
 * src/app/api/departments/route.ts
 *
 * PRD-02 :: Department Configuration Listing.
 * Returns active departments for complaint filing and routing.
 * Inactive departments are hidden unless caller is an authenticated administrator.
 * All comments use Roman English or Roman Urdu.
 */

import { NextResponse } from "next/server";
import { createServerSupabaseClient, getAuthenticatedUser, getUserProfile } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const user = await getAuthenticatedUser();
    let isAdmin = false;

    if (user) {
      const profile = await getUserProfile(user.id);
      isAdmin = profile?.role === "admin";
    }

    let query = supabase
      .from("departments")
      .select("id, name, slug, description, is_active, created_at");

    // Normal users only see active departments
    if (!isAdmin) {
      query = query.eq("is_active", true);
    }

    const { data: departments, error } = await query.order("name", { ascending: true });

    if (error) {
      console.error("[CivicPulse API] Error fetching departments:", error.message);
      return NextResponse.json({ error: "Failed to retrieve departments." }, { status: 500 });
    }

    return NextResponse.json({ departments }, { status: 200 });
  } catch (err) {
    console.error("[CivicPulse API] Unexpected error in /api/departments:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
