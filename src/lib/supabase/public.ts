import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env";

/**
 * Cliente Supabase anônimo, sem sessão e sem cookies.
 * Usado pela página pública da loja (pode ser cacheada).
 */
export function createPublicClient() {
  const env = publicEnv();
  return createSupabaseClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
