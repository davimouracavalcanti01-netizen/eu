import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createPublicClient } from "@/lib/supabase/public";

const bodySchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]{3,40}$/),
  kind: z.enum(["visit", "order_click"]),
});

const BOT_RE = /bot|crawl|spider|slurp|facebookexternalhit|whatsapp|preview|lighthouse|headless/i;

/**
 * Conta visitas e cliques em "Pedir". O navegador já evita contar a mesma
 * pessoa mais de uma vez por dia; aqui ignoramos robôs e dados inválidos.
 * Sempre responde 204 (contagem é "melhor esforço" e nunca atrapalha o cliente).
 */
export async function POST(request: NextRequest) {
  const ua = request.headers.get("user-agent") ?? "";
  if (!ua || BOT_RE.test(ua)) return new NextResponse(null, { status: 204 });

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return new NextResponse(null, { status: 204 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success || parsed.data.slug === "demo") return new NextResponse(null, { status: 204 });

  try {
    const supabase = createPublicClient();
    await supabase.rpc("track_store_event", { p_slug: parsed.data.slug, p_kind: parsed.data.kind });
  } catch (e) {
    console.error("[track]", e instanceof Error ? e.message : e);
  }
  return new NextResponse(null, { status: 204 });
}
