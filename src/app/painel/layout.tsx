import { Suspense } from "react";
import { LogOut } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { InactiveSubscription } from "@/components/dashboard/inactive-subscription";
import { PanelSkeleton } from "@/components/dashboard/panel-skeleton";
import { getSubscription, requireUser } from "@/lib/auth";
import { publicEnv } from "@/lib/env";

export const metadata = { robots: { index: false } };

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

  return (
    <>
      <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-4 px-4">
          <Logo href="/painel" />
          <div className="flex items-center gap-2">
            <span className="hidden max-w-[220px] truncate text-sm text-muted-foreground sm:inline">
              {user.email}
            </span>
            <form action="/auth/sair" method="post">
              <Button type="submit" variant="ghost" size="sm" aria-label="Sair da conta">
                <LogOut aria-hidden /> <span className="hidden sm:inline">Sair</span>
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        {subscription.status === "active" ? (
          children
        ) : (
          <InactiveSubscription
            checkoutUrl={env.NEXT_PUBLIC_KIWIFY_CHECKOUT_URL}
            supportEmail={env.NEXT_PUBLIC_SUPPORT_EMAIL}
          />
        )}
      </main>
    </>
  );
}
