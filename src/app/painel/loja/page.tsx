import type { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { getMyHours, requireStore } from "@/lib/data/dashboard";
import { publicEnv } from "@/lib/env";
import { HoursEditor } from "./hours-editor";
import { StoreForm } from "./store-form";

export const metadata: Metadata = { title: "Minha loja" };
export const instant = false;

export default async function LojaPage() {
  const user = await requireUser();
  const store = await requireStore();
  const hours = await getMyHours(store.id);
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Minha loja</h1>
        <p className="text-sm text-muted-foreground">Personalize como sua loja aparece para os clientes.</p>
      </div>
      <StoreForm store={store} userId={user.id} siteUrl={publicEnv().NEXT_PUBLIC_SITE_URL} />
      <Card id="horarios">
        <CardHeader>
          <CardTitle>Horário de funcionamento</CardTitle>
          <CardDescription>Fora desses horários sua loja mostra &quot;Fechado agora&quot;.</CardDescription>
        </CardHeader>
        <CardContent>
          <HoursEditor initial={hours} />
        </CardContent>
      </Card>
    </div>
  );
}
