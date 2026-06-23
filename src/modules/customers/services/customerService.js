/**
 * customerService.js — CRUD de clientes y gestión de cuenta corriente.
 *
 * getCustomers({ search, activeOnly }) → Lista con filtros
 * getCustomerById(id)                 → Detalle + últimas ventas
 * createCustomer(payload)
 * updateCustomer(id, payload)
 * toggleCustomerActive(id, isActive)
 * registerPayment({ customerId, amount, method, notes }) → Registra abono y reduce current_balance
 * getCustomerSales(customerId, limit)  → Historial de compras
 */
import { supabase } from '@/supabase/client'

export async function getCustomers({ search = '', activeOnly = false } = {}) {
  let query = supabase
    .from('customers')
    .select('*')
    .order('full_name')

  if (search) {
    query = query.or(`full_name.ilike.%${search}%,document_number.ilike.%${search}%,phone.ilike.%${search}%`)
  }
  if (activeOnly) {
    query = query.eq('is_active', true)
  }

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function getCustomerById(id) {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function createCustomer(payload) {
  const { data, error } = await supabase
    .from('customers')
    .insert(cleanPayload(payload))
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateCustomer(id, payload) {
  const { data, error } = await supabase
    .from('customers')
    .update(cleanPayload(payload))
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function toggleCustomerActive(id, isActive) {
  const { error } = await supabase
    .from('customers')
    .update({ is_active: isActive })
    .eq('id', id)
  if (error) throw error
}

/**
 * Registra un abono de deuda: reduce current_balance del cliente.
 * Usa increment_customer_balance con valor negativo (SECURITY DEFINER).
 */
export async function registerPayment({ customerId, amount }) {
  const { error } = await supabase.rpc('increment_customer_balance', {
    p_customer_id: customerId,
    p_amount:      -Math.abs(amount),
  })
  if (error) throw error
}

/** Últimas ventas del cliente con total y método de pago. */
export async function getCustomerSales(customerId, limit = 20) {
  const { data, error } = await supabase
    .from('sales')
    .select('id, sale_number, created_at, total, receipt_type, sale_payments(method, amount)')
    .eq('customer_id', customerId)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data ?? []
}

function cleanPayload(d) {
  return {
    full_name:        d.full_name,
    document_type:    d.document_type    || null,
    document_number:  d.document_number  || null,
    phone:            d.phone            || null,
    email:            d.email            || null,
    address:          d.address          || null,
    credit_limit:     parseFloat(d.credit_limit)     || 0,
    discount_percent: parseFloat(d.discount_percent) || 0,
    is_active:        d.is_active !== false,
  }
}
