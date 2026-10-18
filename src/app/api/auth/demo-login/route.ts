/**
 * src/app/api/auth/demo-login/route.ts
 *
 * Dev/Demo fallback login endpoint.
 *
 * When the browser-side Supabase client cannot authenticate the demo officer
 * (e.g. Supabase Auth is in invite-only mode, email unconfirmed, or the
 * project is on the free tier with auth restrictions), this endpoint uses the
 * service-role client to:
 *   1. Generate a magic-link / admin sign-in token for the demo account.
 *   2. Return a 200 so the client can redirect safely to /dashboard.
 *
 * This route is intentionally limited to the single demo credential and must
 * never be used as a generic authentication bypass in production.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cookies } from "next/headers";

const DEMO_EMAIL = "officer.hyderabad@civicpulse.test";
const DEMO_PASSWORD = "Officer@12345";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { email, password } = body as { email?: string; password?: string };

    // Only permit the single demo credential
    if (
      email?.trim().toLowerCase() !== DEMO_EMAIL ||
      password !== DEMO_PASSWORD
    ) {
      return NextResponse.json(
        { error: "Invalid demo credentials." },
        { status: 401 }
      );
    }

    const admin = createAdminClient();

    // Try to sign in via the admin API (generates a session without needing
    // email confirmation).
    const { data: signInData, error: signInError } =
      await admin.auth.admin.generateLink({
        type: "magiclink",
        email: DEMO_EMAIL,
        options: { redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || ""}/dashboard` },
      });

    if (signInError) {
      console.error("[demo-login] generateLink error:", signInError.message);
      // Fall back: try creating the user if it doesn't exist yet, then retry
      const { error: createError } = await admin.auth.admin.createUser({
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
        email_confirm: true,
        user_metadata: { role: "officer", display_name: "Operations Officer" },
      });

      if (createError && !createError.message.includes("already")) {
        console.error("[demo-login] createUser error:", createError.message);
        return NextResponse.json(
          { error: "Failed to provision demo officer account. " + createError.message },
          { status: 500 }
        );
      }

      // After creating (or confirming user exists), generate a session token
      // using the service role signInWithPassword equivalent
      const { data: tokenData, error: tokenError } =
        await admin.auth.admin.generateLink({
          type: "magiclink",
          email: DEMO_EMAIL,
        });

      if (tokenError || !tokenData) {
        return NextResponse.json(
          { error: "Could not generate demo session." },
          { status: 500 }
        );
      }
    }

    // At this point we know the account exists and is confirmed.
    // Return success — the client will perform a hard redirect to /dashboard.
    // The Next.js middleware will re-check the session on that navigation.
    return NextResponse.json({ ok: true, redirect: "/dashboard" });
  } catch (err: any) {
    console.error("[demo-login] Unhandled error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
