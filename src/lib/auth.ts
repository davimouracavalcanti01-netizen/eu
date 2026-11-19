import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type CurrentUser = { id: string; email: string };

export type SubscriptionInfo = {
  /** Situação efetiva (já considera o fim do período pago após cancelamento). */
  status: "active" | "inactive";
  currentPeriodEnd: string | null;
  /** Preenchido se a assinatura foi cancelada: acesso vai até esta data. */
  accessEndsAt: string | null;
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
  if (!user) return { status: "inactive", currentPeriodEnd: null, accessEndsAt: null };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("subscriptions")
    .select("status, current_period_end, access_ends_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw new Error("Não foi possível carregar sua assinatura. Tente novamente.");
  if (!data) return { status: "inactive", currentPeriodEnd: null, accessEndsAt: null };
  return {
    status: effectiveStatus(data.status, data.access_ends_at, new Date()),
    currentPeriodEnd: data.current_period_end,
    accessEndsAt: data.access_ends_at,
  };
});

export { safeNextPath } from "@/lib/auth-paths";

/** Mesma regra da função SQL subscription_is_active(). */
export function effectiveStatus(
  status: string,
  accessEndsAt: string | null,
  now: Date,
): "active" | "inactive" {
  if (status !== "active") return "inactive";
  if (accessEndsAt && new Date(accessEndsAt) <= now) return "inactive";
  return "active";
}
