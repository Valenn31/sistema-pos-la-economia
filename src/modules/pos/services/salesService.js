/**
 * salesService.js — Registra ventas completas en Supabase.
 *
 * createSale(payload) → Inserta sale + items + payments + movimientos de stock.
 * searchProducts(term) → Busca productos por nombre, SKU o código de barras.
 * getProductByBarcode(barcode) → Búsqueda exacta por código de barras.
 */
import { supabase } from '@/supabase/client'

/**
 * Registra una venta completa de forma atómica.
 * Si algún paso falla, lanza el error para que el caller lo maneje.
 *
 * @param {{
 *   sessionId: string,
 *   registerId: number,
 *   cashierId: string,
 *   customerId: string|null,
 *   items: CartItem[],
 *   payments: PaymentLine[],
 *   subtotal: number,
 *   discountTotal: number,
 *   ivaTotal: number,
 *   total: number,
 *   receiptType: string,
 *   notes: string|null
 * }} payload
 */
export async function createSale(payload) {
  const {
    sessionId, registerId, cashierId, customerId,
    items, payments, subtotal, discountTotal, ivaTotal, total,
    receiptType = 'ticket', notes = null,
  } = payload

  // 1. Insertar cabecera de venta
  const { data: sale, error: saleErr } = await supabase
    .from('sales')
    .insert({
      session_id:     sessionId,
      register_id:    registerId,
      cashier_id:     cashierId,
      customer_id:    customerId || null,
      subtotal,
      discount_total: discountTotal,
      iva_total:      ivaTotal,
      total,
      receipt_type:   receiptType,
      notes,
    })
    .select()
    .single()
  if (saleErr) throw saleErr

  // 2. Insertar ítems
  const { error: itemsErr } = await supabase.from('sale_items').insert(
    items.map((i) => ({
      sale_id:         sale.id,
      product_id:      i.product.id,
      quantity:        i.quantity,
      unit_price:      i.unitPrice,
      iva_rate:        i.ivaRate,
      discount_amount: i.discountAmount,
      subtotal:        i.subtotal,
    }))
  )
  if (itemsErr) throw itemsErr

  // 3. Insertar pagos
  const { error: paymentsErr } = await supabase.from('sale_payments').insert(
    payments.map((p) => ({
      sale_id:   sale.id,
      method:    p.method,
      amount:    p.amount,
      reference: p.reference ?? null,
    }))
  )
  if (paymentsErr) throw paymentsErr

  // 4. Decrementar stock de "En Estantería" y registrar movimientos
  const { data: locationData } = await supabase
    .from('locations')
    .select('id')
    .eq('name', 'En Estantería')
    .single()

  if (locationData) {
    const locationId = locationData.id

    for (const item of items) {
      // RPC decrement_stock (SECURITY DEFINER, maneja el upsert de stock)
      await supabase.rpc('decrement_stock', {
        p_product_id:  item.product.id,
        p_location_id: locationId,
        p_quantity:    item.quantity,
      })

      // Registrar movimiento
      await supabase.from('stock_movements').insert({
        product_id:       item.product.id,
        from_location_id: locationId,
        to_location_id:   null,
        quantity:         item.quantity,
        movement_type:    'venta',
        reference_id:     sale.id,
        reference_type:   'sale',
        user_id:          cashierId,
      })
    }
  }

  // 5. Si algún pago es en "cuenta", incrementar saldo del cliente
  const cuentaPayment = payments.find((p) => p.method === 'cuenta')
  if (customerId && cuentaPayment) {
    await supabase.rpc('increment_customer_balance', {
      p_customer_id: customerId,
      p_amount:      cuentaPayment.amount,
    })
  }

  return sale
}

/**
 * Obtiene una venta completa para imprimir: items, pagos, cliente y cajero.
 * Se usan queries separadas para evitar ambigüedad de FK en PostgREST.
 */
export async function getSaleForPrint(saleId) {
  const { data: sale, error } = await supabase
    .from('sales')
    .select(`
      id, sale_number, created_at, total, subtotal, discount_total, iva_total,
      receipt_type, cashier_id, customer_id,
      customers(full_name),
      sale_payments(method, amount),
      sale_items(
        quantity, unit_price, discount_amount, subtotal,
        products(name, unit_of_measure)
      )
    `)
    .eq('id', saleId)
    .single()
  if (error) throw error

  // Fetch cashier name separately to avoid ambiguous FK issues
  let cashierName = '—'
  if (sale.cashier_id) {
    const { data: cashier } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', sale.cashier_id)
      .single()
    if (cashier) cashierName = cashier.full_name
  }

  return { ...sale, cashierName }
}

/**
 * Busca productos activos por nombre, SKU o código de barras.
 * Devuelve el stock disponible en "En Estantería" para cada producto.
 *
 * @param {string} term - Texto de búsqueda
 * @returns {Product[]}
 */
export async function searchProducts(term) {
  if (!term || term.trim().length < 1) return []

  const q = term.trim()

  const { data, error } = await supabase
    .from('products')
    .select('*, categories(name), stock(quantity, location_id, locations(name))')
    .eq('is_active', true)
    .or(`name.ilike.%${q}%,sku.ilike.%${q}%,barcode.ilike.%${q}%`)
    .order('name')
    .limit(30)

  if (error) throw error
  return data ?? []
}

/**
 * Busca un producto por código de barras exacto (para escaneo).
 * @param {string} barcode
 * @returns {Product|null}
 */
export async function getProductByBarcode(barcode) {
  const { data: product, error } = await supabase
    .from('products')
    .select('*, categories(name)')
    .eq('barcode', barcode)
    .eq('is_active', true)
    .maybeSingle()
  if (error) throw error
  if (!product) return null

  const { data: stockRows } = await supabase
    .from('stock')
    .select('quantity, location_id, locations(name)')
    .eq('product_id', product.id)

  return { ...product, stock: stockRows ?? [] }
}

/**
 * Obtiene clientes activos para el selector en el POS.
 * @param {string} term - Búsqueda por nombre o documento
 */
export async function searchCustomers(term) {
  let query = supabase
    .from('customers')
    .select('id, full_name, document_number, current_balance, credit_limit, discount_percent')
    .eq('is_active', true)
    .order('full_name')
    .limit(20)

  if (term) {
    query = query.or(`full_name.ilike.%${term}%,document_number.ilike.%${term}%`)
  }

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}
