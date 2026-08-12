/**
 * Prueba de integración: producto + stock + venta, y cliente + venta.
 * Verifica que createSale() orqueste correctamente el descuento de stock
 * (siempre de "En Estantería") y el incremento de cuenta corriente
 * (solo si hubo un pago con method: 'cuenta').
 */
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { chainable } from '../helpers/supabaseMock'

vi.mock('@/supabase/client', () => ({
  supabase: { from: vi.fn(), rpc: vi.fn(), auth: {} },
}))

import { supabase } from '@/supabase/client'
import { createSale } from '@/modules/pos/services/salesService'

const SALE_ROW = { id: 'sale-1', sale_number: 7 }
const SHELF_LOCATION = { id: 2 } // "En Estantería"

function makeItem(id, quantity) {
  return {
    product: { id },
    quantity,
    unitPrice: 100,
    ivaRate: 21,
    discountAmount: 0,
    subtotal: 100 * quantity,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  supabase.rpc.mockReturnValue(chainable({ error: null }))
})

describe('createSale — producto + stock + venta', () => {
  it('decrementa stock de "En Estantería" (nunca del Depósito) por cada ítem vendido', async () => {
    supabase.from
      .mockReturnValueOnce(chainable({ data: SALE_ROW, error: null })) // sales
      .mockReturnValueOnce(chainable({ error: null }))                  // sale_items
      .mockReturnValueOnce(chainable({ error: null }))                  // sale_payments
      .mockReturnValueOnce(chainable({ data: SHELF_LOCATION, error: null })) // locations
      .mockReturnValue(chainable({ error: null }))                      // stock_movements (resto)

    await createSale({
      sessionId: 's1', registerId: 1, cashierId: 'cashier-1', customerId: null,
      items: [makeItem('prod-A', 3), makeItem('prod-B', 1)],
      payments: [{ method: 'efectivo', amount: 400 }],
      subtotal: 400, discountTotal: 0, ivaTotal: 0, total: 400,
    })

    expect(supabase.rpc).toHaveBeenCalledWith('decrement_stock', {
      p_product_id: 'prod-A', p_location_id: 2, p_quantity: 3,
    })
    expect(supabase.rpc).toHaveBeenCalledWith('decrement_stock', {
      p_product_id: 'prod-B', p_location_id: 2, p_quantity: 1,
    })
    // Nunca debe llamarse con un location_id distinto al de "En Estantería"
    for (const call of supabase.rpc.mock.calls) {
      if (call[0] === 'decrement_stock') expect(call[1].p_location_id).toBe(2)
    }
  })

  it('respeta el orden: cabecera → ítems → pagos → stock', async () => {
    supabase.from
      .mockReturnValueOnce(chainable({ data: SALE_ROW, error: null }))
      .mockReturnValueOnce(chainable({ error: null }))
      .mockReturnValueOnce(chainable({ error: null }))
      .mockReturnValueOnce(chainable({ data: SHELF_LOCATION, error: null }))
      .mockReturnValue(chainable({ error: null }))

    await createSale({
      sessionId: 's1', registerId: 1, cashierId: 'cashier-1', customerId: null,
      items: [makeItem('prod-A', 1)],
      payments: [{ method: 'efectivo', amount: 100 }],
      subtotal: 100, discountTotal: 0, ivaTotal: 0, total: 100,
    })

    const tablesCalled = supabase.from.mock.calls.map((c) => c[0])
    expect(tablesCalled).toEqual(['sales', 'sale_items', 'sale_payments', 'locations', 'stock_movements'])
  })
})

describe('createSale — cliente + venta (cuenta corriente)', () => {
  it('NO toca el saldo del cliente si ningún pago fue en cuenta corriente', async () => {
    supabase.from
      .mockReturnValueOnce(chainable({ data: SALE_ROW, error: null }))
      .mockReturnValueOnce(chainable({ error: null }))
      .mockReturnValueOnce(chainable({ error: null }))
      .mockReturnValueOnce(chainable({ data: SHELF_LOCATION, error: null }))
      .mockReturnValue(chainable({ error: null }))

    await createSale({
      sessionId: 's1', registerId: 1, cashierId: 'cashier-1', customerId: 'cust-1',
      items: [makeItem('prod-A', 1)],
      payments: [{ method: 'efectivo', amount: 100 }],
      subtotal: 100, discountTotal: 0, ivaTotal: 0, total: 100,
    })

    expect(supabase.rpc).not.toHaveBeenCalledWith('increment_customer_balance', expect.anything())
  })

  it('incrementa el saldo del cliente por el monto pagado en cuenta corriente', async () => {
    supabase.from
      .mockReturnValueOnce(chainable({ data: SALE_ROW, error: null }))
      .mockReturnValueOnce(chainable({ error: null }))
      .mockReturnValueOnce(chainable({ error: null }))
      .mockReturnValueOnce(chainable({ data: SHELF_LOCATION, error: null }))
      .mockReturnValue(chainable({ error: null }))

    await createSale({
      sessionId: 's1', registerId: 1, cashierId: 'cashier-1', customerId: 'cust-1',
      items: [makeItem('prod-A', 1)],
      payments: [{ method: 'cuenta', amount: 100 }],
      subtotal: 100, discountTotal: 0, ivaTotal: 0, total: 100,
    })

    expect(supabase.rpc).toHaveBeenCalledWith('increment_customer_balance', {
      p_customer_id: 'cust-1', p_amount: 100,
    })
  })

  it('si el RPC de saldo falla, hace fallback a lectura + update manual', async () => {
    supabase.from
      .mockReturnValueOnce(chainable({ data: SALE_ROW, error: null })) // sales
      .mockReturnValueOnce(chainable({ error: null }))                  // sale_items
      .mockReturnValueOnce(chainable({ error: null }))                  // sale_payments
      .mockReturnValueOnce(chainable({ data: SHELF_LOCATION, error: null })) // locations
      .mockReturnValueOnce(chainable({ error: null }))                  // stock_movements
      .mockReturnValueOnce(chainable({ data: { current_balance: 500 }, error: null })) // customers select
      .mockReturnValueOnce(chainable({ error: null }))                  // customers update

    supabase.rpc.mockImplementation((name) =>
      name === 'increment_customer_balance' ? chainable({ error: { message: 'rpc down' } }) : chainable({ error: null })
    )

    await createSale({
      sessionId: 's1', registerId: 1, cashierId: 'cashier-1', customerId: 'cust-1',
      items: [makeItem('prod-A', 1)],
      payments: [{ method: 'cuenta', amount: 100 }],
      subtotal: 100, discountTotal: 0, ivaTotal: 0, total: 100,
    })

    const customersCalls = supabase.from.mock.calls.filter((c) => c[0] === 'customers')
    expect(customersCalls).toHaveLength(2) // select current_balance + update
  })
})
