import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AlertCircle } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { publicEnv } from "@/lib/env";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Entrar",
  robots: { index: false },
};

const ERRORS: Record<string, string> = {
  "link-invalido": "Esse link de acesso expirou ou já foi usado. Peça um novo abaixo.",
};

async function ErrorFromQuery({ searchParams }: { searchParams: PageProps<"/entrar">["searchParams"] }) {
  const { erro } = await searchParams;
  const message = typeof erro === "string" ? ERRORS[erro] : undefined;
  if (!message) return null;
  return (
    <Alert variant="destructive" className="mb-4">
      <AlertCircle />
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

export default function EntrarPage({ searchParams }: PageProps<"/entrar">) {
  const env = publicEnv();
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-10">
      <Logo className="mb-8" />
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>
            <span className="text-2xl">Entrar no painel</span>
          </CardTitle>
          <CardDescription>Enviaremos um link de acesso para o seu e-mail.</CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={null}>
            <ErrorFromQuery searchParams={searchParams} />
          </Suspense>
          <LoginForm supportEmail={env.NEXT_PUBLIC_SUPPORT_EMAIL} />
        </CardContent>
      </Card>
      <p className="mt-6 text-sm text-muted-foreground">
        Ainda não tem conta?{" "}
        <Link href="/" className="font-medium text-primary underline">
          Conheça o plano
        </Link>
      </p>
    </main>
  );
}
