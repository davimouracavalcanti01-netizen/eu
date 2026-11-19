"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { Field } from "@/components/ui/field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { ImageUpload } from "@/components/dashboard/image-upload";
import type { Category, Product } from "@/lib/data/dashboard";
import { centsToInput } from "@/lib/money";
import { saveProduct, type ActionResult } from "../actions";

type Props = { userId: string; categories: Category[]; product?: Product };

export function ProductForm({ userId, categories, product }: Props) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(saveProduct, null);
  const errors = state && !state.ok ? state.fieldErrors ?? {} : {};

  return (
    <form action={action} className="space-y-6" noValidate>
      {product ? <input type="hidden" name="id" value={product.id} /> : null}
      <Card>
        <CardContent className="space-y-5">
          <ImageUpload
            userId={userId}
            folder="products"
            name="image_path"
            defaultPath={product?.image_path ?? null}
            label="Foto do produto"
            hint="Pode ser foto do celular. A gente diminui o tamanho automaticamente."
          />

          <Field id="name" label="Nome" error={errors.name}>
            {(a11y) => (
              <Input {...a11y} name="name" maxLength={80} required placeholder="Ex.: Brigadeiro gourmet" defaultValue={product?.name} />
            )}
          </Field>

          <Field id="price" label="Preço (R$)" error={errors.price}>
            {(a11y) => (
              <Input
                {...a11y}
                name="price"
                inputMode="decimal"
                required
                placeholder="Ex.: 3,50"
                defaultValue={product ? centsToInput(product.price_cents) : undefined}
              />
            )}
          </Field>

          <Field
            id="description"
            label="Descrição (opcional)"
            error={errors.description}
            hint="Sabores, tamanho, quantas pessoas serve, prazo de encomenda…"
          >
            {(a11y) => (
              <Textarea {...a11y} name="description" maxLength={500} rows={3} defaultValue={product?.description ?? ""} />
            )}
          </Field>

          <Field
            id="category_id"
            label="Categoria"
            error={errors.category_id}
            hint={
              categories.length === 0 ? (
                <>
                  Você ainda não tem categorias. <Link href="/painel/produtos#categorias" className="text-primary underline">Criar categorias</Link>
                </>
              ) : undefined
            }
          >
            {(a11y) => (
              <NativeSelect {...a11y} name="category_id" defaultValue={product?.category_id ?? ""}>
                <option value="">Sem categoria (aparece em &quot;Outros&quot;)</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </NativeSelect>
            )}
          </Field>

          <label className="flex items-center justify-between gap-4 rounded-lg border p-3">
            <span>
              <span className="block text-sm font-medium">Disponível na loja</span>
              <span className="block text-xs text-muted-foreground">Desligue quando acabar. O produto some da loja, mas não é apagado.</span>
            </span>
            <Switch name="is_available" defaultChecked={product?.is_available ?? true} />
          </label>
        </CardContent>
      </Card>

      {state && !state.ok ? (
        <Alert variant="destructive">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button asChild variant="outline">
          <Link href="/painel/produtos">Cancelar</Link>
        </Button>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
          {product ? "Salvar alterações" : "Cadastrar produto"}
        </Button>
      </div>
    </form>
  );
}
