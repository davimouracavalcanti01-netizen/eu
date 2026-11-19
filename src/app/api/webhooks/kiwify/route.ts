import { revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { accessEmail } from "@/lib/email/templates";
import { sendEmail } from "@/lib/email/resend";
import { publicEnv, serverEnv } from "@/lib/env";
import { handleKiwifyWebhook, MAX_BODY_BYTES } from "@/lib/kiwify/handle-webhook";
import { createSupabaseWebhookRepository } from "@/lib/kiwify/supabase-repository";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Webhook da Kiwify: cadastre esta URL no painel da Kiwify
 *   https://SEU_DOMINIO/api/webhooks/kiwify
 * A Kiwify acrescenta ?signature=... (HMAC-SHA1 do corpo com o token).
 */
export async function POST(request: NextRequest) {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_BODY_BYTES) return NextResponse.json({ error: "payload muito grande" }, { status: 413 });

  const rawBody = await request.text(); // corpo CRU — necessário para validar a assinatura
  const signature = request.nextUrl.searchParams.get("signature");

  const env = serverEnv();
  const pub = publicEnv();
  const alertTo = env.ALERT_EMAIL ?? pub.NEXT_PUBLIC_SUPPORT_EMAIL;

  const result = await handleKiwifyWebhook(rawBody, signature, {
    repo: createSupabaseWebhookRepository(createAdminClient(), pub.NEXT_PUBLIC_SITE_URL),
    mailer: {
      async sendAccess(to, loginUrl, kind) {
        const email = accessEmail(kind, loginUrl, pub.NEXT_PUBLIC_SITE_URL, pub.NEXT_PUBLIC_SUPPORT_EMAIL);
        await sendEmail({ to, ...email, replyTo: pub.NEXT_PUBLIC_SUPPORT_EMAIL });
      },
      async sendAlert(subject, text) {
        await sendEmail({ to: alertTo, subject, text });
      },
    },
    revalidateStore: (slug) => revalidateTag(`store:${slug}`, { expire: 0 }),
    tokens: [env.KIWIFY_WEBHOOK_TOKEN, env.KIWIFY_WEBHOOK_TOKEN_PREVIOUS],
    now: () => new Date(),
    log: (msg, data) => console.log(msg, data ? JSON.stringify(data) : ""),
  });

  return NextResponse.json(result.body, { status: result.status });
}
