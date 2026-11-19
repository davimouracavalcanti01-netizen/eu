import { z } from "zod";

/** Mesma lista do banco (constraint stores_slug_reserved). */
export const RESERVED_SLUGS = new Set([
  "admin", "api", "app", "auth", "entrar", "login", "logout", "sair", "painel",
  "dashboard", "termos", "privacidade", "precos", "preco", "planos", "ajuda",
  "suporte", "contato", "blog", "www", "static", "assets", "public", "loja",
  "lojas", "cadastro", "assinar", "checkout", "webhook", "webhooks", "pedidinho",
  "sobre", "faq", "favicon", "robots", "sitemap", "manifest", "conta", "config",
  "demo", "exemplo", "teste", "images", "img", "_next",
]);

/** Converte "Doces da Ana!" em "doces-da-ana". */
export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40)
    .replace(/-$/, "");
}

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "O link precisa ter pelo menos 3 letras")
  .max(40, "O link pode ter no máximo 40 letras")
  .regex(/^[a-z0-9-]+$/, "Use só letras sem acento, números e hífen (-)")
  .refine((s) => !s.startsWith("-") && !s.endsWith("-"), "O link não pode começar nem terminar com hífen")
  .refine((s) => !s.includes("--"), "Não use dois hífens seguidos")
  .refine((s) => !RESERVED_SLUGS.has(s), "Esse link é reservado. Escolha outro.");

/**
 * Normaliza um WhatsApp brasileiro para o formato do banco: 55 + DDD + número.
 * Aceita "(11) 99999-0001", "11999990001", "+55 11 99999-0001".
 * Retorna null se não for um número válido.
 */
export function normalizeWhatsapp(input: string): string | null {
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = digits.replace(/^0+/, "");
  if (digits.length === 10 || digits.length === 11) digits = `55${digits}`;
  if (!/^55[1-9][1-9][0-9]{8,9}$/.test(digits)) return null;
  return digits;
}

const optionalText = (max: number, msg: string) =>
  z
    .string()
    .trim()
    .max(max, msg)
    .transform((v) => (v === "" ? null : v))
    .nullable();

const checkbox = z
  .union([z.literal("on"), z.literal("true"), z.literal("false"), z.literal(""), z.null(), z.undefined()])
  .transform((v) => v === "on" || v === "true");

const whatsappField = z
  .string()
  .trim()
  .min(1, "Informe o WhatsApp que vai receber os pedidos")
  .transform((v, ctx) => {
    const n = normalizeWhatsapp(v);
    if (!n) {
      ctx.addIssue({ code: "custom", message: "WhatsApp inválido. Use DDD + número, ex.: (11) 99999-0000" });
      return z.NEVER;
    }
    return n;
  });

export const storeNameSchema = z
  .string()
  .trim()
  .min(2, "O nome precisa ter pelo menos 2 letras")
  .max(60, "O nome pode ter no máximo 60 letras");

export const onboardingSchema = z.object({
  name: storeNameSchema,
  slug: slugSchema,
  whatsapp: whatsappField,
});

export const PIX_KEY_TYPES = ["cpf", "cnpj", "email", "telefone", "aleatoria"] as const;
export const PIX_KEY_LABELS: Record<(typeof PIX_KEY_TYPES)[number], string> = {
  cpf: "CPF",
  cnpj: "CNPJ",
  email: "E-mail",
  telefone: "Telefone",
  aleatoria: "Chave aleatória",
};

export const COLOR_PRESETS = [
  "#E11D48", "#DB2777", "#C2410C", "#B45309", "#15803D",
  "#0F766E", "#0369A1", "#4338CA", "#7E22CE", "#3F3F46",
] as const;

export const storeSettingsSchema = z
  .object({
    name: storeNameSchema,
    slug: slugSchema,
    description: optionalText(200, "A descrição pode ter no máximo 200 letras"),
    primary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Escolha uma cor válida"),
    whatsapp: whatsappField,
    pix_key: optionalText(140, "Chave Pix muito longa"),
    pix_key_type: z
      .enum(PIX_KEY_TYPES)
      .or(z.literal("").transform(() => null))
      .nullable(),
    allows_delivery: checkbox,
    delivery_fee: z.string().trim().default(""),
    allows_pickup: checkbox,
    pickup_address: optionalText(200, "O endereço pode ter no máximo 200 letras"),
    logo_path: optionalText(300, "Logo inválido"),
  })
  .superRefine((v, ctx) => {
    if (!v.allows_delivery && !v.allows_pickup) {
      ctx.addIssue({
        code: "custom",
        path: ["allows_delivery"],
        message: "Ative entrega, retirada ou as duas",
      });
    }
    if (v.pix_key && !v.pix_key_type) {
      ctx.addIssue({ code: "custom", path: ["pix_key_type"], message: "Escolha o tipo da chave Pix" });
    }
  });

export const productSchema = z.object({
  name: z.string().trim().min(1, "Dê um nome ao produto").max(80, "O nome pode ter no máximo 80 letras"),
  description: optionalText(500, "A descrição pode ter no máximo 500 letras"),
  price: z.string().trim().min(1, "Informe o preço"),
  category_id: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .pipe(z.uuid({ error: "Categoria inválida" }).nullable()),
  is_available: checkbox,
  image_path: optionalText(300, "Foto inválida"),
});

export const categorySchema = z.object({
  name: z.string().trim().min(1, "Dê um nome à categoria").max(40, "O nome pode ter no máximo 40 letras"),
});

export const hoursSchema = z
  .array(
    z.object({
      weekday: z.number().int().min(0).max(6),
      opens_at: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Horário inválido"),
      closes_at: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Horário inválido"),
    }),
  )
  .max(21, "Máximo de 3 turnos por dia")
  .superRefine((ranges, ctx) => {
    ranges.forEach((r, i) => {
      if (r.opens_at === r.closes_at) {
        ctx.addIssue({ code: "custom", path: [i], message: "Abertura e fechamento não podem ser iguais" });
      }
    });
  });

/** Transforma a lista de erros do zod em { campo: mensagem }. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "_form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

/** "5511999990001" → "(11) 99999-0001" */
export function formatWhatsapp(stored: string | null | undefined): string {
  if (!stored) return "";
  const local = stored.startsWith("55") ? stored.slice(2) : stored;
  const ddd = local.slice(0, 2);
  const num = local.slice(2);
  if (num.length === 9) return `(${ddd}) ${num.slice(0, 5)}-${num.slice(5)}`;
  if (num.length === 8) return `(${ddd}) ${num.slice(0, 4)}-${num.slice(4)}`;
  return stored;
}
