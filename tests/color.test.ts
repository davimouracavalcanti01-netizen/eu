import { describe, expect, it } from "vitest";
import { brandPalette, contrastRatio } from "@/lib/color";

describe("brandPalette", () => {
  it.each(["#E11D48", "#FFD700", "#FFFFFF", "#7FFFD4", "#3F3F46", "invalido"])("cor %s sempre tem contraste AA", (hex) => {
    const p = brandPalette(hex);
    expect(contrastRatio(p.brand, p.onBrand)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(p.brandText, "#ffffff")).toBeGreaterThanOrEqual(4.5);
  });
});
