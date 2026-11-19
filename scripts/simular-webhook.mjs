#!/usr/bin/env node
/**
 * Simula a Kiwify enviando um evento ASSINADO para o seu webhook.
 * Útil para testar localmente ou em produção sem fazer uma compra real.
 *
 * Uso:
 *   npm run webhook:simular -- <evento> <email> [url]
 *
 * Eventos: compra_aprovada | renovada | atrasada | cancelada | reembolsada | chargeback | pix_gerado
 * URL padrão: http://localhost:3000/api/webhooks/kiwify
 * Usa KIWIFY_WEBHOOK_TOKEN do .env.local.
 */
import { createHmac, randomUUID } from "node:crypto";

const [, , evento, email, url = "http://localhost:3000/api/webhooks/kiwify"] = process.argv;
const token = process.env.KIWIFY_WEBHOOK_TOKEN;
if (!token) {
  console.error("Defina KIWIFY_WEBHOOK_TOKEN no .env.local");
  process.exit(1);
}

const MAP = {
  compra_aprovada: { type: "order_approved", status: "paid", subStatus: "active", hasAccess: true, days: 30 },
  renovada: { type: "subscription_renewed", status: "paid", subStatus: "active", hasAccess: true, days: 60 },
  // Como na Kiwify real: o aviso de atraso traz o fim do período que não foi renovado.
  atrasada: { type: "subscription_late", status: "refused", subStatus: "waiting_payment", hasAccess: false, days: 30 },
  cancelada: { type: "subscription_canceled", status: "paid", subStatus: "canceled", hasAccess: true, days: 60 },
  reembolsada: { type: "order_refunded", status: "refunded", subStatus: "canceled", hasAccess: false, days: 0 },
  chargeback: { type: "chargeback", status: "chargedback", subStatus: "canceled", hasAccess: true, days: 60 },
  pix_gerado: { type: "pix_created", status: "waiting_payment", subStatus: "active", hasAccess: true, days: 30 },
};
const cfg = MAP[evento];
if (!cfg || !email) {
  console.error(`Uso: npm run webhook:simular -- <${Object.keys(MAP).join("|")}> <email> [url]`);
  process.exit(1);
}

const subscriptionId = `sim-${Buffer.from(email).toString("hex").slice(0, 24)}`;
const accessUntil = new Date(Date.now() + cfg.days * 86_400_000).toISOString();
const body = JSON.stringify({
  order_id: randomUUID(),
  order_status: cfg.status,
  webhook_event_type: cfg.type,
  payment_method: "credit_card",
  subscription_id: subscriptionId,
  Customer: { full_name: "Cliente Simulado", email },
  Subscription: {
    id: subscriptionId,
    status: cfg.subStatus,
    next_payment: accessUntil,
    customer_access: { has_access: cfg.hasAccess, active_period: cfg.hasAccess, access_until: accessUntil },
  },
});
const signature = createHmac("sha1", token).update(body).digest("hex");
const target = `${url}${url.includes("?") ? "&" : "?"}signature=${signature}`;

const res = await fetch(target, { method: "POST", headers: { "Content-Type": "application/json" }, body });
console.log(`${evento} → HTTP ${res.status}`, await res.text());
