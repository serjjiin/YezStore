-- ============================================================
-- Yez Store — Corrige políticas RLS para verificar role real de admin
--
-- PROBLEMA: as policies anteriores usavam auth.role() = 'authenticated',
-- o que permitia que QUALQUER conta Supabase (não apenas o admin da Yez)
-- modificasse produtos, artesãos e pedidos.
--
-- SOLUÇÃO: verificar app_metadata.role = 'admin' no JWT do usuário.
--
-- PRÉ-REQUISITO: o usuário admin precisa ter app_metadata configurado.
-- No Supabase Dashboard > Authentication > Users > selecione o admin:
--   Edit > Raw app_meta_data: { "role": "admin" }
-- ============================================================

-- ------------------------------------------------------------
-- Função auxiliar: retorna true somente para admins reais
-- ------------------------------------------------------------
create or replace function is_admin()
returns boolean
language sql
stable
as $$
  select (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
$$;

-- ------------------------------------------------------------
-- Remove políticas antigas (permissivas demais)
-- ------------------------------------------------------------
drop policy if exists "Admin gerencia produtos"    on products;
drop policy if exists "Admin gerencia artesaos"    on artisans;
drop policy if exists "Admin gerencia pedidos"     on orders;
drop policy if exists "Admin gerencia order_items" on order_items;

drop policy if exists "Admin faz upload de imagens" on storage.objects;
drop policy if exists "Admin deleta imagens"        on storage.objects;

-- ------------------------------------------------------------
-- Produtos
-- Leitura pública de ativos já existe em 001 — admin vê todos
-- ------------------------------------------------------------
create policy "Admin real gerencia produtos" on products
  for all
  to authenticated
  using (is_admin())
  with check (is_admin());

-- ------------------------------------------------------------
-- Artesãos
-- Leitura pública já existe em 001 — admin pode escrever
-- ------------------------------------------------------------
create policy "Admin real gerencia artesaos" on artisans
  for all
  to authenticated
  using (is_admin())
  with check (is_admin());

-- ------------------------------------------------------------
-- Pedidos — acesso completo somente para admin
-- ------------------------------------------------------------
create policy "Admin real gerencia pedidos" on orders
  for all
  to authenticated
  using (is_admin())
  with check (is_admin());

-- ------------------------------------------------------------
-- Itens de pedido — acesso completo somente para admin
-- ------------------------------------------------------------
create policy "Admin real gerencia order_items" on order_items
  for all
  to authenticated
  using (is_admin())
  with check (is_admin());

-- ------------------------------------------------------------
-- Storage: upload e remoção de imagens — somente admin
-- ------------------------------------------------------------
create policy "Admin real faz upload de imagens" on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'produtos' and is_admin());

create policy "Admin real deleta imagens" on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'produtos' and is_admin());

-- ------------------------------------------------------------
-- Grant: permite que a role authenticated execute is_admin()
-- Necessário para que as políticas RLS funcionem com o anon key + JWT
-- (Se já rodou a migration acima, execute só esta linha)
-- ------------------------------------------------------------
grant execute on function is_admin() to authenticated;
