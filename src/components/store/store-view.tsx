"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Clock, Plus, ShoppingBag, Store as StoreIcon } from "lucide-react";
import type { PublicProduct, PublicStore } from "@/lib/data/public-store";
import { brandPalette } from "@/lib/color";
import { isOpenAt, nextOpeningLabel } from "@/lib/hours";
import { formatBRL } from "@/lib/money";
import { productImageUrl, publicImageUrl } from "@/lib/storage";
import { CheckoutSheet } from "./checkout-sheet";
import { QuantityStepper } from "./quantity-stepper";
import { StoreFooter } from "./store-footer";
import { useCart } from "./use-cart";

export type OpenState = { open: boolean; next: string | null } | null;

/** Conta 1 visita por pessoa, por loja, por dia (sem cookies). */
function trackOnce(slug: string, kind: "visit" | "order_click") {
  if (slug === "demo") return;
  const day = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  const key = `pedidinho:${kind}:${slug}:${day}`;
  try {
    if (kind === "visit" && window.localStorage.getItem(key)) return;
    window.localStorage.setItem(key, "1");
  } catch {
    // sem armazenamento: conta mesmo assim
  }
  const body = JSON.stringify({ slug, kind });
  if (!navigator.sendBeacon?.("/api/track", new Blob([body], { type: "application/json" }))) {
    fetch("/api/track", { method: "POST", body, headers: { "content-type": "application/json" }, keepalive: true }).catch(() => {});
  }
}

export function StoreView({ store }: { store: PublicStore }) {
  const palette = brandPalette(store.primary_color);
  const productIds = useMemo(() => new Set(store.products.map((p) => p.id)), [store.products]);
  const productsById = useMemo(() => new Map(store.products.map((p) => [p.id, p])), [store.products]);
  const cart = useCart(store.slug, productIds);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [openState, setOpenState] = useState<OpenState>(null);

  // Aberto/fechado é calculado no navegador (a página fica em cache no servidor).
  useEffect(() => {
    const update = () => {
      const now = new Date();
      setOpenState({ open: isOpenAt(store.hours, now), next: nextOpeningLabel(store.hours, now) });
    };
    update();
    const id = window.setInterval(update, 60_000);
    return () => window.clearInterval(id);
  }, [store.hours]);

  useEffect(() => trackOnce(store.slug, "visit"), [store.slug]);

  const sections = useMemo(() => {
    const groups = store.categories
      .map((c) => ({ id: c.id, name: c.name, items: store.products.filter((p) => p.category_id === c.id) }))
      .filter((g) => g.items.length > 0);
    const known = new Set(store.categories.map((c) => c.id));
    const others = store.products.filter((p) => !p.category_id || !known.has(p.category_id));
    if (others.length) groups.push({ id: "outros", name: groups.length ? "Outros" : "Cardápio", items: others });
    return groups;
  }, [store.categories, store.products]);

  const cartItems = cart.lines
    .map((l) => ({ product: productsById.get(l.productId), quantity: l.quantity }))
    .filter((x): x is { product: PublicProduct; quantity: number } => Boolean(x.product));
  const subtotal = cartItems.reduce((s, i) => s + i.product.price_cents * i.quantity, 0);
  const logo = publicImageUrl(store.logo_path);

  const style = {
    "--brand": palette.brand,
    "--on-brand": palette.onBrand,
    "--brand-text": palette.brandText,
  } as CSSProperties;

  return (
    <div style={style} className="flex min-h-full flex-1 flex-col bg-[#faf9f7]">
      <header className="bg-white">
        <div className="h-20 w-full" style={{ backgroundColor: palette.brand }} aria-hidden />
        <div className="mx-auto max-w-2xl px-4 pb-5">
          <div className="-mt-10 flex items-end gap-3">
            <div className="relative grid size-20 shrink-0 place-items-center overflow-hidden rounded-full border-4 border-white bg-white shadow-md">
              {logo ? (
                <Image src={logo} alt={`Logo de ${store.name}`} fill sizes="80px" className="object-cover" priority />
              ) : (
                <StoreIcon className="size-8" style={{ color: palette.brandText }} aria-hidden />
              )}
            </div>
          </div>
          <h1 className="mt-3 text-2xl leading-tight font-bold text-neutral-900">{store.name}</h1>
          {store.description ? <p className="mt-1 text-sm text-neutral-600">{store.description}</p> : null}
          <OpenBadge state={openState} hasHours={store.hours.length > 0} />
        </div>
      </header>

      {sections.length > 1 ? (
        <nav aria-label="Categorias" className="sticky top-0 z-20 border-y bg-white/95 backdrop-blur">
          <ul className="mx-auto flex max-w-2xl gap-2 overflow-x-auto px-4 py-2 [scrollbar-width:none]">
            {sections.map((s) => (
              <li key={s.id} className="shrink-0">
                <a
                  href={`#cat-${s.id}`}
                  className="inline-block rounded-full border px-3 py-1.5 text-sm font-medium text-neutral-700 hover:border-[var(--brand)] hover:text-[var(--brand-text)]"
                >
                  {s.name}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pt-4 pb-32">
        {sections.length === 0 ? (
          <div className="rounded-2xl border bg-white p-10 text-center">
            <p className="text-4xl" aria-hidden>
              🍰
            </p>
            <p className="mt-2 font-semibold text-neutral-900">Cardápio em preparação</p>
            <p className="text-sm text-neutral-600">Volte daqui a pouco para ver as novidades!</p>
          </div>
        ) : (
          sections.map((s, si) => (
            <section key={s.id} id={`cat-${s.id}`} aria-labelledby={`h-${s.id}`} className="scroll-mt-16 pt-4">
              <h2 id={`h-${s.id}`} className="mb-3 text-lg font-bold text-neutral-900">
                {s.name}
              </h2>
              <ul className="space-y-3">
                {s.items.map((p, pi) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    quantity={cart.quantities.get(p.id) ?? 0}
                    onChange={(q) => cart.setQuantity(p.id, q)}
                    priority={si === 0 && pi < 2}
                  />
                ))}
              </ul>
            </section>
          ))
        )}
      </main>

      <StoreFooter />

      {cart.count > 0 ? (
        <div className="fixed inset-x-0 bottom-0 z-30 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={() => setCheckoutOpen(true)}
            className="mx-auto flex h-14 w-full max-w-2xl items-center justify-between rounded-2xl px-5 text-base font-semibold shadow-xl transition active:scale-[0.99]"
            style={{ backgroundColor: palette.brand, color: palette.onBrand }}
          >
            <span className="flex items-center gap-2">
              <span className="relative">
                <ShoppingBag className="size-5" aria-hidden />
                <span className="absolute -top-2 -right-2 grid size-5 place-items-center rounded-full bg-white text-xs font-bold" style={{ color: palette.brandText }}>
                  {cart.count}
                </span>
              </span>
              Ver pedido
            </span>
            <span className="tabular-nums">{formatBRL(subtotal)}</span>
          </button>
        </div>
      ) : null}

      <CheckoutSheet
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        store={store}
        items={cartItems}
        onQuantity={cart.setQuantity}
        onOrdered={() => trackOnce(store.slug, "order_click")}
        closedNow={openState ? !openState.open : false}
      />
    </div>
  );
}

function OpenBadge({ state, hasHours }: { state: OpenState; hasHours: boolean }) {
  if (!hasHours) return null;
  if (!state) return <div className="mt-3 h-7 w-40 animate-pulse rounded-full bg-neutral-100" aria-hidden />;
  return state.open ? (
    <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-800">
      <span className="size-2 rounded-full bg-emerald-500" aria-hidden /> Aberto agora
    </p>
  ) : (
    <p className="mt-3 inline-flex flex-wrap items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1 text-sm font-medium text-neutral-800">
      <Clock className="size-4" aria-hidden /> Fechado agora
      {state.next ? <span className="font-normal text-neutral-600">· abre {state.next}</span> : null}
    </p>
  );
}

function ProductCard({
  product,
  quantity,
  onChange,
  priority,
}: {
  product: PublicProduct;
  quantity: number;
  onChange: (q: number) => void;
  priority: boolean;
}) {
  const img = productImageUrl(product.image_path);
  return (
    <li className="flex gap-3 rounded-2xl border bg-white p-3 shadow-xs">
      <div className="min-w-0 flex-1">
        <h3 className="font-semibold text-neutral-900">{product.name}</h3>
        {product.description ? <p className="mt-0.5 line-clamp-3 text-sm text-neutral-600">{product.description}</p> : null}
        <p className="mt-2 font-semibold text-neutral-900 tabular-nums">{formatBRL(product.price_cents)}</p>
        <div className="mt-2">
          {quantity === 0 ? (
            <button
              type="button"
              onClick={() => onChange(1)}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl border-2 px-4 text-sm font-semibold transition"
              style={{ borderColor: "var(--brand)", color: "var(--brand-text)" }}
              aria-label={`Adicionar ${product.name}`}
            >
              <Plus className="size-4" aria-hidden /> Adicionar
            </button>
          ) : (
            <QuantityStepper name={product.name} quantity={quantity} onChange={onChange} />
          )}
        </div>
      </div>
      {img ? (
        <div className="relative size-28 shrink-0 overflow-hidden rounded-xl bg-neutral-100">
          <Image src={img} alt={product.name} fill sizes="112px" className="object-cover" priority={priority} />
        </div>
      ) : null}
    </li>
  );
}
