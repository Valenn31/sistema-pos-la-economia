/**
 * cashSessionService.js — Gestión de turnos de caja (sesiones de caja).
 *
 * Funciones exportadas:
 *  - getActiveRegisters()                              → Lista de cajas registradoras activas
 *  - getActiveSession(registerId)                      → Sesión abierta de una caja (o null)
 *  - openCashSession({ registerId, openedBy, ... })    → Abre una nueva sesión de caja
 *  - closeCashSession(sessionId, closingAmount)        → Cierra una sesión de caja
 *  - getSessionTotals(sessionId)                       → Totales de ventas y devoluciones del turno
 */
import { supabase } from '@/supabase/client'

/**
 * Obtiene todas las cajas registradoras activas del sistema, ordenadas por nombre.
 *
 * @returns {Promise<object[]>} Lista de cajas registradoras activas
 * @throws {Error} Si falla la consulta a Supabase
 */
export async function getActiveRegisters() {
  const { data, error } = await supabase
    .from('cash_registers')
    .select('*')
    .eq('is_active', true)
    .order('name')
  if (error) throw error
  return data
}

/**
 * Obtiene la sesión de caja abierta (si existe) para una caja registradora específica.
 * Retorna null si la caja no tiene ninguna sesión abierta actualmente.
 *
 * @param {number} registerId - ID de la caja registradora
 * @returns {Promise<object|null>} Sesión abierta con el nombre de la caja, o null
 * @throws {Error} Si falla la consulta a Supabase
 */
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

/**
 * Abre una nueva sesión de caja (turno).
 * Registra quién abrió la caja y con qué monto inicial.
 *
 * @param {object} params - Datos de apertura
 * @param {number} params.registerId - ID de la caja registradora
 * @param {string} params.openedBy - UUID del usuario que abre la caja
 * @param {number} params.openingAmount - Monto inicial en efectivo
 * @returns {Promise<object>} La sesión de caja creada con el nombre de la caja
 * @throws {Error} Si falla la inserción en Supabase
 */
export async function openCashSession({ registerId, openedBy, openingAmount }) {
  const { data, error } = await supabase
    .from('cash_sessions')
    .insert({ register_id: registerId, opened_by: openedBy, opening_amount: openingAmount })
    .select('*, cash_registers(name)')
    .single()
  if (error) throw error
  return data
}

/**
 * Cierra una sesión de caja activa.
 * Registra el monto de cierre, la fecha/hora de cierre y cambia el estado a 'closed'.
 *
 * @param {string} sessionId - UUID de la sesión de caja a cerrar
 * @param {number} closingAmount - Monto en efectivo al momento del cierre
 * @returns {Promise<object>} La sesión de caja actualizada
 * @throws {Error} Si falla la actualización en Supabase
 */
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
 * Calcula los totales de ventas y devoluciones de una sesión de caja,
 * agrupados por método de pago.
 *
 * Consulta las ventas asociadas a la sesión y las devoluciones realizadas
 * durante el período de apertura de la caja.
 *
 * @param {string} sessionId - UUID de la sesión de caja
 * @returns {Promise<{
 *   totals: Record<string, number>,
 *   total: number,
 *   salesCount: number,
 *   returnsTotal: number,
 *   returnsCount: number
 * }>} Objeto con:
 *   - totals: Monto por método de pago (efectivo, debito, credito, qr, transferencia, cuenta)
 *   - total: Suma total de todas las ventas
 *   - salesCount: Cantidad de ventas realizadas
 *   - returnsTotal: Monto total de devoluciones
 *   - returnsCount: Cantidad de devoluciones
 * @throws {Error} Si falla alguna consulta a Supabase
 */
export async function getSessionTotals(sessionId) {
  /** Consulta en paralelo los datos de la sesión y sus ventas */
  const [sessionRes, salesRes] = await Promise.all([
    supabase.from('cash_sessions').select('opened_at').eq('id', sessionId).single(),
    supabase.from('sales').select('total, sale_payments(method, amount)')
      .eq('session_id', sessionId).eq('status', 'completed'),
  ])
  if (sessionRes.error) throw sessionRes.error
  if (salesRes.error) throw salesRes.error

  /** Consulta devoluciones realizadas desde la apertura de la sesión */
  const { data: returnsData } = await supabase
    .from('returns')
    .select('total, created_at')
    .gte('created_at', sessionRes.data.opened_at)

  /** @type {Record<string, number>} Totales acumulados por método de pago */
  const totals = { efectivo: 0, debito: 0, credito: 0, qr: 0, transferencia: 0, cuenta: 0 }
  let total = 0

  /** Recorre cada venta y acumula totales por método de pago */
  salesRes.data.forEach((sale) => {
    total += Number(sale.total)
    ;(sale.sale_payments ?? []).forEach((p) => {
      totals[p.method] = (totals[p.method] ?? 0) + Number(p.amount)
    })
  })

  /** Calcula totales de devoluciones */
  const returnsTotal = (returnsData ?? []).reduce((s, r) => s + Number(r.total), 0)
  const returnsCount = (returnsData ?? []).length

  return { totals, total, salesCount: salesRes.data.length, returnsTotal, returnsCount }
}
