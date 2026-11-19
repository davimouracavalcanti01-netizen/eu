"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, X } from "lucide-react";
import type { PublicProduct, PublicStore } from "@/lib/data/public-store";
import { formatBRL } from "@/lib/money";
import {
  buildOrderMessage,
  buildWhatsappUrl,
  orderTotals,
  PAYMENT_LABELS,
  type PaymentMethod,
} from "@/lib/whatsapp/build-message";
import { QuantityStepper } from "./quantity-stepper";
import { useCustomerDraft, type CustomerDraft } from "./use-cart";

type Props = {
  open: boolean;
  onClose: () => void;
  store: PublicStore;
  items: { product: PublicProduct; quantity: number }[];
  onQuantity: (productId: string, q: number) => void;
  onOrdered: () => void;
  closedNow: boolean;
};

const inputCls =
  "h-12 w-full rounded-xl border border-neutral-300 bg-white px-3 text-base text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/30 aria-invalid:border-red-600";

export function CheckoutSheet({ open, onClose, store, items, onQuantity, onOrdered, closedNow }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { draft, setDraft, remember } = useCustomerDraft();
  const [errors, setErrors] = useState<Partial<Record<keyof CustomerDraft, string>>>({});

  const canDeliver = store.allows_delivery;
  const canPickup = store.allows_pickup;
  const fulfillment: CustomerDraft["fulfillment"] = !canDeliver ? "pickup" : !canPickup ? "delivery" : draft.fulfillment;

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  useEffect(() => {
    if (open && items.length === 0) onClose();
  }, [open, items.length, onClose]);

  const totals = orderTotals(
    store,
    items.map((i) => ({ name: i.product.name, unit_price_cents: i.product.price_cents, quantity: i.quantity })),
    fulfillment,
  );

  const set = <K extends keyof CustomerDraft>(k: K, v: CustomerDraft[K]) => {
    setDraft((d) => ({ ...d, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const next: typeof errors = {};
    if (draft.name.trim().length < 2) next.name = "Digite seu nome";
    if (fulfillment === "delivery" && draft.address.trim().length < 5) next.address = "Digite o endereço completo para entrega";
    setErrors(next);
    if (Object.keys(next).length) {
      const first = Object.keys(next)[0];
      document.getElementById(`co-${first}`)?.focus();
      return;
    }
    if (!store.whatsapp) return;

    const message = buildOrderMessage(
      {
        name: store.name,
        whatsapp: store.whatsapp,
        delivery_fee_cents: store.delivery_fee_cents,
        pix_key: store.pix_key,
        pix_key_type: store.pix_key_type,
        pickup_address: store.pickup_address,
      },
      items.map((i) => ({ name: i.product.name, unit_price_cents: i.product.price_cents, quantity: i.quantity })),
      { ...draft, fulfillment },
      { closedNow },
    );
    remember(draft);
    onOrdered();
    window.location.href = buildWhatsappUrl(store.whatsapp, message);
  }

  const payments: PaymentMethod[] = ["pix", "dinheiro", "cartao"];

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
      aria-labelledby="checkout-title"
      className="m-0 mt-auto h-[92dvh] max-h-none w-full max-w-none rounded-t-3xl bg-white p-0 text-neutral-900 backdrop:bg-black/50 sm:m-auto sm:h-auto sm:max-h-[90dvh] sm:max-w-lg sm:rounded-3xl"
    >
      <form onSubmit={submit} noValidate className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 id="checkout-title" className="text-lg font-bold">
            Seu pedido
          </h2>
          <button type="button" onClick={onClose} className="grid size-10 place-items-center rounded-full hover:bg-neutral-100" aria-label="Fechar">
            <X className="size-5" aria-hidden />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-4 py-4">
          {closedNow ? (
            <p className="flex gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
              <AlertCircle className="size-5 shrink-0" aria-hidden />
              Estamos fechados agora, mas você pode enviar seu pedido. Respondemos assim que abrirmos!
            </p>
          ) : null}

          <ul className="divide-y rounded-2xl border">
            {items.map(({ product, quantity }) => (
              <li key={product.id} className="flex items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{product.name}</p>
                  <p className="text-sm text-neutral-600 tabular-nums">{formatBRL(product.price_cents * quantity)}</p>
                </div>
                <QuantityStepper name={product.name} quantity={quantity} onChange={(q) => onQuantity(product.id, q)} />
              </li>
            ))}
          </ul>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="co-name" className="text-sm font-medium">
                Seu nome
              </label>
              <input
                id="co-name"
                className={inputCls}
                autoComplete="name"
                maxLength={80}
                value={draft.name}
                onChange={(e) => set("name", e.target.value)}
                aria-invalid={errors.name ? true : undefined}
                aria-describedby={errors.name ? "co-name-err" : undefined}
              />
              {errors.name ? <p id="co-name-err" className="text-sm font-medium text-red-700">{errors.name}</p> : null}
            </div>

            {canDeliver && canPickup ? (
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">Como prefere receber?</legend>
                <div className="grid grid-cols-2 gap-2">
                  {(["delivery", "pickup"] as const).map((f) => (
                    <label
                      key={f}
                      className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 p-3 text-sm font-medium has-[:checked]:border-[var(--brand)] has-[:checked]:text-[var(--brand-text)] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[var(--brand)]/40"
                    >
                      <input type="radio" name="fulfillment" value={f} checked={fulfillment === f} onChange={() => set("fulfillment", f)} className="sr-only" />
                      {f === "delivery" ? "🛵 Entrega" : "🏠 Retirar"}
                    </label>
                  ))}
                </div>
              </fieldset>
            ) : (
              <p className="rounded-xl bg-neutral-100 p-3 text-sm">
                {fulfillment === "delivery" ? "🛵 Esta loja trabalha só com entrega." : "🏠 Esta loja trabalha só com retirada."}
              </p>
            )}

            {fulfillment === "delivery" ? (
              <div className="space-y-1.5">
                <label htmlFor="co-address" className="text-sm font-medium">
                  Endereço de entrega
                </label>
                <textarea
                  id="co-address"
                  rows={2}
                  className={`${inputCls} h-auto py-2`}
                  autoComplete="street-address"
                  placeholder="Rua, número, bairro e complemento"
                  maxLength={200}
                  value={draft.address}
                  onChange={(e) => set("address", e.target.value)}
                  aria-invalid={errors.address ? true : undefined}
                  aria-describedby={errors.address ? "co-address-err" : undefined}
                />
                {errors.address ? <p id="co-address-err" className="text-sm font-medium text-red-700">{errors.address}</p> : null}
              </div>
            ) : store.pickup_address ? (
              <p className="text-sm text-neutral-700">
                <strong>Retirada em:</strong> {store.pickup_address}
              </p>
            ) : null}

            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Forma de pagamento</legend>
              <div className="grid gap-2">
                {payments.map((p) => (
                  <label
                    key={p}
                    className="flex cursor-pointer items-center gap-3 rounded-xl border-2 p-3 text-sm font-medium has-[:checked]:border-[var(--brand)] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[var(--brand)]/40"
                  >
                    <input type="radio" name="payment" value={p} checked={draft.payment === p} onChange={() => set("payment", p)} className="size-4 accent-[var(--brand)]" />
                    {PAYMENT_LABELS[p]}
                  </label>
                ))}
              </div>
            </fieldset>

            {draft.payment === "dinheiro" ? (
              <div className="space-y-1.5">
                <label htmlFor="co-change_for" className="text-sm font-medium">
                  Troco para quanto? (opcional)
                </label>
                <input id="co-change_for" className={inputCls} inputMode="decimal" placeholder="Ex.: R$ 50" maxLength={20} value={draft.change_for} onChange={(e) => set("change_for", e.target.value)} />
              </div>
            ) : null}
            {draft.payment === "pix" && store.pix_key ? (
              <p className="rounded-xl bg-neutral-100 p-3 text-sm break-all">
                A chave Pix vai junto na mensagem: <strong>{store.pix_key}</strong>
              </p>
            ) : null}

            <div className="space-y-1.5">
              <label htmlFor="co-notes" className="text-sm font-medium">
                Observações (opcional)
              </label>
              <textarea
                id="co-notes"
                rows={2}
                className={`${inputCls} h-auto py-2`}
                placeholder="Ex.: sem granulado, entregar depois das 18h"
                maxLength={500}
                value={draft.notes}
                onChange={(e) => set("notes", e.target.value)}
              />
            </div>
          </div>

          <dl className="space-y-1 rounded-2xl bg-neutral-50 p-4 text-sm">
            <div className="flex justify-between">
              <dt>Subtotal</dt>
              <dd className="tabular-nums">{formatBRL(totals.subtotal)}</dd>
            </div>
            {fulfillment === "delivery" ? (
              <div className="flex justify-between">
                <dt>Entrega</dt>
                <dd className="tabular-nums">{totals.deliveryFee ? formatBRL(totals.deliveryFee) : "Grátis"}</dd>
              </div>
            ) : null}
            <div className="flex justify-between border-t pt-2 text-base font-bold">
              <dt>Total</dt>
              <dd className="tabular-nums">{formatBRL(totals.total)}</dd>
            </div>
          </dl>
        </div>

        <div className="border-t p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            type="submit"
            disabled={!store.whatsapp}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#128C7E] text-base font-semibold text-white shadow-lg transition hover:bg-[#0f7a6e] focus-visible:ring-4 focus-visible:ring-[#128C7E]/40 focus-visible:outline-none disabled:opacity-50"
          >
            <WhatsappIcon /> Pedir pelo WhatsApp
          </button>
          <p className="mt-2 text-center text-xs text-neutral-600">
            Vamos abrir o WhatsApp com seu pedido pronto. É só enviar!
          </p>
        </div>
      </form>
    </dialog>
  );
}

function WhatsappIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" fill="currentColor" aria-hidden>
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.9-4.45 9.9-9.91A9.85 9.85 0 0 0 12.04 2Zm5.8 14.03c-.25.69-1.44 1.32-2 1.38-.51.06-1.15.08-1.86-.12-.43-.13-.98-.32-1.69-.62-2.97-1.28-4.91-4.27-5.06-4.47-.15-.2-1.21-1.6-1.21-3.06 0-1.46.76-2.17 1.04-2.47.27-.3.6-.37.8-.37h.57c.18 0 .43-.07.67.51.25.6.84 2.06.92 2.21.07.15.12.32.02.52-.1.2-.15.32-.3.5-.15.17-.31.39-.45.52-.15.15-.3.31-.13.61.17.3.77 1.27 1.65 2.06 1.14 1.01 2.1 1.33 2.4 1.48.3.15.47.12.65-.07.17-.2.74-.87.94-1.17.2-.3.4-.25.67-.15.27.1 1.73.82 2.03.97.3.15.5.22.57.35.07.12.07.72-.17 1.41Z" />
    </svg>
  );
}
