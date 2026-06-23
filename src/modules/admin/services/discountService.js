/**
 * discountService.js — CRUD de reglas de descuento.
 *
 * Tipos soportados:
 *  'product'          → % de descuento sobre un producto específico
 *  'category'         → % de descuento sobre una categoría
 *  'quantity_rule'    → Compra min_quantity, lleva free_quantity gratis (3x2, etc.)
 *  'percentage_total' → % sobre el total de la venta (aplicar manualmente desde el POS)
 *  'fixed_total'      → Monto fijo sobre el total (aplicar manualmente desde el POS)
 *
 * Los tipos 'product', 'category' y 'quantity_rule' se aplican automáticamente
 * al agregar ítems al carrito en el POS.
 */
import { supabase } from '@/supabase/client'

export async function getDiscounts() {
  const { data, error } = await supabase
    .from('discounts')
    .select('*, products(name, sku), categories(name)')
    .order('is_active', { ascending: false })
    .order('name')
  if (error) throw error
  return data ?? []
}

/** Solo descuentos activos — usados por el POS para aplicar automáticamente. */
export async function getActiveDiscounts() {
  const { data, error } = await supabase
    .from('discounts')
    .select('*, products(name), categories(name)')
    .eq('is_active', true)
  if (error) throw error
  return data ?? []
}

export async function createDiscount(payload) {
  const { data, error } = await supabase
    .from('discounts')
    .insert(cleanPayload(payload))
    .select()
    .single()
  if (error) throw error
  return data
}

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

export async function toggleDiscountActive(id, isActive) {
  const { error } = await supabase
    .from('discounts')
    .update({ is_active: isActive })
    .eq('id', id)
  if (error) throw error
}

export async function deleteDiscount(id) {
  const { error } = await supabase
    .from('discounts')
    .delete()
    .eq('id', id)
  if (error) throw error
}

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
