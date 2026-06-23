/**
 * discountService.js — CRUD de reglas de descuento.
 *
 * Tipos de descuento soportados:
 *  'product'          → Porcentaje de descuento sobre un producto específico
 *  'category'         → Porcentaje de descuento sobre una categoría completa
 *  'quantity_rule'    → Compra min_quantity, lleva free_quantity gratis (ej: 3x2)
 *  'percentage_total' → Porcentaje sobre el total de la venta (se aplica manualmente desde el POS)
 *  'fixed_total'      → Monto fijo de descuento sobre el total (se aplica manualmente desde el POS)
 *
 * Los tipos 'product', 'category' y 'quantity_rule' se aplican automáticamente
 * al agregar ítems al carrito en el POS.
 *
 * Funciones exportadas:
 *  - getDiscounts()                    → Todos los descuentos (activos e inactivos)
 *  - getActiveDiscounts()              → Solo descuentos activos (para el POS)
 *  - createDiscount(payload)           → Crea una regla de descuento
 *  - updateDiscount(id, payload)       → Actualiza una regla existente
 *  - toggleDiscountActive(id, isActive)→ Activa/desactiva un descuento
 *  - deleteDiscount(id)                → Elimina un descuento permanentemente
 */
import { supabase } from '@/supabase/client'

/**
 * Obtiene todos los descuentos del sistema con sus relaciones de producto y categoría.
 * Ordena primero los activos, luego alfabéticamente por nombre.
 *
 * @returns {Promise<object[]>} Lista de descuentos con datos de producto y categoría asociados
 * @throws {Error} Si falla la consulta a Supabase
 */
export async function getDiscounts() {
  const { data, error } = await supabase
    .from('discounts')
    .select('*, products(name, sku), categories(name)')
    .order('is_active', { ascending: false })
    .order('name')
  if (error) throw error
  return data ?? []
}

/**
 * Obtiene solo los descuentos activos — usado por el POS para aplicarlos automáticamente
 * al agregar productos al carrito.
 *
 * @returns {Promise<object[]>} Lista de descuentos activos con producto y categoría
 * @throws {Error} Si falla la consulta a Supabase
 */
export async function getActiveDiscounts() {
  const { data, error } = await supabase
    .from('discounts')
    .select('*, products(name), categories(name)')
    .eq('is_active', true)
  if (error) throw error
  return data ?? []
}

/**
 * Crea una nueva regla de descuento en la base de datos.
 *
 * @param {object} payload - Datos del descuento
 * @param {string} payload.name - Nombre descriptivo del descuento
 * @param {string} payload.type - Tipo de descuento (product|category|quantity_rule|percentage_total|fixed_total)
 * @param {number|null} payload.value - Valor del descuento (porcentaje o monto fijo según tipo)
 * @param {number|null} payload.min_quantity - Cantidad mínima para regla de cantidad
 * @param {number|null} payload.free_quantity - Cantidad gratis en regla de cantidad
 * @param {string|null} payload.product_id - UUID del producto (para tipo 'product')
 * @param {number|null} payload.category_id - ID de la categoría (para tipo 'category')
 * @param {boolean} payload.is_active - Si el descuento está activo
 * @returns {Promise<object>} El descuento creado
 * @throws {Error} Si falla la inserción en Supabase
 */
export async function createDiscount(payload) {
  const { data, error } = await supabase
    .from('discounts')
    .insert(cleanPayload(payload))
    .select()
    .single()
  if (error) throw error
  return data
}

/**
 * Actualiza una regla de descuento existente.
 *
 * @param {string} id - UUID del descuento a actualizar
 * @param {object} payload - Nuevos datos del descuento (misma estructura que createDiscount)
 * @returns {Promise<object>} El descuento actualizado
 * @throws {Error} Si falla la actualización en Supabase
 */
export async function updateDiscount(id, payload) {
  const { data, error } = await supabase
    .from('discounts')
    .update(cleanPayload(payload))
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

/**
 * Activa o desactiva un descuento.
 *
 * @param {string} id - UUID del descuento
 * @param {boolean} isActive - true para activar, false para desactivar
 * @returns {Promise<void>}
 * @throws {Error} Si falla la actualización en Supabase
 */
export async function toggleDiscountActive(id, isActive) {
  const { error } = await supabase
    .from('discounts')
    .update({ is_active: isActive })
    .eq('id', id)
  if (error) throw error
}

/**
 * Elimina permanentemente un descuento de la base de datos.
 *
 * @param {string} id - UUID del descuento a eliminar
 * @returns {Promise<void>}
 * @throws {Error} Si falla la eliminación en Supabase
 */
export async function deleteDiscount(id) {
  const { error } = await supabase
    .from('discounts')
    .delete()
    .eq('id', id)
  if (error) throw error
}

/**
 * Limpia y normaliza el payload de un descuento antes de enviarlo a Supabase.
 * Convierte valores numéricos con parseFloat y establece defaults.
 *
 * @param {object} d - Datos crudos del formulario
 * @returns {object} Objeto limpio listo para insertar/actualizar en la tabla `discounts`
 */
function cleanPayload(d) {
  return {
    name:          d.name,
    type:          d.type,
    value:         d.value         != null ? parseFloat(d.value)         : null,
    min_quantity:  d.min_quantity  != null ? parseFloat(d.min_quantity)  : null,
    free_quantity: d.free_quantity != null ? parseFloat(d.free_quantity) : null,
    product_id:    d.product_id    || null,
    category_id:   d.category_id   ? parseInt(d.category_id)            : null,
    is_active:     d.is_active !== false,
  }
}
