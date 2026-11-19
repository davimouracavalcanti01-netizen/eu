/** Utilitários de cor para aplicar a cor escolhida pelo vendedor com contraste acessível (WCAG). */

function hexToRgb(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

function darken(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex).map((v) => Math.max(0, Math.round(v * (1 - amount))));
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

/**
 * A partir da cor da loja, devolve:
 * - `brand`: cor de fundo de botões (escurecida se for clara demais para texto branco)
 * - `onBrand`: cor do texto sobre o botão
 * - `brandText`: cor para textos/ícones sobre fundo branco (contraste ≥ 4.5)
 */
export function brandPalette(hex: string): { brand: string; onBrand: string; brandText: string } {
  const safe = /^#[0-9a-fA-F]{6}$/.test(hex) ? hex : "#C2410C";
  let brand = safe;
  let step = 0;
  while (contrastRatio(brand, "#ffffff") < 4.5 && step < 10) {
    brand = darken(safe, (step += 1) * 0.08);
  }
  return { brand, onBrand: "#ffffff", brandText: brand };
}
