import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgePercent,
  Check,
  Clock,
  Image as ImageIcon,
  Link2,
  MessageCircle,
  QrCode,
  ShieldCheck,
  Smartphone,
  Wallet,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { PhoneDemo } from "@/components/marketing/phone-demo";
import { SiteFooter } from "@/components/marketing/site-footer";
import { publicEnv } from "@/lib/env";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: `${site.name} — Cardápio digital com pedido no WhatsApp para doces e marmitas` },
  description: `Crie seu cardápio digital em 5 minutos. Seus clientes escolhem pelo celular e o pedido chega pronto no seu WhatsApp. Sem comissão. ${site.priceMonthly}/mês.`,
  openGraph: {
    title: `${site.name} — seu cardápio digital com pedido no WhatsApp`,
    description: "Para confeiteiras, marmiteiras e quem vende comida caseira. Sem comissão por pedido.",
    type: "website",
    locale: "pt_BR",
  },
};

const STEPS = [
  { n: "1", title: "Cadastre seus produtos", text: "Foto do celular, nome e preço. A gente deixa tudo bonito e leve automaticamente." },
  { n: "2", title: "Compartilhe seu link", text: "Coloque na bio do Instagram, no status do WhatsApp ou imprima o QR Code." },
  { n: "3", title: "Receba pedidos prontos", text: "O cliente monta o carrinho e o pedido chega no seu WhatsApp, com total e forma de pagamento." },
];

const BENEFITS = [
  { icon: BadgePercent, title: "Zero comissão", text: "Pague só a mensalidade. O dinheiro das vendas é 100% seu." },
  { icon: MessageCircle, title: "Pedido organizado", text: "Itens, quantidades, total, endereço e pagamento numa mensagem só. Nada de \"me manda o cardápio?\"." },
  { icon: Link2, title: "Link com o seu nome", text: "{host}/sua-loja — fácil de lembrar e de divulgar." },
  { icon: Wallet, title: "Pix no pedido", text: "Sua chave Pix vai junto na mensagem. O cliente já paga certinho." },
  { icon: Clock, title: "Horário de funcionamento", text: "Fora do horário, a loja mostra \"Fechado agora\" e avisa quando abre." },
  { icon: QrCode, title: "QR Code para imprimir", text: "Plaquinha pronta para o balcão, embalagens e encomendas." },
  { icon: Smartphone, title: "Feito para o celular", text: "Abre rápido até no 4G fraco. O cliente não precisa baixar nada." },
  { icon: ImageIcon, title: "Fotos que vendem", text: "Seu cardápio com fotos, categorias e a cor da sua marca." },
];

const FAQ = [
  {
    q: "Preciso entender de tecnologia?",
    a: "Não. Se você usa WhatsApp, você consegue usar o Pedidinho. É só preencher nome, preço e foto dos produtos.",
  },
  {
    q: "O Pedidinho cobra comissão sobre as vendas?",
    a: `Não. Você paga apenas ${site.priceMonthly} por mês, venda quanto vender. O pagamento dos clientes vai direto para você (Pix, dinheiro ou cartão na entrega).`,
  },
  {
    q: "Como meus clientes pagam?",
    a: "Do jeito que você já recebe hoje. Sua chave Pix aparece na mensagem do pedido e o cliente também pode escolher dinheiro (com troco) ou cartão na entrega/retirada.",
  },
  {
    q: "O cliente precisa baixar aplicativo ou fazer cadastro?",
    a: "Não. Ele abre o link no celular, escolhe os produtos e toca em \"Pedir pelo WhatsApp\". Simples assim.",
  },
  {
    q: "Preciso de CNPJ?",
    a: "Não. Qualquer pessoa que vende comida caseira pode usar.",
  },
  {
    q: "Posso cancelar quando quiser?",
    a: "Sim, sem multa e sem fidelidade. Ao cancelar, sua loja continua no ar até o fim do mês que você já pagou.",
  },
  {
    q: "E se eu cancelar, perco meus produtos?",
    a: "Não. Seus produtos, fotos e configurações ficam guardados. Se voltar a assinar, sua loja volta exatamente como estava.",
  },
  {
    q: "Como eu entro no painel? Tem senha?",
    a: "Não tem senha para esquecer. Depois da compra você recebe um e-mail com o link de acesso. Sempre que quiser entrar, digite seu e-mail e enviamos um novo link.",
  },
  {
    q: "Quantos produtos posso cadastrar?",
    a: `Até ${site.maxProducts} produtos, com fotos e categorias. É mais do que suficiente para a maioria dos cardápios.`,
  },
];

export default function Home() {
  const checkout = publicEnv().NEXT_PUBLIC_KIWIFY_CHECKOUT_URL;
  const support = publicEnv().NEXT_PUBLIC_SUPPORT_EMAIL;
  const host = publicEnv().NEXT_PUBLIC_SITE_URL.replace(/^https?:\/\//, "");

  return (
    <>
      <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Logo />
          <nav aria-label="Principal" className="flex items-center gap-2">
            <Link href="#precos" className="hidden px-3 text-sm font-medium text-muted-foreground hover:text-foreground sm:block">
              Preço
            </Link>
            <Link href="#duvidas" className="hidden px-3 text-sm font-medium text-muted-foreground hover:text-foreground sm:block">
              Dúvidas
            </Link>
            <Button asChild variant="ghost" size="sm">
              <Link href="/entrar">Entrar</Link>
            </Button>
            <Button asChild size="sm">
              <a href={checkout}>Assinar</a>
            </Button>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="overflow-hidden bg-gradient-to-b from-accent/60 to-background">
          <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 pt-12 pb-24 md:grid-cols-[1.1fr_1fr] md:pt-20">
            <div>
              <p className="mb-4 inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-sm font-medium">
                🧁 Para confeiteiras, marmiteiras e quem vende comida caseira
              </p>
              <h1 className="text-4xl leading-[1.1] font-extrabold tracking-tight text-balance sm:text-5xl">
                Seu cardápio no celular do cliente. <span className="text-primary">O pedido pronto no seu WhatsApp.</span>
              </h1>
              <p className="mt-5 max-w-xl text-lg text-muted-foreground">
                Pare de mandar foto de cardápio e anotar pedido na mão. Com o {site.name}, seu cliente escolhe, vê o total e
                envia o pedido organizado — em menos de 1 minuto.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="h-14 px-7 text-base">
                  <a href={checkout}>
                    Quero meu cardápio <ArrowRight aria-hidden />
                  </a>
                </Button>
                <Button asChild size="lg" variant="outline" className="h-14 px-7 text-base">
                  <Link href="/demo">Ver uma loja de exemplo</Link>
                </Button>
              </div>
              <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                {["Pronto em 5 minutos", "Sem comissão", "Cancele quando quiser"].map((t) => (
                  <li key={t} className="flex items-center gap-1.5">
                    <Check className="size-4 text-emerald-600" aria-hidden /> {t}
                  </li>
                ))}
              </ul>
            </div>
            <PhoneDemo />
          </div>
        </section>

        {/* Como funciona */}
        <section aria-labelledby="como-funciona" className="mx-auto max-w-6xl px-4 py-20">
          <h2 id="como-funciona" className="text-center text-3xl font-bold tracking-tight">
            Como funciona
          </h2>
          <p className="mt-3 text-center text-muted-foreground">Três passos e você já está recebendo pedidos.</p>
          <ol className="mt-12 grid gap-6 md:grid-cols-3">
            {STEPS.map((s) => (
              <li key={s.n} className="rounded-3xl border bg-card p-6 shadow-sm">
                <span className="grid size-10 place-items-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                  {s.n}
                </span>
                <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-muted-foreground">{s.text}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Antes e depois */}
        <section aria-labelledby="antes-depois" className="bg-muted/50">
          <div className="mx-auto grid max-w-6xl gap-6 px-4 py-20 md:grid-cols-2">
            <h2 id="antes-depois" className="sr-only">
              Antes e depois do {site.name}
            </h2>
            <div className="rounded-3xl border bg-background p-7">
              <p className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">Sem o {site.name}</p>
              <ul className="mt-4 space-y-3 text-base">
                {[
                  "Cliente pede \"me manda o cardápio\" toda hora",
                  "Foto do cardápio desatualizada no status",
                  "Pedido picado em 10 mensagens",
                  "Conta de cabeça e erro no troco",
                  "Pedido esquecido no meio da conversa",
                ].map((t) => (
                  <li key={t} className="flex gap-3">
                    <span aria-hidden>😩</span> {t}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-3xl border-2 border-primary bg-background p-7">
              <p className="text-sm font-semibold tracking-wide text-primary uppercase">Com o {site.name}</p>
              <ul className="mt-4 space-y-3 text-base">
                {[
                  "Um link com tudo: fotos, preços e categorias",
                  "Produto esgotado some na hora, com um toque",
                  "Pedido chega numa mensagem só, organizado",
                  "Total, taxa de entrega e troco calculados",
                  "Mais tempo para cozinhar (e vender mais)",
                ].map((t) => (
                  <li key={t} className="flex gap-3">
                    <span aria-hidden>🥰</span> {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Benefícios */}
        <section aria-labelledby="beneficios" className="mx-auto max-w-6xl px-4 py-20">
          <h2 id="beneficios" className="text-center text-3xl font-bold tracking-tight">
            Tudo o que você precisa para vender mais
          </h2>
          <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {BENEFITS.map(({ icon: Icon, title, text }) => (
              <li key={title} className="rounded-3xl border bg-card p-6">
                <Icon className="size-6 text-primary" aria-hidden />
                <h3 className="mt-3 font-semibold">{title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{text.replace("{host}", host)}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* Preço */}
        <section id="precos" aria-labelledby="preco-titulo" className="scroll-mt-20 bg-gradient-to-b from-background to-accent/60">
          <div className="mx-auto max-w-6xl px-4 py-20">
            <h2 id="preco-titulo" className="text-center text-3xl font-bold tracking-tight">
              Um preço simples. Sem surpresas.
            </h2>
            <div className="mx-auto mt-10 max-w-md rounded-3xl border-2 border-primary bg-card p-8 shadow-xl">
              <p className="text-sm font-semibold tracking-wide text-primary uppercase">Plano completo</p>
              <p className="mt-3 flex items-end gap-1">
                <span className="text-5xl font-extrabold tracking-tight">{site.priceMonthly}</span>
                <span className="pb-1.5 text-muted-foreground">/mês</span>
              </p>
              <p className="mt-1 text-sm text-muted-foreground">Menos que 1 bolo de pote por mês. Sem comissão por pedido.</p>
              <ul className="mt-6 space-y-3">
                {[
                  `Até ${site.maxProducts} produtos com foto`,
                  "Link próprio + QR Code para imprimir",
                  "Pedidos ilimitados direto no WhatsApp",
                  "Sua cor, seu logo e seu horário",
                  "Chave Pix e taxa de entrega no pedido",
                  "Contador de visitas e pedidos",
                  "Suporte por e-mail",
                ].map((t) => (
                  <li key={t} className="flex gap-2.5">
                    <Check className="mt-0.5 size-5 shrink-0 text-emerald-600" aria-hidden /> {t}
                  </li>
                ))}
              </ul>
              <Button asChild size="lg" className="mt-8 h-14 w-full text-base">
                <a href={checkout}>
                  Assinar agora <ArrowRight aria-hidden />
                </a>
              </Button>
              <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
                <ShieldCheck className="size-4" aria-hidden /> Pagamento seguro pela Kiwify · Cancele quando quiser
              </p>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="duvidas" aria-labelledby="faq-titulo" className="mx-auto max-w-3xl scroll-mt-20 px-4 py-20">
          <h2 id="faq-titulo" className="text-center text-3xl font-bold tracking-tight">
            Dúvidas frequentes
          </h2>
          <div className="mt-10 divide-y rounded-3xl border bg-card">
            {FAQ.map(({ q, a }) => (
              <details key={q} className="group p-5 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
                  {q}
                  <span className="text-2xl leading-none text-primary transition-transform group-open:rotate-45" aria-hidden>
                    +
                  </span>
                </summary>
                <p className="mt-3 text-muted-foreground">{a}</p>
              </details>
            ))}
          </div>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Outra dúvida? Escreva para{" "}
            <a href={`mailto:${support}`} className="font-medium text-primary underline">
              {support}
            </a>
          </p>
        </section>

        {/* CTA final */}
        <section className="px-4 pb-20">
          <div className="mx-auto max-w-4xl rounded-[2rem] bg-primary px-6 py-14 text-center text-primary-foreground">
            <h2 className="text-3xl font-bold tracking-tight text-balance">Seu próximo pedido pode chegar organizadinho.</h2>
            <p className="mx-auto mt-3 max-w-xl">Crie seu cardápio hoje e mande o link para seus clientes ainda agora.</p>
            <Button asChild size="lg" variant="secondary" className="mt-8 h-14 px-8 text-base">
              <a href={checkout}>
                Começar por {site.priceMonthly}/mês <ArrowRight aria-hidden />
              </a>
            </Button>
          </div>
        </section>
      </main>

      <SiteFooter supportEmail={support} />
    </>
  );
}
