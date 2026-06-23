-- =====================================================================
-- SPRINT 3: Funciones para Stock y Proveedores
-- Ejecutar en Supabase SQL Editor
-- =====================================================================

-- Incrementa stock de una ubicación (uso: recepción de mercadería, ajustes)
CREATE OR REPLACE FUNCTION public.increment_stock(
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
  SET quantity = quantity + p_quantity, updated_at = now()
  WHERE product_id = p_product_id AND location_id = p_location_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_stock TO authenticated;

-- Traslada stock entre ubicaciones en forma atómica (Depósito → Estantería)
CREATE OR REPLACE FUNCTION public.transfer_stock(
  p_product_id       uuid,
  p_from_location_id int,
  p_to_location_id   int,
  p_quantity         numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_available numeric;
BEGIN
  -- Asegurar que existan los registros de stock
  INSERT INTO stock (product_id, location_id, quantity)
  VALUES (p_product_id, p_from_location_id, 0)
  ON CONFLICT (product_id, location_id) DO NOTHING;

  INSERT INTO stock (product_id, location_id, quantity)
  VALUES (p_product_id, p_to_location_id, 0)
  ON CONFLICT (product_id, location_id) DO NOTHING;

  -- Verificar stock disponible en origen
  SELECT quantity INTO v_available
  FROM stock
  WHERE product_id = p_product_id AND location_id = p_from_location_id;

  IF v_available < p_quantity THEN
    RAISE EXCEPTION 'Stock insuficiente en origen (disponible: %, requerido: %)', v_available, p_quantity;
  END IF;

  -- Mover stock
  UPDATE stock
  SET quantity = quantity - p_quantity, updated_at = now()
  WHERE product_id = p_product_id AND location_id = p_from_location_id;

  UPDATE stock
  SET quantity = quantity + p_quantity, updated_at = now()
  WHERE product_id = p_product_id AND location_id = p_to_location_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.transfer_stock TO authenticated;
