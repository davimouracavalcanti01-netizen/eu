import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Store as StoreIcon } from "lucide-react";
import { StoreFooter } from "@/components/store/store-footer";
import { StoreView } from "@/components/store/store-view";
import { DEMO_SLUG, getPublicStore } from "@/lib/data/public-store";
import { publicImageUrl } from "@/lib/storage";

// Pré-gera a loja de demonstração; as demais são geradas na primeira visita e
// ficam em cache até o vendedor alterar algo.
export function generateStaticParams() {
  return [{ slug: DEMO_SLUG }];
}

export async function generateMetadata({ params }: PageProps<"/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const store = await getPublicStore(slug).catch(() => null);
  if (!store) return { title: "Loja não encontrada", robots: { index: false } };
  if (!store.active) return { title: store.name, robots: { index: false } };
  const logo = publicImageUrl(store.logo_path);
  return {
    title: { absolute: `${store.name} · Cardápio` },
    description: store.description ?? `Veja o cardápio de ${store.name} e faça seu pedido pelo WhatsApp.`,
    robots: slug === DEMO_SLUG ? { index: false } : undefined,
    openGraph: {
      title: store.name,
      description: store.description ?? "Veja o cardápio e faça seu pedido pelo WhatsApp.",
      images: logo ? [{ url: logo }] : undefined,
    },
  };
}

export default function StorePage({ params }: PageProps<"/[slug]">) {
  return (
    <Suspense fallback={<StoreSkeleton />}>
      <StoreContent params={params} />
    </Suspense>
  );
}

async function StoreContent({ params }: Pick<PageProps<"/[slug]">, "params">) {
  const { slug } = await params;
  const store = await getPublicStore(slug.toLowerCase());
  if (!store) notFound();
  if (!store.active) return <UnavailableStore name={store.name} />;
  return <StoreView store={store} />;
}

function UnavailableStore({ name }: { name: string }) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-[#faf9f7]">
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <div className="grid size-16 place-items-center rounded-full bg-neutral-200 text-neutral-600">
          <StoreIcon className="size-7" aria-hidden />
        </div>
        <h1 className="mt-4 text-2xl font-bold text-neutral-900">{name}</h1>
        <p className="mt-2 text-neutral-700">Esta loja está temporariamente indisponível.</p>
        <p className="mt-1 text-sm text-neutral-600">Tente novamente mais tarde ou fale direto com o vendedor.</p>
      </main>
      <StoreFooter />
    </div>
  );
}

function StoreSkeleton() {
  return (
    <div className="flex-1 bg-[#faf9f7]" aria-busy="true" aria-label="Carregando cardápio">
      <div className="h-20 bg-neutral-200" />
      <div className="mx-auto max-w-2xl space-y-3 px-4">
        <div className="-mt-10 size-20 rounded-full border-4 border-white bg-neutral-200" />
        <div className="h-7 w-56 animate-pulse rounded bg-neutral-200" />
        <div className="h-4 w-72 animate-pulse rounded bg-neutral-200" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded-2xl bg-neutral-200" />
        ))}
      </div>
    </div>
  );
}
