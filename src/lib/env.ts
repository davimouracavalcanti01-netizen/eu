import { z } from "zod";

/**
 * Variáveis de ambiente validadas.
 *
 * - `publicEnv`: pode ser usada no navegador (prefixo NEXT_PUBLIC_).
 *   Cada variável precisa ser lida de forma literal (process.env.NEXT_PUBLIC_X)
 *   para o Next.js conseguir embuti-la no código do navegador.
 * Segredos ficam em `env.server.ts` (nunca vão para o navegador).
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

export type PublicEnv = z.infer<typeof publicSchema>;

export function formatIssues(error: z.ZodError) {
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
