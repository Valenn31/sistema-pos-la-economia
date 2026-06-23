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
 * Registra un abono de deuda: reduce current_balance y guarda el pago.
 */
export async function registerPayment({ customerId, amount, method = 'efectivo', notes, userId }) {
  const { error: rpcErr } = await supabase.rpc('increment_customer_balance', {
    p_customer_id: customerId,
    p_amount:      -Math.abs(amount),
  })
  if (rpcErr) {
    const { data: cust } = await supabase
      .from('customers').select('current_balance').eq('id', customerId).single()
    const newBalance = Math.max(0, (Number(cust?.current_balance) || 0) - Math.abs(amount))
    const { error: updErr } = await supabase.from('customers').update({ current_balance: newBalance }).eq('id', customerId)
    if (updErr) throw updErr
  }

  const { error: payErr } = await supabase.from('customer_payments').insert({
    customer_id: customerId,
    amount:      Math.abs(amount),
    method:      method || 'efectivo',
    notes:       notes || null,
    user_id:     userId || null,
  })
  if (payErr) throw payErr
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

/**
 * Estado de cuenta: ventas en cta cte + pagos, ordenados por fecha con saldo acumulado.
 */
export async function getAccountStatement(customerId) {
  const [salesRes, paymentsRes] = await Promise.all([
    supabase
      .from('sales')
      .select(`
        id, sale_number, created_at, total,
        sale_payments(method, amount),
        sale_items(quantity, unit_price, subtotal, products(name))
      `)
      .eq('customer_id', customerId)
      .eq('status', 'completed')
      .order('created_at', { ascending: true }),
    supabase
      .from('customer_payments')
      .select('id, amount, method, notes, created_at')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: true }),
  ])
  if (salesRes.error) throw salesRes.error
  if (paymentsRes.error) throw paymentsRes.error

  const movements = []

  for (const sale of (salesRes.data ?? [])) {
    const cuentaPayment = (sale.sale_payments ?? []).find((p) => p.method === 'cuenta')
    if (cuentaPayment) {
      movements.push({
        type: 'debit',
        date: sale.created_at,
        amount: Number(cuentaPayment.amount),
        description: `Venta #${sale.sale_number}`,
        saleTotal: Number(sale.total),
        items: sale.sale_items ?? [],
        id: sale.id,
      })
    }
  }

  for (const pay of (paymentsRes.data ?? [])) {
    movements.push({
      type: 'credit',
      date: pay.created_at,
      amount: Number(pay.amount),
      description: `Pago — ${pay.method}`,
      notes: pay.notes,
      id: pay.id,
    })
  }

  movements.sort((a, b) => new Date(a.date) - new Date(b.date))

  let balance = 0
  for (const m of movements) {
    if (m.type === 'debit') balance += m.amount
    else balance -= m.amount
    m.balance = Math.round(balance * 100) / 100
  }

  return movements
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
