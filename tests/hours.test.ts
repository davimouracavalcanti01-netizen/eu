import { describe, expect, it } from "vitest";
import { isOpenAt, nextOpeningLabel, type HourRange } from "@/lib/hours";

// Datas em UTC; São Paulo = UTC-3 (sem horário de verão desde 2019).
const at = (iso: string) => new Date(iso);

const comercial: HourRange[] = [
  { weekday: 1, opens_at: "09:00", closes_at: "12:00" },
  { weekday: 1, opens_at: "14:00", closes_at: "18:00" },
];
const madrugada: HourRange[] = [{ weekday: 5, opens_at: "18:00", closes_at: "02:00" }];

describe("isOpenAt", () => {
  it("sem horários cadastrados = sempre aberto", () => {
    expect(isOpenAt([], at("2026-11-16T15:00:00Z"))).toBe(true);
  });

  it("respeita o fuso de São Paulo", () => {
    // Segunda 16/11/2026 10:00 em SP = 13:00 UTC
    expect(isOpenAt(comercial, at("2026-11-16T13:00:00Z"))).toBe(true);
    // 12:30 em SP (intervalo de almoço)
    expect(isOpenAt(comercial, at("2026-11-16T15:30:00Z"))).toBe(false);
    // 18:00 em SP: já fechou (fim exclusivo)
    expect(isOpenAt(comercial, at("2026-11-16T21:00:00Z"))).toBe(false);
    // 08:59 em SP
    expect(isOpenAt(comercial, at("2026-11-16T11:59:00Z"))).toBe(false);
  });

  it("faixa que vira a madrugada", () => {
    // Sexta 20/11 23:00 SP = sábado 02:00 UTC
    expect(isOpenAt(madrugada, at("2026-11-21T02:00:00Z"))).toBe(true);
    // Sábado 01:30 SP = 04:30 UTC
    expect(isOpenAt(madrugada, at("2026-11-21T04:30:00Z"))).toBe(true);
    // Sábado 02:00 SP = 05:00 UTC → fechado
    expect(isOpenAt(madrugada, at("2026-11-21T05:00:00Z"))).toBe(false);
    // Sexta 17:00 SP
    expect(isOpenAt(madrugada, at("2026-11-20T20:00:00Z"))).toBe(false);
  });
});

describe("nextOpeningLabel", () => {
  it("abre mais tarde hoje", () => {
    // Segunda 12:30 SP
    expect(nextOpeningLabel(comercial, at("2026-11-16T15:30:00Z"))).toBe("hoje às 14:00");
  });
  it("abre em outro dia", () => {
    // Segunda 19:00 SP → próxima segunda
    expect(nextOpeningLabel(comercial, at("2026-11-16T22:00:00Z"))).toBe("segunda às 09:00");
    // Domingo 10:00 SP → amanhã
    expect(nextOpeningLabel(comercial, at("2026-11-15T13:00:00Z"))).toBe("amanhã às 09:00");
  });
});
