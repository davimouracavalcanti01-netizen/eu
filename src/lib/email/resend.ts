import "server-only";
import { serverEnv } from "@/lib/env";

/** Envia um e-mail pela API HTTP do Resend (https://resend.com/docs/api-reference/emails/send-email). */
export async function sendEmail(input: { to: string; subject: string; html?: string; text: string; replyTo?: string }) {
  const env = serverEnv();
  // Desenvolvimento sem Resend: RESEND_API_KEY=re_dev só mostra o e-mail no terminal.
  if (env.RESEND_API_KEY === "re_dev" && process.env.NODE_ENV !== "production") {
    console.log(`\n[e-mail de desenvolvimento] para: ${input.to}\nassunto: ${input.subject}\n${input.text}\n`);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
      reply_to: input.replyTo,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Resend respondeu ${res.status}: ${detail.slice(0, 200)}`);
  }
}
