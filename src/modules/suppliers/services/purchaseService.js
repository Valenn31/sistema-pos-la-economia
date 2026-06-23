/**
 * purchaseService.js — Notas de Pedido y Órdenes de Compra.
 */
import { supabase } from '@/supabase/client'
import { receiveGoods } from '@/modules/stock/services/movementService'

// ── Notas de Pedido ───────────────────────────────────────────────────

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

export async function getPurchaseNoteById(id) {
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

export async function updatePurchaseNote(id, { supplierId, items, notes }) {
  const { error: noteErr } = await supabase
    .from('purchase_notes')
    .update({ supplier_id: supplierId, notes: notes || null })
    .eq('id', id)
  if (noteErr) throw noteErr

  // Replace items
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

export async function updateNoteStatus(id, status) {
  const { error } = await supabase
    .from('purchase_notes')
    .update({ status })
    .eq('id', id)
  if (error) throw error
}

// ── Órdenes de Compra ─────────────────────────────────────────────────

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

export async function getPurchaseOrderById(id) {
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

  // Mark note as converted if origin was a note
  if (noteId) {
    await supabase.from('purchase_notes').update({ status: 'converted' }).eq('id', noteId)
  }

  return order
}

export async function updateOrderStatus(id, status) {
  const { error } = await supabase
    .from('purchase_orders')
    .update({ status })
    .eq('id', id)
  if (error) throw error
}

/**
 * Recibe una OC: actualiza quantities_received, incrementa stock en Depósito,
 * registra movimientos y marca la OC como 'received'.
 *
 * @param {string} orderId
 * @param {Array}  receivedItems - [{ itemId, productId, quantityReceived }]
 * @param {string} userId
 * @param {number} depositLocationId - ID de la ubicación Depósito
 */
export async function receivePurchaseOrder(orderId, receivedItems, userId, depositLocationId) {
  for (const item of receivedItems) {
    if (!item.quantityReceived || item.quantityReceived <= 0) continue

    const { error: updateErr } = await supabase
      .from('purchase_order_items')
      .update({ quantity_received: item.quantityReceived })
      .eq('id', item.itemId)
    if (updateErr) throw updateErr

    await receiveGoods({
      productId:   item.productId,
      locationId:  depositLocationId,
      quantity:    item.quantityReceived,
      userId,
      referenceId: orderId,
      expiryDate:  item.expiryDate || null,
    })
  }

  await updateOrderStatus(orderId, 'received')
}
