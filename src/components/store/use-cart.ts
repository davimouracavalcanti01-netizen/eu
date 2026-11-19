"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export type CartLine = { productId: string; quantity: number };
export type CustomerDraft = {
  name: string;
  fulfillment: "delivery" | "pickup";
  address: string;
  payment: "pix" | "dinheiro" | "cartao";
  change_for: string;
  notes: string;
};

const MAX_QTY = 99;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // modo anônimo/sem espaço: o carrinho só não fica salvo
  }
}

/**
 * Carrinho salvo no próprio celular do cliente (nada vai para o servidor).
 * Itens que não existem mais na loja são descartados automaticamente.
 */
export function useCart(slug: string, validProductIds: Set<string>) {
  const cartKey = `pedidinho:cart:${slug}`;
  const [lines, setLines] = useState<CartLine[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const saved = read<CartLine[]>(cartKey, []);
    const clean = Array.isArray(saved)
      ? saved.filter((l) => validProductIds.has(l.productId) && Number.isInteger(l.quantity) && l.quantity > 0)
      : [];
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carrega o carrinho salvo só no navegador
    setLines(clean);
    setLoaded(true);
  }, [cartKey, validProductIds]);

  useEffect(() => {
    if (loaded) write(cartKey, lines);
  }, [cartKey, lines, loaded]);

  const setQuantity = useCallback((productId: string, quantity: number) => {
    setLines((prev) => {
      const q = Math.max(0, Math.min(MAX_QTY, Math.floor(quantity)));
      if (q === 0) return prev.filter((l) => l.productId !== productId);
      const exists = prev.some((l) => l.productId === productId);
      return exists ? prev.map((l) => (l.productId === productId ? { ...l, quantity: q } : l)) : [...prev, { productId, quantity: q }];
    });
  }, []);

  const clear = useCallback(() => setLines([]), []);
  const quantities = useMemo(() => new Map(lines.map((l) => [l.productId, l.quantity])), [lines]);
  const count = lines.reduce((s, l) => s + l.quantity, 0);

  return { lines, quantities, count, setQuantity, clear, loaded };
}

export function useCustomerDraft() {
  const key = "pedidinho:customer";
  const [draft, setDraft] = useState<CustomerDraft>({
    name: "",
    fulfillment: "delivery",
    address: "",
    payment: "pix",
    change_for: "",
    notes: "",
  });
  useEffect(() => {
    const saved = read<Partial<CustomerDraft>>(key, {});
    // eslint-disable-next-line react-hooks/set-state-in-effect -- dados salvos só existem no navegador
    setDraft((d) => ({ ...d, name: saved.name ?? "", address: saved.address ?? "" }));
  }, []);
  const remember = useCallback((d: CustomerDraft) => write(key, { name: d.name, address: d.address }), []);
  return { draft, setDraft, remember };
}
