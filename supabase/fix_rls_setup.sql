-- =====================================================================
-- FIX: RLS para setup inicial + función SECURITY DEFINER
-- Ejecutar en Supabase SQL Editor
-- =====================================================================

-- 1. Permitir que usuarios anónimos lean app_settings
--    (necesario para que checkSetupCompleted() funcione sin sesión)
CREATE POLICY "Anon lee app_settings"
  ON app_settings FOR SELECT TO anon
  USING (true);

-- 2. Función SECURITY DEFINER — ejecuta con privilegios de postgres,
--    saltando RLS. Es llamada por el usuario anónimo durante el setup.
--    Valida que el setup no haya sido completado antes de proceder.
CREATE OR REPLACE FUNCTION public.complete_initial_setup(
  p_business_name   text,
  p_cuit            text,
  p_fiscal_condition text,
  p_address         text,
  p_phone           text,
  p_full_name       text,
  p_pin             varchar(4),
  p_user_id         uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Protección: no permitir re-ejecutar si ya está configurado
  IF EXISTS (
    SELECT 1 FROM app_settings
    WHERE key = 'setup_completed' AND value = 'true'
  ) THEN
    RAISE EXCEPTION 'El sistema ya fue configurado anteriormente';
  END IF;

  -- Guardar configuración del negocio
  INSERT INTO app_settings (key, value, description) VALUES
    ('business_name',        p_business_name,                  'Nombre del negocio'),
    ('cuit',                 COALESCE(p_cuit, ''),             'CUIT del negocio'),
    ('fiscal_condition',     p_fiscal_condition,               'Condición fiscal'),
    ('address',              COALESCE(p_address, ''),          'Dirección del negocio'),
    ('phone',                COALESCE(p_phone, ''),            'Teléfono del negocio'),
    ('iva_included_default', 'true',                           'Precio con IVA incluido por defecto'),
    ('setup_completed',      'true',                           'Setup inicial completado')
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

  -- Crear perfil del superadmin
  INSERT INTO profiles (id, full_name, pin)
  VALUES (p_user_id, p_full_name, p_pin);

  -- Asignar rol superadmin
  INSERT INTO user_roles (user_id, role_id)
  SELECT p_user_id, id FROM roles WHERE name = 'superadmin';
END;
$$;

-- 3. Otorgar permiso de ejecución al rol anónimo
GRANT EXECUTE ON FUNCTION public.complete_initial_setup TO anon;
