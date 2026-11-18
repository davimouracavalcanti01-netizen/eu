import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Sair da conta. Só aceita POST (evita logout por links/imagens maliciosos). */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/entrar", request.nextUrl.origin), { status: 303 });
}
