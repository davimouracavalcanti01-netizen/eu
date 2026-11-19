import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { CheckCircle2, Circle, ExternalLink, Eye, MousePointerClick } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyButton } from "@/components/dashboard/copy-button";
import { FlashToast } from "@/components/dashboard/flash-toast";
import { getMyHours, getMyProducts, getMyStats, getMyStore, type StatsSummary } from "@/lib/data/dashboard";
import { publicEnv } from "@/lib/env";
import { OnboardingForm } from "./onboarding-form";

export const metadata: Metadata = { title: "Painel" };
export const instant = false;

export default async function PainelPage({ searchParams }: PageProps<"/painel">) {
  const store = await getMyStore();
  const env = publicEnv();
  if (!store) return <OnboardingForm siteUrl={env.NEXT_PUBLIC_SITE_URL} />;

  await connection();
  const [stats, products, hours, params] = await Promise.all([
    getMyStats(store.id, new Date()),
    getMyProducts(store.id),
    getMyHours(store.id),
    searchParams,
  ]);
  const storeUrl = `${env.NEXT_PUBLIC_SITE_URL}/${store.slug}`;

  const steps = [
    { done: true, label: "Criar sua loja", href: "/painel/loja" },
    { done: products.length > 0, label: "Cadastrar o primeiro produto", href: "/painel/produtos/novo" },
    { done: Boolean(store.logo_path), label: "Colocar seu logo e escolher a cor", href: "/painel/loja" },
    { done: hours.length > 0, label: "Informar o horário de funcionamento", href: "/painel/loja#horarios" },
    { done: Boolean(store.pix_key), label: "Cadastrar sua chave Pix", href: "/painel/loja#pagamento" },
  ];
  const pending = steps.filter((s) => !s.done).length;

  return (
    <div className="space-y-6">
      <FlashToast message={params["bem-vindo"] ? "Sua loja foi criada! 🎉" : null} />
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{store.name}</h1>
        <p className="text-sm text-muted-foreground">Acompanhe sua loja e compartilhe seu link.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Seu link</CardTitle>
          <CardDescription>Mande para seus clientes ou coloque na bio do Instagram.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="rounded-lg bg-muted px-3 py-2 font-mono text-sm break-all">{storeUrl}</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <CopyButton text={storeUrl} className="sm:flex-1" />
            <Button asChild variant="outline" className="sm:flex-1">
              <a href={storeUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink aria-hidden /> Ver minha loja
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      <StatsCards stats={stats} />

      {pending > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Primeiros passos</CardTitle>
            <CardDescription>
              Faltam {pending} {pending === 1 ? "passo" : "passos"} para sua loja ficar completa.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {steps.map((s) => (
                <li key={s.label}>
                  <Link href={s.href} className="flex items-center gap-3 py-3 text-sm hover:text-primary">
                    {s.done ? (
                      <CheckCircle2 className="size-5 shrink-0 text-emerald-600" aria-label="Feito" />
                    ) : (
                      <Circle className="size-5 shrink-0 text-muted-foreground" aria-label="Pendente" />
                    )}
                    <span className={s.done ? "text-muted-foreground line-through" : "font-medium"}>{s.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function StatsCards({ stats }: { stats: StatsSummary }) {
  const rows = [
    { label: "Hoje", data: stats.today },
    { label: "Últimos 7 dias", data: stats.last7 },
    { label: "Últimos 30 dias", data: stats.last30 },
  ];
  const fmt = new Intl.NumberFormat("pt-BR");
  return (
    <section aria-labelledby="stats-title" className="space-y-3">
      <h2 id="stats-title" className="text-lg font-semibold">
        Movimento da loja
      </h2>
      <div className="grid gap-3 sm:grid-cols-3">
        {rows.map(({ label, data }) => (
          <Card key={label} className="gap-3 py-4">
            <CardHeader className="px-4">
              <CardDescription className="font-medium">{label}</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2 px-4">
              <div>
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Eye className="size-3.5" aria-hidden /> Visitas
                </p>
                <p className="text-2xl font-bold tabular-nums">{fmt.format(data.visits)}</p>
              </div>
              <div>
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MousePointerClick className="size-3.5" aria-hidden /> Pedidos
                </p>
                <p className="text-2xl font-bold tabular-nums">{fmt.format(data.clicks)}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        &quot;Pedidos&quot; conta quantas vezes clicaram em &quot;Pedir pelo WhatsApp&quot;. Cada pessoa conta uma
        visita por dia.
      </p>
    </section>
  );
}
