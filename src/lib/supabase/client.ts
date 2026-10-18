"use client";

/**
 * src/lib/supabase/client.ts
 *
 * PRD-04 :: Supabase — Browser-side client (singleton).
 * Sirf client components mein use karo.
 * 
 * SECURITY: Ye sirf ANON key use karta hai — service role key kabhi nahi.
 */

import { createBrowserClient } from "@supabase/ssr";

// Singleton pattern — ek hi instance poori app mein
let _client: ReturnType<typeof createBrowserClient> | null = null;

export function createSupabaseBrowserClient() {
  if (_client) return _client;

  _client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  return _client;
}

/** Alias for createSupabaseBrowserClient for convenience in auth pages */
export const createClient = createSupabaseBrowserClient;
