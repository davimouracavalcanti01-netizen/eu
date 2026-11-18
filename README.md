# Pedidinho

Cardápio digital para quem vende comida caseira. O cliente monta o pedido pelo
celular e ele chega pronto no WhatsApp do vendedor. Assinatura mensal via Kiwify.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind 4 · shadcn/ui ·
Supabase (Postgres, Auth com link mágico, Storage) · Resend · Vercel.

> 🚧 Em construção por fases. Status atual: **Fase 1 concluída** (base,
> banco, autenticação e segurança). O passo a passo completo de deploy
> (Vercel + Kiwify + teste de compra) entra na Fase 6.

---

## Rodar no seu computador (Fase 1)

Você vai precisar de: [Node.js 20+](https://nodejs.org) e uma conta gratuita no
[Supabase](https://supabase.com).

### 1. Criar o projeto no Supabase

1. Entre em https://supabase.com/dashboard e clique em **New project**.
2. **Name:** `pedidinho` · **Database Password:** clique em *Generate* e guarde
   num lugar seguro · **Region:** `South America (São Paulo)`.
3. Clique em **Create new project** e espere uns 2 minutos.

### 2. Criar as tabelas e as regras de segurança

1. No menu da esquerda, abra **SQL Editor** → **New query**.
2. Abra o arquivo `supabase/migrations/20261118000000_init.sql` deste projeto,
   copie **todo** o conteúdo e cole no editor.
3. Clique em **Run**. Deve aparecer *Success. No rows returned*.

### 3. Configurar o login por e-mail (sem senha)

1. **Authentication → Sign In / Providers → Email**: deixe *Email* ligado.
2. Na mesma tela (ou em **Authentication → Settings**), **desligue**
   *Allow new users to sign up*. Assim só quem comprou consegue entrar —
   as contas são criadas automaticamente pelo sistema após o pagamento.
3. **Authentication → URL Configuration**:
   - **Site URL:** `http://localhost:3000` (em produção, troque pelo seu domínio).
   - **Redirect URLs:** adicione `http://localhost:3000/**`.
4. **Authentication → Emails → Templates → Magic Link**:
   - **Subject:** `Seu link de acesso ao Pedidinho`
   - **Body:** apague o conteúdo e cole o arquivo `supabase/templates/magic-link.html`.
   - Clique em **Save**.

   > Por que trocar o modelo? O link padrão só funciona se for aberto no
   > mesmo navegador em que foi pedido. O nosso funciona em qualquer um
   > (por exemplo, pedir no computador e abrir no app do Gmail no celular).

### 4. Preencher as variáveis de ambiente

1. Copie o arquivo de exemplo:
   ```bash
   cp .env.example .env.local
   ```
2. No Supabase, vá em **Project Settings → API Keys** e copie para o `.env.local`:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **Publishable key** → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - **Secret key** → `SUPABASE_SECRET_KEY` (⚠️ nunca compartilhe essa)
3. As variáveis da Kiwify e do Resend podem ficar com valores provisórios por
   enquanto (ex.: `KIWIFY_WEBHOOK_TOKEN=provisorio123`,
   `RESEND_API_KEY=re_provisorio`). Elas serão configuradas na Fase 4.

### 5. Instalar, liberar seu acesso e rodar

```bash
npm install
```

```bash
npm run acesso -- seu@email.com
```

```bash
npm run dev
```

Abra http://localhost:3000/entrar, digite o mesmo e-mail e clique no link que
chegar na sua caixa de entrada.

> O envio de e-mails padrão do Supabase permite poucos e-mails por hora. Serve
> para testar; na Fase 4 ligamos o Resend para produção.

Para testar a tela de assinatura inativa:

```bash
npm run acesso -- seu@email.com --desativar
```

---

## Testes

| Comando | O que testa |
|---|---|
| `npm test` | Testes unitários (validações, links, segurança de redirecionamento) |
| `npm run test:db` | Sobe um Postgres local descartável, aplica as migrations e testa **todas as regras de RLS** (um vendedor não vê/edita dados de outro, assinatura inativa fica somente-leitura, visitante não lê tabelas, storage por pasta etc.). Requer PostgreSQL 15+ instalado. |
| `npm run typecheck` | Checagem de tipos do TypeScript |
| `npm run lint` | Padrões de código |

---

## Estrutura

```
src/
  app/
    entrar/            Login por link mágico
    auth/confirm/      Destino do link do e-mail
    auth/sair/         Logout (POST)
    painel/            Área logada (bloqueia se a assinatura estiver inativa)
  components/ui/       Componentes shadcn/ui
  lib/
    env.ts             Variáveis de ambiente validadas com zod
    auth.ts            Usuário logado e assinatura (servidor)
    supabase/          Clientes: navegador, servidor, público e admin
    validation/        Schemas zod (login, loja, WhatsApp)
  proxy.ts             Renova a sessão e protege /painel
supabase/
  migrations/          Banco: tabelas, RLS, funções, storage
  templates/           Modelo do e-mail de login
  tests/               Testes de segurança do banco
scripts/
  conceder-acesso.mjs  Liberar/retirar acesso manualmente
  test-db.sh           Roda os testes do banco
```

## Segurança (resumo)

- **RLS em todas as tabelas.** Cada vendedor só lê e altera a própria loja.
- **Assinatura inativa = somente leitura.** Os dados nunca são apagados.
- **Visitantes não acessam tabelas.** A página pública usa uma função que
  devolve só os campos públicos — e nada de produtos se a loja estiver inativa.
- **Assinaturas e log de webhooks** só podem ser escritos pelo servidor.
- **Fotos:** bucket com limite de 2 MB, só imagens, e cada vendedor só grava
  na própria pasta.
- **Nenhum segredo no código:** tudo em variáveis de ambiente (`.env.example`).
