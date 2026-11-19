"use client";

import { useActionState, useEffect, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { Field } from "@/components/ui/field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageUpload } from "@/components/dashboard/image-upload";
import type { Store } from "@/lib/data/dashboard";
import { centsToInput } from "@/lib/money";
import { COLOR_PRESETS, formatWhatsapp, PIX_KEY_LABELS, PIX_KEY_TYPES } from "@/lib/validation/store";
import { cn } from "@/lib/utils";
import { updateStore, type ActionResult } from "../actions";

export function StoreForm({ store, userId, siteUrl }: { store: Store; userId: string; siteUrl: string }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(updateStore, null);
  const [color, setColor] = useState(store.primary_color.toUpperCase());
  const [slug, setSlug] = useState(store.slug);
  const [delivery, setDelivery] = useState(store.allows_delivery);
  const [pickup, setPickup] = useState(store.allows_pickup);
  const errors = state && !state.ok ? state.fieldErrors ?? {} : {};
  const host = siteUrl.replace(/^https?:\/\//, "");

  useEffect(() => {
    if (state?.ok) toast.success(state.message);
    else if (state && !state.ok) toast.error(state.message);
  }, [state]);

  return (
    <form action={action} className="space-y-6" noValidate>
      <Card>
        <CardHeader>
          <CardTitle>Identidade</CardTitle>
          <CardDescription>Como sua loja aparece para os clientes.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <ImageUpload
            userId={userId}
            folder="logo"
            name="logo_path"
            defaultPath={store.logo_path}
            label="Logo"
            hint="Uma imagem quadrada fica melhor."
            shape="circle"
          />
          <Field id="name" label="Nome da loja" error={errors.name}>
            {(a11y) => <Input {...a11y} name="name" maxLength={60} required defaultValue={store.name} />}
          </Field>
          <Field id="description" label="Frase de apresentação (opcional)" error={errors.description} hint="Ex.: Doces artesanais feitos com amor em Campinas 💕">
            {(a11y) => <Textarea {...a11y} name="description" maxLength={200} rows={2} defaultValue={store.description ?? ""} />}
          </Field>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Cor principal</legend>
            <div className="flex flex-wrap items-center gap-2">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-label={`Cor ${c}`}
                  aria-pressed={color === c}
                  className={cn(
                    "size-9 rounded-full border-2 border-white shadow ring-offset-2 transition focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
                    color === c && "ring-2 ring-foreground",
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value.toUpperCase())}
                  className="size-9 cursor-pointer rounded-full border bg-transparent"
                  aria-label="Escolher outra cor"
                />
                Outra
              </label>
            </div>
            <input type="hidden" name="primary_color" value={color} />
            {errors.primary_color ? <p className="text-sm text-destructive">{errors.primary_color}</p> : null}
          </fieldset>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Link e WhatsApp</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <Field id="slug" label="Endereço da loja" error={errors.slug} hint={<>Link: <strong className="break-all text-foreground">{host}/{slug}</strong></>}>
            {(a11y) => (
              <Input
                {...a11y}
                name="slug"
                maxLength={40}
                autoCapitalize="none"
                spellCheck={false}
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              />
            )}
          </Field>
          {slug !== store.slug ? (
            <Alert className="border-amber-300 bg-amber-50 text-amber-950">
              <AlertTriangle />
              <AlertDescription>
                Atenção: ao mudar o endereço, o link antigo e os QR Codes já impressos param de funcionar.
              </AlertDescription>
            </Alert>
          ) : null}
          <Field id="whatsapp" label="WhatsApp que recebe os pedidos" error={errors.whatsapp} hint="Com DDD. Ex.: (11) 99999-0000">
            {(a11y) => (
              <Input {...a11y} name="whatsapp" type="tel" inputMode="tel" required defaultValue={formatWhatsapp(store.whatsapp)} />
            )}
          </Field>
        </CardContent>
      </Card>

      <Card id="entrega">
        <CardHeader>
          <CardTitle>Entrega e retirada</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center justify-between gap-4 rounded-lg border p-3">
            <span className="text-sm font-medium">Faço entregas</span>
            <Switch name="allows_delivery" checked={delivery} onChange={(e) => setDelivery(e.target.checked)} />
          </label>
          {delivery ? (
            <Field id="delivery_fee" label="Taxa de entrega (R$)" error={errors.delivery_fee} hint="Deixe 0,00 para entrega grátis.">
              {(a11y) => (
                <Input {...a11y} name="delivery_fee" inputMode="decimal" defaultValue={centsToInput(store.delivery_fee_cents)} />
              )}
            </Field>
          ) : null}
          <label className="flex items-center justify-between gap-4 rounded-lg border p-3">
            <span className="text-sm font-medium">Cliente pode retirar no local</span>
            <Switch name="allows_pickup" checked={pickup} onChange={(e) => setPickup(e.target.checked)} />
          </label>
          {pickup ? (
            <Field id="pickup_address" label="Endereço para retirada (opcional)" error={errors.pickup_address} hint="Aparece para o cliente que escolher retirar.">
              {(a11y) => <Input {...a11y} name="pickup_address" maxLength={200} defaultValue={store.pickup_address ?? ""} />}
            </Field>
          ) : null}
          {errors.allows_delivery ? <p className="text-sm font-medium text-destructive">{errors.allows_delivery}</p> : null}
        </CardContent>
      </Card>

      <Card id="pagamento">
        <CardHeader>
          <CardTitle>Pix</CardTitle>
          <CardDescription>A chave aparece na mensagem do pedido para o cliente pagar.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-[180px_1fr]">
          <Field id="pix_key_type" label="Tipo da chave" error={errors.pix_key_type}>
            {(a11y) => (
              <NativeSelect {...a11y} name="pix_key_type" defaultValue={store.pix_key_type ?? ""}>
                <option value="">Selecione</option>
                {PIX_KEY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {PIX_KEY_LABELS[t]}
                  </option>
                ))}
              </NativeSelect>
            )}
          </Field>
          <Field id="pix_key" label="Chave Pix (opcional)" error={errors.pix_key}>
            {(a11y) => <Input {...a11y} name="pix_key" maxLength={140} autoCapitalize="none" defaultValue={store.pix_key ?? ""} />}
          </Field>
        </CardContent>
      </Card>

      <div className="sticky bottom-20 z-20 sm:bottom-4">
        <Button type="submit" size="lg" className="w-full shadow-lg" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
          Salvar alterações
        </Button>
      </div>
    </form>
  );
}
