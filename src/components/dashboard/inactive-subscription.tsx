import { AlertTriangle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { site } from "@/lib/site";

export function InactiveSubscription({ checkoutUrl, supportEmail }: { checkoutUrl: string; supportEmail: string }) {
  return (
    <Card className="mx-auto w-full max-w-lg">
      <CardHeader>
        <div className="mb-2 grid size-12 place-items-center rounded-full bg-amber-100 text-amber-700">
          <AlertTriangle aria-hidden />
        </div>
        <CardTitle>
          <span className="text-2xl">Assinatura inativa</span>
        </CardTitle>
        <CardDescription className="text-base">
          Sua loja está fora do ar para os clientes no momento. Mas não se preocupe: <strong>todos os seus
          produtos, fotos e configurações continuam salvos</strong>.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Assim que o pagamento for confirmado, sua loja volta ao ar automaticamente, do jeitinho que estava.
          Plano mensal: <strong className="text-foreground">{site.priceMonthly}</strong>.
        </p>
        <Button asChild size="lg" className="w-full">
          <a href={checkoutUrl} target="_blank" rel="noopener noreferrer">
            Reativar minha assinatura <ExternalLink aria-hidden />
          </a>
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Já pagou? A confirmação pode levar alguns minutos (no boleto, até 3 dias úteis). Dúvidas:{" "}
          <a href={`mailto:${supportEmail}`} className="font-medium text-primary underline">
            {supportEmail}
          </a>
        </p>
      </CardContent>
    </Card>
  );
}
