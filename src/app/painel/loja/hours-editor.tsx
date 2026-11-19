"use client";

import { useState, useTransition } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { WEEKDAYS, type HourRange } from "@/lib/hours";
import { saveHours } from "../actions";

type Range = { opens_at: string; closes_at: string };

export function HoursEditor({ initial }: { initial: HourRange[] }) {
  const [days, setDays] = useState<Range[][]>(() =>
    WEEKDAYS.map((_, d) => initial.filter((h) => h.weekday === d).map(({ opens_at, closes_at }) => ({ opens_at, closes_at }))),
  );
  const [pending, start] = useTransition();

  const update = (d: number, fn: (r: Range[]) => Range[]) => setDays((prev) => prev.map((r, i) => (i === d ? fn(r) : r)));

  function save() {
    const payload = days.flatMap((ranges, weekday) => ranges.map((r) => ({ weekday, ...r })));
    start(async () => {
      const res = await saveHours(payload);
      if (res.ok) toast.success(res.message);
      else toast.error(res.message);
    });
  }

  const allEmpty = days.every((d) => d.length === 0);

  return (
    <div className="space-y-4">
      {allEmpty ? (
        <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
          Sem horários cadastrados, sua loja aparece sempre como <strong>aberta</strong>.
        </p>
      ) : null}
      <ul className="divide-y rounded-lg border">
        {WEEKDAYS.map((label, d) => {
          const ranges = days[d];
          const open = ranges.length > 0;
          return (
            <li key={label} className="space-y-2 p-3">
              <div className="flex items-center justify-between gap-3">
                <label className="flex items-center gap-3 text-sm font-medium">
                  <Switch
                    checked={open}
                    onChange={(e) => update(d, () => (e.target.checked ? [{ opens_at: "09:00", closes_at: "18:00" }] : []))}
                    aria-label={`${label}: aberto`}
                  />
                  <span className="w-16">{label}</span>
                </label>
                {!open ? <span className="text-sm text-muted-foreground">Fechado</span> : null}
              </div>
              {ranges.map((r, i) => (
                <div key={i} className="flex items-center gap-2 pl-14">
                  <input
                    type="time"
                    value={r.opens_at}
                    aria-label={`${label}: abre às`}
                    onChange={(e) => update(d, (rs) => rs.map((x, j) => (j === i ? { ...x, opens_at: e.target.value } : x)))}
                    className="h-10 rounded-lg border border-input bg-background px-2 text-base md:text-sm"
                  />
                  <span className="text-sm text-muted-foreground">até</span>
                  <input
                    type="time"
                    value={r.closes_at}
                    aria-label={`${label}: fecha às`}
                    onChange={(e) => update(d, (rs) => rs.map((x, j) => (j === i ? { ...x, closes_at: e.target.value } : x)))}
                    className="h-10 rounded-lg border border-input bg-background px-2 text-base md:text-sm"
                  />
                  {ranges.length > 1 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Remover este horário"
                      onClick={() => update(d, (rs) => rs.filter((_, j) => j !== i))}
                    >
                      <Trash2 aria-hidden />
                    </Button>
                  ) : null}
                </div>
              ))}
              {open && ranges.length < 3 ? (
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="ml-12"
                  onClick={() => update(d, (rs) => [...rs, { opens_at: "18:00", closes_at: "22:00" }])}
                >
                  <Plus aria-hidden /> Adicionar outro horário
                </Button>
              ) : null}
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-muted-foreground">
        Para horários que passam da meia-noite, é só colocar o fechamento menor que a abertura (ex.: 18:00 até 02:00).
      </p>
      <Button type="button" onClick={save} disabled={pending} className="w-full sm:w-auto">
        {pending ? <Loader2 className="animate-spin" aria-hidden /> : null} Salvar horários
      </Button>
    </div>
  );
}
