import { describe, it, expect, beforeEach } from 'vitest'
import { useCartStore } from '@/modules/pos/hooks/useCartStore'

const store = () => useCartStore.getState()

// Producto base reutilizable — cada test puede sobrescribir los campos que necesite.
function makeProduct(overrides = {}) {
  return {
    id: 'p1',
    name: 'Producto de prueba',
    price_sell: 100,
    iva_rate: 21,
    iva_included: true,
    category_id: null,
    ...overrides,
  }
}

beforeEach(() => {
  // Reset completo del store entre tests (es un singleton global de Zustand).
  useCartStore.setState({ items: [], customer: null, globalDiscount: 0, discounts: [] })
})

describe('useCartStore — carrito básico', () => {
  it('agrega un producto nuevo con subtotal e IVA calculados', () => {
    store().addItem(makeProduct(), 1)
    const items = store().items
    expect(items).toHaveLength(1)
    expect(items[0].quantity).toBe(1)
    expect(items[0].subtotal).toBe(100)
    expect(items[0].discountAmount).toBe(0)
  })

  it('si el producto ya está en el carrito, suma la cantidad en vez de duplicar la fila', () => {
    store().addItem(makeProduct(), 1)
    store().addItem(makeProduct(), 2)
    const items = store().items
    expect(items).toHaveLength(1)
    expect(items[0].quantity).toBe(3)
    expect(items[0].subtotal).toBe(300)
  })

  it('updateQuantity a 0 o menos elimina el ítem', () => {
    store().addItem(makeProduct(), 2)
    store().updateQuantity('p1', 0)
    expect(store().items).toHaveLength(0)
  })

  it('removeItem saca el producto indicado sin afectar el resto', () => {
    store().addItem(makeProduct({ id: 'p1' }), 1)
    store().addItem(makeProduct({ id: 'p2' }), 1)
    store().removeItem('p1')
    expect(store().items.map((i) => i.product.id)).toEqual(['p2'])
  })

  it('clearCart vacía items, cliente y descuento global', () => {
    store().addItem(makeProduct(), 1)
    store().setCustomer({ id: 'c1', discount_percent: 10 })
    store().setGlobalDiscount(15)
    store().clearCart()
    expect(store().items).toHaveLength(0)
    expect(store().customer).toBeNull()
    expect(store().globalDiscount).toBe(0)
  })

  it('setGlobalDiscount acota el valor al rango [0, 100]', () => {
    store().setGlobalDiscount(150)
    expect(store().globalDiscount).toBe(100)
    store().setGlobalDiscount(-20)
    expect(store().globalDiscount).toBe(0)
  })
})

describe('useCartStore — IVA', () => {
  it('IVA incluido: se extrae del precio, el total no cambia', () => {
    store().addItem(makeProduct({ price_sell: 100, iva_rate: 21, iva_included: true }), 1)
    expect(store().getIvaTotal()).toBeCloseTo(17.36, 1) // 100 * 21/121
    expect(store().getTotal()).toBe(100)
    expect(store().getIvaExtra()).toBe(0)
  })

  it('IVA no incluido: se suma aparte, el total sube', () => {
    store().addItem(makeProduct({ price_sell: 100, iva_rate: 21, iva_included: false }), 1)
    expect(store().getIvaTotal()).toBe(21)
    expect(store().getIvaExtra()).toBe(21)
    expect(store().getTotal()).toBe(121)
  })

  it('productos con iva_rate 0 no aportan IVA', () => {
    store().addItem(makeProduct({ price_sell: 50, iva_rate: 0 }), 1)
    expect(store().getIvaTotal()).toBe(0)
  })
})

describe('useCartStore — descuentos automáticos', () => {
  it('descuento por producto específico', () => {
    store().setDiscounts([{ type: 'product', product_id: 'p1', value: 10 }])
    store().addItem(makeProduct({ price_sell: 50 }), 2) // bruto 100, 10% = 10
    expect(store().items[0].discountAmount).toBe(10)
    expect(store().items[0].subtotal).toBe(90)
  })

  it('descuento por categoría', () => {
    store().setDiscounts([{ type: 'category', category_id: 5, value: 10 }])
    store().addItem(makeProduct({ price_sell: 50, category_id: 5 }), 2) // bruto 100, 10% = 10
    expect(store().items[0].discountAmount).toBe(10)
  })

  it('regla de cantidad (3x2): regala 1 cada 3 unidades compradas', () => {
    store().setDiscounts([{ type: 'quantity_rule', product_id: 'p1', min_quantity: 3, free_quantity: 1 }])
    store().addItem(makeProduct({ price_sell: 10 }), 3) // bruto 30, regala 1 unidad = -10
    expect(store().items[0].discountAmount).toBe(10)
    expect(store().items[0].subtotal).toBe(20)
  })

  it('la regla de cantidad no aplica si no se alcanza min_quantity', () => {
    store().setDiscounts([{ type: 'quantity_rule', product_id: 'p1', min_quantity: 3, free_quantity: 1 }])
    store().addItem(makeProduct({ price_sell: 10 }), 2)
    expect(store().items[0].discountAmount).toBe(0)
  })

  it('el descuento automático nunca supera el valor bruto del ítem', () => {
    store().setDiscounts([
      { type: 'product', product_id: 'p1', value: 60 },
      { type: 'category', category_id: 5, value: 60 },
    ])
    store().addItem(makeProduct({ price_sell: 10, category_id: 5 }), 1) // bruto 10, 60%+60% = 12 → tope 10
    expect(store().items[0].discountAmount).toBe(10)
    expect(store().items[0].subtotal).toBe(0)
  })
})

describe('useCartStore — descuento de cliente y descuento global', () => {
  it('aplica el % de descuento del cliente sobre el subtotal', () => {
    store().addItem(makeProduct({ price_sell: 100 }), 1)
    store().setCustomer({ id: 'c1', discount_percent: 10 })
    expect(store().getSubtotal()).toBe(90)
  })

  it('el descuento global se aplica después del descuento de cliente, sobre lo que queda', () => {
    store().addItem(makeProduct({ price_sell: 100 }), 1)
    store().setCustomer({ id: 'c1', discount_percent: 10 })
    store().setGlobalDiscount(20)
    // afterCust = 90; global 20% de 90 = 18
    expect(store().getGlobalDiscountAmount()).toBe(18)
    // total: 100 * 0.90 * 0.80 = 72 (IVA incluido, no suma extra)
    expect(store().getTotal()).toBe(72)
  })

  it('getDiscountTotal refleja la suma de todos los descuentos aplicados', () => {
    store().addItem(makeProduct({ price_sell: 100 }), 1)
    store().setCustomer({ id: 'c1', discount_percent: 10 })
    store().setGlobalDiscount(20)
    expect(store().getDiscountTotal()).toBe(28) // 100 - 72
  })
})

describe('useCartStore — applyItemDiscount (descuento manual)', () => {
  it('sobreescribe el descuento automático y recalcula el subtotal', () => {
    store().addItem(makeProduct({ price_sell: 100 }), 1)
    store().applyItemDiscount('p1', 30)
    expect(store().items[0].discountAmount).toBe(30)
    expect(store().items[0].subtotal).toBe(70)
  })

  it('no permite un descuento manual mayor al valor bruto del ítem', () => {
    store().addItem(makeProduct({ price_sell: 100 }), 1)
    store().applyItemDiscount('p1', 500)
    expect(store().items[0].discountAmount).toBe(100)
    expect(store().items[0].subtotal).toBe(0)
  })
})
