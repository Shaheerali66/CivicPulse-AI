/**
 * src/lib/supabase/server.ts
 *
 * PRD-02 :: Supabase Server Client.
 * Authenticated server-side Supabase client using cookie sessions.
 * Never leaks the session to client or exposes service role key.
 * All comments use Roman English or Roman Urdu.
 */

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database, UserRole, Tables } from "@/types/database";

import type { SupabaseClient } from "@supabase/supabase-js";

export async function createServerSupabaseClient(): Promise<SupabaseClient<Database>> {
  const cookieStore = cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "[CivicPulse Server] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  const client = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch {
          // Server component context mein set cookie ignore ho sakta hai
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: "", ...options, maxAge: 0 });
        } catch {
          // Server component context mein remove cookie ignore ho sakta hai
        }
      },
    },
  });

  return client as unknown as SupabaseClient<Database>;
}

/**
 * Verified identity helper: Reads user securely from auth.getUser()
 * Server par session verify karta hai, client claims par blindly trust nahi karta.
 */
export async function getAuthenticatedUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

/**
 * Fetches user profile including role.
 */
export async function getUserProfile(userId: string): Promise<Tables<"profiles"> | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

/**
 * Idempotent profile onboarding helper.
 * Agar user ka profile pehle se nahi hai toh safe citizen role ke saath banata hai.
 * Retries aur duplicates ko safely handle karta hai without privilege escalation.
 */
export async function ensureUserProfile(user: {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
}): Promise<Tables<"profiles">> {
  const supabase = await createServerSupabaseClient();

  // Pehle existing profile check karo
  const existing = await getUserProfile(user.id);
  if (existing) {
    return existing;
  }

  const displayName =
    (user.user_metadata?.display_name as string) ||
    (user.user_metadata?.full_name as string) ||
    (user.email ? user.email.split("@")[0] : "Citizen");

  const phone = (user.user_metadata?.phone as string) || null;

  // New accounts strictly receive 'citizen' role
  const newProfile = {
    id: user.id,
    display_name: displayName,
    role: "citizen" as UserRole,
    phone,
  };

  const { data, error } = await supabase
    .from("profiles")
    .upsert(newProfile, { onConflict: "id", ignoreDuplicates: true })
    .select("*")
    .single();

  if (error || !data) {
    // Agar upsert select fail ho, dobara read karo (race condition safety)
    const fallback = await getUserProfile(user.id);
    if (fallback) return fallback;
    throw new Error(
      `[CivicPulse Onboarding] Failed to ensure profile for user ${user.id}: ${error?.message}`
    );
  }

  return data;
}
