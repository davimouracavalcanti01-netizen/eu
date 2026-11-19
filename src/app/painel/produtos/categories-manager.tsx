"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Check, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Category } from "@/lib/data/dashboard";
import { createCategory, deleteCategory, moveCategory, renameCategory, type ActionResult } from "../actions";

export function CategoriesManager({ categories }: { categories: Category[] }) {
  const [state, action, creating] = useActionState<ActionResult | null, FormData>(createCategory, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success(state.message);
      formRef.current?.reset();
    } else toast.error(state.message);
  }, [state]);

  return (
    <div className="space-y-4">
      <form ref={formRef} action={action} className="flex gap-2">
        <label htmlFor="new-category" className="sr-only">
          Nome da nova categoria
        </label>
        <Input id="new-category" name="name" placeholder="Ex.: Bolos, Doces, Salgados" maxLength={40} required />
        <Button type="submit" disabled={creating}>
          {creating ? <Loader2 className="animate-spin" aria-hidden /> : <Plus aria-hidden />} Adicionar
        </Button>
      </form>
      {categories.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhuma categoria ainda. Elas organizam seu cardápio em seções (ex.: &quot;Bolos&quot;, &quot;Doces&quot;).
        </p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {categories.map((c, i) => (
            <CategoryRow key={c.id} category={c} isFirst={i === 0} isLast={i === categories.length - 1} />
          ))}
        </ul>
      )}
    </div>
  );
}

function CategoryRow({ category, isFirst, isLast }: { category: Category; isFirst: boolean; isLast: boolean }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(category.name);
  const [pending, start] = useTransition();

  const run = (fn: () => Promise<ActionResult>) =>
    start(async () => {
      const res = await fn();
      if (!res.ok) toast.error(res.message);
      else if (res.message) toast.success(res.message);
    });

  if (editing) {
    return (
      <li className="flex items-center gap-2 p-2">
        <label htmlFor={`cat-${category.id}`} className="sr-only">
          Novo nome
        </label>
        <Input id={`cat-${category.id}`} value={name} onChange={(e) => setName(e.target.value)} maxLength={40} autoFocus />
        <Button
          size="icon"
          aria-label="Salvar nome"
          disabled={pending}
          onClick={() => run(async () => {
            const res = await renameCategory(category.id, name);
            if (res.ok) setEditing(false);
            return res;
          })}
        >
          <Check aria-hidden />
        </Button>
        <Button size="icon" variant="ghost" aria-label="Cancelar" onClick={() => { setName(category.name); setEditing(false); }}>
          <X aria-hidden />
        </Button>
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between gap-2 p-2 pl-3">
      <span className="truncate text-sm font-medium">{category.name}</span>
      <div className="flex shrink-0 items-center">
        <Button size="icon" variant="ghost" aria-label={`Subir ${category.name}`} disabled={pending || isFirst} onClick={() => run(() => moveCategory(category.id, "up"))}>
          <ArrowUp aria-hidden />
        </Button>
        <Button size="icon" variant="ghost" aria-label={`Descer ${category.name}`} disabled={pending || isLast} onClick={() => run(() => moveCategory(category.id, "down"))}>
          <ArrowDown aria-hidden />
        </Button>
        <Button size="icon" variant="ghost" aria-label={`Renomear ${category.name}`} onClick={() => setEditing(true)}>
          <Pencil aria-hidden />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          aria-label={`Apagar ${category.name}`}
          disabled={pending}
          onClick={() => {
            if (window.confirm(`Apagar a categoria "${category.name}"? Os produtos dela não serão apagados.`)) {
              run(() => deleteCategory(category.id));
            }
          }}
        >
          <Trash2 aria-hidden />
        </Button>
      </div>
    </li>
  );
}
