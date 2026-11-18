import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Roda antes das rotas do painel e de login:
 *  1. Renova a sessão do Supabase (cookies) quando o token está para expirar.
 *  2. Faz o redirecionamento "otimista": quem não está logado vai para /entrar.
 * A checagem definitiva de permissão acontece no servidor (lib/auth.ts) e no RLS.
 * A página pública da loja NÃO passa por aqui, para continuar rápida e cacheável.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Importante: não colocar código entre createServerClient e getClaims.
  const { data } = await supabase.auth.getClaims();
  const isLoggedIn = Boolean(data?.claims?.sub);
  const { pathname } = request.nextUrl;

  if (!isLoggedIn && pathname.startsWith("/painel")) {
    const to = request.nextUrl.clone();
    to.pathname = "/entrar";
    to.search = "";
    return redirectKeepingCookies(to, response);
  }

  if (isLoggedIn && pathname === "/entrar") {
    const to = request.nextUrl.clone();
    to.pathname = "/painel";
    to.search = "";
    return redirectKeepingCookies(to, response);
  }

  return response;
}

function redirectKeepingCookies(to: URL, from: NextResponse) {
  const redirect = NextResponse.redirect(to);
  for (const cookie of from.cookies.getAll()) redirect.cookies.set(cookie);
  return redirect;
}

export const config = {
  matcher: ["/painel/:path*", "/entrar"],
};
