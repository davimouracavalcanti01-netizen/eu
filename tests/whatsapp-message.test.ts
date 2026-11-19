import { describe, expect, it } from "vitest";
import { buildOrderMessage, buildWhatsappUrl, cleanText, orderTotals, type OrderStore } from "@/lib/whatsapp/build-message";

const store: OrderStore = {
  name: "Doces da Ana",
  whatsapp: "5511988887777",
  delivery_fee_cents: 500,
  pix_key: "ana@example.com",
  pix_key_type: "email",
  pickup_address: "Rua das Flores, 10",
};
const items = [
  { name: "Brigadeiro gourmet", unit_price_cents: 350, quantity: 4 },
  { name: "Bolo de pote", unit_price_cents: 1200, quantity: 1 },
];

describe("buildOrderMessage", () => {
  it("entrega + Pix: itens, subtotal, taxa, total, endereço e chave Pix", () => {
    const msg = buildOrderMessage(store, items, {
      name: "Maria",
      fulfillment: "delivery",
      address: "Rua A, 123 - Centro",
      payment: "pix",
      notes: "Sem granulado",
    });
    expect(msg).toBe(
      [
        "*Novo pedido — Doces da Ana*",
        "",
        "*Itens*",
        "4x Brigadeiro gourmet — R$ 14,00",
        "1x Bolo de pote — R$ 12,00",
        "",
        "Subtotal: R$ 26,00",
        "Taxa de entrega: R$ 5,00",
        "*Total: R$ 31,00*",
        "",
        "*Nome:* Maria",
        "*Entrega:* Rua A, 123 - Centro",
        "*Pagamento:* Pix",
        "Chave Pix (e-mail): ana@example.com",
        "",
        "*Observações:* Sem granulado",
      ].join("\n"),
    );
  });

  it("retirada: sem taxa de entrega e com endereço de retirada", () => {
    const msg = buildOrderMessage(store, items, { name: "João", fulfillment: "pickup", payment: "cartao" });
    expect(msg).not.toContain("Taxa de entrega");
    expect(msg).not.toContain("Subtotal");
    expect(msg).toContain("*Total: R$ 26,00*");
    expect(msg).toContain("*Retirada no local* (Rua das Flores, 10)");
    expect(msg).toContain("*Pagamento:* Cartão (na entrega/retirada)");
    expect(msg).not.toContain("Chave Pix");
  });

  it("dinheiro com troco", () => {
    const msg = buildOrderMessage(store, items, {
      name: "Bia",
      fulfillment: "pickup",
      payment: "dinheiro",
      change_for: "R$ 50",
    });
    expect(msg).toContain("*Pagamento:* Dinheiro");
    expect(msg).toContain("Troco para: R$ 50");
  });

  it("taxa de entrega zero não mostra subtotal/taxa", () => {
    const msg = buildOrderMessage({ ...store, delivery_fee_cents: 0 }, items, {
      name: "Bia",
      fulfillment: "delivery",
      address: "Rua B",
      payment: "pix",
    });
    expect(msg).not.toContain("Taxa de entrega");
    expect(msg).toContain("*Total: R$ 26,00*");
  });

  it("Pix sem chave cadastrada não mostra linha de chave", () => {
    const msg = buildOrderMessage({ ...store, pix_key: null, pix_key_type: null }, items, {
      name: "Bia",
      fulfillment: "pickup",
      payment: "pix",
    });
    expect(msg).toContain("*Pagamento:* Pix");
    expect(msg).not.toContain("Chave Pix");
  });

  it("avisa quando o pedido é feito com a loja fechada", () => {
    const msg = buildOrderMessage(store, items, { name: "Bia", fulfillment: "pickup", payment: "pix" }, { closedNow: true });
    expect(msg.split("\n")[1]).toBe("_(pedido feito fora do horário de atendimento)_");
  });

  it("limpa marcações e quebras de linha digitadas pelo cliente", () => {
    const msg = buildOrderMessage(store, items, {
      name: "*Maria*\n_Hack_",
      fulfillment: "delivery",
      address: "Rua ~A~\n123",
      payment: "pix",
      notes: "linha 1\r\n\r\n\r\n\r\nlinha 2",
    });
    expect(msg).toContain("*Nome:* Maria Hack");
    expect(msg).toContain("*Entrega:* Rua A 123");
    expect(msg).toContain("*Observações:* linha 1\n\nlinha 2");
  });

  it("recusa carrinho vazio", () => {
    expect(() => buildOrderMessage(store, [], { name: "A", fulfillment: "pickup", payment: "pix" })).toThrow();
  });

  it("quantidade fracionada ou zero vira no mínimo 1", () => {
    const msg = buildOrderMessage(store, [{ name: "X", unit_price_cents: 100, quantity: 0 }], {
      name: "A",
      fulfillment: "pickup",
      payment: "pix",
    });
    expect(msg).toContain("1x X — R$ 1,00");
  });
});

describe("orderTotals", () => {
  it("soma itens e taxa só na entrega", () => {
    expect(orderTotals(store, items, "delivery")).toEqual({ subtotal: 2600, deliveryFee: 500, total: 3100 });
    expect(orderTotals(store, items, "pickup")).toEqual({ subtotal: 2600, deliveryFee: 0, total: 2600 });
  });
});

describe("buildWhatsappUrl", () => {
  it("gera link wa.me com a mensagem codificada (acentos, emojis e quebras de linha)", () => {
    const url = buildWhatsappUrl("+55 (11) 98888-7777", "Olá! 🎉\nTotal: R$ 10,00 & mais");
    expect(url.startsWith("https://wa.me/5511988887777?text=")).toBe(true);
    const text = new URL(url).searchParams.get("text");
    expect(text).toBe("Olá! 🎉\nTotal: R$ 10,00 & mais");
  });
});

describe("cleanText", () => {
  it("corta no tamanho máximo", () => {
    expect(cleanText("a".repeat(100), 10)).toBe("a".repeat(10));
  });
});
