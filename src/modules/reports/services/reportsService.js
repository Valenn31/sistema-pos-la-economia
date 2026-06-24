/**
 * reportsService.js — Queries para los reportes del módulo Admin.
 *
 * Funciones exportadas:
 *  - getSalesReport({ from, to })  → Ventas completadas en un rango de fechas
 *  - getSalesSummary(sales)        → Resumen calculado a partir de ventas (totales, por método)
 *  - getCashReport({ from, to })   → Sesiones de caja en un rango de fechas
 *  - getStockReport()              → Inventario actual por producto y ubicación
 */
import { supabase } from '@/supabase/client'

// ── Ventas ────────────────────────────────────────────────────────────

/**
 * Obtiene las ventas completadas en un rango de fechas.
 * Incluye datos del cajero, cliente y métodos de pago.
 * Se usa para el reporte de ventas en el módulo Admin.
 *
 * @param {object} params - Rango de fechas
 * @param {string} params.from - Fecha de inicio en formato ISO 8601
 * @param {string} params.to - Fecha de fin en formato ISO 8601
 * @returns {Promise<object[]>} Lista de ventas con cajero, cliente y pagos
 * @throws {Error} Si falla la consulta a Supabase
 */
export async function getSalesReport({ from, to }) {
  const { data, error } = await supabase
    .from('sales')
    .select(`
      id, sale_number, created_at, total, subtotal, discount_total, iva_total,
      receipt_type, status,
      profiles!cashier_id(full_name),
      customers(full_name),
      sale_payments(method, amount)
    `)
    .gte('created_at', from)
    .lte('created_at', to)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

/**
 * Calcula un resumen estadístico a partir de un array de ventas.
 * Es una función pura (no hace queries) que procesa los datos ya obtenidos.
 *
 * @param {object[]} sales - Array de ventas (resultado de getSalesReport)
 * @returns {{
 *   totalRevenue: number,
 *   totalDiscount: number,
 *   totalIva: number,
 *   byMethod: Record<string, number>,
 *   count: number
 * }} Resumen con:
 *   - totalRevenue: Ingreso total (suma de totales)
 *   - totalDiscount: Total de descuentos otorgados
 *   - totalIva: Total de IVA facturado
 *   - byMethod: Monto agrupado por método de pago (ej: { efectivo: 5000, debito: 2000 })
 *   - count: Cantidad de ventas
 */
export function getSalesSummary(sales) {
  const totalRevenue = sales.reduce((s, v) => s + Number(v.total), 0)
  const totalDiscount = sales.reduce((s, v) => s + Number(v.discount_total ?? 0), 0)
  const totalIva = sales.reduce((s, v) => s + Number(v.iva_total ?? 0), 0)

  /** @type {Record<string, number>} Acumula montos por método de pago */
  const byMethod = {}
  for (const sale of sales) {
    for (const p of (sale.sale_payments ?? [])) {
      byMethod[p.method] = (byMethod[p.method] ?? 0) + Number(p.amount)
    }
  }

  return { totalRevenue, totalDiscount, totalIva, byMethod, count: sales.length }
}

// ── Sesiones de caja ──────────────────────────────────────────────────

/**
 * Obtiene las sesiones de caja (turnos) en un rango de fechas.
 * Incluye el nombre de la caja registradora y el nombre del usuario que abrió.
 *
 * @param {object} params - Rango de fechas
 * @param {string} params.from - Fecha de inicio en formato ISO 8601
 * @param {string} params.to - Fecha de fin en formato ISO 8601
 * @returns {Promise<object[]>} Lista de sesiones de caja con datos de caja y operador
 * @throws {Error} Si falla la consulta a Supabase
 */
export async function getCashReport({ from, to }) {
  const { data, error } = await supabase
    .from('cash_sessions')
    .select(`
      *,
      cash_registers(name),
      profiles!opened_by(full_name)
    `)
    .gte('opened_at', from)
    .lte('opened_at', to)
    .order('opened_at', { ascending: false })
  if (error) throw error
  return data
}

// ── Stock ─────────────────────────────────────────────────────────────

/**
 * Genera el reporte de inventario actual.
 * Combina productos activos con sus cantidades de stock por ubicación.
 *
 * Pasos:
 *  1. Obtiene todas las filas de stock con su ubicación
 *  2. Obtiene todos los productos activos con categoría y precios
 *  3. Agrupa el stock por producto y ubicación
 *  4. Retorna cada producto con su stock desglosado por ubicación y el total general
 *
 * @returns {Promise<Array<object & {
 *   stockByLoc: Record<string, number>,
 *   totalStock: number
 * }>>} Productos con stock por ubicación (nombre de ubicación → cantidad) y stock total
 * @throws {Error} Si falla alguna consulta a Supabase
 */
export async function getStockReport() {
  const { data: stockRows, error: stockErr } = await supabase
    .from('stock')
    .select('product_id, location_id, quantity, locations(name)')
  if (stockErr) throw stockErr

  const { data: products, error: prodErr } = await supabase
    .from('products')
    .select('id, name, sku, min_stock, price_sell, price_cost, categories(name)')
    .eq('is_active', true)
    .order('name')
  if (prodErr) throw prodErr

  /** @type {Record<string, Record<string, number>>} Mapa: productId → { nombreUbicacion → cantidad } */
  const byProduct = {}
  for (const row of stockRows) {
    if (!byProduct[row.product_id]) byProduct[row.product_id] = {}
    byProduct[row.product_id][row.locations?.name ?? row.location_id] = row.quantity
  }

  return products.map((p) => ({
    ...p,
    stockByLoc: byProduct[p.id] ?? {},
    totalStock: Object.values(byProduct[p.id] ?? {}).reduce((s, q) => s + q, 0),
  }))
}
