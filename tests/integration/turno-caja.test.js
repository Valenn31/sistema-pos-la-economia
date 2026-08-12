/**
 * Prueba de integración: turno + cliente + pago.
 * getSessionTotals() agrupa ventas por método de pago y descuenta el
 * contexto de devoluciones ocurridas durante el turno.
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { chainable } from '../helpers/supabaseMock'

vi.mock('@/supabase/client', () => ({
  supabase: { from: vi.fn(), rpc: vi.fn(), auth: {} },
}))

import { supabase } from '@/supabase/client'
import { getSessionTotals } from '@/modules/pos/services/cashSessionService'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getSessionTotals', () => {
  it('agrupa el total vendido por método de pago y cuenta las devoluciones del turno', async () => {
    const sales = [
      { total: 100, sale_payments: [{ method: 'efectivo', amount: 60 }, { method: 'debito', amount: 40 }] },
      { total: 50, sale_payments: [{ method: 'efectivo', amount: 50 }] },
    ]
    const returns = [{ total: 20, created_at: '2026-01-02T00:00:00Z' }]

    supabase.from
      .mockReturnValueOnce(chainable({ data: { opened_at: '2026-01-01T00:00:00Z' }, error: null })) // cash_sessions
      .mockReturnValueOnce(chainable({ data: sales, error: null }))                                    // sales
      .mockReturnValueOnce(chainable({ data: returns, error: null }))                                  // returns

    const result = await getSessionTotals('session-1')

    expect(result.totals.efectivo).toBe(110)
    expect(result.totals.debito).toBe(40)
    expect(result.totals.credito).toBe(0)
    expect(result.total).toBe(150)
    expect(result.salesCount).toBe(2)
    expect(result.returnsTotal).toBe(20)
    expect(result.returnsCount).toBe(1)
  })

  it('con un turno sin ventas ni devoluciones, todos los totales quedan en 0', async () => {
    supabase.from
      .mockReturnValueOnce(chainable({ data: { opened_at: '2026-01-01T00:00:00Z' }, error: null }))
      .mockReturnValueOnce(chainable({ data: [], error: null }))
      .mockReturnValueOnce(chainable({ data: [], error: null }))

    const result = await getSessionTotals('session-vacia')

    expect(result.total).toBe(0)
    expect(result.salesCount).toBe(0)
    expect(result.returnsTotal).toBe(0)
    Object.values(result.totals).forEach((v) => expect(v).toBe(0))
  })

  it('propaga el error si falla la consulta de ventas', async () => {
    supabase.from
      .mockReturnValueOnce(chainable({ data: { opened_at: '2026-01-01T00:00:00Z' }, error: null }))
      .mockReturnValueOnce(chainable({ data: null, error: new Error('fallo de red') }))

    await expect(getSessionTotals('session-1')).rejects.toThrow('fallo de red')
  })
})
