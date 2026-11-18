import { describe, expect, it } from "vitest";
import { normalizeWhatsapp, slugSchema, slugify } from "@/lib/validation/store";
import { loginSchema } from "@/lib/validation/auth";
import { safeNextPath } from "@/lib/auth-paths";

describe("slugify", () => {
  it("remove acentos, espaços e símbolos", () => {
    expect(slugify("Doces da Ana!")).toBe("doces-da-ana");
    expect(slugify("  Pão de Mel & Cia  ")).toBe("pao-de-mel-cia");
    expect(slugify("Bolo---de---Pote")).toBe("bolo-de-pote");
  });
  it("limita a 40 caracteres sem terminar em hífen", () => {
    const s = slugify("a".repeat(39) + " bcd");
    expect(s.length).toBeLessThanOrEqual(40);
    expect(s.endsWith("-")).toBe(false);
  });
});

describe("slugSchema", () => {
  it("aceita links válidos", () => {
    expect(slugSchema.parse("doces-da-ana")).toBe("doces-da-ana");
    expect(slugSchema.parse("Marmita123")).toBe("marmita123");
  });
  it.each(["ab", "-ana", "ana-", "a--b", "com espaço", "pão", "painel", "api", "a".repeat(41)])(
    "recusa %s",
    (value) => {
      expect(slugSchema.safeParse(value).success).toBe(false);
    },
  );
});

describe("normalizeWhatsapp", () => {
  it.each([
    ["(11) 99999-0001", "5511999990001"],
    ["11999990001", "5511999990001"],
    ["+55 11 99999-0001", "5511999990001"],
    ["(21) 3333-4444", "552133334444"],
    ["011 99999-0001", "5511999990001"],
  ])("%s → %s", (input, expected) => {
    expect(normalizeWhatsapp(input)).toBe(expected);
  });
  it.each(["", "123", "99999-0001", "(10) 99999-0001", "5511999"])("recusa %s", (input) => {
    expect(normalizeWhatsapp(input)).toBeNull();
  });
});

describe("loginSchema", () => {
  it("normaliza o e-mail", () => {
    expect(loginSchema.parse({ email: "  Ana@Email.COM " }).email).toBe("ana@email.com");
  });
  it("recusa e-mail inválido", () => {
    expect(loginSchema.safeParse({ email: "ana@" }).success).toBe(false);
    expect(loginSchema.safeParse({ email: "" }).success).toBe(false);
  });
});

describe("safeNextPath (proteção contra redirecionamento externo)", () => {
  it("aceita caminhos internos", () => {
    expect(safeNextPath("/painel/produtos")).toBe("/painel/produtos");
  });
  it.each(["https://evil.com", "//evil.com", "/\\evil.com", "", null, undefined, "painel"])(
    "bloqueia %s",
    (value) => {
      expect(safeNextPath(value)).toBe("/painel");
    },
  );
});
