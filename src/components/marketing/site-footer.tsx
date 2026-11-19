import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { site } from "@/lib/site";

export function SiteFooter({ supportEmail }: { supportEmail: string }) {
  return (
    <footer className="border-t bg-background">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Logo />
          <p className="text-sm text-muted-foreground">{site.tagline}</p>
        </div>
        <nav aria-label="Rodapé" className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <Link href="/termos" className="text-muted-foreground hover:text-foreground">
            Termos de uso
          </Link>
          <Link href="/privacidade" className="text-muted-foreground hover:text-foreground">
            Privacidade
          </Link>
          <Link href="/entrar" className="text-muted-foreground hover:text-foreground">
            Entrar
          </Link>
          <a href={`mailto:${supportEmail}`} className="text-muted-foreground hover:text-foreground">
            {supportEmail}
          </a>
        </nav>
      </div>
      <p className="pb-8 text-center text-xs text-muted-foreground">
        © {site.name}. Pagamentos processados com segurança pela Kiwify.
      </p>
    </footer>
  );
}
