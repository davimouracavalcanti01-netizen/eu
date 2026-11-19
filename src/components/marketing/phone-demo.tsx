/**
 * Demonstração visual (só HTML/CSS, sem imagens pesadas):
 * o cardápio no celular do cliente + o pedido chegando no WhatsApp.
 */
export function PhoneDemo() {
  return (
    <div className="relative mx-auto w-full max-w-[340px]" aria-hidden>
      <div className="rounded-[2.5rem] border-[10px] border-neutral-900 bg-[#faf9f7] shadow-2xl">
        <div className="h-14 rounded-t-[1.8rem] bg-pink-600" />
        <div className="px-4 pb-5">
          <div className="-mt-7 grid size-14 place-items-center rounded-full border-4 border-white bg-pink-100 text-xl">🧁</div>
          <p className="mt-2 font-bold text-neutral-900">Doces da Ana</p>
          <p className="text-xs text-neutral-600">Brigadeiros e bolos de pote</p>
          <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
            <span className="size-1.5 rounded-full bg-emerald-500" /> Aberto agora
          </p>
          {[
            ["Brigadeiro gourmet", "R$ 3,50", "🍫", "2"],
            ["Bolo de pote de ninho", "R$ 14,00", "🍰", "1"],
            ["Palha italiana", "R$ 8,00", "🍪", ""],
          ].map(([name, price, emoji, qty]) => (
            <div key={name} className="mt-3 flex items-center gap-3 rounded-2xl border bg-white p-2.5">
              <div className="grid size-12 place-items-center rounded-xl bg-pink-50 text-2xl">{emoji}</div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-neutral-900">{name}</p>
                <p className="text-xs text-neutral-600">{price}</p>
              </div>
              {qty ? (
                <span className="rounded-lg border px-2 py-1 text-xs font-bold text-pink-700">− {qty} +</span>
              ) : (
                <span className="rounded-lg border-2 border-pink-600 px-2 py-1 text-xs font-bold text-pink-700">+ Adicionar</span>
              )}
            </div>
          ))}
          <div className="mt-4 flex items-center justify-between rounded-2xl bg-[#128C7E] px-4 py-3 text-sm font-semibold text-white">
            <span>Pedir pelo WhatsApp</span>
            <span>R$ 26,00</span>
          </div>
        </div>
      </div>
      <div className="absolute -right-4 -bottom-10 w-60 rotate-2 rounded-2xl bg-[#dcf8c6] p-3 text-[11px] leading-snug text-neutral-900 shadow-xl sm:-right-16">
        <p className="font-bold">Novo pedido — Doces da Ana</p>
        <p className="mt-1">2x Brigadeiro gourmet — R$ 7,00</p>
        <p>1x Bolo de pote de ninho — R$ 14,00</p>
        <p className="mt-1">Taxa de entrega: R$ 5,00</p>
        <p className="font-bold">Total: R$ 26,00</p>
        <p className="mt-1">Nome: Maria · Pix</p>
        <p className="mt-1 text-right text-[10px] text-neutral-700">14:32 ✓✓</p>
      </div>
    </div>
  );
}
