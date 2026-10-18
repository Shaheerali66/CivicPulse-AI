/**
 * src/app/api/auth/profile/route.ts
 *
 * PRD-02 :: Profile Onboarding & Management (GET / PATCH /api/auth/profile).
 * Ensures safe onboarding with default 'citizen' role.
 * Prohibits self-service role escalation.
 * All comments use Roman English or Roman Urdu.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  createServerSupabaseClient,
  getAuthenticatedUser,
  ensureUserProfile,
} from "@/lib/supabase/server";
import { UpdateProfileSchema } from "@/lib/validation/complaint";

/**
 * GET /api/auth/profile
 * Returns profile for current authenticated user.
 * Idempotently initializes the profile if not already present.
 */
export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    // Idempotent onboarding: initializes safe 'citizen' profile if missing
    const profile = await ensureUserProfile({
      id: user.id,
      email: user.email,
      user_metadata: user.user_metadata,
    });

    return NextResponse.json({ profile }, { status: 200 });
  } catch (err) {
    console.error("[CivicPulse API] Error in GET /api/auth/profile:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

/**
 * PATCH /api/auth/profile
 * Allows users to update display_name or phone.
 * Explicitly rejects role escalation attempts.
 */
export async function PATCH(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
    }

    // Schema validation (strictly disallows 'role' or other privileged fields)
    const validation = UpdateProfileSchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failure.", details: validation.error.errors },
        { status: 400 }
      );
    }

    const input = validation.data;
    const supabase = await createServerSupabaseClient();

    const { data: updatedProfile, error } = await supabase
      .from("profiles")
      .update({
        ...(input.display_name !== undefined && { display_name: input.display_name }),
        ...(input.phone !== undefined && { phone: input.phone }),
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id)
      .select()
      .single();

    if (error || !updatedProfile) {
      console.error("[CivicPulse API] Failed to update profile:", error?.message);
      return NextResponse.json({ error: "Failed to update profile." }, { status: 500 });
    }

    return NextResponse.json(
      { message: "Profile updated successfully.", profile: updatedProfile },
      { status: 200 }
    );
  } catch (err) {
    console.error("[CivicPulse API] Error in PATCH /api/auth/profile:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
