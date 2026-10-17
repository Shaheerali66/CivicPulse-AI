/**
 * src/lib/supabase/client.ts
 *
 * Supabase client for browser-side usage (public anon key only).
 * Server secrets are never used here.
 */

import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://example.supabase.co";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "example-anon-key";

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
