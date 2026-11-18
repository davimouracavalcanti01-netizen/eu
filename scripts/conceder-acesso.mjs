#!/usr/bin/env node
/**
 * Libera (ou retira) acesso MANUALMENTE a um e-mail, sem passar pela Kiwify.
 * Útil para testar antes de ligar o webhook, ou para dar cortesia a alguém.
 *
 * Uso:
 *   npm run acesso -- ana@email.com            → cria a conta (se não existir) e ativa
 *   npm run acesso -- ana@email.com --desativar → marca como inativa
 *
 * Lê NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SECRET_KEY do .env.local.
 */
import { createClient } from "@supabase/supabase-js";

const [, , rawEmail, flag] = process.argv;
const email = rawEmail?.trim().toLowerCase();
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error("Informe um e-mail válido. Ex.: npm run acesso -- ana@email.com");
  process.exit(1);
}
const deactivate = flag === "--desativar";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
if (!url || !secret) {
  console.error("Preencha NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SECRET_KEY no .env.local");
  process.exit(1);
}

const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });

let { data: userId, error } = await admin.rpc("get_user_id_by_email", { p_email: email });
if (error) throw error;

if (!userId) {
  if (deactivate) {
    console.log(`Nenhuma conta com ${email}. Nada a fazer.`);
    process.exit(0);
  }
  const created = await admin.auth.admin.createUser({ email, email_confirm: true });
  if (created.error) throw created.error;
  userId = created.data.user.id;
  console.log(`Conta criada para ${email}`);
}

const { error: upsertError } = await admin.from("subscriptions").upsert(
  {
    user_id: userId,
    email,
    status: deactivate ? "inactive" : "active",
    last_event_type: deactivate ? "manual_deactivation" : "manual_activation",
    last_event_at: new Date().toISOString(),
  },
  { onConflict: "user_id" },
);
if (upsertError) throw upsertError;

console.log(`Assinatura de ${email}: ${deactivate ? "INATIVA" : "ATIVA"}.`);
if (!deactivate) console.log("Agora é só entrar em /entrar com esse e-mail.");
