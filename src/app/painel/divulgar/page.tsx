import type { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyButton } from "@/components/dashboard/copy-button";
import { requireStore } from "@/lib/data/dashboard";
import { publicEnv } from "@/lib/env";
import { QrCard } from "./qr-card";

export const metadata: Metadata = { title: "Divulgar" };
export const instant = false;

export default async function DivulgarPage() {
  const store = await requireStore();
  const url = `${publicEnv().NEXT_PUBLIC_SITE_URL}/${store.slug}`;
  const shareText = `Olá! Agora você pode ver meu cardápio e fazer seu pedido por aqui: ${url}`;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="print:hidden">
        <h1 className="text-2xl font-bold tracking-tight">Divulgar</h1>
        <p className="text-sm text-muted-foreground">Quanto mais gente vê seu link, mais pedidos chegam.</p>
      </div>

      <Card className="print:hidden">
        <CardHeader>
          <CardTitle>Seu link</CardTitle>
          <CardDescription>Coloque na bio do Instagram, no status do WhatsApp e mande para seus clientes.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="rounded-lg bg-muted px-3 py-2 font-mono text-sm break-all">{url}</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <CopyButton text={url} className="sm:flex-1" />
            <CopyButton text={shareText} label="Copiar mensagem pronta" variant="outline" className="sm:flex-1" />
          </div>
        </CardContent>
      </Card>

      <Card className="print:border-0 print:shadow-none">
        <CardHeader className="print:hidden">
          <CardTitle>QR Code</CardTitle>
          <CardDescription>Imprima e deixe no balcão, cole nas embalagens ou mande junto com as encomendas.</CardDescription>
        </CardHeader>
        <CardContent>
          <QrCard url={url} storeName={store.name} color={store.primary_color} slug={store.slug} />
        </CardContent>
      </Card>
    </div>
  );
}
