-- Incrementa stock_quantity de forma atômica.
-- Usada pelo webhook do Mercado Pago ao restaurar estoque após pagamento cancelado.
CREATE OR REPLACE FUNCTION increment_stock(p_product_id uuid, p_qty integer)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE products
  SET stock_quantity = stock_quantity + p_qty
  WHERE id = p_product_id;
$$;
