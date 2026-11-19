import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ImageOff, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FlashToast } from "@/components/dashboard/flash-toast";
import { getMyCategories, getMyProducts, requireStore, type Product } from "@/lib/data/dashboard";
import { formatBRL } from "@/lib/money";
import { publicImageUrl } from "@/lib/storage";
import { site } from "@/lib/site";
import { CategoriesManager } from "./categories-manager";
import { ProductRowActions } from "./product-actions";

export const metadata: Metadata = { title: "Produtos" };
export const instant = false;

const FLASH: Record<string, string> = {
  criado: "Produto cadastrado! Ele já aparece na sua loja.",
  editado: "Alterações salvas!",
};

export default async function ProdutosPage({ searchParams }: PageProps<"/painel/produtos">) {
  const store = await requireStore();
  const [products, categories, params] = await Promise.all([
    getMyProducts(store.id),
    getMyCategories(store.id),
    searchParams,
  ]);
  const flash = typeof params.salvo === "string" ? FLASH[params.salvo] ?? null : null;

  const groups = [
    ...categories.map((c) => ({ id: c.id, name: c.name, items: products.filter((p) => p.category_id === c.id) })),
    { id: "outros", name: categories.length ? "Outros" : "Seus produtos", items: products.filter((p) => !p.category_id) },
  ].filter((g) => g.items.length > 0);

  return (
    <div className="space-y-6">
      <FlashToast message={flash} />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Produtos</h1>
          <p className="text-sm text-muted-foreground">
            {products.length} de {site.maxProducts} produtos
          </p>
        </div>
        {products.length < site.maxProducts ? (
          <Button asChild size="lg">
            <Link href="/painel/produtos/novo">
              <Plus aria-hidden /> Novo produto
            </Link>
          </Button>
        ) : null}
      </div>

      {products.length === 0 ? (
        <Card className="items-center py-12 text-center">
          <CardContent className="space-y-3">
            <p className="text-4xl" aria-hidden>
              🧁
            </p>
            <p className="text-lg font-semibold">Seu cardápio está vazio</p>
            <p className="text-sm text-muted-foreground">Cadastre seu primeiro produto. Leva 1 minutinho!</p>
            <Button asChild>
              <Link href="/painel/produtos/novo">
                <Plus aria-hidden /> Cadastrar produto
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        groups.map((g) => (
          <section key={g.id} aria-labelledby={`grp-${g.id}`} className="space-y-2">
            <h2 id={`grp-${g.id}`} className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
              {g.name}
            </h2>
            <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
              {g.items.map((p) => (
                <ProductRow key={p.id} product={p} />
              ))}
            </ul>
          </section>
        ))
      )}

      <Card id="categorias">
        <CardHeader>
          <CardTitle>Categorias</CardTitle>
          <CardDescription>Organize seu cardápio em seções. Use as setas para mudar a ordem.</CardDescription>
        </CardHeader>
        <CardContent>
          <CategoriesManager categories={categories} />
        </CardContent>
      </Card>
    </div>
  );
}

function ProductRow({ product }: { product: Product }) {
  const url = publicImageUrl(product.image_path);
  return (
    <li className="flex items-center gap-3 p-3">
      <div className="relative grid size-14 shrink-0 place-items-center overflow-hidden rounded-lg bg-muted text-muted-foreground">
        {url ? <Image src={url} alt="" fill sizes="56px" className="object-cover" /> : <ImageOff className="size-5" aria-hidden />}
      </div>
      <div className="min-w-0 flex-1">
        <p className={`truncate font-medium ${product.is_available ? "" : "text-muted-foreground line-through"}`}>{product.name}</p>
        <p className="text-sm text-muted-foreground tabular-nums">{formatBRL(product.price_cents)}</p>
      </div>
      <ProductRowActions id={product.id} name={product.name} isAvailable={product.is_available} />
    </li>
  );
}
