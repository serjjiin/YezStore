-- ============================================================
-- Yez Store — Schema inicial do banco de dados
-- Execute este script no SQL Editor do Supabase
-- ============================================================

-- Extensão para gerar UUIDs
create extension if not exists "uuid-ossp";

-- ============================================================
-- Tabela: artisans (Artesãos / Parceiros)
-- ============================================================
create table if not exists artisans (
  id                uuid primary key default uuid_generate_v4(),
  name              text not null,
  contact_email     text,
  phone             text,
  split_percentage  integer not null default 80
    check (split_percentage between 1 and 99),
  pix_key           text,
  created_at        timestamptz not null default now()
);

-- ============================================================
-- Tabela: products (Catálogo de produtos)
-- ============================================================
create table if not exists products (
  id              uuid primary key default uuid_generate_v4(),
  artisan_id      uuid references artisans(id) on delete set null,
  title           text not null,
  description     text,
  price           numeric(10,2) not null check (price >= 0),
  stock_quantity  integer not null default 0 check (stock_quantity >= 0),
  category        text,
  image_url       text,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);

-- ============================================================
-- Tabela: orders (Pedidos)
-- ============================================================
create table if not exists orders (
  id                uuid primary key default uuid_generate_v4(),
  customer_name     text not null,
  customer_email    text not null,
  customer_phone    text,
  status            text not null default 'pending'
    check (status in ('pending', 'paid', 'shipped', 'cancelled')),
  total_amount      numeric(10,2) not null default 0,
  shipping_cost     numeric(10,2) not null default 0,
  shipping_address  jsonb,
  shipping_option   jsonb,
  mp_payment_id     text,
  mp_preference_id  text,
  created_at        timestamptz not null default now()
);

-- ============================================================
-- Tabela: order_items (Itens de cada pedido)
-- ============================================================
create table if not exists order_items (
  id          uuid primary key default uuid_generate_v4(),
  order_id    uuid not null references orders(id) on delete cascade,
  product_id  uuid references products(id) on delete set null,
  quantity    integer not null check (quantity > 0),
  unit_price  numeric(10,2) not null check (unit_price >= 0),
  created_at  timestamptz not null default now()
);

-- ============================================================
-- Índices para performance
-- ============================================================
create index if not exists idx_products_artisan_id on products(artisan_id);
create index if not exists idx_products_is_active on products(is_active);
create index if not exists idx_products_category on products(category);
create index if not exists idx_orders_status on orders(status);
create index if not exists idx_orders_created_at on orders(created_at desc);
create index if not exists idx_order_items_order_id on order_items(order_id);
create index if not exists idx_order_items_product_id on order_items(product_id);

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================

-- Habilita RLS em todas as tabelas
alter table artisans enable row level security;
alter table products enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;

-- Produtos: leitura pública para produtos ativos
create policy "Produtos ativos são públicos" on products
  for select using (is_active = true);

-- Artesãos: leitura pública (nome aparece no produto)
create policy "Artesãos são públicos" on artisans
  for select using (true);

-- Orders: INSERT público (cliente cria o pedido via API route com service role)
-- A leitura/atualização é feita apenas via service role (API route admin)

-- Usuários autenticados (admin) têm acesso total via service role key
-- (o service role bypassa RLS — não precisa de policies adicionais)

-- ============================================================
-- Storage: bucket para imagens de produtos
-- Execute manualmente no Supabase Dashboard > Storage > New bucket
-- Nome: produtos | Public: SIM
-- ============================================================

-- ============================================================
-- Dados de exemplo para desenvolvimento
-- ============================================================
insert into artisans (name, contact_email, phone, split_percentage, pix_key)
values
  ('Arte da Ana', 'ana@exemplo.com', '(61) 99999-0001', 80, 'ana@exemplo.com'),
  ('Crochê da Bia', 'bia@exemplo.com', '(61) 99999-0002', 75, '(61) 99999-0002'),
  ('Peças da Carol', 'carol@exemplo.com', '(61) 99999-0003', 80, 'carol@exemplo.com')
on conflict do nothing;

insert into products (artisan_id, title, description, price, stock_quantity, category, is_active)
select
  a.id,
  'Sousplat de Crochê Mostarda',
  'Sousplat artesanal feito à mão em crochê com barbante 100% algodão na cor mostarda. Ideal para decorar sua mesa com um toque rústico e aconchegante.',
  45.00,
  8,
  'Crochê',
  true
from artisans a where a.name = 'Crochê da Bia'
on conflict do nothing;

insert into products (artisan_id, title, description, price, stock_quantity, category, is_active)
select
  a.id,
  'Vaso Decorativo em Cerâmica',
  'Vaso artesanal em cerâmica com textura natural e acabamento fosco. Perfeito para decorar qualquer ambiente com charme e autenticidade.',
  89.90,
  3,
  'Decoração',
  true
from artisans a where a.name = 'Arte da Ana'
on conflict do nothing;

insert into products (artisan_id, title, description, price, stock_quantity, category, is_active)
select
  a.id,
  'Brinco Semijoia Dourado Floral',
  'Brinco semijoia banhado a ouro 18k com detalhes florais. Hipoalergênico e resistente. Acompanha caixinha presente.',
  38.00,
  15,
  'Semi-joias',
  true
from artisans a where a.name = 'Peças da Carol'
on conflict do nothing;
