/**
 * supplierService.js — CRUD de proveedores y relaciones producto-proveedor.
 */
import { supabase } from '@/supabase/client'

export async function getSuppliers({ activeOnly = false } = {}) {
  let query = supabase
    .from('suppliers')
    .select('*')
    .order('razon_social')
  if (activeOnly) query = query.eq('is_active', true)
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function createSupplier(payload) {
  const { data, error } = await supabase
    .from('suppliers')
    .insert(cleanSupplier(payload))
    .select()
    .single()
  if (error) throw error
  return data
}

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

export async function toggleSupplierActive(id, isActive) {
  const { error } = await supabase
    .from('suppliers')
    .update({ is_active: isActive })
    .eq('id', id)
  if (error) throw error
}

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
