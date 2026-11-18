import { z } from "zod";

/** Mesma lista do banco (constraint stores_slug_reserved). */
export const RESERVED_SLUGS = new Set([
  "admin", "api", "app", "auth", "entrar", "login", "logout", "sair", "painel",
  "dashboard", "termos", "privacidade", "precos", "preco", "planos", "ajuda",
  "suporte", "contato", "blog", "www", "static", "assets", "public", "loja",
  "lojas", "cadastro", "assinar", "checkout", "webhook", "webhooks", "pedidinho",
  "sobre", "faq", "favicon", "robots", "sitemap", "manifest", "conta", "config",
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
