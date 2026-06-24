/**
 * movementService.js — Niveles de stock, movimientos, traslados y ajustes.
 *
 * Funciones exportadas:
 *  - getStockLevels()                 → Todos los productos con su stock por ubicación
 *  - getProductStock(productId)       → Stock de un producto específico por ubicación
 *  - getLocations()                   → Lista de ubicaciones activas
 *  - transferStock({ ... })           → Traslado de stock entre ubicaciones
 *  - adjustStock({ ... })             → Ajuste manual de stock (incremento o decremento)
 *  - receiveGoods({ ... })            → Ingreso de mercadería (desde orden de compra)
 *  - getExpiryAlerts()                → Productos con vencimiento próximo o vencidos
 *  - getMovements({ productId, ... }) → Historial de movimientos de stock
 */
import { supabase } from '@/supabase/client'

// ── Niveles de stock ──────────────────────────────────────────────────

/**
 * Obtiene todos los productos activos con su stock desglosado por ubicación.
 * Combina las tablas `products`, `stock` y `locations` para armar un mapa
 * de stock por producto.
 *
 * @returns {Promise<Array<object & {
 *   stock: Record<string, { quantity: number, locationName: string }>
 * }>>} Lista de productos con su stock por ubicación (locationId → { quantity, locationName })
 * @throws {Error} Si falla alguna consulta a Supabase
 */
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

  /** @type {Record<string, Record<string, { quantity: number, locationName: string }>>} */
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

/**
 * Obtiene el stock de un producto específico desglosado por ubicación.
 *
 * @param {string} productId - UUID del producto
 * @returns {Promise<Record<string, { quantity: number, locationName: string }>>}
 *   Mapa de locationId → { quantity, locationName }
 * @throws {Error} Si falla la consulta a Supabase
 */
export async function getProductStock(productId) {
  const { data, error } = await supabase
    .from('stock')
    .select('location_id, quantity, locations(id, name)')
    .eq('product_id', productId)
  if (error) throw error

  /** @type {Record<string, { quantity: number, locationName: string }>} */
  const byLoc = {}
  for (const row of data) {
    byLoc[row.location_id] = { quantity: row.quantity, locationName: row.locations?.name ?? '' }
  }
  return byLoc
}

/**
 * Obtiene todas las ubicaciones de stock activas (ej: "En Estantería", "Depósito").
 *
 * @returns {Promise<object[]>} Lista de ubicaciones activas ordenadas por nombre
 * @throws {Error} Si falla la consulta a Supabase
 */
export async function getLocations() {
  const { data, error } = await supabase
    .from('locations')
    .select('*')
    .eq('is_active', true)
    .order('name')
  if (error) throw error
  return data ?? []
}

// ── Traslado entre ubicaciones ────────────────────────────────────────

/**
 * Realiza un traslado de stock entre dos ubicaciones (ej: Depósito → Estantería).
 * Usa el RPC `transfer_stock` para garantizar atomicidad, y luego registra
 * el movimiento en `stock_movements`.
 *
 * @param {object} params - Datos del traslado
 * @param {string} params.productId - UUID del producto a trasladar
 * @param {string} params.fromLocationId - UUID de la ubicación de origen
 * @param {string} params.toLocationId - UUID de la ubicación de destino
 * @param {number} params.quantity - Cantidad a trasladar
 * @param {string} params.userId - UUID del usuario que realiza el traslado
 * @param {string|null} [params.notes] - Notas u observaciones del traslado
 * @returns {Promise<void>}
 * @throws {Error} Si falla el RPC o el registro del movimiento
 */
export async function transferStock({ productId, fromLocationId, toLocationId, quantity, userId, notes }) {
  const { error: rpcErr } = await supabase.rpc('transfer_stock', {
    p_product_id:       productId,
    p_from_location_id: fromLocationId,
    p_to_location_id:   toLocationId,
    p_quantity:         quantity,
  })
  if (rpcErr) throw rpcErr

  /** Registra el movimiento de tipo 'traslado' */
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

/**
 * Realiza un ajuste manual de stock (incremento o decremento).
 * Si la cantidad es positiva, se incrementa el stock en la ubicación indicada.
 * Si es negativa, se decrementa. El movimiento se registra con tipo 'ajuste'.
 *
 * @param {object} params - Datos del ajuste
 * @param {string} params.productId - UUID del producto
 * @param {string} params.locationId - UUID de la ubicación donde se ajusta
 * @param {number} params.quantity - Cantidad a ajustar (positiva o negativa)
 * @param {string} params.userId - UUID del usuario que realiza el ajuste
 * @param {string|null} [params.notes] - Motivo o notas del ajuste
 * @returns {Promise<void>}
 * @throws {Error} Si falla el RPC o el registro del movimiento
 */
export async function adjustStock({ productId, locationId, quantity, userId, notes }) {
  const { error: rpcErr } = await supabase.rpc('increment_stock', {
    p_product_id:  productId,
    p_location_id: locationId,
    p_quantity:    quantity,
  })
  if (rpcErr) throw rpcErr

  /** Registra el movimiento — la dirección (from/to) depende del signo de quantity */
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

/**
 * Registra el ingreso de mercadería a una ubicación (generalmente "Depósito").
 * Se usa al recibir una orden de compra. Incrementa el stock y registra
 * el movimiento con tipo 'compra'.
 *
 * @param {object} params - Datos del ingreso
 * @param {string} params.productId - UUID del producto recibido
 * @param {string} params.locationId - UUID de la ubicación de destino
 * @param {number} params.quantity - Cantidad recibida
 * @param {string} params.userId - UUID del usuario que recibe la mercadería
 * @param {string|null} [params.referenceId] - UUID de la orden de compra asociada
 * @param {string|null} [params.notes] - Notas del ingreso
 * @param {string|null} [params.expiryDate] - Fecha de vencimiento del lote (formato ISO)
 * @returns {Promise<void>}
 * @throws {Error} Si falla el RPC o el registro del movimiento
 */
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
 * Obtiene alertas de vencimiento de productos.
 * Combina dos fuentes de datos:
 *  1. Lotes con fecha de vencimiento (desde `stock_movements` de tipo 'compra')
 *  2. Productos con fecha de vencimiento directa (desde `products.expiry_date`)
 *
 * Cada resultado incluye un estado calculado:
 *  - 'expired'  → Ya venció
 *  - 'critical' → Vence en los próximos 7 días
 *  - 'warning'  → Vence en los próximos 30 días
 *  - 'ok'       → Vence después de 30 días
 *
 * Evita duplicados: si un producto tiene lotes con vencimiento en stock_movements,
 * no se incluye su fecha de vencimiento directa de la tabla products.
 *
 * @returns {Promise<object[]>} Lista de alertas de vencimiento ordenadas por fecha (más próximas primero)
 * @throws {Error} Si falla alguna consulta a Supabase
 */
export async function getExpiryAlerts() {
  /** Consulta en paralelo lotes con vencimiento y productos con vencimiento directo */
  const [movRes, prodRes] = await Promise.all([
    supabase
      .from('stock_movements')
      .select('id, product_id, quantity, expiry_date, created_at, products(name, sku)')
      .eq('movement_type', 'compra')
      .not('expiry_date', 'is', null)
      .order('expiry_date', { ascending: true }),
    supabase
      .from('products')
      .select('id, name, sku, expiry_date')
      .eq('is_active', true)
      .eq('has_expiry', true)
      .not('expiry_date', 'is', null),
  ])
  if (movRes.error) throw movRes.error
  if (prodRes.error) throw prodRes.error

  /** Fechas de referencia para clasificar el estado de vencimiento */
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const in7  = new Date(today); in7.setDate(in7.getDate() + 7)
  const in30 = new Date(today); in30.setDate(in30.getDate() + 30)

  /**
   * Clasifica una fecha de vencimiento en un estado.
   * @param {string} expDate - Fecha de vencimiento en formato ISO
   * @returns {'expired'|'critical'|'warning'|'ok'} Estado del vencimiento
   */
  const classify = (expDate) => {
    const exp = new Date(expDate)
    if (exp < today) return 'expired'
    if (exp <= in7)  return 'critical'
    if (exp <= in30) return 'warning'
    return 'ok'
  }

  /** Lotes con vencimiento desde movimientos de stock */
  const movRows = (movRes.data ?? []).map((row) => ({
    ...row, source: 'batch', status: classify(row.expiry_date),
  }))

  /** Evita duplicar productos que ya tienen lotes registrados */
  const seenProductIds = new Set(movRows.map((r) => r.product_id))

  /** Productos con vencimiento directo (sin lotes en stock_movements) */
  const prodRows = (prodRes.data ?? [])
    .filter((p) => !seenProductIds.has(p.id))
    .map((p) => ({
      id: p.id,
      product_id: p.id,
      quantity: null,
      expiry_date: p.expiry_date,
      created_at: null,
      products: { name: p.name, sku: p.sku },
      source: 'product',
      status: classify(p.expiry_date),
    }))

  /** Combina ambas fuentes y ordena por fecha de vencimiento (más cercana primero) */
  return [...movRows, ...prodRows].sort((a, b) =>
    new Date(a.expiry_date) - new Date(b.expiry_date)
  )
}

// ── Historial de movimientos ──────────────────────────────────────────

/**
 * Obtiene el historial de movimientos de stock con paginación.
 * Incluye datos del producto, usuario, y nombres de ubicaciones de origen/destino.
 * Puede filtrarse opcionalmente por producto.
 *
 * @param {object} [opciones] - Parámetros de consulta
 * @param {string} [opciones.productId] - UUID del producto para filtrar (opcional)
 * @param {number} [opciones.limit=100] - Cantidad máxima de resultados
 * @param {number} [opciones.offset=0] - Desplazamiento para paginación
 * @returns {Promise<object[]>} Lista de movimientos con producto, usuario y ubicaciones
 * @throws {Error} Si falla la consulta a Supabase
 */
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
  return data ?? []
}
