/**
 * supplierService.js — CRUD de proveedores.
 *
 * Funciones exportadas:
 *  - getSuppliers({ activeOnly })           → Lista de proveedores con filtro opcional
 *  - createSupplier(payload)                → Crea un nuevo proveedor
 *  - updateSupplier(id, payload)            → Actualiza un proveedor existente
 *  - toggleSupplierActive(id, isActive)     → Activa/desactiva un proveedor
 */
import { supabase } from '@/supabase/client'

/**
 * Obtiene la lista de proveedores ordenados por razón social.
 * Puede filtrarse opcionalmente para devolver solo los activos.
 *
 * @param {object} [opciones] - Filtros opcionales
 * @param {boolean} [opciones.activeOnly=false] - Si es true, solo devuelve proveedores activos
 * @returns {Promise<object[]>} Lista de proveedores
 * @throws {Error} Si falla la consulta a Supabase
 */
export async function getSuppliers({ activeOnly = false } = {}) {
  let query = supabase
    .from('suppliers')
    .select('*')
    .order('razon_social')
  if (activeOnly) query = query.eq('is_active', true)
  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

/**
 * Crea un nuevo proveedor en la base de datos.
 *
 * @param {object} payload - Datos del proveedor
 * @param {string} payload.razon_social - Razón social del proveedor
 * @param {string|null} [payload.cuit] - CUIT del proveedor
 * @param {string|null} [payload.phone] - Teléfono de contacto
 * @param {string|null} [payload.email] - Email de contacto
 * @param {string|null} [payload.payment_condition] - Condición de pago (ej: "30 días", "contado")
 * @param {number|null} [payload.delivery_days] - Días estimados de entrega
 * @returns {Promise<object>} El proveedor creado
 * @throws {Error} Si falla la inserción en Supabase
 */
export async function createSupplier(payload) {
  const { data, error } = await supabase
    .from('suppliers')
    .insert(cleanSupplier(payload))
    .select()
    .single()
  if (error) throw error
  return data
}

/**
 * Actualiza un proveedor existente.
 *
 * @param {string} id - UUID del proveedor a actualizar
 * @param {object} payload - Nuevos datos del proveedor (misma estructura que createSupplier)
 * @returns {Promise<object>} El proveedor actualizado
 * @throws {Error} Si falla la actualización en Supabase
 */
export async function updateSupplier(id, payload) {
  const { data, error } = await supabase
    .from('suppliers')
    .update(cleanSupplier(payload))
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

/**
 * Activa o desactiva un proveedor.
 * Los proveedores desactivados no aparecen en los selectores de compras.
 *
 * @param {string} id - UUID del proveedor
 * @param {boolean} isActive - true para activar, false para desactivar
 * @returns {Promise<void>}
 * @throws {Error} Si falla la actualización en Supabase
 */
export async function toggleSupplierActive(id, isActive) {
  const { error } = await supabase
    .from('suppliers')
    .update({ is_active: isActive })
    .eq('id', id)
  if (error) throw error
}

/**
 * Limpia y normaliza el payload de un proveedor antes de enviarlo a Supabase.
 * Convierte campos vacíos a null y parsea el campo numérico delivery_days.
 *
 * @param {object} d - Datos crudos del formulario
 * @returns {object} Objeto limpio listo para insertar/actualizar en la tabla `suppliers`
 */
function cleanSupplier(d) {
  return {
    razon_social:      d.razon_social,
    cuit:              d.cuit              || null,
    phone:             d.phone             || null,
    email:             d.email             || null,
    payment_condition: d.payment_condition || null,
    delivery_days:     parseInt(d.delivery_days) || null,
  }
}
