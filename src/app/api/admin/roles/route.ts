/**
 * src/app/api/admin/roles/route.ts
 *
 * PRD-02 :: Administrative Role Management (POST /api/admin/roles).
 * Strictly requires authenticated administrator privileges.
 * Audited and logged to prevent unauthorized role escalation.
 * All comments use Roman English or Roman Urdu.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getAuthenticatedUser,
  getUserProfile,
} from "@/lib/supabase/server";
import { updateUserRole } from "@/lib/supabase/admin";
import { AdminRoleUpdateSchema } from "@/lib/validation/complaint";

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

    const validation = AdminRoleUpdateSchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failure.", details: validation.error.errors },
        { status: 400 }
      );
    }

    const { target_user_id, role } = validation.data;

    const updatedProfile = await updateUserRole(user.id, target_user_id, role);

    return NextResponse.json(
      {
        message: `User role successfully updated to '${role}'.`,
        profile: updatedProfile,
      },
      { status: 200 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error.";
    console.error("[CivicPulse API] Error in POST /api/admin/roles:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
