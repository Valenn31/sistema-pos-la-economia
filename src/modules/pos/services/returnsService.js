/**
 * returnsService.js — Gestión de devoluciones de ventas.
 *
 * Funciones exportadas:
 *  - getSaleByNumber(saleNumber)  → Busca una venta completada por su número
 *  - getPreviousReturns(saleId)   → Obtiene devoluciones anteriores de una venta
 *  - createReturn({ ... })        → Registra una devolución completa
 *
 * Flujo de devolución (createReturn):
 *   1. Inserta la cabecera en `returns` y los ítems en `return_items`
 *   2. Restaura stock en "En Estantería" vía RPC `increment_stock` + movimientos
 *   3. Si la venta tenía pago en "cuenta", reduce el saldo del cliente proporcionalmente
 */
import { supabase } from '@/supabase/client'

/**
 * Busca una venta completada por su número de ticket.
 * Incluye todos los datos necesarios para procesar una devolución:
 * cliente, pagos, e ítems con detalle de productos.
 *
 * @param {string|number} saleNumber - Número de la venta a buscar
 * @returns {Promise<object|null>} Datos completos de la venta, o null si no se encuentra
 * @throws {Error} Si falla la consulta a Supabase
 */
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

/**
 * Obtiene las devoluciones previas de una venta específica.
 * Se usa para calcular las cantidades ya devueltas y evitar devolver
 * más de lo vendido originalmente.
 *
 * @param {string} saleId - UUID de la venta original
 * @returns {Promise<object[]>} Lista de devoluciones con sus ítems (sale_item_id y quantity)
 * @throws {Error} Si falla la consulta a Supabase
 */
export async function getPreviousReturns(saleId) {
  const { data, error } = await supabase
    .from('returns')
    .select('id, total, reason, created_at, return_items(sale_item_id, quantity)')
    .eq('sale_id', saleId)
  if (error) throw error
  return data ?? []
}

/**
 * Registra una devolución completa con los siguientes pasos:
 *
 *  1. Inserta la cabecera de devolución en la tabla `returns`
 *  2. Inserta los ítems devueltos en `return_items`
 *  3. (Opcional) Restaura el stock en la ubicación "En Estantería":
 *     - Incrementa la cantidad vía RPC `increment_stock`
 *     - Registra el movimiento de stock con tipo 'devolucion'
 *  4. Si la venta original tuvo pago en "cuenta" (cuenta corriente),
 *     reduce el saldo del cliente proporcionalmente al monto devuelto
 *
 * @param {object} params - Datos de la devolución
 * @param {string} params.saleId - UUID de la venta original
 * @param {string} params.userId - UUID del usuario que procesa la devolución
 * @param {object[]} params.items - Ítems a devolver
 * @param {string} params.items[].saleItemId - ID del ítem de venta original
 * @param {string} params.items[].productId - UUID del producto
 * @param {number} params.items[].quantity - Cantidad a devolver
 * @param {number} params.items[].unitPrice - Precio unitario del producto
 * @param {number} params.items[].subtotal - Subtotal del ítem devuelto (quantity * unitPrice)
 * @param {string|null} params.reason - Motivo de la devolución
 * @param {object} params.sale - Datos de la venta original (necesarios para calcular ajustes en cta cte)
 * @param {boolean} [params.restoreStock=true] - Si es true, restaura el stock de los productos devueltos
 * @returns {Promise<object>} La devolución creada (cabecera)
 * @throws {Error} Si falla alguna operación en Supabase
 */
export async function createReturn({ saleId, userId, items, reason, sale, restoreStock = true }) {
  /** Calcula el total de la devolución sumando los subtotales de los ítems */
  const total = items.reduce((s, i) => s + i.subtotal, 0)

  // 1. Inserta la cabecera de devolución
  const { data: ret, error: retErr } = await supabase
    .from('returns')
    .insert({ sale_id: saleId, user_id: userId, total, reason: reason || null })
    .select()
    .single()
  if (retErr) throw retErr

  // 2. Inserta los ítems devueltos
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

  // 3. Restaurar stock en "En Estantería" (solo si se solicitó)
  if (restoreStock) {
    /** Busca el ID de la ubicación "En Estantería" */
    const { data: loc } = await supabase
      .from('locations')
      .select('id')
      .eq('name', 'En Estantería')
      .single()

    if (loc) {
      for (const item of items) {
        /** Incrementa el stock del producto en la ubicación */
        await supabase.rpc('increment_stock', {
          p_product_id:  item.productId,
          p_location_id: loc.id,
          p_quantity:    item.quantity,
        })
        /** Registra el movimiento de stock de tipo devolución */
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

  // 4. Si hubo pago en cuenta corriente, reducir saldo del cliente proporcionalmente
  const cuentaPayment = (sale.sale_payments ?? []).find((p) => p.method === 'cuenta')
  if (cuentaPayment && sale.customer_id) {
    /** Calcula la proporción del monto devuelto respecto al total de la venta */
    const proportion  = sale.total > 0 ? total / sale.total : 1
    /** Monto a reducir del saldo del cliente */
    const reduction   = parseFloat((cuentaPayment.amount * proportion).toFixed(2))

    /** Intenta reducir el saldo vía RPC atómica */
    const { error: rpcErr } = await supabase.rpc('increment_customer_balance', {
      p_customer_id: sale.customer_id,
      p_amount:      -reduction,
    })

    /** Fallback: si el RPC falla, calcula y actualiza manualmente */
    if (rpcErr) {
      const { data: cust } = await supabase
        .from('customers').select('current_balance').eq('id', sale.customer_id).single()
      const newBalance = Math.max(0, (Number(cust?.current_balance) || 0) - reduction)
      await supabase.from('customers').update({ current_balance: newBalance }).eq('id', sale.customer_id)
    }
  }

  return ret
}
