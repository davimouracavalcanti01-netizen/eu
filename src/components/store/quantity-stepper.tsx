"use client";

import { Minus, Plus } from "lucide-react";

export function QuantityStepper({ name, quantity, onChange }: { name: string; quantity: number; onChange: (q: number) => void }) {
  return (
    <div className="inline-flex h-10 items-center rounded-xl border bg-white" role="group" aria-label={`Quantidade de ${name}`}>
      <button
        type="button"
        onClick={() => onChange(quantity - 1)}
        className="grid size-10 place-items-center"
        style={{ color: "var(--brand-text)" }}
        aria-label={`Diminuir ${name}`}
      >
        <Minus className="size-4" aria-hidden />
      </button>
      <span className="min-w-8 text-center font-semibold tabular-nums" aria-live="polite">
        {quantity}
      </span>
      <button
        type="button"
        onClick={() => onChange(quantity + 1)}
        disabled={quantity >= 99}
        className="grid size-10 place-items-center disabled:opacity-40"
        style={{ color: "var(--brand-text)" }}
        aria-label={`Aumentar ${name}`}
      >
        <Plus className="size-4" aria-hidden />
      </button>
    </div>
  );
}
