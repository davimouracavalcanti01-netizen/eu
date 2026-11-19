import * as React from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type FieldProps = {
  id: string;
  label: string;
  error?: string;
  hint?: React.ReactNode;
  className?: string;
  children: (a11y: { id: string; "aria-invalid"?: true; "aria-describedby"?: string }) => React.ReactNode;
};

/** Rótulo + campo + dica + erro, já ligados para leitores de tela. */
function Field({ id, label, error, hint, className, children }: FieldProps) {
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id}>{label}</Label>
      {children({ id, "aria-invalid": error ? true : undefined, "aria-describedby": describedBy })}
      {hint ? (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="text-sm font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export { Field };
