-- ============================================================
-- Yez Store — Políticas RLS para operações admin
-- Permite que usuários autenticados (admin) façam INSERT/UPDATE/DELETE
-- Execute no Supabase Dashboard > SQL Editor
-- ============================================================

-- Produtos: admin autenticado tem acesso total
create policy "Admin gerencia produtos" on products
  for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Artesãos: admin autenticado tem acesso total
create policy "Admin gerencia artesaos" on artisans
  for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Pedidos: admin autenticado tem acesso total
create policy "Admin gerencia pedidos" on orders
  for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Itens de pedido: admin autenticado tem acesso total
create policy "Admin gerencia order_items" on order_items
  for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- ============================================================
-- Política de Storage: admin pode fazer upload no bucket "produtos"
-- ============================================================
create policy "Admin faz upload de imagens" on storage.objects
  for insert
  with check (bucket_id = 'produtos' and auth.role() = 'authenticated');

create policy "Admin deleta imagens" on storage.objects
  for delete
  using (bucket_id = 'produtos' and auth.role() = 'authenticated');
