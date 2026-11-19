/**
 * Horário de funcionamento. Tudo é calculado no fuso de São Paulo,
 * independente de onde está o servidor ou o celular do cliente.
 */
export type HourRange = { weekday: number; opens_at: string; closes_at: string };

export const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"] as const;
export const WEEKDAYS_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;
export const STORE_TIMEZONE = "America/Sao_Paulo";

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function toMinutes(hhmm: string): number {
  const m = TIME_RE.exec(hhmm);
  if (!m) throw new Error(`Horário inválido: ${hhmm}`);
  return Number(m[1]) * 60 + Number(m[2]);
}

export function isValidTime(hhmm: string): boolean {
  return TIME_RE.test(hhmm);
}

/** Dia da semana (0=domingo) e minutos desde meia-noite, no fuso da loja. */
export function zonedNow(date: Date, timeZone = STORE_TIMEZONE): { weekday: number; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  return { weekday, minutes: Number(get("hour")) * 60 + Number(get("minute")) };
}

/**
 * A loja está aberta agora?
 * - Sem nenhum horário cadastrado → considera sempre aberta.
 * - Faixas que viram a madrugada (ex.: 18:00–02:00) valem até o dia seguinte.
 */
export function isOpenAt(hours: HourRange[], date: Date, timeZone = STORE_TIMEZONE): boolean {
  if (hours.length === 0) return true;
  const { weekday, minutes } = zonedNow(date, timeZone);
  const yesterday = (weekday + 6) % 7;

  return hours.some((h) => {
    const open = toMinutes(h.opens_at);
    const close = toMinutes(h.closes_at);
    const overnight = close <= open;
    if (h.weekday === weekday) {
      return overnight ? minutes >= open : minutes >= open && minutes < close;
    }
    if (overnight && h.weekday === yesterday) {
      return minutes < close;
    }
    return false;
  });
}

/** Próxima abertura, em texto: "hoje às 14:00", "amanhã às 09:00", "quinta às 10:00". */
export function nextOpeningLabel(hours: HourRange[], date: Date, timeZone = STORE_TIMEZONE): string | null {
  if (hours.length === 0) return null;
  const { weekday, minutes } = zonedNow(date, timeZone);
  for (let offset = 0; offset < 8; offset++) {
    const day = (weekday + offset) % 7;
    const candidates = hours
      .filter((h) => h.weekday === day)
      .map((h) => toMinutes(h.opens_at))
      .filter((open) => offset > 0 || open > minutes)
      .sort((a, b) => a - b);
    if (candidates.length > 0) {
      const t = candidates[0];
      const hhmm = `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
      const dayLabel = offset === 0 ? "hoje" : offset === 1 ? "amanhã" : WEEKDAYS[day].toLowerCase();
      return `${dayLabel} às ${hhmm}`;
    }
  }
  return null;
}

/** Agrupa as faixas por dia, para exibir "Seg: 09:00–12:00, 14:00–18:00". */
export function hoursByWeekday(hours: HourRange[]): Map<number, HourRange[]> {
  const map = new Map<number, HourRange[]>();
  for (const h of [...hours].sort((a, b) => a.weekday - b.weekday || toMinutes(a.opens_at) - toMinutes(b.opens_at))) {
    map.set(h.weekday, [...(map.get(h.weekday) ?? []), h]);
  }
  return map;
}
