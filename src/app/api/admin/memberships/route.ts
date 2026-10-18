/**
 * src/app/api/admin/memberships/route.ts
 *
 * PRD-02 :: Department Membership Management (POST / PATCH /api/admin/memberships).
 * Administrators assign, modify, or deactivate officer memberships.
 * Membership deactivation immediately disables department-scoped access.
 * All comments use Roman English or Roman Urdu.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  createServerSupabaseClient,
  getAuthenticatedUser,
  getUserProfile,
} from "@/lib/supabase/server";
import { AdminMembershipSchema } from "@/lib/validation/complaint";

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const profile = await getUserProfile(user.id);
    if (profile?.role !== "admin") {
      return NextResponse.json(
        { error: "Unauthorized: Administrator authority required." },
        { status: 403 }
      );
    }

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
    }

    const validation = AdminMembershipSchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failure.", details: validation.error.errors },
        { status: 400 }
      );
    }

    const input = validation.data;
    const supabase = await createServerSupabaseClient();

    // Upsert membership (unique on department_id, user_id)
    const { data: membership, error } = await supabase
      .from("department_members")
      .upsert(
        {
          department_id: input.department_id,
          user_id: input.user_id,
          membership_role: input.membership_role,
          is_active: input.is_active,
          created_by: user.id,
        },
        { onConflict: "department_id,user_id" }
      )
      .select()
      .single();

    if (error || !membership) {
      console.error("[CivicPulse API] Failed to manage membership:", error?.message);
      return NextResponse.json({ error: "Failed to configure membership." }, { status: 500 });
    }

    return NextResponse.json(
      {
        message: "Department membership updated successfully.",
        membership,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[CivicPulse API] Error in POST /api/admin/memberships:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
