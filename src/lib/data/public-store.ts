import { cacheLife, cacheTag } from "next/cache";
import { z } from "zod";
import { createPublicClient } from "@/lib/supabase/public";
import { DEMO_STORE } from "@/lib/data/demo-store";

/** Formato devolvido pela função SQL get_public_store(). */
const hourSchema = z.object({ weekday: z.number(), opens_at: z.string(), closes_at: z.string() });
const activeStoreSchema = z.object({
  active: z.literal(true),
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  logo_path: z.string().nullable(),
  primary_color: z.string(),
  whatsapp: z.string().nullable(),
  pix_key: z.string().nullable(),
  pix_key_type: z.string().nullable(),
  delivery_fee_cents: z.number(),
  allows_delivery: z.boolean(),
  allows_pickup: z.boolean(),
  pickup_address: z.string().nullable(),
  hours: z.array(hourSchema),
  categories: z.array(z.object({ id: z.string(), name: z.string() })),
  products: z.array(
    z.object({
      id: z.string(),
      category_id: z.string().nullable(),
      name: z.string(),
      description: z.string().nullable(),
      price_cents: z.number(),
      image_path: z.string().nullable(),
    }),
  ),
});
const inactiveStoreSchema = z.object({
  active: z.literal(false),
  slug: z.string(),
  name: z.string(),
  primary_color: z.string(),
});
const publicStoreSchema = z.discriminatedUnion("active", [activeStoreSchema, inactiveStoreSchema]);

export type PublicStore = z.infer<typeof activeStoreSchema>;
export type PublicStoreResult = z.infer<typeof publicStoreSchema> | null;
export type PublicProduct = PublicStore["products"][number];

export const DEMO_SLUG = "demo";

/**
 * Dados públicos da loja, em cache (página abre muito rápido).
 * O cache é renovado na hora quando o vendedor salva algo no painel
 * (updateTag `store:<slug>`) ou quando a assinatura muda (webhook).
 */
export async function getPublicStore(slug: string): Promise<PublicStoreResult> {
  "use cache";
  cacheTag(`store:${slug}`);

  if (slug === DEMO_SLUG) {
    cacheLife("max");
    return DEMO_STORE;
  }
  if (!/^[a-z0-9-]{3,40}$/.test(slug)) {
    cacheLife("max");
    return null;
  }

  const supabase = createPublicClient();
  const { data, error } = await supabase.rpc("get_public_store", { p_slug: slug });
  if (error) throw new Error(`Falha ao carregar a loja: ${error.message}`);
  if (!data) {
    // "Não encontrada" fica pouco tempo em cache: se a loja for criada,
    // o link passa a funcionar sozinho (além da limpeza imediata pelo painel).
    cacheLife("minutes");
    return null;
  }

  const parsed = publicStoreSchema.safeParse(data);
  if (!parsed.success) throw new Error("Resposta inesperada ao carregar a loja");
  cacheLife("hours");
  return parsed.data;
}
