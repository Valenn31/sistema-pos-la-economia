/**
 * reportsService.js — Queries para los reportes del módulo Admin.
 */
import { supabase } from '@/supabase/client'

// ── Ventas ────────────────────────────────────────────────────────────

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

export function getSalesSummary(sales) {
  const totalRevenue = sales.reduce((s, v) => s + v.total, 0)
  const totalDiscount = sales.reduce((s, v) => s + (v.discount_total ?? 0), 0)
  const totalIva = sales.reduce((s, v) => s + (v.iva_total ?? 0), 0)

  const byMethod = {}
  for (const sale of sales) {
    for (const p of (sale.sale_payments ?? [])) {
      byMethod[p.method] = (byMethod[p.method] ?? 0) + p.amount
    }
  }

  return { totalRevenue, totalDiscount, totalIva, byMethod, count: sales.length }
}

// ── Sesiones de caja ──────────────────────────────────────────────────

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
