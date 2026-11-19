import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { HourRange } from "@/lib/hours";

export type Store = {
  id: string;
  owner_id: string;
  slug: string;
  name: string;
  description: string | null;
  logo_path: string | null;
  primary_color: string;
  whatsapp: string | null;
  pix_key: string | null;
  pix_key_type: string | null;
  delivery_fee_cents: number;
  allows_delivery: boolean;
  allows_pickup: boolean;
  pickup_address: string | null;
};

export type Category = { id: string; name: string; position: number };

export type Product = {
  id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price_cents: number;
  image_path: string | null;
  is_available: boolean;
  position: number;
};

const LOAD_ERROR = "Não foi possível carregar seus dados. Atualize a página para tentar de novo.";

/** Loja do vendedor logado (RLS garante que só a própria aparece). */
export const getMyStore = cache(async (): Promise<Store | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("stores")
    .select(
      "id, owner_id, slug, name, description, logo_path, primary_color, whatsapp, pix_key, pix_key_type, delivery_fee_cents, allows_delivery, allows_pickup, pickup_address",
    )
    .maybeSingle();
  if (error) throw new Error(LOAD_ERROR);
  return data;
});

/** Exige que a loja já exista; senão manda para o cadastro inicial. */
export async function requireStore(): Promise<Store> {
  const store = await getMyStore();
  if (!store) redirect("/painel");
  return store;
}

export const getMyCategories = cache(async (storeId: string): Promise<Category[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, position")
    .eq("store_id", storeId)
    .order("position")
    .order("name");
  if (error) throw new Error(LOAD_ERROR);
  return data ?? [];
});

export const getMyProducts = cache(async (storeId: string): Promise<Product[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("id, category_id, name, description, price_cents, image_path, is_available, position")
    .eq("store_id", storeId)
    .order("position")
    .order("created_at");
  if (error) throw new Error(LOAD_ERROR);
  return data ?? [];
});

export async function getMyProduct(storeId: string, productId: string): Promise<Product | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("id, category_id, name, description, price_cents, image_path, is_available, position")
    .eq("store_id", storeId)
    .eq("id", productId)
    .maybeSingle();
  if (error) return null;
  return data;
}

export const getMyHours = cache(async (storeId: string): Promise<HourRange[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("store_hours")
    .select("weekday, opens_at, closes_at")
    .eq("store_id", storeId)
    .order("weekday")
    .order("opens_at");
  if (error) throw new Error(LOAD_ERROR);
  return (data ?? []).map((h) => ({
    weekday: h.weekday,
    opens_at: String(h.opens_at).slice(0, 5),
    closes_at: String(h.closes_at).slice(0, 5),
  }));
});

export type StatsSummary = {
  today: { visits: number; clicks: number };
  last7: { visits: number; clicks: number };
  last30: { visits: number; clicks: number };
};

/** Soma visitas e cliques em "Pedir" (hoje, 7 e 30 dias), no fuso de SP. */
export async function getMyStats(storeId: string, now: Date): Promise<StatsSummary> {
  const day = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  const today = day(now);
  const minus = (n: number) => day(new Date(now.getTime() - n * 86_400_000));

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("store_stats_daily")
    .select("day, visits, order_clicks")
    .eq("store_id", storeId)
    .gte("day", minus(29));
  if (error) throw new Error(LOAD_ERROR);

  const sum = (from: string) =>
    (data ?? [])
      .filter((r) => r.day >= from)
      .reduce((acc, r) => ({ visits: acc.visits + r.visits, clicks: acc.clicks + r.order_clicks }), {
        visits: 0,
        clicks: 0,
      });

  return { today: sum(today), last7: sum(minus(6)), last30: sum(minus(29)) };
}
