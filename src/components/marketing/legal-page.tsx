import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { SiteFooter } from "@/components/marketing/site-footer";
import { publicEnv } from "@/lib/env";

/** Mostra o valor preenchido em src/lib/legal.ts ou um aviso amarelo [PREENCHER]. */
export function Fill({ value, label }: { value: string; label: string }) {
  if (value) return <>{value}</>;
  return <mark className="rounded bg-amber-200 px-1 font-semibold text-amber-950">[PREENCHER: {label}]</mark>;
}

export function LegalPage({ title, updatedAt, children }: { title: string; updatedAt: string; children: React.ReactNode }) {
  return (
    <>
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
          <Logo />
          <Link href="/" className="text-sm font-medium text-muted-foreground hover:text-foreground">
            Voltar ao início
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Última atualização: {updatedAt}</p>
        <div className="mt-8 space-y-4 text-[15px] leading-relaxed [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_li]:pl-1 [&_ul]:space-y-1.5">
          {children}
        </div>
      </main>
      <SiteFooter supportEmail={publicEnv().NEXT_PUBLIC_SUPPORT_EMAIL} />
    </>
  );
}
