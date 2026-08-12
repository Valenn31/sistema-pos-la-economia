/**
 * Prueba de integración: cuenta corriente de clientes.
 * registerPayment() (con su fallback) y getAccountStatement() (períodos de deuda).
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { chainable } from '../helpers/supabaseMock'

vi.mock('@/supabase/client', () => ({
  supabase: { from: vi.fn(), rpc: vi.fn(), auth: {} },
}))

import { supabase } from '@/supabase/client'
import { registerPayment, getAccountStatement } from '@/modules/customers/services/customerService'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('registerPayment', () => {
  it('camino feliz: usa el RPC atómico y registra el pago en customer_payments', async () => {
    supabase.rpc.mockReturnValueOnce(chainable({ error: null }))
    supabase.from.mockReturnValueOnce(chainable({ error: null })) // insert customer_payments

    await registerPayment({ customerId: 'c1', amount: 200, method: 'efectivo' })

    expect(supabase.rpc).toHaveBeenCalledWith('increment_customer_balance', {
      p_customer_id: 'c1', p_amount: -200, // negativo: es un abono, reduce la deuda
    })
    expect(supabase.from).toHaveBeenCalledWith('customer_payments')
  })

  it('si el RPC falla, calcula el nuevo saldo manualmente (nunca negativo) y actualiza', async () => {
    supabase.rpc.mockReturnValueOnce(chainable({ error: { message: 'rpc down' } }))
    supabase.from
      .mockReturnValueOnce(chainable({ data: { current_balance: 150 }, error: null })) // select
      .mockReturnValueOnce(chainable({ error: null }))                                  // update
      .mockReturnValueOnce(chainable({ error: null }))                                  // insert customer_payments

    await registerPayment({ customerId: 'c1', amount: 200 }) // paga más de lo que debe

    const tablesCalled = supabase.from.mock.calls.map((c) => c[0])
    expect(tablesCalled).toEqual(['customers', 'customers', 'customer_payments'])
  })
})

describe('getAccountStatement — períodos de cuenta corriente', () => {
  const sales = [
    { id: 'sale-1', sale_number: 1, created_at: '2026-01-01T00:00:00Z', total: 100, sale_payments: [{ method: 'cuenta', amount: 100 }], sale_items: [] },
    { id: 'sale-2', sale_number: 2, created_at: '2026-02-01T00:00:00Z', total: 50, sale_payments: [{ method: 'cuenta', amount: 50 }], sale_items: [] },
    { id: 'sale-3', sale_number: 3, created_at: '2026-01-15T00:00:00Z', total: 30, sale_payments: [{ method: 'efectivo', amount: 30 }], sale_items: [] },
  ]
  const payments = [
    { id: 'pay-1', amount: 100, method: 'efectivo', notes: null, created_at: '2026-01-05T00:00:00Z' },
  ]

  function mockQueries() {
    supabase.from
      .mockReturnValueOnce(chainable({ data: sales, error: null }))
      .mockReturnValueOnce(chainable({ data: payments, error: null }))
  }

  it('ignora ventas que no se pagaron en cuenta corriente', async () => {
    mockQueries()
    const movements = await getAccountStatement('c1', { showAll: true })
    expect(movements.find((m) => m.id === 'sale-3')).toBeUndefined()
  })

  it('calcula el saldo acumulado en orden cronológico', async () => {
    mockQueries()
    const movements = await getAccountStatement('c1', { showAll: true })
    // sale-1 (débito 100, saldo 100) → pay-1 (crédito 100, saldo 0) → sale-2 (débito 50, saldo 50)
    expect(movements.map((m) => m.id)).toEqual(['sale-1', 'pay-1', 'sale-2'])
    expect(movements[0].balance).toBe(100)
    expect(movements[1].balance).toBe(0)
    expect(movements[2].balance).toBe(50)
  })

  it('por defecto (showAll: false) devuelve solo el período posterior al último saldo en $0', async () => {
    mockQueries()
    const movements = await getAccountStatement('c1') // showAll no especificado → false
    expect(movements).toHaveLength(1)
    expect(movements[0].id).toBe('sale-2')
    expect(movements[0].balance).toBe(50)
  })

  it('con showAll: true devuelve todo el historial, incluida la deuda ya saldada', async () => {
    mockQueries()
    const movements = await getAccountStatement('c1', { showAll: true })
    expect(movements).toHaveLength(3)
  })
})
