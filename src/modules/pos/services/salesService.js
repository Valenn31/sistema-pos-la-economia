/**
 * salesService.js — Registra ventas completas en Supabase.
 *
 * Funciones exportadas:
 *  - createSale(payload)            → Registra una venta con items, pagos y movimientos de stock
 *  - getSaleForPrint(saleId)        → Obtiene una venta completa para impresión de ticket
 *  - searchProducts(term)           → Busca productos por nombre, SKU o código de barras
 *  - getProductByBarcode(barcode)   → Búsqueda exacta por código de barras (para escaneo)
 *  - searchCustomers(term)          → Busca clientes activos para el selector del POS
 */
import { supabase } from '@/supabase/client'

/**
 * Registra una venta completa de forma secuencial.
 * Si algún paso falla, lanza el error para que el caller lo maneje.
 *
 * Pasos:
 *  1. Inserta la cabecera de venta en `sales`
 *  2. Inserta los ítems de la venta en `sale_items`
 *  3. Inserta los pagos en `sale_payments`
 *  4. Decrementa stock de "En Estantería" y registra movimientos en `stock_movements`
 *  5. Si algún pago es en "cuenta" (cuenta corriente), incrementa el saldo del cliente
 *
 * @param {object} payload - Datos completos de la venta
 * @param {string} payload.sessionId - UUID de la sesión de caja activa
 * @param {number} payload.registerId - ID de la caja registradora
 * @param {string} payload.cashierId - UUID del cajero
 * @param {string|null} payload.customerId - UUID del cliente (null si es venta sin cliente)
 * @param {object[]} payload.items - Ítems del carrito
 * @param {object} payload.items[].product - Producto con al menos { id }
 * @param {number} payload.items[].quantity - Cantidad vendida
 * @param {number} payload.items[].unitPrice - Precio unitario
 * @param {number} payload.items[].ivaRate - Tasa de IVA aplicada
 * @param {number} payload.items[].discountAmount - Monto de descuento por ítem
 * @param {number} payload.items[].subtotal - Subtotal del ítem
 * @param {object[]} payload.payments - Métodos de pago utilizados
 * @param {string} payload.payments[].method - Método (efectivo|debito|credito|qr|transferencia|cuenta)
 * @param {number} payload.payments[].amount - Monto pagado con este método
 * @param {string|null} [payload.payments[].reference] - Referencia del pago (nro de operación, etc.)
 * @param {number} payload.subtotal - Subtotal antes de descuentos
 * @param {number} payload.discountTotal - Total de descuentos aplicados
 * @param {number} payload.ivaTotal - Total de IVA
 * @param {number} payload.total - Total final de la venta
 * @param {string} [payload.receiptType='ticket'] - Tipo de comprobante (ticket|factura_a|factura_b|factura_c)
 * @param {string|null} [payload.notes=null] - Notas u observaciones de la venta
 * @returns {Promise<object>} La venta creada (cabecera con id, sale_number, etc.)
 * @throws {Error} Si falla algún paso de la transacción
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

  // 2. Insertar ítems de la venta
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

  // 3. Insertar pagos de la venta
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
      /** Decrementa stock vía RPC (SECURITY DEFINER, maneja el upsert de stock) */
      await supabase.rpc('decrement_stock', {
        p_product_id:  item.product.id,
        p_location_id: locationId,
        p_quantity:    item.quantity,
      })

      /** Registra el movimiento de stock de tipo 'venta' */
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
    /** Intenta incrementar el saldo vía RPC atómica */
    const { error: rpcErr } = await supabase.rpc('increment_customer_balance', {
      p_customer_id: customerId,
      p_amount:      cuentaPayment.amount,
    })

    /** Fallback: si el RPC falla, calcula y actualiza manualmente */
    if (rpcErr) {
      const { data: cust } = await supabase
        .from('customers').select('current_balance').eq('id', customerId).single()
      const newBalance = (Number(cust?.current_balance) || 0) + cuentaPayment.amount
      await supabase.from('customers').update({ current_balance: newBalance }).eq('id', customerId)
    }
  }

  return sale
}

/**
 * Obtiene una venta completa para imprimir el ticket/comprobante.
 * Incluye ítems, pagos, cliente y nombre del cajero.
 * Se usan queries separadas para obtener el cajero y evitar ambigüedad
 * de FK en PostgREST (profiles tiene múltiples relaciones con sales).
 *
 * @param {string} saleId - UUID de la venta
 * @returns {Promise<object>} Venta completa con cashierName agregado
 * @throws {Error} Si la venta no existe o falla la consulta
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

  /** Obtiene el nombre del cajero por separado para evitar FK ambiguas */
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
 * Devuelve hasta 30 resultados con el stock disponible por ubicación.
 * Se usa en el buscador del POS para agregar productos al carrito.
 *
 * @param {string} term - Texto de búsqueda (mínimo 1 carácter)
 * @returns {Promise<object[]>} Lista de productos con categoría y stock por ubicación
 * @throws {Error} Si falla la consulta a Supabase
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
 * Busca un producto por código de barras exacto (para lectura con escáner).
 * Retorna el producto con su categoría y stock por ubicación, o null si no existe.
 *
 * @param {string} barcode - Código de barras exacto
 * @returns {Promise<object|null>} Producto con stock, o null si no se encuentra
 * @throws {Error} Si falla la consulta a Supabase
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

  /** Consulta el stock del producto en todas las ubicaciones */
  const { data: stockRows } = await supabase
    .from('stock')
    .select('quantity, location_id, locations(name)')
    .eq('product_id', product.id)

  return { ...product, stock: stockRows ?? [] }
}

/**
 * Busca clientes activos para el selector de cliente en el POS.
 * Filtra por nombre o número de documento. Retorna hasta 20 resultados.
 *
 * @param {string} [term] - Texto de búsqueda (nombre o documento). Si está vacío, lista todos.
 * @returns {Promise<object[]>} Lista de clientes con id, nombre, documento, saldo, límite y descuento
 * @throws {Error} Si falla la consulta a Supabase
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
