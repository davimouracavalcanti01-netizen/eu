import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { getMyCategories, getMyProduct, requireStore } from "@/lib/data/dashboard";
import { ProductForm } from "../product-form";

export const metadata: Metadata = { title: "Editar produto" };
export const instant = false;

export default async function EditarProdutoPage({ params }: PageProps<"/painel/produtos/[id]">) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const user = await requireUser();
  const store = await requireStore();
  const [categories, product] = await Promise.all([getMyCategories(store.id), getMyProduct(store.id, id)]);
  if (!product) notFound();

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Editar produto</h1>
      <ProductForm userId={user.id} categories={categories} product={product} />
    </div>
  );
}
