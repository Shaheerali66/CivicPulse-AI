/**
 * src/lib/supabase/server.ts
 *
 * PRD-04 :: Supabase — Server-side client using @supabase/ssr.
 * Ye file sirf server-side use hoti hai (Route Handlers, Server Components).
 * User session cookies se automatically authenticate hoti hai.
 *
 * SECURITY: Is file ko kabhi bhi client component mein import mat karo.
 */

import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// ---------------------------------------------------------------------------
// Standard server client — reads user session from cookies
// Use in Server Components and Route Handlers for user-scoped queries.
// RLS policies will apply automatically based on the logged-in user.
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

// ---------------------------------------------------------------------------
// Admin / service-role client — bypasses RLS for privileged server operations.
// ONLY use when: creating complaints (no user session), running batch jobs,
// or performing admin-gated operations after manual permission checks.
//
// NEVER expose this client to client-side code or return raw data to users
// without applying permission filters manually.
// ---------------------------------------------------------------------------
export function createSupabaseServiceClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error(
      "[CivicPulse] SUPABASE_SERVICE_ROLE_KEY is not set. " +
        "This is required for privileged server operations."
    );
  }

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
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
