import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { site } from "@/lib/site";

// Fase 1: página inicial provisória. A landing page de vendas é feita na Fase 5.
export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      <Logo />
      <h1 className="max-w-xl text-3xl font-bold tracking-tight text-balance sm:text-4xl">{site.tagline}</h1>
      <Button asChild size="lg">
        <Link href="/entrar">Entrar no painel</Link>
      </Button>
    </main>
  );
}
