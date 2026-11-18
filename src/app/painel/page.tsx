import type { Metadata } from "next";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Painel" };

// Fase 1: tela provisória. O painel completo (produtos, loja, QR Code,
// estatísticas) é construído na Fase 2.
export default function PainelPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Olá! 👋</h1>
      <Card>
        <CardHeader>
          <CardTitle>Sua assinatura está ativa</CardTitle>
          <CardDescription>Em breve você vai cadastrar seus produtos e personalizar sua loja aqui.</CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
