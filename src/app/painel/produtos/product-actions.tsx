"use client";

import Link from "next/link";
import { useOptimistic, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { deleteProduct, toggleProductAvailability } from "../actions";

export function ProductRowActions({ id, name, isAvailable }: { id: string; name: string; isAvailable: boolean }) {
  const [pending, startTransition] = useTransition();
  const [available, setAvailable] = useOptimistic(isAvailable);

  function toggle(next: boolean) {
    startTransition(async () => {
      setAvailable(next);
      const res = await toggleProductAvailability(id, next);
      if (res.ok) toast.success(res.message);
      else toast.error(res.message);
    });
  }

  function remove() {
    if (!window.confirm(`Apagar "${name}"? Isso não pode ser desfeito.`)) return;
    startTransition(async () => {
      const res = await deleteProduct(id);
      if (res.ok) toast.success(res.message);
      else toast.error(res.message);
    });
  }

  return (
    <div className="flex items-center gap-1">
      <label className="mr-2 flex items-center gap-2 text-xs text-muted-foreground">
        <Switch
          checked={available}
          disabled={pending}
          onChange={(e) => toggle(e.target.checked)}
          aria-label={`${name}: disponível na loja`}
        />
        <span className="hidden sm:inline">{available ? "Disponível" : "Esgotado"}</span>
      </label>
      <Button asChild variant="ghost" size="icon" aria-label={`Editar ${name}`}>
        <Link href={`/painel/produtos/${id}`}>
          <Pencil aria-hidden />
        </Link>
      </Button>
      <Button variant="ghost" size="icon" onClick={remove} disabled={pending} aria-label={`Apagar ${name}`}>
        <Trash2 aria-hidden />
      </Button>
    </div>
  );
}
