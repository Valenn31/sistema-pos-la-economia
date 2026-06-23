-- =====================================================================
-- SPRINT 2: Funciones y políticas RLS para el módulo POS
-- Ejecutar en Supabase SQL Editor
-- =====================================================================

-- ── POLÍTICAS RLS para tablas del POS ───────────────────────────────

-- products / categories / locations / stock (solo lectura para todos los autenticados)
CREATE POLICY "auth_read_products"     ON products     FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_write_products"    ON products     FOR ALL    TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_read_categories"   ON categories   FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_write_categories"  ON categories   FOR ALL    TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_read_locations"    ON locations    FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_read_stock"        ON stock        FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_write_stock"       ON stock        FOR ALL    TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_write_movements"   ON stock_movements FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_read_movements"    ON stock_movements FOR SELECT TO authenticated USING (true);

-- customers
CREATE POLICY "auth_read_customers"    ON customers    FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_write_customers"   ON customers    FOR ALL    TO authenticated USING (true) WITH CHECK (true);

-- discounts
CREATE POLICY "auth_read_discounts"    ON discounts    FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_write_discounts"   ON discounts    FOR ALL    TO authenticated USING (true) WITH CHECK (true);

-- cash_registers / cash_sessions
CREATE POLICY "auth_read_registers"    ON cash_registers FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_write_registers"   ON cash_registers FOR ALL   TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_read_sessions"     ON cash_sessions  FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_write_sessions"    ON cash_sessions  FOR ALL   TO authenticated USING (true) WITH CHECK (true);

-- sales, sale_items, sale_payments
CREATE POLICY "auth_read_sales"        ON sales        FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_write_sales"       ON sales        FOR ALL    TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_read_sale_items"   ON sale_items   FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_write_sale_items"  ON sale_items   FOR ALL    TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_read_payments"     ON sale_payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_write_payments"    ON sale_payments FOR ALL   TO authenticated USING (true) WITH CHECK (true);

-- returns / return_items
CREATE POLICY "auth_read_returns"      ON returns      FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_write_returns"     ON returns      FOR ALL    TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_read_return_items" ON return_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_write_return_items" ON return_items FOR ALL   TO authenticated USING (true) WITH CHECK (true);

-- suppliers / product_suppliers / purchase_notes / purchase_orders
CREATE POLICY "auth_read_suppliers"     ON suppliers           FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_write_suppliers"    ON suppliers           FOR ALL    TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_read_prod_sup"      ON product_suppliers   FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_write_prod_sup"     ON product_suppliers   FOR ALL    TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_read_p_notes"       ON purchase_notes      FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_write_p_notes"      ON purchase_notes      FOR ALL    TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_read_p_note_items"  ON purchase_note_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_write_p_note_items" ON purchase_note_items FOR ALL    TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_read_p_orders"      ON purchase_orders     FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_write_p_orders"     ON purchase_orders     FOR ALL    TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_read_p_ord_items"   ON purchase_order_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_write_p_ord_items"  ON purchase_order_items FOR ALL   TO authenticated USING (true) WITH CHECK (true);

-- ── FUNCIONES SECURITY DEFINER ──────────────────────────────────────

-- Decrementa stock de una ubicación (uso: al confirmar venta)
CREATE OR REPLACE FUNCTION public.decrement_stock(
  p_product_id  uuid,
  p_location_id int,
  p_quantity    numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO stock (product_id, location_id, quantity)
  VALUES (p_product_id, p_location_id, 0)
  ON CONFLICT (product_id, location_id) DO NOTHING;

  UPDATE stock
  SET quantity = quantity - p_quantity, updated_at = now()
  WHERE product_id = p_product_id AND location_id = p_location_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.decrement_stock TO authenticated;

-- Incrementa el saldo de un cliente con cuenta corriente
CREATE OR REPLACE FUNCTION public.increment_customer_balance(
  p_customer_id uuid,
  p_amount      numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE customers
  SET current_balance = current_balance + p_amount
  WHERE id = p_customer_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_customer_balance TO authenticated;
