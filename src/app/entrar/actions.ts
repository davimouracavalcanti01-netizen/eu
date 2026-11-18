"use server";

import { createClient } from "@/lib/supabase/server";
import { publicEnv } from "@/lib/env";
import { loginSchema } from "@/lib/validation/auth";

export type LoginState =
  | { status: "idle" }
  | { status: "sent"; email: string }
  | { status: "error"; message: string; email?: string };

export async function sendMagicLink(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "E-mail inválido" };
  }
  const { email } = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      // Só quem comprou tem conta: o usuário é criado pelo webhook da Kiwify.
      shouldCreateUser: false,
      emailRedirectTo: `${publicEnv().NEXT_PUBLIC_SITE_URL}/auth/confirm?next=/painel`,
    },
  });

  if (error) {
    if (error.status === 429 || error.code === "over_email_send_rate_limit") {
      return {
        status: "error",
        email,
        message: "Você pediu vários links seguidos. Espere 1 minuto e tente de novo.",
      };
    }
    // E-mail sem conta: respondemos igual ao sucesso para não revelar
    // quais e-mails são clientes (a mensagem orienta a usar o e-mail da compra).
    if (error.code === "otp_disabled" || error.code === "user_not_found" || /signups not allowed/i.test(error.message)) {
      return { status: "sent", email };
    }
    console.error("[entrar] signInWithOtp falhou", { code: error.code, status: error.status });
    return {
      status: "error",
      email,
      message: "Não conseguimos enviar o link agora. Tente de novo em alguns minutos.",
    };
  }

  return { status: "sent", email };
}
