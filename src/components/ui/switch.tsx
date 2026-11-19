"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type SwitchProps = Omit<React.ComponentProps<"input">, "type" | "role">;

/** Interruptor liga/desliga acessível (um checkbox com visual de switch). */
function Switch({ className, ...props }: SwitchProps) {
  return (
    <span className={cn("relative inline-flex h-6 w-11 shrink-0", className)}>
      <input
        type="checkbox"
        role="switch"
        className="peer absolute inset-0 z-10 size-full cursor-pointer appearance-none rounded-full opacity-0 disabled:cursor-not-allowed"
        {...props}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-full bg-input transition-colors peer-checked:bg-primary peer-focus-visible:ring-[3px] peer-focus-visible:ring-ring/50 peer-disabled:opacity-50"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5"
      />
    </span>
  );
}

export { Switch };
