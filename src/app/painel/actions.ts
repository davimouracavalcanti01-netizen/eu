"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser, getSubscription, type CurrentUser } from "@/lib/auth";
import { getMyStore, type Store } from "@/lib/data/dashboard";
import { parseBRL } from "@/lib/money";
import { isOwnMediaPath, STORE_MEDIA_BUCKET } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import {
  categorySchema,
  fieldErrors,
  hoursSchema,
  onboardingSchema,
  productSchema,
  storeSettingsSchema,
} from "@/lib/validation/store";
import { site } from "@/lib/site";

export type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; message: string; fieldErrors?: Record<string, string> };

const GENERIC_ERROR = "Algo deu errado ao salvar. Tente de novo em instantes.";
const INACTIVE_ERROR = "Sua assinatura está inativa. Reative para voltar a editar.";

/** Cache da página pública da loja. */
function storeTag(slug: string) {
  return `store:${slug}`;
}

function refreshStore(slug: string) {
  updateTag(storeTag(slug));
  revalidatePath("/painel", "layout");
}

type Fail = { ok: false; error: string };
type ActiveUser = { ok: true; user: CurrentUser };
type ActiveStore = { ok: true; user: CurrentUser; store: Store };

/** Garante: logado + assinatura ativa (o RLS também bloqueia, isto só melhora a mensagem). */
async function requireActiveUser(): Promise<ActiveUser | Fail> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sua sessão expirou. Entre de novo." };
  const sub = await getSubscription();
  if (sub.status !== "active") return { ok: false, error: INACTIVE_ERROR };
  return { ok: true, user };
}

async function requireActiveStore(): Promise<ActiveStore | Fail> {
  const ctx = await requireActiveUser();
  if (!ctx.ok) return ctx;
  const store = await getMyStore();
  if (!store) return { ok: false, error: "Crie sua loja primeiro." };
  return { ok: true, user: ctx.user, store };
}

async function removeMedia(path: string | null | undefined, userId: string) {
  if (!path || !path.startsWith(`${userId}/`)) return;
  const supabase = await createClient();
  await supabase.storage.from(STORE_MEDIA_BUCKET).remove([path]);
}

// ---------------------------------------------------------------------------
// Loja
// ---------------------------------------------------------------------------

export async function createStore(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const ctx = await requireActiveUser();
  if (!ctx.ok) return { ok: false, message: ctx.error };

  const parsed = onboardingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, message: "Confira os campos destacados.", fieldErrors: fieldErrors(parsed.error) };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("stores").insert({ owner_id: ctx.user.id, ...parsed.data });

  if (error) {
    if (error.code === "23505") {
      if (error.message.includes("owner_id")) redirect("/painel");
      return { ok: false, message: "Esse link já está em uso.", fieldErrors: { slug: "Esse link já está em uso. Tente outro." } };
    }
    console.error("[createStore]", error.code, error.message);
    return { ok: false, message: GENERIC_ERROR };
  }

  refreshStore(parsed.data.slug);
  redirect("/painel?bem-vindo=1");
}

export async function updateStore(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const ctx = await requireActiveStore();
  if (!ctx.ok) return { ok: false, message: ctx.error };
  const { user, store } = ctx;

  const parsed = storeSettingsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, message: "Confira os campos destacados.", fieldErrors: fieldErrors(parsed.error) };
  }
  const { delivery_fee, logo_path, ...data } = parsed.data;

  let deliveryFeeCents = 0;
  if (data.allows_delivery && delivery_fee) {
    const cents = parseBRL(delivery_fee);
    if (cents === null || cents < 0 || cents > 100000) {
      return { ok: false, message: "Confira os campos destacados.", fieldErrors: { delivery_fee: "Taxa inválida. Ex.: 5,00" } };
    }
    deliveryFeeCents = cents;
  }

  if (logo_path && logo_path !== store.logo_path && !isOwnMediaPath(logo_path, user.id, "logo")) {
    return { ok: false, message: "Não foi possível usar esse logo. Envie a imagem de novo." };
  }

  const supabase = await createClient();
  const { data: updated, error } = await supabase
    .from("stores")
    .update({
      ...data,
      pix_key_type: data.pix_key ? data.pix_key_type : null,
      delivery_fee_cents: deliveryFeeCents,
      logo_path,
    })
    .eq("id", store.id)
    .select("id")
    .maybeSingle();

  if (error) {
    if (error.code === "23505") {
      return { ok: false, message: "Esse link já está em uso.", fieldErrors: { slug: "Esse link já está em uso. Tente outro." } };
    }
    console.error("[updateStore]", error.code, error.message);
    return { ok: false, message: GENERIC_ERROR };
  }
  if (!updated) return { ok: false, message: INACTIVE_ERROR };

  if (store.logo_path && store.logo_path !== logo_path) await removeMedia(store.logo_path, user.id);

  refreshStore(store.slug);
  if (data.slug !== store.slug) refreshStore(data.slug);
  return { ok: true, message: "Alterações salvas!" };
}

export async function saveHours(input: unknown): Promise<ActionResult> {
  const ctx = await requireActiveStore();
  if (!ctx.ok) return { ok: false, message: ctx.error };

  const parsed = hoursSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Horários inválidos" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("replace_store_hours", {
    p_store_id: ctx.store.id,
    p_hours: parsed.data,
  });
  if (error) {
    console.error("[saveHours]", error.code, error.message);
    return { ok: false, message: GENERIC_ERROR };
  }

  refreshStore(ctx.store.slug);
  return { ok: true, message: "Horários salvos!" };
}

// ---------------------------------------------------------------------------
// Categorias
// ---------------------------------------------------------------------------

export async function createCategory(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const ctx = await requireActiveStore();
  if (!ctx.ok) return { ok: false, message: ctx.error };

  const parsed = categorySchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { count } = await supabase
    .from("categories")
    .select("id", { count: "exact", head: true })
    .eq("store_id", ctx.store.id);
  if ((count ?? 0) >= 30) return { ok: false, message: "Limite de 30 categorias atingido." };

  const { error } = await supabase
    .from("categories")
    .insert({ store_id: ctx.store.id, name: parsed.data.name, position: count ?? 0 });
  if (error) {
    console.error("[createCategory]", error.code, error.message);
    return { ok: false, message: GENERIC_ERROR };
  }

  refreshStore(ctx.store.slug);
  return { ok: true, message: "Categoria criada!" };
}

export async function renameCategory(id: string, name: string): Promise<ActionResult> {
  const ctx = await requireActiveStore();
  if (!ctx.ok) return { ok: false, message: ctx.error };

  const parsed = categorySchema.safeParse({ name });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase
    .from("categories")
    .update({ name: parsed.data.name })
    .eq("id", id)
    .eq("store_id", ctx.store.id);
  if (error) return { ok: false, message: GENERIC_ERROR };

  refreshStore(ctx.store.slug);
  return { ok: true, message: "Categoria renomeada!" };
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  const ctx = await requireActiveStore();
  if (!ctx.ok) return { ok: false, message: ctx.error };

  const supabase = await createClient();
  const { error } = await supabase.from("categories").delete().eq("id", id).eq("store_id", ctx.store.id);
  if (error) return { ok: false, message: GENERIC_ERROR };

  refreshStore(ctx.store.slug);
  return { ok: true, message: "Categoria apagada. Os produtos dela ficaram em \"Outros\"." };
}

export async function moveCategory(id: string, direction: "up" | "down"): Promise<ActionResult> {
  const ctx = await requireActiveStore();
  if (!ctx.ok) return { ok: false, message: ctx.error };

  const supabase = await createClient();
  const { data: cats, error } = await supabase
    .from("categories")
    .select("id, position")
    .eq("store_id", ctx.store.id)
    .order("position")
    .order("name");
  if (error || !cats) return { ok: false, message: GENERIC_ERROR };

  const i = cats.findIndex((c) => c.id === id);
  const j = direction === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= cats.length) return { ok: true };

  const order = cats.map((c) => c.id);
  [order[i], order[j]] = [order[j], order[i]];
  await Promise.all(
    order.map((cid, position) =>
      supabase.from("categories").update({ position }).eq("id", cid).eq("store_id", ctx.store.id),
    ),
  );

  refreshStore(ctx.store.slug);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Produtos
// ---------------------------------------------------------------------------

export async function saveProduct(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const ctx = await requireActiveStore();
  if (!ctx.ok) return { ok: false, message: ctx.error };
  const { user, store } = ctx;

  const productId = String(formData.get("id") ?? "") || null;
  const parsed = productSchema.safeParse({
    name: formData.get("name") ?? "",
    description: formData.get("description") ?? "",
    price: formData.get("price") ?? "",
    category_id: formData.get("category_id") ?? "",
    is_available: formData.get("is_available"),
    image_path: formData.get("image_path") ?? "",
  });
  if (!parsed.success) {
    return { ok: false, message: "Confira os campos destacados.", fieldErrors: fieldErrors(parsed.error) };
  }

  const priceCents = parseBRL(parsed.data.price);
  if (priceCents === null || priceCents < 1 || priceCents > 10_000_000) {
    return { ok: false, message: "Confira os campos destacados.", fieldErrors: { price: "Preço inválido. Ex.: 12,50" } };
  }

  const supabase = await createClient();
  let previousImage: string | null = null;
  if (productId) {
    const { data: existing } = await supabase
      .from("products")
      .select("image_path")
      .eq("id", productId)
      .eq("store_id", store.id)
      .maybeSingle();
    if (!existing) return { ok: false, message: "Produto não encontrado." };
    previousImage = existing.image_path;
  }

  const imagePath = parsed.data.image_path;
  if (imagePath && imagePath !== previousImage && !isOwnMediaPath(imagePath, user.id, "products")) {
    return { ok: false, message: "Não foi possível usar essa foto. Envie a imagem de novo." };
  }

  const row = {
    name: parsed.data.name,
    description: parsed.data.description,
    price_cents: priceCents,
    category_id: parsed.data.category_id,
    is_available: parsed.data.is_available,
    image_path: imagePath,
  };

  if (productId) {
    const { error } = await supabase.from("products").update(row).eq("id", productId).eq("store_id", store.id);
    if (error) {
      console.error("[saveProduct:update]", error.code, error.message);
      return { ok: false, message: error.code === "23503" ? "Categoria inválida." : GENERIC_ERROR };
    }
    if (previousImage && previousImage !== imagePath) await removeMedia(previousImage, user.id);
  } else {
    const { count } = await supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("store_id", store.id);
    const { error } = await supabase.from("products").insert({ ...row, store_id: store.id, position: count ?? 0 });
    if (error) {
      if (error.hint === "product_limit" || /Limite de/.test(error.message)) {
        return { ok: false, message: `Você chegou ao limite de ${site.maxProducts} produtos.` };
      }
      console.error("[saveProduct:insert]", error.code, error.message);
      return { ok: false, message: error.code === "23503" ? "Categoria inválida." : GENERIC_ERROR };
    }
  }

  refreshStore(store.slug);
  redirect(`/painel/produtos?salvo=${productId ? "editado" : "criado"}`);
}

export async function toggleProductAvailability(id: string, isAvailable: boolean): Promise<ActionResult> {
  const ctx = await requireActiveStore();
  if (!ctx.ok) return { ok: false, message: ctx.error };

  const supabase = await createClient();
  const { error } = await supabase
    .from("products")
    .update({ is_available: isAvailable })
    .eq("id", id)
    .eq("store_id", ctx.store.id);
  if (error) return { ok: false, message: GENERIC_ERROR };

  refreshStore(ctx.store.slug);
  return { ok: true, message: isAvailable ? "Produto disponível na loja" : "Produto escondido da loja" };
}

export async function deleteProduct(id: string): Promise<ActionResult> {
  const ctx = await requireActiveStore();
  if (!ctx.ok) return { ok: false, message: ctx.error };

  const supabase = await createClient();
  const { data: deleted, error } = await supabase
    .from("products")
    .delete()
    .eq("id", id)
    .eq("store_id", ctx.store.id)
    .select("image_path")
    .maybeSingle();
  if (error) return { ok: false, message: GENERIC_ERROR };
  if (deleted?.image_path) await removeMedia(deleted.image_path, ctx.user.id);

  refreshStore(ctx.store.slug);
  return { ok: true, message: "Produto apagado." };
}
