import { z } from "zod";

/**
 * Campos do payload usados pelo Pedidinho, conforme a documentação oficial:
 * https://docs.kiwify.com.br/api-reference/webhooks/receiving
 * https://docs.kiwify.com.br/api-reference/webhooks/subscription-events
 * Campos desconhecidos são preservados (passthrough) e gravados no log.
 */
const customerAccessSchema = z
  .object({
    has_access: z.boolean().optional(),
    active_period: z.boolean().optional(),
    access_until: z.string().nullable().optional(),
  })
  .passthrough();

const subscriptionSchema = z
  .object({
    id: z.string().optional(),
    status: z.string().optional(),
    next_payment: z.string().nullable().optional(),
    customer_access: customerAccessSchema.optional(),
  })
  .passthrough();

export const kiwifyPayloadSchema = z
  .object({
    order_id: z.string().min(1).optional(),
    order_status: z.string().optional(),
    webhook_event_type: z.string().min(1),
    subscription_id: z.string().nullable().optional(),
    Subscription: subscriptionSchema.nullable().optional(),
  })
  .passthrough();

export type KiwifyPayload = z.infer<typeof kiwifyPayloadSchema>;

/** Valores de webhook_event_type (tabela "Valores de webhook_event_type" da documentação). */
export const KIWIFY_EVENTS = {
  ORDER_APPROVED: "order_approved",
  ORDER_REJECTED: "order_rejected",
  ORDER_REFUNDED: "order_refunded",
  CHARGEBACK: "chargeback",
  BILLET_CREATED: "billet_created",
  PIX_CREATED: "pix_created",
  SUBSCRIPTION_CANCELED: "subscription_canceled",
  SUBSCRIPTION_LATE: "subscription_late",
  SUBSCRIPTION_RENEWED: "subscription_renewed",
  SUBSCRIPTION_TRIAL_STARTED: "subscription_trial_started",
  SUBSCRIPTION_TRIAL_CANCELED: "subscription_trial_canceled",
} as const;

/**
 * Chave de idempotência recomendada pela Kiwify:
 * order_id + webhook_event_type (eventos sem pedido: subscription_id + webhook_event_type).
 */
export function idempotencyKey(p: KiwifyPayload): string | null {
  const id = p.order_id ?? p.subscription_id ?? p.Subscription?.id;
  return id ? `${p.webhook_event_type}:${id}` : null;
}

export function subscriptionIdOf(p: KiwifyPayload): string | null {
  return p.subscription_id ?? p.Subscription?.id ?? null;
}

/** Fim do período pago (UTC), vindo do objeto Subscription. */
export function accessUntilOf(p: KiwifyPayload): string | null {
  const raw = p.Subscription?.customer_access?.access_until ?? p.Subscription?.next_payment ?? null;
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/**
 * E-mail do comprador.
 * ⚠️ A página de webhooks da documentação oficial omite o objeto do cliente
 * nos exemplos. Usamos `Customer.email` (formato enviado pela Kiwify nos
 * webhooks de venda) e, como alternativa, `customer.email` (formato da API
 * de vendas). Confirme com "Testar Webhook" → "Ver logs" (ver README).
 */
export function customerEmailOf(p: KiwifyPayload): string | null {
  const record = p as Record<string, unknown>;
  for (const key of ["Customer", "customer"]) {
    const obj = record[key];
    if (obj && typeof obj === "object") {
      const email = (obj as Record<string, unknown>).email;
      if (typeof email === "string") {
        const clean = email.trim().toLowerCase();
        if (z.email().safeParse(clean).success) return clean;
      }
    }
  }
  return null;
}
