import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { EventLog, SubscriptionRow, SubscriptionUpsert, WebhookRepository } from "./handle-webhook";

const SUB_COLUMNS = "user_id, email, status, kiwify_subscription_id, current_period_end, access_ends_at";

/** Implementação real do repositório do webhook, usando a chave secreta (service role). */
export function createSupabaseWebhookRepository(admin: SupabaseClient, siteUrl: string): WebhookRepository {
  const fail = (what: string, error: { message: string } | null) => {
    if (error) throw new Error(`${what}: ${error.message}`);
  };

  return {
    async insertEvent(e: EventLog) {
      const { data, error } = await admin.from("webhook_events").insert(e).select("id").single();
      if (!error) return { inserted: true, id: data.id as number };
      if (error.code !== "23505") throw new Error(`gravar evento: ${error.message}`);
      const { data: existing, error: e2 } = await admin
        .from("webhook_events")
        .select("id, status, received_at")
        .eq("idempotency_key", e.idempotency_key)
        .single();
      fail("ler evento existente", e2);
      return { inserted: false, id: existing!.id, status: existing!.status, receivedAt: existing!.received_at };
    },

    async updateEvent(id, patch) {
      const { error } = await admin
        .from("webhook_events")
        .update({ status: patch.status, error: patch.error ?? null, processed_at: patch.processed ? new Date().toISOString() : null })
        .eq("id", id);
      fail("atualizar evento", error);
    },

    async logUnprocessable(e) {
      await admin.from("webhook_events").insert(e);
    },

    async findSubscriptionBySubscriptionId(subscriptionId) {
      const { data, error } = await admin
        .from("subscriptions")
        .select(SUB_COLUMNS)
        .eq("kiwify_subscription_id", subscriptionId)
        .maybeSingle();
      fail("buscar assinatura", error);
      return data as SubscriptionRow | null;
    },

    async findSubscriptionByEmail(email) {
      const { data, error } = await admin.from("subscriptions").select(SUB_COLUMNS).eq("email", email).maybeSingle();
      fail("buscar assinatura por e-mail", error);
      return data as SubscriptionRow | null;
    },

    async findUserIdByEmail(email) {
      const { data, error } = await admin.rpc("get_user_id_by_email", { p_email: email });
      fail("buscar usuário", error);
      return (data as string | null) ?? null;
    },

    async createUser(email) {
      const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: true });
      if (error) {
        // Corrida: outra entrega criou o usuário ao mesmo tempo.
        const { data: id } = await admin.rpc("get_user_id_by_email", { p_email: email });
        if (id) return id as string;
        throw new Error(`criar usuário: ${error.message}`);
      }
      return data.user.id;
    },

    async upsertSubscription(row: SubscriptionUpsert) {
      const { error } = await admin.from("subscriptions").upsert(row, { onConflict: "user_id" });
      fail("salvar assinatura", error);
    },

    async storeSlugOf(userId) {
      const { data } = await admin.from("stores").select("slug").eq("owner_id", userId).maybeSingle();
      return data?.slug ?? null;
    },

    async createLoginLink(email) {
      const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
      fail("gerar link de acesso", error);
      const token = data?.properties?.hashed_token;
      if (!token) throw new Error("gerar link de acesso: resposta sem token");
      return `${siteUrl}/auth/confirm?token_hash=${encodeURIComponent(token)}&type=magiclink&next=/painel`;
    },
  };
}
