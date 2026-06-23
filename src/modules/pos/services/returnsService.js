/**
 * returnsService.js — Devoluciones de ventas.
 *
 * getSaleByNumber(num)  → Busca venta completada por número, con items y pagos.
 * getPreviousReturns(saleId) → Devoluciones anteriores para calcular cantidades ya devueltas.
 * createReturn({ saleId, userId, items, reason, sale }) → Registra devolución:
 *   1. Inserta returns + return_items
 *   2. Restaura stock en "En Estantería" via increment_stock + stock_movements
 *   3. Si la venta tenía pago en "cuenta", reduce current_balance del cliente proporcionalmente
 */
import { supabase } from '@/supabase/client'

export async function getSaleByNumber(saleNumber) {
  const num = parseInt(saleNumber, 10)
  if (!num) return null

  const { data, error } = await supabase
    .from('sales')
    .select(`
      id, sale_number, created_at, total, subtotal, receipt_type, status,
      customer_id,
      customers(id, full_name),
      sale_payments(method, amount),
      sale_items(
        id, product_id, quantity, unit_price, discount_amount, subtotal, iva_rate,
        products(name, sku, unit_of_measure)
      )
    `)
    .eq('sale_number', num)
    .eq('status', 'completed')
    .maybeSingle()
  if (error) throw error
  return data
}

export async function getPreviousReturns(saleId) {
  const { data, error } = await supabase
    .from('returns')
    .select('id, total, reason, created_at, return_items(sale_item_id, quantity)')
    .eq('sale_id', saleId)
  if (error) throw error
  return data ?? []
}

export async function createReturn({ saleId, userId, items, reason, sale, restoreStock = true }) {
  const total = items.reduce((s, i) => s + i.subtotal, 0)

  // 1. Cabecera de devolución
  const { data: ret, error: retErr } = await supabase
    .from('returns')
    .insert({ sale_id: saleId, user_id: userId, total, reason: reason || null })
    .select()
    .single()
  if (retErr) throw retErr

  // 2. Items devueltos
  const { error: itemsErr } = await supabase.from('return_items').insert(
    items.map((i) => ({
      return_id:    ret.id,
      sale_item_id: i.saleItemId,
      product_id:   i.productId,
      quantity:     i.quantity,
      unit_price:   i.unitPrice,
      subtotal:     i.subtotal,
    }))
  )
  if (itemsErr) throw itemsErr

  // 3. Restaurar stock en "En Estantería" (solo si se pidió)
  if (restoreStock) {
    const { data: loc } = await supabase
      .from('locations')
      .select('id')
      .eq('name', 'En Estantería')
      .single()

    if (loc) {
      for (const item of items) {
        await supabase.rpc('increment_stock', {
          p_product_id:  item.productId,
          p_location_id: loc.id,
          p_quantity:    item.quantity,
        })
        await supabase.from('stock_movements').insert({
          product_id:     item.productId,
          to_location_id: loc.id,
          quantity:       item.quantity,
          movement_type:  'devolucion',
          reference_id:   ret.id,
          reference_type: 'return',
          user_id:        userId,
        })
      }
    }
  }

  // 4. Si hubo pago en cuenta, reducir saldo del cliente proporcionalmente
  const cuentaPayment = (sale.sale_payments ?? []).find((p) => p.method === 'cuenta')
  if (cuentaPayment && sale.customer_id) {
    const proportion  = sale.total > 0 ? total / sale.total : 1
    const reduction   = parseFloat((cuentaPayment.amount * proportion).toFixed(2))
    const { error: rpcErr } = await supabase.rpc('increment_customer_balance', {
      p_customer_id: sale.customer_id,
      p_amount:      -reduction,
    })
    if (rpcErr) {
      const { data: cust } = await supabase
        .from('customers').select('current_balance').eq('id', sale.customer_id).single()
      const newBalance = Math.max(0, (Number(cust?.current_balance) || 0) - reduction)
      await supabase.from('customers').update({ current_balance: newBalance }).eq('id', sale.customer_id)
    }
  }

  return ret
}
