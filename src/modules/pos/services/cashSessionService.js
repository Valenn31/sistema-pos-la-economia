/**
 * cashSessionService.js — Gestión de turnos de caja.
 *
 * Funciones:
 *  - getActiveRegisters()                     → Lista de cajas activas
 *  - getActiveSession(registerId)             → Sesión abierta de una caja (o null)
 *  - openCashSession({ registerId, openedBy, openingAmount }) → Nueva sesión
 *  - closeCashSession(sessionId, closingAmount) → Cierra la sesión
 *  - getSessionTotals(sessionId)              → Totales de ventas del turno
 */
import { supabase } from '@/supabase/client'

export async function getActiveRegisters() {
  const { data, error } = await supabase
    .from('cash_registers')
    .select('*')
    .eq('is_active', true)
    .order('name')
  if (error) throw error
  return data
}

export async function getActiveSession(registerId) {
  const { data, error } = await supabase
    .from('cash_sessions')
    .select('*, cash_registers(name)')
    .eq('register_id', registerId)
    .eq('status', 'open')
    .maybeSingle()
  if (error) throw error
  return data
}

export async function openCashSession({ registerId, openedBy, openingAmount }) {
  const { data, error } = await supabase
    .from('cash_sessions')
    .insert({ register_id: registerId, opened_by: openedBy, opening_amount: openingAmount })
    .select('*, cash_registers(name)')
    .single()
  if (error) throw error
  return data
}

export async function closeCashSession(sessionId, closingAmount) {
  const { data, error } = await supabase
    .from('cash_sessions')
    .update({ closing_amount: closingAmount, closed_at: new Date().toISOString(), status: 'closed' })
    .eq('id', sessionId)
    .select()
    .single()
  if (error) throw error
  return data
}

/**
 * Calcula totales de ventas de una sesión agrupados por método de pago.
 * @param {string} sessionId
 * @returns {{ totals: object, salesCount: number }}
 */
export async function getSessionTotals(sessionId) {
  const [sessionRes, salesRes] = await Promise.all([
    supabase.from('cash_sessions').select('opened_at').eq('id', sessionId).single(),
    supabase.from('sales').select('total, sale_payments(method, amount)')
      .eq('session_id', sessionId).eq('status', 'completed'),
  ])
  if (sessionRes.error) throw sessionRes.error
  if (salesRes.error) throw salesRes.error

  const { data: returnsData } = await supabase
    .from('returns')
    .select('total, created_at')
    .gte('created_at', sessionRes.data.opened_at)

  const totals = { efectivo: 0, debito: 0, credito: 0, qr: 0, transferencia: 0, cuenta: 0 }
  let total = 0

  salesRes.data.forEach((sale) => {
    total += Number(sale.total)
    ;(sale.sale_payments ?? []).forEach((p) => {
      totals[p.method] = (totals[p.method] ?? 0) + Number(p.amount)
    })
  })

  const returnsTotal = (returnsData ?? []).reduce((s, r) => s + Number(r.total), 0)
  const returnsCount = (returnsData ?? []).length

  return { totals, total, salesCount: salesRes.data.length, returnsTotal, returnsCount }
}
