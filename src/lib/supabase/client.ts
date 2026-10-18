/**
 * src/lib/supabase/client.ts
 *
 * PRD-02 :: Supabase Browser Client.
 * Browser-safe client using public anon key.
 * Never accesses or exports SUPABASE_SERVICE_ROLE_KEY.
 * All comments use Roman English or Roman Urdu.
 */

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function createClient() {
  if (browserClient) return browserClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "[CivicPulse Client] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
        "Ensure your environment variables are configured correctly."
    );
  }

  // Browser client with singleton cache
  browserClient = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
  return browserClient;
}
