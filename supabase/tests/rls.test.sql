-- =============================================================================
-- Testes de segurança do banco (RLS, constraints, funções públicas).
-- Rodar com: npm run test:db   (usa um Postgres local descartável)
-- Qualquer falha interrompe o script com erro (ON_ERROR_STOP).
-- =============================================================================
\set ON_ERROR_STOP on
\set QUIET on

-- ---------- Dados de teste (como superusuário / service_role) ----------------
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'ana@example.com'),
  ('00000000-0000-0000-0000-00000000000b', 'bia@example.com'),
  ('00000000-0000-0000-0000-00000000000c', 'caio@example.com');

insert into public.subscriptions (user_id, email, status) values
  ('00000000-0000-0000-0000-00000000000a', 'ana@example.com', 'active'),
  ('00000000-0000-0000-0000-00000000000b', 'bia@example.com', 'active'),
  ('00000000-0000-0000-0000-00000000000c', 'caio@example.com', 'inactive');

insert into public.stores (id, owner_id, slug, name, whatsapp) values
  ('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000a', 'doces-da-ana', 'Doces da Ana', '5511999990001'),
  ('10000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000b', 'marmitas-da-bia', 'Marmitas da Bia', '5511999990002'),
  ('10000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-00000000000c', 'bolos-do-caio', 'Bolos do Caio', '5511999990003');

insert into public.categories (id, store_id, name) values
  ('20000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', 'Brigadeiros'),
  ('20000000-0000-0000-0000-00000000000b', '10000000-0000-0000-0000-00000000000b', 'Marmitas');

insert into public.products (id, store_id, category_id, name, price_cents, is_available) values
  ('30000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-00000000000a', 'Brigadeiro', 350, true),
  ('30000000-0000-0000-0000-0000000000a2', '10000000-0000-0000-0000-00000000000a', null, 'Bolo indisponível', 5000, false),
  ('30000000-0000-0000-0000-00000000000b', '10000000-0000-0000-0000-00000000000b', '20000000-0000-0000-0000-00000000000b', 'Marmita P', 1800, true),
  ('30000000-0000-0000-0000-00000000000c', '10000000-0000-0000-0000-00000000000c', null, 'Bolo de pote', 1200, true);

insert into public.store_stats_daily (store_id, day, visits) values
  ('10000000-0000-0000-0000-00000000000b', current_date, 42);

insert into public.webhook_events (idempotency_key, signature_valid, payload)
values ('teste-1', true, '{"segredo": true}');

\echo '1. Ana só enxerga os próprios dados'
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
set role authenticated;
do $$
begin
  assert (select count(*) from public.stores) = 1, 'Ana deveria ver só 1 loja';
  assert (select slug from public.stores) = 'doces-da-ana', 'Ana viu loja errada';
  assert (select count(*) from public.products) = 2, 'Ana deveria ver só os 2 produtos dela';
  assert (select count(*) from public.categories) = 1, 'Ana viu categorias de outros';
  assert (select count(*) from public.subscriptions) = 1, 'Ana viu assinaturas de outros';
  assert (select count(*) from public.store_stats_daily) = 0, 'Ana viu estatísticas da Bia';
end $$;

\echo '2. Ana não consegue alterar nem apagar dados da Bia'
do $$
declare n int;
begin
  update public.products set price_cents = 1 where store_id = '10000000-0000-0000-0000-00000000000b';
  get diagnostics n = row_count;
  assert n = 0, 'Ana alterou produto da Bia!';

  delete from public.products where store_id = '10000000-0000-0000-0000-00000000000b';
  get diagnostics n = row_count;
  assert n = 0, 'Ana apagou produto da Bia!';

  update public.stores set name = 'Hackeada' where id = '10000000-0000-0000-0000-00000000000b';
  get diagnostics n = row_count;
  assert n = 0, 'Ana alterou loja da Bia!';
end $$;

\echo '3. Ana não consegue criar produto na loja da Bia'
do $$
begin
  begin
    insert into public.products (store_id, name, price_cents)
    values ('10000000-0000-0000-0000-00000000000b', 'Intruso', 100);
    raise exception 'FALHA: Ana inseriu produto na loja da Bia';
  exception when insufficient_privilege then null; -- esperado (RLS)
  end;
end $$;

\echo '4. Ana não consegue usar categoria da Bia no próprio produto'
do $$
begin
  begin
    insert into public.products (store_id, category_id, name, price_cents)
    values ('10000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-00000000000b', 'Mistura', 100);
    raise exception 'FALHA: aceitou categoria de outra loja';
  exception when foreign_key_violation then null; -- esperado
  end;
end $$;

\echo '5. Ana não altera a própria assinatura nem lê o log de webhooks'
do $$
begin
  begin
    update public.subscriptions set status = 'active' where user_id = '00000000-0000-0000-0000-00000000000a';
    raise exception 'FALHA: usuário conseguiu alterar assinatura';
  exception when insufficient_privilege then null;
  end;
  begin
    perform * from public.webhook_events;
    raise exception 'FALHA: usuário leu webhook_events';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.store_stats_daily (store_id, day, visits)
    values ('10000000-0000-0000-0000-00000000000a', current_date, 9999);
    raise exception 'FALHA: usuário inflou estatísticas direto na tabela';
  exception when insufficient_privilege then null;
  end;
end $$;

\echo '6. Ana não consegue "roubar" a loja trocando o owner_id'
do $$
begin
  begin
    update public.stores set owner_id = '00000000-0000-0000-0000-00000000000b'
    where id = '10000000-0000-0000-0000-00000000000a';
    raise exception 'FALHA: owner_id foi alterado';
  exception when others then
    if sqlerrm like 'FALHA%' then raise; end if;
  end;
end $$;

\echo '7. Ana pode editar a própria loja e produtos (assinatura ativa)'
do $$
declare n int;
begin
  update public.products set price_cents = 400 where id = '30000000-0000-0000-0000-00000000000a';
  get diagnostics n = row_count;
  assert n = 1, 'Ana deveria conseguir editar o próprio produto';
end $$;
reset role;

\echo '8. Caio (assinatura inativa) LÊ os dados mas não consegue editar'
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
set role authenticated;
do $$
declare n int;
begin
  assert (select count(*) from public.products) = 1, 'Caio deveria continuar vendo os dados';
  update public.products set price_cents = 1 where id = '30000000-0000-0000-0000-00000000000c';
  get diagnostics n = row_count;
  assert n = 0, 'Caio (inativo) conseguiu editar produto';
  begin
    insert into public.products (store_id, name, price_cents)
    values ('10000000-0000-0000-0000-00000000000c', 'Novo', 100);
    raise exception 'FALHA: inativo inseriu produto';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

\echo '9. Visitante (anon) não lê tabelas, só a função pública'
set request.jwt.claim.sub = '';
set role anon;
do $$
declare j jsonb;
begin
  begin
    perform * from public.products;
    raise exception 'FALHA: anon leu products direto';
  exception when insufficient_privilege then null;
  end;
  begin
    perform * from public.subscriptions;
    raise exception 'FALHA: anon leu subscriptions';
  exception when insufficient_privilege then null;
  end;

  j := public.get_public_store('doces-da-ana');
  assert (j->>'active')::boolean, 'loja da Ana deveria estar ativa';
  assert jsonb_array_length(j->'products') = 1, 'deveria listar só produto disponível';
  assert j->'owner_id' is null, 'não pode vazar owner_id';

  j := public.get_public_store('bolos-do-caio');
  assert (j->>'active')::boolean = false, 'loja do Caio deveria aparecer inativa';
  assert j->'products' is null, 'loja inativa não pode expor produtos';
  assert j->'whatsapp' is null, 'loja inativa não pode expor whatsapp';

  assert public.get_public_store('nao-existe') is null, 'loja inexistente deveria ser null';

  assert public.track_store_event('doces-da-ana', 'visit'), 'deveria contar visita';
  assert public.track_store_event('DOCES-DA-ANA', 'order_click'), 'deveria contar clique';
  assert not public.track_store_event('bolos-do-caio', 'visit'), 'não conta em loja inativa';
  assert not public.track_store_event('doces-da-ana', 'hack'), 'tipo inválido não conta';
end $$;
reset role;

do $$
begin
  assert (select visits from public.store_stats_daily
          where store_id = '10000000-0000-0000-0000-00000000000a') = 1, 'visita não registrada';
  assert (select order_clicks from public.store_stats_daily
          where store_id = '10000000-0000-0000-0000-00000000000a') = 1, 'clique não registrado';
end $$;

\echo '10. Validações do banco (slug, WhatsApp, cor, preço)'
do $$
begin
  begin
    insert into public.stores (owner_id, slug, name) values ('00000000-0000-0000-0000-00000000000c', 'painel', 'X');
    raise exception 'FALHA: aceitou slug reservado';
  exception when check_violation then null;
  end;
  begin
    insert into public.stores (owner_id, slug, name) values (gen_random_uuid(), 'Com Espaco', 'Loja X');
    raise exception 'FALHA: aceitou slug inválido';
  exception when check_violation then null;
  end;
  begin
    update public.stores set whatsapp = '11999990001' where slug = 'doces-da-ana';
    raise exception 'FALHA: aceitou WhatsApp sem 55';
  exception when check_violation then null;
  end;
  begin
    update public.stores set primary_color = 'red' where slug = 'doces-da-ana';
    raise exception 'FALHA: aceitou cor inválida';
  exception when check_violation then null;
  end;
  begin
    update public.products set price_cents = 0 where id = '30000000-0000-0000-0000-00000000000a';
    raise exception 'FALHA: aceitou preço zero';
  exception when check_violation then null;
  end;
end $$;

\echo '11. Storage: Ana só envia arquivos na própria pasta'
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
set role authenticated;
do $$
begin
  insert into storage.objects (bucket_id, name)
  values ('store-media', '00000000-0000-0000-0000-00000000000a/produtos/foto.webp');
  begin
    insert into storage.objects (bucket_id, name)
    values ('store-media', '00000000-0000-0000-0000-00000000000b/produtos/foto.webp');
    raise exception 'FALHA: Ana enviou arquivo na pasta da Bia';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

\echo '12. Limite de 150 produtos por loja'
do $$
begin
  insert into public.products (store_id, name, price_cents)
  select '10000000-0000-0000-0000-00000000000b', 'P' || g, 100 from generate_series(1, 149) g;
  begin
    insert into public.products (store_id, name, price_cents)
    values ('10000000-0000-0000-0000-00000000000b', 'P151', 100);
    raise exception 'FALHA: passou do limite de produtos';
  exception when raise_exception then
    if sqlerrm like 'FALHA%' then raise; end if;
  end;
end $$;

\echo '13. Usuário comum não consegue procurar outros usuários por e-mail'
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
set role authenticated;
do $$
begin
  begin
    perform public.get_user_id_by_email('bia@example.com');
    raise exception 'FALHA: authenticated chamou get_user_id_by_email';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
set role service_role;
do $$
begin
  assert public.get_user_id_by_email(' BIA@example.com ') = '00000000-0000-0000-0000-00000000000b', 'service_role deveria achar a Bia';
  insert into public.webhook_events (idempotency_key, signature_valid) values ('teste-service-role', true);
  update public.subscriptions set status = 'inactive' where email = 'bia@example.com';
end $$;
reset role;

\echo '14. Cancelada: ativa até o fim do período pago, depois inativa'
update public.subscriptions set status = 'active', access_ends_at = now() + interval '5 days'
  where email = 'caio@example.com';
set role anon;
do $$
begin
  assert (public.get_public_store('bolos-do-caio')->>'active')::boolean, 'cancelada no prazo deveria continuar ativa';
end $$;
reset role;
update public.subscriptions set access_ends_at = now() - interval '1 minute'
  where email = 'caio@example.com';
set role anon;
do $$
begin
  assert not (public.get_public_store('bolos-do-caio')->>'active')::boolean, 'cancelada vencida deveria ficar inativa';
end $$;
reset role;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
set role authenticated;
do $$
declare n int;
begin
  update public.products set price_cents = 1 where id = '30000000-0000-0000-0000-00000000000c';
  get diagnostics n = row_count;
  assert n = 0, 'cancelada vencida não pode editar';
end $$;
reset role;

\echo '15. Horários: Ana troca os dela, mas não os da Bia'
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
set role authenticated;
do $$
begin
  perform public.replace_store_hours('10000000-0000-0000-0000-00000000000a',
    '[{"weekday":1,"opens_at":"09:00","closes_at":"18:00"},{"weekday":5,"opens_at":"18:00","closes_at":"02:00"}]');
  assert (select count(*) from public.store_hours) = 2, 'deveria ter 2 horários';
  begin
    perform public.replace_store_hours('10000000-0000-0000-0000-00000000000b', '[]');
    raise exception 'FALHA: Ana trocou horários da Bia';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

\echo ''
\echo 'OK: todos os testes de banco passaram.'
