"use client";

import { useActionState } from "react";
import { Loader2, MailCheck, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { sendMagicLink, type LoginState } from "./actions";

const initialState: LoginState = { status: "idle" };

export function LoginForm({ supportEmail }: { supportEmail: string }) {
  const [state, formAction, pending] = useActionState(sendMagicLink, initialState);

  if (state.status === "sent") {
    return (
      <div className="space-y-4" aria-live="polite">
        <Alert variant="success">
          <MailCheck />
          <AlertTitle>Confira seu e-mail</AlertTitle>
          <AlertDescription>
            <p>
              Se <strong>{state.email}</strong> tiver uma assinatura ativa, você vai receber um link para
              entrar em instantes. É só clicar nele, sem precisar de senha.
            </p>
          </AlertDescription>
        </Alert>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>Não chegou? Olhe a caixa de spam ou &quot;Promoções&quot;.</li>
          <li>Use o mesmo e-mail que você usou na compra.</li>
          <li>
            Ainda com problema? Fale com a gente:{" "}
            <a className="font-medium text-primary underline" href={`mailto:${supportEmail}`}>
              {supportEmail}
            </a>
          </li>
        </ul>
        <form action={formAction}>
          <input type="hidden" name="email" value={state.email} />
          <Button type="submit" variant="outline" className="w-full" disabled={pending}>
            {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
            Reenviar link
          </Button>
        </form>
      </div>
    );
  }

  const errorId = "email-error";
  return (
    <form action={formAction} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="email">Seu e-mail</Label>
        <Input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="voce@email.com"
          required
          defaultValue={state.status === "error" ? state.email : undefined}
          aria-invalid={state.status === "error" || undefined}
          aria-describedby={state.status === "error" ? errorId : undefined}
        />
      </div>

      {state.status === "error" ? (
        <Alert variant="destructive" id={errorId}>
          <AlertCircle />
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? (
          <>
            <Loader2 className="animate-spin" aria-hidden /> Enviando…
          </>
        ) : (
          "Receber link de acesso"
        )}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Use o e-mail da sua compra. Não precisa de senha.
      </p>
    </form>
  );
}
