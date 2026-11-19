import { decide, type Decision } from "./decide";
import { customerEmailOf, idempotencyKey, kiwifyPayloadSchema, subscriptionIdOf, type KiwifyPayload } from "./events";
import { isValidKiwifySignature } from "./signature";

/**
 * Processamento do webhook da Kiwify, independente de framework e banco
 * (as dependências são injetadas — isso permite testar cada cenário).
 */

export type SubscriptionRow = {
  user_id: string;
  email: string;
  status: "active" | "inactive";
  kiwify_subscription_id: string | null;
  current_period_end: string | null;
  access_ends_at: string | null;
};

export type SubscriptionUpsert = {
  user_id: string;
  email: string;
  status: "active" | "inactive";
  kiwify_subscription_id: string | null;
  kiwify_order_id: string | null;
  current_period_end: string | null;
  access_ends_at: string | null;
  last_event_type: string;
  last_event_at: string;
};

export type EventStatus = "received" | "processed" | "ignored" | "error" | "rejected";

export type EventLog = {
  idempotency_key: string;
  event_type: string | null;
  order_id: string | null;
  subscription_id: string | null;
  customer_email: string | null;
  signature_valid: boolean;
  status: EventStatus;
  error?: string | null;
  payload: unknown;
};

export interface WebhookRepository {
  /** Insere o evento; se a chave já existir, devolve o registro existente. */
  insertEvent(e: EventLog): Promise<{ inserted: true; id: number } | { inserted: false; id: number; status: EventStatus; receivedAt: string }>;
  updateEvent(id: number, patch: { status: EventStatus; error?: string | null; processed: boolean }): Promise<void>;
  logUnprocessable(e: EventLog): Promise<void>;
  findSubscriptionBySubscriptionId(subscriptionId: string): Promise<SubscriptionRow | null>;
  findSubscriptionByEmail(email: string): Promise<SubscriptionRow | null>;
  findUserIdByEmail(email: string): Promise<string | null>;
  createUser(email: string): Promise<string>;
  upsertSubscription(row: SubscriptionUpsert): Promise<void>;
  storeSlugOf(userId: string): Promise<string | null>;
  createLoginLink(email: string): Promise<string>;
}

export interface WebhookMailer {
  sendAccess(to: string, loginUrl: string, kind: "welcome" | "reactivated"): Promise<void>;
  sendAlert(subject: string, text: string): Promise<void>;
}

export type WebhookDeps = {
  repo: WebhookRepository;
  mailer: WebhookMailer;
  revalidateStore: (slug: string) => void;
  tokens: (string | undefined)[];
  now: () => Date;
  log?: (msg: string, data?: Record<string, unknown>) => void;
};

export type WebhookResult = { status: number; body: Record<string, unknown> };

export const MAX_BODY_BYTES = 512 * 1024;
const STALE_PROCESSING_MS = 2 * 60 * 1000;
const STALE_LATE_TOLERANCE_MS = 7 * 24 * 60 * 60 * 1000;

class UnprocessableEventError extends Error {}

export async function handleKiwifyWebhook(
  rawBody: string,
  signature: string | null,
  deps: WebhookDeps,
): Promise<WebhookResult> {
  const log = deps.log ?? (() => {});

  if (Buffer.byteLength(rawBody, "utf8") > MAX_BODY_BYTES) {
    return { status: 413, body: { error: "payload muito grande" } };
  }

  // 1) Autenticidade: assinatura HMAC-SHA1 do corpo cru com o token.
  if (!isValidKiwifySignature(rawBody, signature, deps.tokens)) {
    await deps.repo
      .logUnprocessable({
        idempotency_key: `rejected:${deps.now().toISOString()}:${Math.random().toString(36).slice(2)}`,
        event_type: null,
        order_id: null,
        subscription_id: null,
        customer_email: null,
        signature_valid: false,
        status: "rejected",
        error: signature ? "assinatura inválida" : "assinatura ausente",
        payload: null,
      })
      .catch(() => {});
    log("[kiwify] assinatura inválida");
    return { status: 401, body: { error: "assinatura inválida" } };
  }

  // 2) Formato
  let json: unknown;
  try {
    json = JSON.parse(rawBody);
  } catch {
    return { status: 400, body: { error: "JSON inválido" } };
  }
  const parsed = kiwifyPayloadSchema.safeParse(json);
  if (!parsed.success) {
    await deps.repo
      .logUnprocessable({
        idempotency_key: `invalid:${deps.now().toISOString()}:${Math.random().toString(36).slice(2)}`,
        event_type: null,
        order_id: null,
        subscription_id: null,
        customer_email: null,
        signature_valid: true,
        status: "error",
        error: "payload sem webhook_event_type",
        payload: json,
      })
      .catch(() => {});
    return { status: 400, body: { error: "payload inválido" } };
  }
  const payload = parsed.data;
  const key = idempotencyKey(payload);
  const email = customerEmailOf(payload);
  const subscriptionId = subscriptionIdOf(payload);

  const baseLog: Omit<EventLog, "status" | "idempotency_key"> = {
    event_type: payload.webhook_event_type,
    order_id: payload.order_id ?? null,
    subscription_id: subscriptionId,
    customer_email: email,
    signature_valid: true,
    payload: json,
  };

  if (!key) {
    await deps.repo.logUnprocessable({
      ...baseLog,
      idempotency_key: `nokey:${deps.now().toISOString()}:${Math.random().toString(36).slice(2)}`,
      status: "ignored",
      error: "evento sem order_id/subscription_id",
    });
    return { status: 200, body: { ok: true, ignored: true } };
  }

  // 3) Idempotência: o mesmo evento nunca é processado duas vezes.
  const inserted = await deps.repo.insertEvent({ ...baseLog, idempotency_key: key, status: "received" });
  if (!inserted.inserted) {
    if (inserted.status === "processed" || inserted.status === "ignored") {
      log("[kiwify] evento duplicado", { key });
      return { status: 200, body: { ok: true, duplicate: true } };
    }
    const age = deps.now().getTime() - new Date(inserted.receivedAt).getTime();
    if (inserted.status === "received" && age < STALE_PROCESSING_MS) {
      // Outra entrega do mesmo evento está sendo processada agora.
      return { status: 409, body: { error: "evento em processamento" } };
    }
    // Falhou antes (erro/queda): processa de novo.
  }
  const eventId = inserted.id;

  // 4) Processa
  try {
    const decision = decide(payload, deps.now());
    const outcome = await apply(decision, payload, { email, subscriptionId }, deps);
    await deps.repo.updateEvent(eventId, {
      status: outcome.ignored ? "ignored" : "processed",
      error: outcome.note ?? null,
      processed: true,
    });
    log("[kiwify] evento processado", { key, decision: decision.kind, note: outcome.note });
    return { status: 200, body: { ok: true, action: decision.kind, ignored: outcome.ignored || undefined } };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await deps.repo.updateEvent(eventId, { status: "error", error: message, processed: false }).catch(() => {});
    await deps.mailer
      .sendAlert(
        `[Pedidinho] Erro ao processar webhook ${payload.webhook_event_type}`,
        `Evento: ${key}\nE-mail: ${email ?? "(não encontrado)"}\nErro: ${message}\n\nVeja a tabela webhook_events no Supabase.`,
      )
      .catch(() => {});
    log("[kiwify] erro ao processar", { key, message });
    // Erro de dados (ex.: sem e-mail): reenviar não resolve → 200.
    // Erro temporário (banco fora do ar): 500 para a Kiwify tentar de novo.
    return err instanceof UnprocessableEventError
      ? { status: 200, body: { ok: false, error: message } }
      : { status: 500, body: { error: "erro interno" } };
  }
}

async function apply(
  decision: Decision,
  payload: KiwifyPayload,
  ids: { email: string | null; subscriptionId: string | null },
  deps: WebhookDeps,
): Promise<{ ignored: boolean; note?: string }> {
  const { repo } = deps;
  const now = deps.now();
  const nowIso = now.toISOString();

  if (decision.kind === "ignore") return { ignored: true, note: decision.reason };

  const existing =
    (ids.subscriptionId ? await repo.findSubscriptionBySubscriptionId(ids.subscriptionId) : null) ??
    (ids.email ? await repo.findSubscriptionByEmail(ids.email) : null);

  const revalidate = async (userId: string) => {
    const slug = await repo.storeSlugOf(userId);
    if (slug) deps.revalidateStore(slug);
  };

  if (decision.kind === "activate" || decision.kind === "renew") {
    let userId = existing?.user_id ?? null;
    let created = false;
    const email = ids.email ?? existing?.email ?? null;

    if (!userId) {
      if (!email) {
        throw new UnprocessableEventError("compra aprovada sem e-mail do cliente no payload (confira o campo Customer.email)");
      }
      userId = await repo.findUserIdByEmail(email);
      if (!userId) {
        userId = await repo.createUser(email);
        created = true;
      }
    }

    const wasActive = Boolean(
      existing &&
        existing.status === "active" &&
        (!existing.access_ends_at || new Date(existing.access_ends_at) > now),
    );

    await repo.upsertSubscription({
      user_id: userId,
      email: email ?? existing!.email,
      status: "active",
      kiwify_subscription_id: ids.subscriptionId ?? existing?.kiwify_subscription_id ?? null,
      kiwify_order_id: payload.order_id ?? null,
      current_period_end: latest(decision.periodEnd, existing?.current_period_end ?? null),
      access_ends_at: null,
      last_event_type: payload.webhook_event_type,
      last_event_at: nowIso,
    });
    await revalidate(userId);

    let note: string | undefined;
    if (!wasActive && email) {
      try {
        const link = await repo.createLoginLink(email);
        await deps.mailer.sendAccess(email, link, created || !existing ? "welcome" : "reactivated");
      } catch (e) {
        // A conta já está ativa; o cliente ainda consegue entrar pela tela /entrar.
        note = `assinatura ativada, mas o e-mail de acesso falhou: ${e instanceof Error ? e.message : e}`;
        await deps.mailer.sendAlert("[Pedidinho] Falha ao enviar e-mail de acesso", `${email}\n${note}`).catch(() => {});
      }
    }
    return { ignored: false, note };
  }

  if (!existing) {
    return { ignored: true, note: "assinatura não encontrada no Pedidinho" };
  }

  if (decision.kind === "deactivate") {
    // Proteção contra evento atrasado: um "atraso" antigo não derruba quem já renovou.
    const eventPeriod = payload.Subscription?.customer_access?.access_until ?? payload.Subscription?.next_payment ?? null;
    // (Só ignora se já temos um período pago mais de 7 dias além do período do aviso,
    // ou seja, uma renovação de verdade aconteceu depois desse atraso.)
    if (
      payload.webhook_event_type === "subscription_late" &&
      existing.current_period_end &&
      eventPeriod &&
      new Date(existing.current_period_end).getTime() - new Date(eventPeriod).getTime() > STALE_LATE_TOLERANCE_MS
    ) {
      return { ignored: true, note: "atraso antigo ignorado: a assinatura já foi renovada" };
    }

    await repo.upsertSubscription({
      user_id: existing.user_id,
      email: existing.email,
      status: "inactive",
      kiwify_subscription_id: existing.kiwify_subscription_id ?? ids.subscriptionId,
      kiwify_order_id: payload.order_id ?? null,
      current_period_end: existing.current_period_end,
      access_ends_at: existing.access_ends_at,
      last_event_type: payload.webhook_event_type,
      last_event_at: nowIso,
    });
    await revalidate(existing.user_id);
    return { ignored: false, note: decision.reason };
  }

  // cancel_at_period_end: continua no ar até o fim do período pago.
  await repo.upsertSubscription({
    user_id: existing.user_id,
    email: existing.email,
    status: existing.status,
    kiwify_subscription_id: existing.kiwify_subscription_id ?? ids.subscriptionId,
    kiwify_order_id: payload.order_id ?? null,
    current_period_end: latest(decision.accessUntil, existing.current_period_end),
    access_ends_at: decision.accessUntil,
    last_event_type: payload.webhook_event_type,
    last_event_at: nowIso,
  });
  await revalidate(existing.user_id);
  return { ignored: false, note: `cancelada; acesso até ${decision.accessUntil}` };
}

function latest(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return new Date(a) >= new Date(b) ? a : b;
}
