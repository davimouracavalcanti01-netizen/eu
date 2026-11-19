import "server-only";
import { z } from "zod";
import { formatIssues } from "@/lib/env";

/** Variáveis SECRETAS (só no servidor). Veja `.env.example`. */
const serverSchema = z.object({
  SUPABASE_SECRET_KEY: z.string().min(20),
  KIWIFY_WEBHOOK_TOKEN: z.string().min(16, "Use um token longo (16+ caracteres)"),
  // Opcional: token antigo, aceito durante a troca de token (ver README).
  KIWIFY_WEBHOOK_TOKEN_PREVIOUS: z.string().optional(),
  RESEND_API_KEY: z.string().startsWith("re_"),
  EMAIL_FROM: z.string().min(5),
  // Opcional: para onde vão os alertas de erro do webhook (padrão: e-mail de suporte).
  ALERT_EMAIL: z.email().optional(),
});

export type ServerEnv = z.infer<typeof serverSchema>;

let cachedServer: ServerEnv | undefined;
export function serverEnv(): ServerEnv {
  if (cachedServer) return cachedServer;
  const parsed = serverSchema.safeParse({
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
    KIWIFY_WEBHOOK_TOKEN: process.env.KIWIFY_WEBHOOK_TOKEN,
    KIWIFY_WEBHOOK_TOKEN_PREVIOUS: process.env.KIWIFY_WEBHOOK_TOKEN_PREVIOUS || undefined,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    EMAIL_FROM: process.env.EMAIL_FROM,
    ALERT_EMAIL: process.env.ALERT_EMAIL || undefined,
  });
  if (!parsed.success) {
    throw new Error(
      `Variáveis de ambiente do servidor inválidas ou ausentes (confira o .env.example):\n${formatIssues(parsed.error)}`,
    );
  }
  cachedServer = parsed.data;
  return cachedServer;
}
