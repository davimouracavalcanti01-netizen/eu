import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <Logo />
      <p className="text-5xl" aria-hidden>
        🔎
      </p>
      <h1 className="text-2xl font-bold">Página não encontrada</h1>
      <p className="max-w-sm text-muted-foreground">
        Confira se o link está certinho. Se for o cardápio de uma loja, peça o link de novo para o vendedor.
      </p>
      <Button asChild>
        <Link href="/">Ir para o início</Link>
      </Button>
    </main>
  );
}
