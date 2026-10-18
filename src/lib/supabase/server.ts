/**
 * src/lib/supabase/server.ts
 *
 * PRD-02/04 :: Supabase — Server-side client using @supabase/ssr.
 * Ye file sirf server-side use hoti hai (Route Handlers, Server Components).
 * User session cookies se automatically authenticate hoti hai.
 *
 * SECURITY: Is file ko kabhi bhi client component mein import mat karo.
 */

import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// ---------------------------------------------------------------------------
// Standard server client — reads user session from cookies.
// Use in Server Components and Route Handlers for user-scoped queries.
// RLS policies will apply automatically based on the logged-in user.
// Exported as both names for backward compatibility with existing route files.
// ---------------------------------------------------------------------------
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: Array<{
            name: string;
            value: string;
            options?: Parameters<typeof cookieStore.set>[2];
          }>
        ) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component calling setAll — safe to ignore in read-only contexts
          }
        },
      },
    }
  );
}

// Alias used by some older route files — same implementation
export const createServerSupabaseClient = createSupabaseServerClient;

// ---------------------------------------------------------------------------
// Admin / service-role client — bypasses RLS for privileged server operations.
// ONLY use when: creating complaints (no user session), running batch jobs,
// or performing admin-gated operations after manual permission checks.
//
// NEVER expose this client to client-side code or return raw data to users
// without applying permission filters manually.
// ---------------------------------------------------------------------------
export function createSupabaseServiceClient() {
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    "placeholder-key";

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn(
      "[CivicPulse] Warning: SUPABASE_SERVICE_ROLE_KEY is not set. " +
        "Using public fallback key. Privileged operations may require service role credentials."
    );
  }

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
    serviceRoleKey,
    {
      cookies: {
        getAll() {
          return [];
        },
        setAll() {},
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

// ---------------------------------------------------------------------------
// getAuthenticatedUser — returns the currently authenticated Supabase user,
// or null if no valid session exists.
// Used by route handlers that need the raw auth.User object.
// ---------------------------------------------------------------------------
export async function getAuthenticatedUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

// ---------------------------------------------------------------------------
// getUserProfile — fetches the profiles row for a given user ID.
// Returns null if no profile exists yet (pre-onboarding state).
// ---------------------------------------------------------------------------
export async function getUserProfile(userId: string) {
  const supabase = await createSupabaseServerClient();

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, role, display_name, phone, created_at, updated_at")
    .eq("id", userId)
    .single();

  if (error || !profile) {
    return null;
  }

  return profile;
}

// ---------------------------------------------------------------------------
// ensureUserProfile — idempotent onboarding helper.
// Creates a safe 'citizen' profile row if one doesn't already exist.
// Prevents role escalation by always defaulting to 'citizen' on creation.
// ---------------------------------------------------------------------------
export async function ensureUserProfile(params: {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
}) {
  const supabase = await createSupabaseServerClient();

  // Check if profile already exists
  const { data: existing } = await supabase
    .from("profiles")
    .select("id, role, display_name, phone, created_at, updated_at")
    .eq("id", params.id)
    .single();

  if (existing) {
    return existing;
  }

  // Create with safe defaults — citizen role only (PRD-02: no self-escalation)
  const displayName =
    (params.user_metadata?.full_name as string) ||
    (params.user_metadata?.name as string) ||
    params.email?.split("@")[0] ||
    "User";

  const { data: created, error } = await supabase
    .from("profiles")
    .insert({
      id: params.id,
      role: "citizen",
      display_name: displayName,
    })
    .select("id, role, display_name, phone, created_at, updated_at")
    .single();

  if (error || !created) {
    throw new Error(
      `[CivicPulse] Failed to initialize user profile: ${error?.message}`
    );
  }

  return created;
}
