"use client";

import { useActionState, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { slugify } from "@/lib/validation/store";
import { createStore, type ActionResult } from "./actions";

export function OnboardingForm({ siteUrl }: { siteUrl: string }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(createStore, null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const errors = state && !state.ok ? state.fieldErrors ?? {} : {};
  const host = siteUrl.replace(/^https?:\/\//, "");

  return (
    <Card className="mx-auto w-full max-w-lg">
      <CardHeader>
        <div className="mb-2 grid size-12 place-items-center rounded-full bg-accent text-primary">
          <Sparkles aria-hidden />
        </div>
        <CardTitle>
          <span className="text-2xl">Vamos criar sua loja!</span>
        </CardTitle>
        <CardDescription className="text-base">Leva menos de 1 minuto. Você pode mudar tudo depois.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-5" noValidate>
          <Field id="name" label="Nome da sua loja" error={errors.name}>
            {(a11y) => (
              <Input
                {...a11y}
                name="name"
                placeholder="Ex.: Doces da Ana"
                autoComplete="organization"
                maxLength={60}
                required
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!slugTouched) setSlug(slugify(e.target.value));
                }}
              />
            )}
          </Field>

          <Field
            id="slug"
            label="Endereço da sua loja"
            error={errors.slug}
            hint={
              <>
                Seu link vai ficar assim: <strong className="break-all text-foreground">{host}/{slug || "sua-loja"}</strong>
              </>
            }
          >
            {(a11y) => (
              <div className="flex items-center rounded-lg border border-input bg-background shadow-xs focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
                <span className="pl-3 text-sm text-muted-foreground select-none">{host}/</span>
                <input
                  {...a11y}
                  name="slug"
                  className="h-11 min-w-0 flex-1 bg-transparent pr-3 text-base outline-none md:text-sm"
                  placeholder="doces-da-ana"
                  maxLength={40}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  required
                  value={slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
                  }}
                />
              </div>
            )}
          </Field>

          <Field
            id="whatsapp"
            label="WhatsApp que vai receber os pedidos"
            error={errors.whatsapp}
            hint="Com DDD. Ex.: (11) 99999-0000"
          >
            {(a11y) => (
              <Input {...a11y} name="whatsapp" type="tel" inputMode="tel" autoComplete="tel" placeholder="(11) 99999-0000" required />
            )}
          </Field>

          {state && !state.ok && !state.fieldErrors ? (
            <Alert variant="destructive">
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          ) : null}

          <Button type="submit" size="lg" className="w-full" disabled={pending}>
            {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
            Criar minha loja
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
