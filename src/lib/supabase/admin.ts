import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env";
import { serverEnv } from "@/lib/env.server";

/**
 * Cliente Supabase com a chave SECRETA (ignora RLS).
 * ⚠️ Use SOMENTE no servidor e só onde for indispensável
 * (webhook da Kiwify, criação de usuários). Nunca exponha ao navegador.
 */
export function createAdminClient() {
  return createSupabaseClient(publicEnv().NEXT_PUBLIC_SUPABASE_URL, serverEnv().SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
