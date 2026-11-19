-- =============================================================================
-- Pedidinho — esquema inicial
-- Tabelas, Row Level Security (RLS), funções e Storage.
--
-- Princípios:
--   * RLS ligado em TODAS as tabelas do schema public.
--   * O vendedor só enxerga/edita o que é dele (owner_id = auth.uid()).
--   * Escrita do vendedor exige assinatura ativa (os dados nunca são apagados
--     quando a assinatura cai — apenas ficam somente-leitura).
--   * Assinaturas e log de webhooks só são escritos pelo servidor
--     (service_role, que ignora RLS). Nenhuma policy de escrita para usuários.
--   * O público (anon) NÃO lê as tabelas diretamente: usa a função
--     get_public_store(slug), que devolve só campos públicos.
-- =============================================================================

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Utilitários
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Assinaturas (1 por usuário). Escrita apenas pelo webhook (service_role).
-- -----------------------------------------------------------------------------
create type public.subscription_status as enum ('active', 'inactive');

create table public.subscriptions (
  user_id                uuid primary key references auth.users (id) on delete cascade,
  email                  text not null,
  status                 public.subscription_status not null default 'inactive',
  kiwify_subscription_id text,
  kiwify_order_id        text,
  current_period_end     timestamptz,
  -- Preenchido quando a assinatura é cancelada: o acesso continua até esta
  -- data (fim do período já pago) e depois a loja fica inativa sozinha.
  access_ends_at         timestamptz,
  last_event_type        text,
  last_event_at          timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create index subscriptions_kiwify_subscription_id_idx
  on public.subscriptions (kiwify_subscription_id);
create index subscriptions_email_idx on public.subscriptions (lower(email));

create trigger subscriptions_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- Regra única de "assinatura ativa": status ativo E (sem data de término OU
-- data de término no futuro). Usada em todas as policies e funções.
create or replace function public.subscription_is_active(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.subscriptions s
    where s.user_id = p_user_id
      and s.status = 'active'
      and (s.access_ends_at is null or s.access_ends_at > now())
  );
$$;

-- Retorna true se o usuário logado tem assinatura ativa.
-- SECURITY DEFINER para poder ser usada dentro de policies de outras tabelas.
create or replace function public.has_active_subscription()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.subscription_is_active((select auth.uid()));
$$;

-- -----------------------------------------------------------------------------
-- Lojas (1 por vendedor)
-- -----------------------------------------------------------------------------
create table public.stores (
  id                 uuid primary key default gen_random_uuid(),
  owner_id           uuid not null unique references auth.users (id) on delete cascade,
  slug               text not null unique,
  name               text not null,
  description        text,
  logo_path          text,
  primary_color      text not null default '#E11D48',
  whatsapp           text,
  pix_key            text,
  pix_key_type       text,
  delivery_fee_cents integer not null default 0,
  allows_delivery    boolean not null default true,
  allows_pickup      boolean not null default true,
  pickup_address     text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),

  -- 3 a 40 caracteres: letras minúsculas, números e hífen (sem hífen nas pontas)
  constraint stores_slug_format check (slug ~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$'),
  constraint stores_slug_no_double_hyphen check (slug !~ '--'),
  -- Endereços usados pelo próprio app não podem virar nome de loja
  constraint stores_slug_reserved check (slug not in (
    'admin', 'api', 'app', 'auth', 'entrar', 'login', 'logout', 'sair', 'painel',
    'dashboard', 'termos', 'privacidade', 'precos', 'preco', 'planos', 'ajuda',
    'suporte', 'contato', 'blog', 'www', 'static', 'assets', 'public', 'loja',
    'lojas', 'cadastro', 'assinar', 'checkout', 'webhook', 'webhooks', 'pedidinho',
    'sobre', 'faq', 'favicon', 'robots', 'sitemap', 'manifest', 'conta', 'config',
    'demo', 'exemplo', 'teste', 'images', 'img', '_next'
  )),
  constraint stores_name_len check (char_length(name) between 2 and 60),
  constraint stores_description_len check (description is null or char_length(description) <= 200),
  constraint stores_color_format check (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  -- Somente dígitos, com DDI 55 + DDD + número (10 ou 11 dígitos)
  constraint stores_whatsapp_format check (whatsapp is null or whatsapp ~ '^55[0-9]{10,11}$'),
  constraint stores_pix_key_len check (pix_key is null or char_length(pix_key) <= 140),
  constraint stores_pix_key_type check (
    pix_key_type is null or pix_key_type in ('cpf', 'cnpj', 'email', 'telefone', 'aleatoria')
  ),
  constraint stores_delivery_fee_range check (delivery_fee_cents between 0 and 100000),
  constraint stores_pickup_address_len check (pickup_address is null or char_length(pickup_address) <= 200),
  constraint stores_logo_path_len check (logo_path is null or char_length(logo_path) <= 300)
);

create trigger stores_updated_at
  before update on public.stores
  for each row execute function public.set_updated_at();

-- O dono da loja não pode ser trocado.
create or replace function public.prevent_owner_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.owner_id is distinct from old.owner_id then
    raise exception 'owner_id não pode ser alterado';
  end if;
  return new;
end;
$$;

create trigger stores_owner_immutable
  before update on public.stores
  for each row execute function public.prevent_owner_change();

-- Retorna true se a loja pertence ao usuário logado.
create or replace function public.owns_store(p_store_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.stores st
    where st.id = p_store_id
      and st.owner_id = (select auth.uid())
  );
$$;

-- -----------------------------------------------------------------------------
-- Horário de funcionamento (pode haver mais de um turno por dia)
-- weekday: 0 = domingo ... 6 = sábado. Horário no fuso America/Sao_Paulo.
-- closes_at < opens_at significa que vira a madrugada (ex.: 18:00 → 02:00).
-- -----------------------------------------------------------------------------
create table public.store_hours (
  id        uuid primary key default gen_random_uuid(),
  store_id  uuid not null references public.stores (id) on delete cascade,
  weekday   smallint not null,
  opens_at  time not null,
  closes_at time not null,
  constraint store_hours_weekday check (weekday between 0 and 6),
  constraint store_hours_not_empty check (opens_at <> closes_at)
);

create index store_hours_store_id_idx on public.store_hours (store_id);

-- -----------------------------------------------------------------------------
-- Categorias
-- -----------------------------------------------------------------------------
create table public.categories (
  id         uuid primary key default gen_random_uuid(),
  store_id   uuid not null references public.stores (id) on delete cascade,
  name       text not null,
  position   integer not null default 0,
  created_at timestamptz not null default now(),
  constraint categories_name_len check (char_length(name) between 1 and 40),
  -- necessário para a FK composta de products (garante mesma loja)
  constraint categories_id_store_unique unique (id, store_id)
);

create index categories_store_id_idx on public.categories (store_id);

-- -----------------------------------------------------------------------------
-- Produtos
-- -----------------------------------------------------------------------------
create table public.products (
  id           uuid primary key default gen_random_uuid(),
  store_id     uuid not null references public.stores (id) on delete cascade,
  category_id  uuid,
  name         text not null,
  description  text,
  price_cents  integer not null,
  image_path   text,
  is_available boolean not null default true,
  position     integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  -- A categoria precisa ser da MESMA loja. Ao apagar a categoria, o produto
  -- fica "sem categoria" (só category_id vira null; store_id é preservado).
  constraint products_category_same_store
    foreign key (category_id, store_id)
    references public.categories (id, store_id)
    on delete set null (category_id),

  constraint products_name_len check (char_length(name) between 1 and 80),
  constraint products_description_len check (description is null or char_length(description) <= 500),
  constraint products_price_range check (price_cents between 1 and 10000000),
  constraint products_image_path_len check (image_path is null or char_length(image_path) <= 300)
);

create index products_store_id_idx on public.products (store_id);
create index products_category_id_idx on public.products (category_id);

create trigger products_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

-- Limite de produtos por loja (evita abuso de armazenamento).
create or replace function public.enforce_product_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select count(*) from public.products where store_id = new.store_id) >= 150 then
    raise exception 'Limite de 150 produtos por loja atingido'
      using errcode = 'P0001', hint = 'product_limit';
  end if;
  return new;
end;
$$;

create trigger products_limit
  before insert on public.products
  for each row execute function public.enforce_product_limit();

-- -----------------------------------------------------------------------------
-- Estatísticas diárias (visitas e cliques em "Pedir")
-- -----------------------------------------------------------------------------
create table public.store_stats_daily (
  store_id     uuid not null references public.stores (id) on delete cascade,
  day          date not null,
  visits       integer not null default 0,
  order_clicks integer not null default 0,
  primary key (store_id, day)
);

-- -----------------------------------------------------------------------------
-- Log de webhooks (auditoria + idempotência). Somente service_role.
-- -----------------------------------------------------------------------------
create table public.webhook_events (
  id               bigint generated always as identity primary key,
  provider         text not null default 'kiwify',
  idempotency_key  text not null unique,
  event_type       text,
  order_id         text,
  subscription_id  text,
  customer_email   text,
  signature_valid  boolean not null,
  status           text not null default 'received',
  error            text,
  payload          jsonb,
  received_at      timestamptz not null default now(),
  processed_at     timestamptz,
  constraint webhook_events_status check (
    status in ('received', 'processed', 'ignored', 'error', 'rejected')
  )
);

create index webhook_events_received_at_idx on public.webhook_events (received_at desc);
create index webhook_events_customer_email_idx on public.webhook_events (lower(customer_email));

-- =============================================================================
-- Row Level Security
-- =============================================================================
alter table public.subscriptions     enable row level security;
alter table public.stores            enable row level security;
alter table public.store_hours       enable row level security;
alter table public.categories        enable row level security;
alter table public.products          enable row level security;
alter table public.store_stats_daily enable row level security;
alter table public.webhook_events    enable row level security;

-- Privilégios explícitos (não dependemos dos grants padrão do projeto).
revoke all on public.subscriptions, public.stores, public.store_hours,
  public.categories, public.products, public.store_stats_daily,
  public.webhook_events
  from anon, authenticated;

-- O servidor (service_role) precisa de acesso total; ele ignora o RLS.
grant all on public.subscriptions, public.stores, public.store_hours,
  public.categories, public.products, public.store_stats_daily,
  public.webhook_events
  to service_role;

grant select on public.subscriptions to authenticated;
grant select, insert, update, delete on public.stores to authenticated;
grant select, insert, update, delete on public.store_hours to authenticated;
grant select, insert, update, delete on public.categories to authenticated;
grant select, insert, update, delete on public.products to authenticated;
grant select on public.store_stats_daily to authenticated;
-- webhook_events: nenhum grant para anon/authenticated.

-- subscriptions: o usuário só LÊ a própria assinatura.
create policy "subscriptions: dono lê"
  on public.subscriptions for select
  to authenticated
  using (user_id = (select auth.uid()));

-- stores
create policy "stores: dono lê"
  on public.stores for select
  to authenticated
  using (owner_id = (select auth.uid()));

create policy "stores: dono cria com assinatura ativa"
  on public.stores for insert
  to authenticated
  with check (owner_id = (select auth.uid()) and public.has_active_subscription());

create policy "stores: dono edita com assinatura ativa"
  on public.stores for update
  to authenticated
  using (owner_id = (select auth.uid()) and public.has_active_subscription())
  with check (owner_id = (select auth.uid()));

create policy "stores: dono apaga com assinatura ativa"
  on public.stores for delete
  to authenticated
  using (owner_id = (select auth.uid()) and public.has_active_subscription());

-- store_hours / categories / products: mesmas regras via owns_store()
create policy "store_hours: dono lê"
  on public.store_hours for select to authenticated
  using (public.owns_store(store_id));
create policy "store_hours: dono escreve com assinatura ativa"
  on public.store_hours for all to authenticated
  using (public.owns_store(store_id) and public.has_active_subscription())
  with check (public.owns_store(store_id) and public.has_active_subscription());

create policy "categories: dono lê"
  on public.categories for select to authenticated
  using (public.owns_store(store_id));
create policy "categories: dono escreve com assinatura ativa"
  on public.categories for all to authenticated
  using (public.owns_store(store_id) and public.has_active_subscription())
  with check (public.owns_store(store_id) and public.has_active_subscription());

create policy "products: dono lê"
  on public.products for select to authenticated
  using (public.owns_store(store_id));
create policy "products: dono escreve com assinatura ativa"
  on public.products for all to authenticated
  using (public.owns_store(store_id) and public.has_active_subscription())
  with check (public.owns_store(store_id) and public.has_active_subscription());

create policy "store_stats_daily: dono lê"
  on public.store_stats_daily for select to authenticated
  using (public.owns_store(store_id));

-- webhook_events: RLS ligado e NENHUMA policy => só service_role acessa.

-- =============================================================================
-- Funções públicas (chamadas pela página da loja, sem login)
-- =============================================================================

-- Dados públicos da loja em uma única chamada.
-- Loja inexistente  -> null
-- Assinatura inativa -> {"active": false, "name": ..., "slug": ...}
-- Ativa              -> loja + horários + categorias + produtos disponíveis
create or replace function public.get_public_store(p_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_store  public.stores%rowtype;
  v_active boolean;
begin
  select * into v_store from public.stores where slug = lower(p_slug);
  if not found then
    return null;
  end if;

  v_active := public.subscription_is_active(v_store.owner_id);

  if not v_active then
    return jsonb_build_object(
      'active', false,
      'slug', v_store.slug,
      'name', v_store.name,
      'primary_color', v_store.primary_color
    );
  end if;

  return jsonb_build_object(
    'active', true,
    'id', v_store.id,
    'slug', v_store.slug,
    'name', v_store.name,
    'description', v_store.description,
    'logo_path', v_store.logo_path,
    'primary_color', v_store.primary_color,
    'whatsapp', v_store.whatsapp,
    'pix_key', v_store.pix_key,
    'pix_key_type', v_store.pix_key_type,
    'delivery_fee_cents', v_store.delivery_fee_cents,
    'allows_delivery', v_store.allows_delivery,
    'allows_pickup', v_store.allows_pickup,
    'pickup_address', v_store.pickup_address,
    'hours', coalesce((
      select jsonb_agg(jsonb_build_object(
        'weekday', h.weekday,
        'opens_at', to_char(h.opens_at, 'HH24:MI'),
        'closes_at', to_char(h.closes_at, 'HH24:MI')
      ) order by h.weekday, h.opens_at)
      from public.store_hours h where h.store_id = v_store.id
    ), '[]'::jsonb),
    'categories', coalesce((
      select jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name)
        order by c.position, c.name)
      from public.categories c where c.store_id = v_store.id
    ), '[]'::jsonb),
    'products', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id,
        'category_id', p.category_id,
        'name', p.name,
        'description', p.description,
        'price_cents', p.price_cents,
        'image_path', p.image_path
      ) order by p.position, p.name)
      from public.products p
      where p.store_id = v_store.id and p.is_available
    ), '[]'::jsonb)
  );
end;
$$;

-- Incrementa visitas ou cliques em "Pedir" do dia (fuso de São Paulo).
-- Só conta para lojas ativas. Retorna true se contou.
create or replace function public.track_store_event(p_slug text, p_kind text)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_store_id uuid;
  v_day date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  if p_kind not in ('visit', 'order_click') then
    return false;
  end if;

  select st.id into v_store_id
  from public.stores st
  where st.slug = lower(p_slug)
    and public.subscription_is_active(st.owner_id);

  if v_store_id is null then
    return false;
  end if;

  insert into public.store_stats_daily as d (store_id, day, visits, order_clicks)
  values (
    v_store_id, v_day,
    case when p_kind = 'visit' then 1 else 0 end,
    case when p_kind = 'order_click' then 1 else 0 end
  )
  on conflict (store_id, day) do update set
    visits       = d.visits + excluded.visits,
    order_clicks = d.order_clicks + excluded.order_clicks;

  return true;
end;
$$;

-- Verifica se um link (slug) está livre. Usado no cadastro/edição da loja.
create or replace function public.is_slug_available(p_slug text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (
    select 1 from public.stores
    where slug = lower(p_slug)
      and owner_id is distinct from (select auth.uid())
  );
$$;

-- Substitui todos os horários da loja de uma vez (atômico).
-- SECURITY INVOKER: roda com as permissões do usuário, então o RLS vale.
create or replace function public.replace_store_hours(p_store_id uuid, p_hours jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if jsonb_typeof(p_hours) <> 'array' or jsonb_array_length(p_hours) > 21 then
    raise exception 'Lista de horários inválida';
  end if;
  if not public.owns_store(p_store_id) then
    raise exception 'Loja não encontrada' using errcode = '42501';
  end if;

  delete from public.store_hours where store_id = p_store_id;

  insert into public.store_hours (store_id, weekday, opens_at, closes_at)
  select p_store_id, (h->>'weekday')::smallint, (h->>'opens_at')::time, (h->>'closes_at')::time
  from jsonb_array_elements(p_hours) as h;
end;
$$;

-- Busca o id de um usuário pelo e-mail (usado pelo webhook). Só service_role.
create or replace function public.get_user_id_by_email(p_email text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select u.id from auth.users u where lower(u.email) = lower(trim(p_email)) limit 1;
$$;

-- Permissões de execução: por padrão o Postgres libera para PUBLIC; fechamos.
revoke execute on function public.get_public_store(text)        from public;
revoke execute on function public.track_store_event(text, text) from public;
revoke execute on function public.is_slug_available(text)       from public;
revoke execute on function public.replace_store_hours(uuid, jsonb) from public;
revoke execute on function public.has_active_subscription()     from public;
revoke execute on function public.subscription_is_active(uuid)  from public, anon, authenticated;
revoke execute on function public.owns_store(uuid)              from public;
revoke execute on function public.get_user_id_by_email(text)    from public, anon, authenticated;

grant execute on function public.get_public_store(text)        to anon, authenticated;
grant execute on function public.track_store_event(text, text) to anon, authenticated;
grant execute on function public.is_slug_available(text)       to authenticated;
grant execute on function public.replace_store_hours(uuid, jsonb) to authenticated;
grant execute on function public.has_active_subscription()     to authenticated;
grant execute on function public.subscription_is_active(uuid)  to service_role;
grant execute on function public.owns_store(uuid)              to authenticated;
grant execute on function public.get_user_id_by_email(text)    to service_role;

-- =============================================================================
-- Storage: fotos de produtos e logos
-- Bucket público (leitura por URL), com limite de 2 MB e só imagens.
-- Cada vendedor só grava dentro da pasta com o próprio id: {user_id}/...
-- =============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'store-media', 'store-media', true, 2097152,
  array['image/webp', 'image/jpeg', 'image/png']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "store-media: dono envia na própria pasta"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'store-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and public.has_active_subscription()
  );

create policy "store-media: dono lê a própria pasta"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'store-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "store-media: dono atualiza a própria pasta"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'store-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'store-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and public.has_active_subscription()
  );

create policy "store-media: dono apaga da própria pasta"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'store-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
