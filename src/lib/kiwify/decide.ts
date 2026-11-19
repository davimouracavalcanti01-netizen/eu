import { accessUntilOf, KIWIFY_EVENTS, type KiwifyPayload } from "./events";

/**
 * Regras de negócio (decididas com o dono do produto):
 * - Compra aprovada / renovação paga → ativa; vencimento = fim do período pago.
 * - Atraso → inativa NA HORA.
 * - Reembolso / chargeback → inativa NA HORA.
 * - Cancelamento → continua ativa ATÉ O FIM do período já pago.
 *   (Se o cancelamento veio de reembolso/chargeback → inativa na hora.)
 * - Demais eventos (Pix/boleto gerado, compra recusada, período grátis) → só registra.
 */
export type Decision =
  | { kind: "activate"; periodEnd: string | null }
  | { kind: "renew"; periodEnd: string | null }
  | { kind: "deactivate"; reason: string }
  | { kind: "cancel_at_period_end"; accessUntil: string }
  | { kind: "ignore"; reason: string };

export function decide(p: KiwifyPayload, now: Date): Decision {
  const periodEnd = accessUntilOf(p);

  switch (p.webhook_event_type) {
    case KIWIFY_EVENTS.ORDER_APPROVED:
      return { kind: "activate", periodEnd };

    case KIWIFY_EVENTS.SUBSCRIPTION_RENEWED:
      return { kind: "renew", periodEnd };

    case KIWIFY_EVENTS.SUBSCRIPTION_LATE:
      return { kind: "deactivate", reason: "pagamento em atraso" };

    case KIWIFY_EVENTS.ORDER_REFUNDED:
      return { kind: "deactivate", reason: "reembolso" };

    case KIWIFY_EVENTS.CHARGEBACK:
      return { kind: "deactivate", reason: "chargeback" };

    case KIWIFY_EVENTS.SUBSCRIPTION_CANCELED: {
      if (p.order_status === "refunded" || p.order_status === "chargedback") {
        return { kind: "deactivate", reason: `cancelamento por ${p.order_status === "refunded" ? "reembolso" : "chargeback"}` };
      }
      if (p.Subscription?.customer_access?.has_access === false || !periodEnd || new Date(periodEnd) <= now) {
        return { kind: "deactivate", reason: "cancelamento sem período pago restante" };
      }
      return { kind: "cancel_at_period_end", accessUntil: periodEnd };
    }

    case KIWIFY_EVENTS.ORDER_REJECTED:
      return { kind: "ignore", reason: "compra recusada: o período pago continua válido (atraso chega como subscription_late)" };

    default:
      return { kind: "ignore", reason: `evento sem ação no Pedidinho: ${p.webhook_event_type}` };
  }
}
