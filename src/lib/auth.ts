import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type CurrentUser = { id: string; email: string };

export type SubscriptionInfo = {
  status: "active" | "inactive";
  currentPeriodEnd: string | null;
};

/** Usuário logado (JWT verificado) ou null. Memorizado por requisição. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) return null;
  return { id: data.claims.sub, email: String(data.claims.email ?? "") };
});

/** Exige login; caso contrário manda para /entrar. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar");
  return user;
}

/** Assinatura do usuário logado (lida via RLS: só a própria). */
export const getSubscription = cache(async (): Promise<SubscriptionInfo> => {
  const user = await getCurrentUser();
  if (!user) return { status: "inactive", currentPeriodEnd: null };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("subscriptions")
    .select("status, current_period_end")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw new Error("Não foi possível carregar sua assinatura. Tente novamente.");
  if (!data) return { status: "inactive", currentPeriodEnd: null };
  return { status: data.status, currentPeriodEnd: data.current_period_end };
});

export { safeNextPath } from "@/lib/auth-paths";
