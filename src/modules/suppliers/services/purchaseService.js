/**
 * purchaseService.js — Gestión de Notas de Pedido y Órdenes de Compra.
 *
 * Notas de Pedido (borradores de compra):
 *  - getPurchaseNotes()                          → Lista todas las notas de pedido
 *  - getPurchaseNoteById(id)                     → Detalle de una nota con sus ítems
 *  - createPurchaseNote({ supplierId, items, ...}) → Crea una nota de pedido
 *  - updatePurchaseNote(id, { ... })             → Actualiza una nota existente
 *  - updateNoteStatus(id, status)                → Cambia el estado de una nota
 *
 * Órdenes de Compra (pedidos confirmados):
 *  - getPurchaseOrders()                         → Lista todas las órdenes de compra
 *  - getPurchaseOrderById(id)                    → Detalle de una orden con sus ítems
 *  - createPurchaseOrder({ ... })                → Crea una orden de compra
 *  - updateOrderStatus(id, status)               → Cambia el estado de una orden
 *  - receivePurchaseOrder(orderId, items, ...)    → Recibe mercadería de una OC
 */
import { supabase } from '@/supabase/client'
import { receiveGoods } from '@/modules/stock/services/movementService'

// ── Notas de Pedido ───────────────────────────────────────────────────

/**
 * Obtiene todas las notas de pedido con el nombre del proveedor y del creador.
 * Ordenadas por fecha de creación descendente (más recientes primero).
 *
 * @returns {Promise<object[]>} Lista de notas de pedido
 * @throws {Error} Si falla la consulta a Supabase
 */
export async function getPurchaseNotes() {
  const { data, error } = await supabase
    .from('purchase_notes')
    .select(`
      *,
      suppliers(razon_social),
      profiles!created_by(full_name)
    `)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

/**
 * Obtiene el detalle completo de una nota de pedido incluyendo sus ítems.
 * Consulta la nota y los ítems en paralelo para mayor velocidad.
 *
 * @param {string} id - UUID de la nota de pedido
 * @returns {Promise<object & { items: object[] }>} Nota con proveedor, creador y lista de ítems
 * @throws {Error} Si la nota no existe o falla la consulta
 */
export async function getPurchaseNoteById(id) {
  /** Consulta nota e ítems en paralelo */
  const [noteRes, itemsRes] = await Promise.all([
    supabase
      .from('purchase_notes')
      .select(`*, suppliers(razon_social), profiles!created_by(full_name)`)
      .eq('id', id)
      .single(),
    supabase
      .from('purchase_note_items')
      .select(`*, products(id, name, sku)`)
      .eq('note_id', id),
  ])
  if (noteRes.error) throw noteRes.error
  if (itemsRes.error) throw itemsRes.error
  return { ...noteRes.data, items: itemsRes.data }
}

/**
 * Crea una nueva nota de pedido con sus ítems.
 *
 * @param {object} params - Datos de la nota
 * @param {string|null} [params.supplierId] - UUID del proveedor (opcional)
 * @param {object[]} [params.items] - Ítems de la nota de pedido
 * @param {string} params.items[].product_id - UUID del producto
 * @param {number} params.items[].quantity_requested - Cantidad solicitada
 * @param {number|null} [params.items[].unit_price] - Precio unitario estimado
 * @param {string|null} [params.notes] - Notas u observaciones
 * @param {string} params.createdBy - UUID del usuario que crea la nota
 * @returns {Promise<object>} La nota de pedido creada (cabecera)
 * @throws {Error} Si falla la inserción en Supabase
 */
export async function createPurchaseNote({ supplierId, items, notes, createdBy }) {
  const { data: note, error: noteErr } = await supabase
    .from('purchase_notes')
    .insert({ supplier_id: supplierId || null, notes: notes || null, created_by: createdBy })
    .select()
    .single()
  if (noteErr) throw noteErr

  if (items?.length) {
    const { error: itemsErr } = await supabase.from('purchase_note_items').insert(
      items.map((i) => ({
        note_id:            note.id,
        product_id:         i.product_id,
        quantity_requested: parseFloat(i.quantity_requested),
        unit_price:         parseFloat(i.unit_price) || null,
      }))
    )
    if (itemsErr) throw itemsErr
  }

  return note
}

/**
 * Actualiza una nota de pedido existente (proveedor, notas e ítems).
 * Los ítems se reemplazan completamente: se eliminan los anteriores y se insertan los nuevos.
 *
 * @param {string} id - UUID de la nota de pedido a actualizar
 * @param {object} params - Nuevos datos
 * @param {string|null} [params.supplierId] - UUID del proveedor
 * @param {object[]} [params.items] - Nuevos ítems (reemplazan todos los anteriores)
 * @param {string|null} [params.notes] - Notas u observaciones
 * @returns {Promise<void>}
 * @throws {Error} Si falla la actualización o inserción de ítems
 */
export async function updatePurchaseNote(id, { supplierId, items, notes }) {
  const { error: noteErr } = await supabase
    .from('purchase_notes')
    .update({ supplier_id: supplierId, notes: notes || null })
    .eq('id', id)
  if (noteErr) throw noteErr

  /** Reemplaza todos los ítems: elimina los viejos e inserta los nuevos */
  await supabase.from('purchase_note_items').delete().eq('note_id', id)
  if (items?.length) {
    const { error: itemsErr } = await supabase.from('purchase_note_items').insert(
      items.map((i) => ({
        note_id:            id,
        product_id:         i.product_id,
        quantity_requested: parseFloat(i.quantity_requested),
        unit_price:         parseFloat(i.unit_price) || null,
      }))
    )
    if (itemsErr) throw itemsErr
  }
}

/**
 * Actualiza el estado de una nota de pedido.
 *
 * @param {string} id - UUID de la nota de pedido
 * @param {string} status - Nuevo estado (ej: 'draft', 'sent', 'converted', 'cancelled')
 * @returns {Promise<void>}
 * @throws {Error} Si falla la actualización en Supabase
 */
export async function updateNoteStatus(id, status) {
  const { error } = await supabase
    .from('purchase_notes')
    .update({ status })
    .eq('id', id)
  if (error) throw error
}

// ── Órdenes de Compra ─────────────────────────────────────────────────

/**
 * Obtiene todas las órdenes de compra con proveedor, creador y nota de origen.
 * Ordenadas por fecha de creación descendente.
 *
 * @returns {Promise<object[]>} Lista de órdenes de compra
 * @throws {Error} Si falla la consulta a Supabase
 */
export async function getPurchaseOrders() {
  const { data, error } = await supabase
    .from('purchase_orders')
    .select(`
      *,
      suppliers(razon_social),
      profiles!created_by(full_name),
      purchase_notes(note_number)
    `)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

/**
 * Obtiene el detalle completo de una orden de compra incluyendo sus ítems.
 * Consulta la orden y los ítems en paralelo.
 *
 * @param {string} id - UUID de la orden de compra
 * @returns {Promise<object & { items: object[] }>} Orden con proveedor, creador y lista de ítems
 * @throws {Error} Si la orden no existe o falla la consulta
 */
export async function getPurchaseOrderById(id) {
  /** Consulta orden e ítems en paralelo */
  const [orderRes, itemsRes] = await Promise.all([
    supabase
      .from('purchase_orders')
      .select(`*, suppliers(razon_social), profiles!created_by(full_name)`)
      .eq('id', id)
      .single(),
    supabase
      .from('purchase_order_items')
      .select(`*, products(id, name, sku)`)
      .eq('order_id', id),
  ])
  if (orderRes.error) throw orderRes.error
  if (itemsRes.error) throw itemsRes.error
  return { ...orderRes.data, items: itemsRes.data }
}

/**
 * Crea una nueva orden de compra con sus ítems.
 * Si se indica una nota de pedido de origen (noteId), la marca como 'converted'.
 *
 * @param {object} params - Datos de la orden
 * @param {string} params.supplierId - UUID del proveedor
 * @param {string|null} [params.noteId] - UUID de la nota de pedido de origen
 * @param {object[]} [params.items] - Ítems de la orden
 * @param {string} params.items[].product_id - UUID del producto
 * @param {number} params.items[].quantity_ordered - Cantidad ordenada
 * @param {number} params.items[].unit_price - Precio unitario acordado
 * @param {number} [params.totalAmount=0] - Monto total de la orden
 * @param {string|null} [params.expectedDate] - Fecha estimada de entrega (ISO 8601)
 * @param {string|null} [params.notes] - Notas u observaciones
 * @param {string} params.createdBy - UUID del usuario que crea la orden
 * @returns {Promise<object>} La orden de compra creada (cabecera)
 * @throws {Error} Si falla la inserción en Supabase
 */
export async function createPurchaseOrder({ supplierId, noteId, items, totalAmount, expectedDate, notes, createdBy }) {
  const { data: order, error: orderErr } = await supabase
    .from('purchase_orders')
    .insert({
      supplier_id:   supplierId,
      note_id:       noteId   || null,
      created_by:    createdBy,
      total_amount:  parseFloat(totalAmount) || 0,
      expected_date: expectedDate || null,
      notes:         notes || null,
    })
    .select()
    .single()
  if (orderErr) throw orderErr

  if (items?.length) {
    const { error: itemsErr } = await supabase.from('purchase_order_items').insert(
      items.map((i) => ({
        order_id:         order.id,
        product_id:       i.product_id,
        quantity_ordered: parseFloat(i.quantity_ordered),
        unit_price:       parseFloat(i.unit_price),
        subtotal:         parseFloat(i.quantity_ordered) * parseFloat(i.unit_price),
      }))
    )
    if (itemsErr) throw itemsErr
  }

  /** Si la orden proviene de una nota de pedido, marcarla como convertida */
  if (noteId) {
    await supabase.from('purchase_notes').update({ status: 'converted' }).eq('id', noteId)
  }

  return order
}

/**
 * Actualiza el estado de una orden de compra.
 *
 * @param {string} id - UUID de la orden de compra
 * @param {string} status - Nuevo estado (ej: 'pending', 'sent', 'received', 'cancelled')
 * @returns {Promise<void>}
 * @throws {Error} Si falla la actualización en Supabase
 */
export async function updateOrderStatus(id, status) {
  const { error } = await supabase
    .from('purchase_orders')
    .update({ status })
    .eq('id', id)
  if (error) throw error
}

/**
 * Recibe la mercadería de una orden de compra.
 * Para cada ítem recibido:
 *  1. Actualiza la cantidad recibida (quantity_received) en purchase_order_items
 *  2. Incrementa el stock en la ubicación de depósito vía receiveGoods
 *  3. Registra el movimiento de stock correspondiente
 * Finalmente marca la orden como 'received'.
 *
 * @param {string} orderId - UUID de la orden de compra
 * @param {object[]} receivedItems - Lista de ítems recibidos
 * @param {string} receivedItems[].itemId - ID del ítem de la orden (purchase_order_items.id)
 * @param {string} receivedItems[].productId - UUID del producto recibido
 * @param {number} receivedItems[].quantityReceived - Cantidad efectivamente recibida
 * @param {string|null} [receivedItems[].expiryDate] - Fecha de vencimiento del lote (ISO 8601)
 * @param {string} userId - UUID del usuario que recibe la mercadería
 * @param {number} depositLocationId - ID de la ubicación de depósito donde se almacena
 * @returns {Promise<void>}
 * @throws {Error} Si falla la actualización de ítems o el ingreso de stock
 */
export async function receivePurchaseOrder(orderId, receivedItems, userId, depositLocationId) {
  for (const item of receivedItems) {
    /** Omite ítems sin cantidad recibida o con cantidad 0 */
    if (!item.quantityReceived || item.quantityReceived <= 0) continue

    /** Actualiza la cantidad recibida en el ítem de la orden */
    const { error: updateErr } = await supabase
      .from('purchase_order_items')
      .update({ quantity_received: item.quantityReceived })
      .eq('id', item.itemId)
    if (updateErr) throw updateErr

    /** Ingresa la mercadería al stock (incrementa cantidad + registra movimiento) */
    await receiveGoods({
      productId:   item.productId,
      locationId:  depositLocationId,
      quantity:    item.quantityReceived,
      userId,
      referenceId: orderId,
      expiryDate:  item.expiryDate || null,
    })
  }

  /** Marca la orden como recibida */
  await updateOrderStatus(orderId, 'received')
}
