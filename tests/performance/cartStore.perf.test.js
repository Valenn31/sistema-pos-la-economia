/**
 * Prueba de rendimiento básica: el carrito debe seguir respondiendo con
 * fluidez ante una carga "razonable" (un ticket grande, ~500 ítems distintos,
 * más descuentos activos). No es un benchmark riguroso — solo una cota
 * de sanidad para detectar una regresión que vuelva el cálculo cuadrático
 * o similar.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { useCartStore } from '@/modules/pos/hooks/useCartStore'

const store = () => useCartStore.getState()
const ITEM_COUNT = 500
const MAX_MS = 300

beforeEach(() => {
  useCartStore.setState({ items: [], customer: null, globalDiscount: 0, discounts: [] })
})

describe('useCartStore — rendimiento con carga normal', () => {
  it(`agrega ${ITEM_COUNT} productos distintos en tiempo razonable`, () => {
    store().setDiscounts([
      { type: 'category', category_id: 1, value: 5 },
      { type: 'quantity_rule', product_id: 'perf-3', min_quantity: 3, free_quantity: 1 },
    ])

    const start = performance.now()
    for (let i = 0; i < ITEM_COUNT; i++) {
      store().addItem({
        id: `perf-${i}`,
        price_sell: 100 + i,
        iva_rate: 21,
        iva_included: true,
        category_id: i % 2 === 0 ? 1 : 2,
      }, 1)
    }
    const elapsed = performance.now() - start

    expect(store().items).toHaveLength(ITEM_COUNT)
    expect(elapsed).toBeLessThan(MAX_MS)
  })

  it('recalcula subtotal, IVA y total sobre un carrito grande en tiempo razonable', () => {
    for (let i = 0; i < ITEM_COUNT; i++) {
      store().addItem({ id: `perf-${i}`, price_sell: 50, iva_rate: 21, iva_included: true }, 2)
    }
    store().setCustomer({ id: 'c1', discount_percent: 5 })
    store().setGlobalDiscount(10)

    const start = performance.now()
    const subtotal = store().getSubtotal()
    const ivaTotal = store().getIvaTotal()
    const total = store().getTotal()
    const discountTotal = store().getDiscountTotal()
    const elapsed = performance.now() - start

    expect(subtotal).toBeGreaterThan(0)
    expect(ivaTotal).toBeGreaterThan(0)
    expect(total).toBeGreaterThan(0)
    expect(discountTotal).toBeGreaterThan(0)
    expect(elapsed).toBeLessThan(MAX_MS)
  })
})
