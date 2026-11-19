const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** 1990 → "R$ 19,90" */
export function formatBRL(cents: number): string {
  return brl.format(cents / 100).replace(/ /g, " ");
}

/** "19,90" | "19.90" | "R$ 1.234,50" | "12" → centavos. Retorna null se inválido. */
export function parseBRL(input: string): number | null {
  let s = input.replace(/R\$\s?/i, "").replace(/\s/g, "").trim();
  if (!s) return null;
  if (s.includes(",")) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    s = s.replace(/\./g, "");
  }
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const cents = Math.round(Number(s) * 100);
  return Number.isFinite(cents) ? cents : null;
}

/** 1990 → "19,90" (para preencher campos de formulário) */
export function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}
