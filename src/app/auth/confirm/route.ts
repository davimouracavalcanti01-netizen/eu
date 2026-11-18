import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/auth-paths";

const OTP_TYPES: EmailOtpType[] = ["email", "magiclink", "signup", "invite", "recovery", "email_change"];

/**
 * Destino do link mágico enviado por e-mail.
 *
 * Formato recomendado (funciona mesmo se o e-mail for aberto em outro
 * navegador/celular): /auth/confirm?token_hash=...&type=email&next=/painel
 * Também aceita o formato PKCE padrão do Supabase: /auth/confirm?code=...
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  const supabase = await createClient();

  if (tokenHash && type && OTP_TYPES.includes(type)) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) return NextResponse.redirect(new URL(next, origin));
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, origin));
  }

  return NextResponse.redirect(new URL("/entrar?erro=link-invalido", origin));
}
