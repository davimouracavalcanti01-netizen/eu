import { Suspense } from "react";
import { CalendarClock, LogOut } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Toaster } from "@/components/ui/sonner";
import { InactiveSubscription } from "@/components/dashboard/inactive-subscription";
import { PanelNav } from "@/components/dashboard/panel-nav";
import { PanelSkeleton } from "@/components/dashboard/panel-skeleton";
import { getSubscription, requireUser } from "@/lib/auth";
import { publicEnv } from "@/lib/env";

export const metadata = { robots: { index: false } };

// Área logada: tudo depende da sessão, então pode esperar o servidor.
export const instant = false;

export default function PainelLayout({ children }: LayoutProps<"/painel">) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-muted/40">
      <Suspense fallback={<PanelSkeleton />}>
        <AuthenticatedShell>{children}</AuthenticatedShell>
      </Suspense>
    </div>
  );
}

async function AuthenticatedShell({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const subscription = await getSubscription();
  const env = publicEnv();
  const active = subscription.status === "active";

  return (
    <>
      <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-4 px-4">
          <Logo href="/painel" />
          <div className="flex items-center gap-2">
            <span className="hidden max-w-[220px] truncate text-sm text-muted-foreground sm:inline">{user.email}</span>
            <form action="/auth/sair" method="post">
              <Button type="submit" variant="ghost" size="sm" aria-label="Sair da conta">
                <LogOut aria-hidden /> <span className="hidden sm:inline">Sair</span>
              </Button>
            </form>
          </div>
        </div>
      </header>
      <Toaster />
      {active ? <PanelNav /> : null}
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-6 pb-28 sm:pb-10">
        {active ? (
          <>
            {subscription.accessEndsAt ? (
              <Alert className="mb-6 border-amber-300 bg-amber-50 text-amber-950">
                <CalendarClock />
                <AlertDescription>
                  Sua assinatura foi cancelada. A loja continua no ar até{" "}
                  <strong>{new Date(subscription.accessEndsAt).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}</strong>.{" "}
                  <a href={env.NEXT_PUBLIC_KIWIFY_CHECKOUT_URL} className="font-semibold underline" target="_blank" rel="noopener noreferrer">
                    Reativar
                  </a>
                </AlertDescription>
              </Alert>
            ) : null}
            {children}
          </>
        ) : (
          <InactiveSubscription checkoutUrl={env.NEXT_PUBLIC_KIWIFY_CHECKOUT_URL} supportEmail={env.NEXT_PUBLIC_SUPPORT_EMAIL} />
        )}
      </main>
    </>
  );
}
