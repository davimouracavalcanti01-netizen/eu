import { z } from "zod";

/**
 * Variáveis de ambiente validadas.
 *
 * - `publicEnv`: pode ser usada no navegador (prefixo NEXT_PUBLIC_).
 *   Cada variável precisa ser lida de forma literal (process.env.NEXT_PUBLIC_X)
 *   para o Next.js conseguir embuti-la no código do navegador.
 * - `serverEnv()`: segredos. Só pode ser chamada no servidor.
 *
 * Veja `.env.example` para a explicação de cada variável.
 */

const publicSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.url().transform((u) => u.replace(/\/+$/, "")),
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(20),
  NEXT_PUBLIC_KIWIFY_CHECKOUT_URL: z.url(),
  NEXT_PUBLIC_SUPPORT_EMAIL: z.email(),
});

const serverSchema = z.object({
  SUPABASE_SECRET_KEY: z.string().min(20),
  KIWIFY_WEBHOOK_TOKEN: z.string().min(8),
  RESEND_API_KEY: z.string().startsWith("re_"),
  EMAIL_FROM: z.string().min(5),
});

export type PublicEnv = z.infer<typeof publicSchema>;
export type ServerEnv = z.infer<typeof serverSchema>;

function formatIssues(error: z.ZodError) {
  return error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
}

let cachedPublic: PublicEnv | undefined;
export function publicEnv(): PublicEnv {
  if (cachedPublic) return cachedPublic;
  const parsed = publicSchema.safeParse({
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_KIWIFY_CHECKOUT_URL: process.env.NEXT_PUBLIC_KIWIFY_CHECKOUT_URL,
    NEXT_PUBLIC_SUPPORT_EMAIL: process.env.NEXT_PUBLIC_SUPPORT_EMAIL,
  });
  if (!parsed.success) {
    throw new Error(
      `Variáveis de ambiente públicas inválidas ou ausentes (confira o .env.example):\n${formatIssues(parsed.error)}`,
    );
  }
  cachedPublic = parsed.data;
  return cachedPublic;
}

let cachedServer: ServerEnv | undefined;
export function serverEnv(): ServerEnv {
  if (typeof window !== "undefined") {
    throw new Error("serverEnv() não pode ser usada no navegador");
  }
  if (cachedServer) return cachedServer;
  const parsed = serverSchema.safeParse({
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
    KIWIFY_WEBHOOK_TOKEN: process.env.KIWIFY_WEBHOOK_TOKEN,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    EMAIL_FROM: process.env.EMAIL_FROM,
  });
  if (!parsed.success) {
    throw new Error(
      `Variáveis de ambiente do servidor inválidas ou ausentes (confira o .env.example):\n${formatIssues(parsed.error)}`,
    );
  }
  cachedServer = parsed.data;
  return cachedServer;
}
