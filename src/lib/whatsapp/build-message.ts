import { formatBRL } from "@/lib/money";

/**
 * Monta a mensagem do pedido que vai para o WhatsApp do vendedor.
 * Função pura (sem navegador/servidor) para ser fácil de testar.
 */

export type PaymentMethod = "pix" | "dinheiro" | "cartao";
export type Fulfillment = "delivery" | "pickup";

export type OrderStore = {
  name: string;
  whatsapp: string;
  delivery_fee_cents: number;
  pix_key: string | null;
  pix_key_type: string | null;
  pickup_address: string | null;
};

export type OrderItem = { name: string; unit_price_cents: number; quantity: number };

export type OrderCustomer = {
  name: string;
  fulfillment: Fulfillment;
  address?: string;
  payment: PaymentMethod;
  change_for?: string;
  notes?: string;
};

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  pix: "Pix",
  dinheiro: "Dinheiro",
  cartao: "Cartão (na entrega/retirada)",
};

const PIX_TYPE_LABELS: Record<string, string> = {
  cpf: "CPF",
  cnpj: "CNPJ",
  email: "e-mail",
  telefone: "telefone",
  aleatoria: "chave aleatória",
};

/** Remove quebras de linha e marcações do WhatsApp (*negrito*, _itálico_...) do que o cliente digitou. */
export function cleanText(value: string | undefined, max: number, multiline = false): string {
  if (!value) return "";
  let s = value.replace(/[*_~`]/g, "");
  s = multiline ? s.replace(/\r\n?/g, "\n").replace(/\n{3,}/g, "\n\n") : s.replace(/\s+/g, " ");
  return s.trim().slice(0, max);
}

export function orderTotals(store: Pick<OrderStore, "delivery_fee_cents">, items: OrderItem[], fulfillment: Fulfillment) {
  const subtotal = items.reduce((sum, i) => sum + i.unit_price_cents * i.quantity, 0);
  const deliveryFee = fulfillment === "delivery" ? store.delivery_fee_cents : 0;
  return { subtotal, deliveryFee, total: subtotal + deliveryFee };
}

export function buildOrderMessage(
  store: OrderStore,
  items: OrderItem[],
  customer: OrderCustomer,
  options: { closedNow?: boolean } = {},
): string {
  if (items.length === 0) throw new Error("Carrinho vazio");
  const { subtotal, deliveryFee, total } = orderTotals(store, items, customer.fulfillment);
  const lines: string[] = [];

  lines.push(`*Novo pedido — ${cleanText(store.name, 60)}*`);
  if (options.closedNow) lines.push("_(pedido feito fora do horário de atendimento)_");
  lines.push("");

  lines.push("*Itens*");
  for (const item of items) {
    const qty = Math.max(1, Math.floor(item.quantity));
    lines.push(`${qty}x ${cleanText(item.name, 80)} — ${formatBRL(item.unit_price_cents * qty)}`);
  }
  lines.push("");

  if (deliveryFee > 0) {
    lines.push(`Subtotal: ${formatBRL(subtotal)}`);
    lines.push(`Taxa de entrega: ${formatBRL(deliveryFee)}`);
  }
  lines.push(`*Total: ${formatBRL(total)}*`);
  lines.push("");

  lines.push(`*Nome:* ${cleanText(customer.name, 80)}`);
  if (customer.fulfillment === "delivery") {
    lines.push(`*Entrega:* ${cleanText(customer.address, 200)}`);
  } else {
    lines.push(`*Retirada no local*${store.pickup_address ? ` (${cleanText(store.pickup_address, 200)})` : ""}`);
  }

  lines.push(`*Pagamento:* ${PAYMENT_LABELS[customer.payment]}`);
  if (customer.payment === "dinheiro" && customer.change_for?.trim()) {
    lines.push(`Troco para: ${cleanText(customer.change_for, 20)}`);
  }
  if (customer.payment === "pix" && store.pix_key) {
    const type = store.pix_key_type ? PIX_TYPE_LABELS[store.pix_key_type] ?? store.pix_key_type : null;
    lines.push(`Chave Pix${type ? ` (${type})` : ""}: ${store.pix_key}`);
  }

  const notes = cleanText(customer.notes, 500, true);
  if (notes) {
    lines.push("");
    lines.push(`*Observações:* ${notes}`);
  }

  return lines.join("\n");
}

/** Link que abre a conversa com o vendedor já com a mensagem escrita. */
export function buildWhatsappUrl(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
