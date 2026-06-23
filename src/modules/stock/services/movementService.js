/**
 * movementService.js — Stock levels, movimientos, traslados y ajustes.
 */
import { supabase } from '@/supabase/client'

// ── Stock levels ──────────────────────────────────────────────────────

export async function getStockLevels() {
  const { data: stockRows, error: stockErr } = await supabase
    .from('stock')
    .select('product_id, location_id, quantity, locations(id, name)')
    .order('product_id')
  if (stockErr) throw stockErr

  const { data: products, error: prodErr } = await supabase
    .from('products')
    .select('id, name, sku, min_stock, is_active, categories(name)')
    .eq('is_active', true)
    .order('name')
  if (prodErr) throw prodErr

  // Group stock by product
  const stockByProduct = {}
  for (const row of stockRows) {
    if (!stockByProduct[row.product_id]) stockByProduct[row.product_id] = {}
    stockByProduct[row.product_id][row.location_id] = {
      quantity: row.quantity,
      locationName: row.locations?.name ?? '',
    }
  }

  return products.map((p) => ({
    ...p,
    stock: stockByProduct[p.id] ?? {},
  }))
}

// Stock de un producto específico por ubicación — { [locationId]: { quantity, locationName } }
export async function getProductStock(productId) {
  const { data, error } = await supabase
    .from('stock')
    .select('location_id, quantity, locations(id, name)')
    .eq('product_id', productId)
  if (error) throw error
  const byLoc = {}
  for (const row of data) {
    byLoc[row.location_id] = { quantity: row.quantity, locationName: row.locations?.name ?? '' }
  }
  return byLoc
}

export async function getLocations() {
  const { data, error } = await supabase
    .from('locations')
    .select('*')
    .eq('is_active', true)
    .order('name')
  if (error) throw error
  return data
}

// ── Traslado Depósito → Estantería ────────────────────────────────────

export async function transferStock({ productId, fromLocationId, toLocationId, quantity, userId, notes }) {
  const { error: rpcErr } = await supabase.rpc('transfer_stock', {
    p_product_id:       productId,
    p_from_location_id: fromLocationId,
    p_to_location_id:   toLocationId,
    p_quantity:         quantity,
  })
  if (rpcErr) throw rpcErr

  // Registrar movimiento
  const { error: movErr } = await supabase.from('stock_movements').insert({
    product_id:       productId,
    from_location_id: fromLocationId,
    to_location_id:   toLocationId,
    quantity,
    movement_type:    'traslado',
    reference_type:   'manual',
    user_id:          userId,
    notes:            notes || null,
  })
  if (movErr) throw movErr
}

// ── Ajuste manual ─────────────────────────────────────────────────────

export async function adjustStock({ productId, locationId, quantity, userId, notes }) {
  const { error: rpcErr } = await supabase.rpc('increment_stock', {
    p_product_id:  productId,
    p_location_id: locationId,
    p_quantity:    quantity,
  })
  if (rpcErr) throw rpcErr

  const { error: movErr } = await supabase.from('stock_movements').insert({
    product_id:      productId,
    to_location_id:  quantity >= 0 ? locationId : null,
    from_location_id: quantity < 0 ? locationId : null,
    quantity:        Math.abs(quantity),
    movement_type:   'ajuste',
    reference_type:  'manual',
    user_id:         userId,
    notes:           notes || null,
  })
  if (movErr) throw movErr
}

// ── Ingreso de mercadería (desde Orden de Compra) ─────────────────────

export async function receiveGoods({ productId, locationId, quantity, userId, referenceId, notes, expiryDate }) {
  const { error: rpcErr } = await supabase.rpc('increment_stock', {
    p_product_id:  productId,
    p_location_id: locationId,
    p_quantity:    quantity,
  })
  if (rpcErr) throw rpcErr

  const { error: movErr } = await supabase.from('stock_movements').insert({
    product_id:     productId,
    to_location_id: locationId,
    quantity,
    movement_type:  'compra',
    reference_id:   referenceId || null,
    reference_type: referenceId ? 'purchase_order' : 'manual',
    user_id:        userId,
    notes:          notes || null,
    expiry_date:    expiryDate || null,
  })
  if (movErr) throw movErr
}

/**
 * Retorna lotes con fecha de vencimiento agrupados por producto.
 * Incluye estado: 'expired' | 'critical' (≤7d) | 'warning' (≤30d) | 'ok'
 */
export async function getExpiryAlerts() {
  const { data, error } = await supabase
    .from('stock_movements')
    .select('id, product_id, quantity, expiry_date, created_at, products(name, sku)')
    .eq('movement_type', 'compra')
    .not('expiry_date', 'is', null)
    .order('expiry_date', { ascending: true })
  if (error) throw error

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const in7  = new Date(today); in7.setDate(in7.getDate() + 7)
  const in30 = new Date(today); in30.setDate(in30.getDate() + 30)

  return (data ?? []).map((row) => {
    const exp = new Date(row.expiry_date)
    let status = 'ok'
    if (exp < today)  status = 'expired'
    else if (exp <= in7)  status = 'critical'
    else if (exp <= in30) status = 'warning'
    return { ...row, status }
  })
}

// ── Historial de movimientos ──────────────────────────────────────────

export async function getMovements({ productId, limit = 100, offset = 0 } = {}) {
  let query = supabase
    .from('stock_movements')
    .select(`
      *,
      products(name, sku),
      profiles!user_id(full_name),
      from_loc:locations!from_location_id(name),
      to_loc:locations!to_location_id(name)
    `)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (productId) query = query.eq('product_id', productId)

  const { data, error } = await query
  if (error) throw error
  return data
}
