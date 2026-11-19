import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { publicEnv } from "@/lib/env";

/**
 * Cliente Supabase para Server Components, Server Actions e Route Handlers.
 * Age em nome do usuário logado — todas as consultas passam pelo RLS.
 */
export async function createClient() {
  const env = publicEnv();
  // Sessão do usuário = sempre em tempo de requisição (nunca pré-renderizado).
  // O cliente do Supabase usa Date.now() para checar a validade do token.
  await connection();
  const cookieStore = await cookies();

  return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Chamado de um Server Component (cookies são somente-leitura ali).
          // Sem problema: o proxy.ts renova a sessão a cada navegação.
        }
      },
    },
  });
}
