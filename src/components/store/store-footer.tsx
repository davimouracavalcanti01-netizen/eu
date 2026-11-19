import Link from "next/link";
import { site } from "@/lib/site";

/** Rodapé discreto em todas as lojas: marketing gratuito para o Pedidinho. */
export function StoreFooter() {
  return (
    <footer className="pb-28 text-center">
      <Link
        href="/?utm_source=loja&utm_medium=rodape"
        className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs text-neutral-600 hover:text-neutral-900"
      >
        Feito com <strong className="font-semibold text-neutral-800">{site.name}</strong> · crie o seu cardápio
      </Link>
    </footer>
  );
}
