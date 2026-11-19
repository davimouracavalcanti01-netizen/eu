# Pedidinho

Cardápio digital para quem vende comida caseira (confeiteiras, marmitas, bolo de pote…).
O vendedor cadastra os produtos e recebe um link próprio. O cliente monta o pedido no
celular e ele chega **pronto no WhatsApp** do vendedor. Assinatura mensal de **R$ 19,90**
cobrada pela **Kiwify**, com liberação e bloqueio de acesso 100% automáticos.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind 4 · shadcn/ui · Supabase
(Postgres + RLS, Auth com link mágico, Storage) · Resend · Vercel · Kiwify.

---

## Sumário

1. [O que já está pronto](#1-o-que-já-está-pronto)
2. [Antes de começar (contas e custos)](#2-antes-de-começar-contas-e-custos)
3. [Passo a passo do deploy](#3-passo-a-passo-do-deploy)
   - [3.1 Domínio](#31-domínio)
   - [3.2 Supabase](#32-supabase-banco-login-e-fotos)
   - [3.3 Resend](#33-resend-e-mails)
   - [3.4 Vercel](#34-vercel-hospedagem)
   - [3.5 Kiwify: produto de assinatura](#35-kiwify-produto-de-assinatura)
   - [3.6 Kiwify: webhook](#36-kiwify-webhook)
   - [3.7 Teste de ponta a ponta](#37-teste-de-ponta-a-ponta-compra-real)
4. [Dados legais (Termos e Privacidade)](#4-dados-legais-termos-e-privacidade)
5. [Rodar no seu computador](#5-rodar-no-seu-computador)
6. [Testes](#6-testes)
7. [Como funciona por dentro](#7-como-funciona-por-dentro)
8. [Segurança](#8-segurança)
9. [Operação do dia a dia](#9-operação-do-dia-a-dia)

---

## 1. O que já está pronto

| Área | O que faz |
|---|---|
| **Landing page** (`/`) | Página de vendas: demonstração, benefícios, preço, dúvidas e botões para o checkout da Kiwify. |
| **Loja de exemplo** (`/demo`) | Loja fictícia para o visitante ver como funciona. |
| **Login** (`/entrar`) | Sem senha: o vendedor recebe um link por e-mail. Só quem comprou consegue entrar. |
| **Painel** (`/painel`) | Cadastro inicial, produtos com foto (comprimida no celular), categorias, cor, logo, WhatsApp, Pix, entrega/retirada, horários, link, QR Code e contador de visitas/pedidos. |
| **Loja pública** (`/nome-da-loja`) | Cardápio rápido no celular, carrinho, "Fechado agora", pedido formatado no WhatsApp e rodapé "Feito com Pedidinho". |
| **Webhook** (`/api/webhooks/kiwify`) | Cria a conta, ativa, renova, suspende e registra tudo automaticamente. |
| **Termos e Privacidade** | `/termos` e `/privacidade` (LGPD), com os seus dados em um único arquivo. |

**Regras da assinatura** (já programadas):

| Evento na Kiwify | O que acontece |
|---|---|
| Compra aprovada | Cria a conta (se não existir), ativa e envia o e-mail de boas-vindas com link de acesso. |
| Renovação paga | Continua ativa e atualiza a data de vencimento. |
| Pagamento atrasado | Suspende **na hora**. |
| Reembolso ou chargeback | Suspende **na hora**. |
| Cancelamento | Continua no ar **até o fim do mês já pago** e depois suspende sozinha. |
| Pix/boleto gerado, compra recusada | Só registra (nada muda). |

Ao suspender, **nada é apagado**: o painel mostra "Assinatura inativa — reative aqui" e a
loja pública mostra "temporariamente indisponível". Pagou de novo → volta tudo como estava.

---

## 2. Antes de começar (contas e custos)

Você vai precisar criar contas nestes serviços (todos têm cadastro com e-mail):

| Serviço | Para quê | Custo para começar |
|---|---|---|
| [GitHub](https://github.com) | Guardar o código (já está no seu repositório) | Grátis |
| [Registro.br](https://registro.br) | Domínio `.com.br` | ~R$ 40/ano |
| [Supabase](https://supabase.com) | Banco, login e fotos | Grátis para testar; **Pro US$ 25/mês** quando tiver clientes (o grátis pausa após 7 dias sem uso) |
| [Vercel](https://vercel.com) | Hospedagem do site | **Pro US$ 20/mês** (o plano grátis proíbe uso comercial) |
| [Resend](https://resend.com) | Envio dos e-mails | Grátis até 3.000 e-mails/mês |
| [Kiwify](https://kiwify.com.br) | Checkout e cobrança mensal | Taxa por venda |

> 💡 Dá para fazer todo o passo a passo nos planos grátis para testar. Troque para os
> planos pagos (Supabase Pro e Vercel Pro) **antes de começar a vender**.

---

## 3. Passo a passo do deploy

Siga na ordem. Cada etapa diz exatamente onde clicar. Guarde num bloco de notas os
valores marcados com 📋 — você vai colá-los na Vercel no passo 3.4.

### 3.1 Domínio

1. Entre em https://registro.br e registre seu domínio (ex.: `pedidinho.com.br`).
2. Por enquanto é só isso. Os apontamentos (DNS) serão feitos nos passos 3.3 e 3.4.

### 3.2 Supabase (banco, login e fotos)

**Criar o projeto**

1. Acesse https://supabase.com/dashboard → **New project**.
2. **Name:** `pedidinho` · **Database Password:** clique em *Generate a password* e guarde.
   **Region:** `South America (São Paulo)`. Clique em **Create new project** e aguarde ~2 min.

**Criar as tabelas e as regras de segurança**

3. Menu da esquerda → **SQL Editor** → **New query**.
4. No GitHub, abra o arquivo `supabase/migrations/20261118000000_init.sql`, clique em
   **Raw**, copie tudo e cole no editor. Clique em **Run**.
   Deve aparecer *Success. No rows returned*.

**Configurar o login**

5. **Authentication → Sign In / Providers**:
   - Em **User Signups**, **desligue** *Allow new users to sign up*. (As contas são criadas
     apenas pelo sistema, depois do pagamento.)
   - Em **Email**, mantenha o provedor **ligado** (*Enable Email provider*). Não precisa
     de "Confirm email".
6. **Authentication → URL Configuration**:
   - **Site URL:** `https://seudominio.com.br`
   - **Redirect URLs:** adicione `https://seudominio.com.br/**`
7. **Authentication → Emails → Templates → Magic Link**:
   - **Subject:** `Seu link de acesso ao Pedidinho`
   - **Body:** apague tudo e cole o conteúdo de `supabase/templates/magic-link.html`. **Save**.
   > Esse modelo faz o link funcionar mesmo se o e-mail for aberto em outro navegador ou
   > celular (o modelo padrão do Supabase não funciona nesses casos).

**Copiar as chaves**

8. **Project Settings → API Keys**. Copie:
   - 📋 **Project URL** → será `NEXT_PUBLIC_SUPABASE_URL` (fica em **Project Settings → Data API** se não aparecer ali)
   - 📋 **Publishable key** (`sb_publishable_...`) → será `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - 📋 **Secret key** (`sb_secret_...`) → será `SUPABASE_SECRET_KEY`
     ⚠️ Nunca mostre essa chave para ninguém nem cole em lugar público.

> A configuração de e-mail (SMTP) do Supabase é feita no final do passo 3.3.

### 3.3 Resend (e-mails)

1. Crie a conta em https://resend.com.
2. **Domains → Add Domain** → digite `seudominio.com.br` → região **São Paulo (sa-east-1)**
   se disponível.
3. O Resend mostra alguns registros DNS (tipo `TXT` e `MX`). No **registro.br**: entre no
   domínio → **DNS → Editar zona** (ou "Configurar endereçamento" → modo avançado) e
   adicione **exatamente** os registros mostrados. Volte ao Resend e clique em **Verify**
   (pode levar de minutos a algumas horas).
4. **API Keys → Create API Key** → nome `pedidinho`, permissão *Sending access*.
   📋 Copie a chave (`re_...`) → será `RESEND_API_KEY`.
5. 📋 Defina o remetente → `EMAIL_FROM="Pedidinho <ola@seudominio.com.br>"`.

**Fazer o Supabase enviar os e-mails de login pelo Resend** (o envio padrão do Supabase
permite pouquíssimos e-mails por hora):

6. No Supabase: **Authentication → Emails → SMTP Settings** → **Enable custom SMTP**:
   - **Sender email:** `ola@seudominio.com.br` · **Sender name:** `Pedidinho`
   - **Host:** `smtp.resend.com` · **Port:** `465`
   - **Username:** `resend` · **Password:** a mesma chave `re_...` do item 4
   - **Save**.
7. **Authentication → Rate Limits** → aumente **Rate limit for sending emails** para `100`
   por hora (ou mais, conforme seu número de clientes) → **Save**.

### 3.4 Vercel (hospedagem)

1. Crie a conta em https://vercel.com usando **Continue with GitHub**.
2. **Add New… → Project** → escolha o repositório `eu` → **Import**.
3. Em **Environment Variables**, cadastre (uma por linha, nome = valor):

   | Nome | Valor |
   |---|---|
   | `NEXT_PUBLIC_SITE_URL` | `https://seudominio.com.br` (sem barra no final) |
   | `NEXT_PUBLIC_SUPPORT_EMAIL` | seu e-mail de suporte |
   | `NEXT_PUBLIC_SUPABASE_URL` | 📋 do passo 3.2 |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | 📋 do passo 3.2 |
   | `SUPABASE_SECRET_KEY` | 📋 do passo 3.2 |
   | `NEXT_PUBLIC_KIWIFY_CHECKOUT_URL` | por enquanto `https://pay.kiwify.com.br/temporario` (troca no passo 3.5) |
   | `KIWIFY_WEBHOOK_TOKEN` | um texto aleatório e longo — veja abaixo |
   | `RESEND_API_KEY` | 📋 do passo 3.3 |
   | `EMAIL_FROM` | 📋 do passo 3.3 |

   **Como gerar o `KIWIFY_WEBHOOK_TOKEN`:** use um gerador de senhas (ex.: o do seu
   navegador) e crie uma senha de **32 caracteres, só letras e números**. 📋 Guarde: ela
   vai ser colada também na Kiwify (passo 3.6).

4. Clique em **Deploy** e aguarde (~2 min). Abra o endereço `.vercel.app` gerado e confira
   se a página inicial aparece.
5. **Settings → Domains** → adicione `seudominio.com.br` (e `www.seudominio.com.br`). A
   Vercel mostra os registros DNS. Crie-os no **registro.br** (DNS → Editar zona). Quando
   ficar verde ✅, o site está no seu domínio com HTTPS.
6. **Settings → General → Plan:** faça upgrade para **Pro** antes de vender.

> Sempre que alterar uma variável de ambiente na Vercel, vá em **Deployments → ⋯ no
> último deploy → Redeploy** para ela passar a valer.

### 3.5 Kiwify: produto de assinatura

1. Crie e verifique sua conta em https://kiwify.com.br (dados pessoais/empresa e conta
   bancária para receber).
2. **Produtos → Criar produto**:
   - Nome: `Pedidinho — Plano mensal` · Descrição curta do serviço.
   - **Preço:** `R$ 19,90` com cobrança **recorrente (assinatura) mensal**.
   - **Entrega/acesso:** escolha a opção de **área de membros externa** (ou "outra
     plataforma") e informe o endereço de acesso `https://seudominio.com.br/entrar`.
     Assim, a página de obrigado da Kiwify leva o cliente para o seu login.
   - Página de vendas: `https://seudominio.com.br`.
3. Salve e abra o produto → **Links / Checkout** → copie o link do checkout
   (`https://pay.kiwify.com.br/...`).
4. Na Vercel, troque `NEXT_PUBLIC_KIWIFY_CHECKOUT_URL` por esse link e faça **Redeploy**.

### 3.6 Kiwify: webhook

1. Na Kiwify: **Apps → Webhooks → Criar webhook** (o nome do menu pode variar um pouco).
2. Preencha:
   - **Nome:** `Pedidinho`
   - **URL:** `https://seudominio.com.br/api/webhooks/kiwify`
   - **Produto:** o produto do passo 3.5
   - **Token:** cole o **mesmo** valor de `KIWIFY_WEBHOOK_TOKEN` (passo 3.4)
   - **Gatilhos** — marque estes:
     - `compra_aprovada`
     - `compra_reembolsada`
     - `chargeback`
     - `subscription_canceled`
     - `subscription_late`
     - `subscription_renewed`
     - (os demais são opcionais; se marcados, só ficam registrados no log)
3. Salve.

**Teste rápido com dados fictícios (obrigatório):**

4. No webhook criado, clique em **Testar Webhook** → escolha **Compra aprovada** → enviar.
5. Clique em **Ver logs**: a resposta deve ser **HTTP 200**.
6. No Supabase → **Table Editor → webhook_events**: deve aparecer uma linha com
   `event_type = order_approved` e `status = processed`.
   - ✅ Se `status = processed`: perfeito. Uma conta de teste foi criada com o e-mail
     fictício (pode apagar em **Authentication → Users**).
   - ❌ Se `status = error` com a mensagem *"sem e-mail do cliente no payload"*: abra a
     coluna `payload`, copie o conteúdo e envie para o desenvolvedor. Isso significa que a
     Kiwify mandou o e-mail num campo com outro nome (a documentação oficial não mostra
     esse campo). O ajuste é em uma única função: `customerEmailOf` em
     `src/lib/kiwify/events.ts`.
   - ❌ Se a resposta for **401**: o token da Kiwify é diferente do `KIWIFY_WEBHOOK_TOKEN`
     da Vercel (ou você esqueceu o Redeploy).

### 3.7 Teste de ponta a ponta (compra real)

A Kiwify não tem modo de teste, então o teste final é uma compra de verdade (e depois o
reembolso).

1. Abra `https://seudominio.com.br` numa **janela anônima** e clique em **Assinar**.
2. Compre com **um e-mail seu que ainda não usou** no sistema (cartão ou Pix).
3. Em até 1 minuto deve chegar o e-mail **"Boas-vindas ao Pedidinho!"**. Clique em
   **Entrar no meu painel**.
4. Crie a loja, cadastre um produto com foto, configure o Pix e abra o link da loja no
   celular. Faça um pedido e confira a mensagem no WhatsApp.
5. Teste o login de novo: **Sair** → `/entrar` → digite o e-mail → clique no link do e-mail.
6. Na Kiwify, **reembolse** essa venda (Vendas → a venda → Reembolsar).
7. Em até 1 minuto: o painel deve mostrar **"Assinatura inativa"** e a loja
   **"temporariamente indisponível"**. Os produtos continuam salvos.
8. Confira em **webhook_events** (Supabase) os eventos `order_approved`,
   `order_refunded` e `subscription_canceled`, todos com `status = processed`.

✅ Pronto! Seu SaaS está no ar e funcionando sozinho.

---

## 4. Dados legais (Termos e Privacidade)

Abra `src/lib/legal.ts` e preencha razão social, CNPJ (ou CPF), endereço, e-mail de
privacidade, nome do encarregado (DPO) e o foro. Enquanto algum campo estiver vazio, as
páginas `/termos` e `/privacidade` mostram um aviso amarelo **[PREENCHER]**.

Pelo GitHub dá para editar direto no navegador: abra o arquivo → ícone de lápis → edite →
**Commit changes**. A Vercel publica sozinha em ~2 minutos.

> Os textos são um modelo básico. Recomendamos a revisão por um advogado.

---

## 5. Rodar no seu computador

Precisa de [Node.js 22+](https://nodejs.org) e [Docker Desktop](https://www.docker.com/products/docker-desktop/)
(para o Supabase local).

```bash
npm install
```

```bash
npx supabase start
```

O comando acima mostra a **API URL**, a **Publishable key** e a **Secret key** locais.
Copie `.env.example` para `.env.local` e preencha com elas. Use
`NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321`, `KIWIFY_WEBHOOK_TOKEN` com qualquer
texto de 16+ caracteres e `RESEND_API_KEY=re_dev` (os e-mails do sistema aparecem só no
terminal).

```bash
npm run dev
```

- Site: http://localhost:3000
- Caixa de e-mails de teste (links de login): http://127.0.0.1:54324

**Ferramentas úteis:**

| Comando | O que faz |
|---|---|
| `npm run acesso -- email@x.com` | Cria a conta e ativa a assinatura sem passar pela Kiwify |
| `npm run acesso -- email@x.com --desativar` | Desativa a assinatura |
| `npm run webhook:simular -- compra_aprovada email@x.com` | Simula a Kiwify (evento assinado). Eventos: `compra_aprovada`, `renovada`, `atrasada`, `cancelada`, `reembolsada`, `chargeback`, `pix_gerado` |
| `npm run webhook:simular -- compra_aprovada email@x.com https://seudominio.com.br/api/webhooks/kiwify` | O mesmo, contra o site em produção (usa o token do seu `.env.local`) |

---

## 6. Testes

| Comando | O que cobre |
|---|---|
| `npm test` | 92 testes: **webhook** (cada evento, token inválido/ausente, corpo alterado, evento duplicado, entrega simultânea, atraso fora de ordem, falha de banco e de e-mail, vetor oficial de assinatura da Kiwify), **mensagem do WhatsApp**, horário de funcionamento, validações e contraste de cores |
| `npm run test:db` | Sobe um Postgres descartável e testa **todas as regras de RLS** (isolamento entre vendedores, assinatura inativa só leitura, visitante sem acesso às tabelas, storage por pasta, limite de produtos, cancelamento até o fim do período) |
| `npm run typecheck` / `npm run lint` | Tipos e padrões de código |

O GitHub roda tudo isso automaticamente a cada envio (`.github/workflows/ci.yml`).

---

## 7. Como funciona por dentro

```
Cliente (celular) ─► /[slug]  página em cache (abre rápido), carrinho salvo no aparelho
                        └─► wa.me/55… com o pedido formatado ─► WhatsApp do vendedor

Vendedor ─► /entrar (link mágico) ─► /painel (Server Actions + RLS)

Kiwify ─POST /api/webhooks/kiwify?signature=… ─► valida HMAC-SHA1 do corpo cru
        ─► grava em webhook_events (chave única = evento + pedido) ─► aplica a regra
        ─► cria usuário / ativa / suspende ─► limpa o cache da loja ─► e-mail via Resend
```

```
src/
  app/
    page.tsx                 Landing page
    [slug]/                  Loja pública
    entrar/, auth/           Login por link mágico
    painel/                  Painel do vendedor (actions.ts = todas as alterações)
    api/webhooks/kiwify/     Webhook
    api/track/               Contador de visitas/cliques
    termos/, privacidade/    Páginas legais
  components/                ui/ (shadcn), store/, dashboard/, marketing/
  lib/
    kiwify/                  Assinatura, eventos, regras e processamento do webhook
    whatsapp/                Montagem da mensagem do pedido
    data/                    Leitura de dados (painel e loja pública)
    validation/              Schemas zod
    env.ts / env.server.ts   Variáveis de ambiente (públicas / secretas)
    legal.ts                 ✏️ Seus dados legais
    site.ts                  Nome, preço e limites
supabase/
  migrations/                Banco, RLS, funções e storage
  templates/                 E-mail de login
  tests/                     Testes de segurança do banco
scripts/                     acesso manual, simulador de webhook, testes do banco
docs/kiwify-webhook-notas.md Resumo da documentação oficial da Kiwify usada
```

Para mudar o preço exibido: `src/lib/site.ts` (e o preço na Kiwify).

---

## 8. Segurança

- **RLS em todas as tabelas.** Cada vendedor só lê e altera a própria loja; com a
  assinatura inativa, fica somente leitura. Testado com ataques reais via API.
- **Visitantes não acessam tabelas.** A loja pública usa uma função que devolve apenas
  campos públicos — e nada de produtos se a loja estiver inativa.
- **Assinaturas e log de webhooks** só podem ser alterados pelo servidor.
- **Webhook:** assinatura HMAC-SHA1 conferida em tempo constante sobre o corpo cru,
  limite de tamanho, idempotência (o mesmo evento nunca é processado 2x) e log de toda
  requisição, inclusive as recusadas.
- **Fotos:** comprimidas no celular; o bucket aceita só JPG/PNG/WebP de até 2 MB e cada
  vendedor só grava na própria pasta.
- **Login:** sem senha, cadastro público desligado, proteção contra redirecionamento
  externo e cabeçalhos de segurança (HSTS, nosniff, anti-iframe).
- **Segredos:** só em variáveis de ambiente; nenhum valor vai para o navegador.

**Riscos conhecidos (aceitos no MVP):**
- O contador de visitas/pedidos pode ser inflado por alguém mal-intencionado (é só um
  indicador, não afeta cobrança).
- A mensagem do pedido é montada no celular do cliente; o vendedor deve conferir os
  valores antes de confirmar (como já faz hoje no WhatsApp).
- Após o fim do período de um cancelamento, a loja pública pode levar até ~1 hora para
  sair do ar (cache). O painel bloqueia na hora.

---

## 9. Operação do dia a dia

- **Ver o que a Kiwify mandou:** Supabase → Table Editor → `webhook_events`.
- **Alertas:** se um evento falhar, chega um e-mail para `NEXT_PUBLIC_SUPPORT_EMAIL` (ou
  `ALERT_EMAIL`, se definido).
- **Cliente comprou com outro e-mail:** em `subscriptions`, corrija o campo `email`, e em
  Authentication → Users altere o e-mail do usuário; ou use `npm run acesso`.
- **Liberar cortesia:** `npm run acesso -- email@cliente.com` (com o `.env.local`
  apontando para produção — cuidado).
- **Trocar o token do webhook sem perder eventos:** coloque o token atual em
  `KIWIFY_WEBHOOK_TOKEN_PREVIOUS` e o novo em `KIWIFY_WEBHOOK_TOKEN` → Redeploy → troque na
  Kiwify → depois de 1 dia, apague `KIWIFY_WEBHOOK_TOKEN_PREVIOUS`.
- **Pedido de exclusão de dados (LGPD):** Supabase → Authentication → Users → apague o
  usuário (a loja, produtos e assinatura são apagados juntos). As fotos ficam em Storage →
  `store-media` → pasta com o id do usuário.
