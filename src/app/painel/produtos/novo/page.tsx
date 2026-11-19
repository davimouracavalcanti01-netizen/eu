import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { getMyCategories, requireStore } from "@/lib/data/dashboard";
import { ProductForm } from "../product-form";

export const metadata: Metadata = { title: "Novo produto" };
export const instant = false;

export default async function NovoProdutoPage() {
  const user = await requireUser();
  const store = await requireStore();
  const categories = await getMyCategories(store.id);
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Novo produto</h1>
      <ProductForm userId={user.id} categories={categories} />
    </div>
  );
}
