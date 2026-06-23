/**
 * useCartStore — Store Zustand del carrito de ventas.
 *
 * Estado:
 *  items[]        Lista de ítems en el carrito
 *  customer       Cliente seleccionado (null = venta anónima)
 *  globalDiscount Descuento porcentual global aplicado manualmente
 *  discounts[]    Reglas de descuento activas cargadas desde DB (setDiscounts al montar POSPage)
 *
 * Descuentos automáticos por ítem (se aplican en addItem / updateQuantity):
 *  'product'       → % sobre producto específico
 *  'category'      → % sobre categoría del producto
 *  'quantity_rule' → N unidades gratis al alcanzar min_quantity (ej: 3x2)
 *
 * Los tipos 'percentage_total' y 'fixed_total' se gestionan como globalDiscount
 * desde el carrito manualmente — no se auto-aplican.
 */
import { create } from 'zustand'
import { round2 } from '@/shared/utils/formatters'

/** Calcula el descuento en $ que aplica automáticamente a un ítem según las reglas activas. */
function computeItemDiscount(product, quantity, unitPrice, discounts) {
  let discount = 0
  for (const d of discounts) {
    if (d.type === 'product' && d.product_id === product.id) {
      discount += quantity * unitPrice * (d.value / 100)
    }
    if (d.type === 'category' && d.category_id === product.category_id) {
      discount += quantity * unitPrice * (d.value / 100)
    }
    if (d.type === 'quantity_rule' && d.product_id === product.id) {
      if (quantity >= d.min_quantity) {
        const groups    = Math.floor(quantity / d.min_quantity)
        const freeItems = groups * d.free_quantity
        discount += Math.min(freeItems, quantity) * unitPrice
      }
    }
  }
  return round2(Math.min(discount, quantity * unitPrice))
}

export const useCartStore = create((set, get) => ({
  items:          [],
  customer:       null,
  globalDiscount: 0,
  discounts:      [],

  // ── Mutaciones ─────────────────────────────────────────────────────

  /** Carga las reglas de descuento activas desde el POS al montar. */
  setDiscounts: (discounts) => set({ discounts }),

  /** Agrega un producto al carrito; si ya existe, incrementa la cantidad y recalcula descuento. */
  addItem: (product, quantity = 1) => {
    const { items, discounts } = get()
    const idx = items.findIndex((i) => i.product.id === product.id)

    if (idx !== -1) {
      const updated = [...items]
      const item    = updated[idx]
      const newQty  = item.quantity + quantity
      const discAmt = computeItemDiscount(product, newQty, item.unitPrice, discounts)
      updated[idx]  = {
        ...item,
        quantity:       newQty,
        discountAmount: discAmt,
        subtotal:       round2(newQty * item.unitPrice - discAmt),
      }
      set({ items: updated })
    } else {
      const unitPrice = Number(product.price_sell)
      const discAmt   = computeItemDiscount(product, quantity, unitPrice, discounts)
      set({
        items: [
          ...items,
          {
            product,
            quantity,
            unitPrice,
            ivaRate:        Number(product.iva_rate ?? 21),
            ivaIncluded:    product.iva_included ?? true,
            discountAmount: discAmt,
            subtotal:       round2(unitPrice * quantity - discAmt),
          },
        ],
      })
    }
  },

  /** Actualiza la cantidad de un ítem y recalcula su descuento automático. */
  updateQuantity: (productId, quantity) => {
    if (quantity <= 0) { get().removeItem(productId); return }
    const discounts = get().discounts
    set({
      items: get().items.map((i) => {
        if (i.product.id !== productId) return i
        const discAmt = computeItemDiscount(i.product, quantity, i.unitPrice, discounts)
        return { ...i, quantity, discountAmount: discAmt, subtotal: round2(quantity * i.unitPrice - discAmt) }
      }),
    })
  },

  /** Aplica un descuento en $ manual a un ítem específico (sobreescribe el automático). */
  applyItemDiscount: (productId, discountAmount) => {
    set({
      items: get().items.map((i) => {
        if (i.product.id !== productId) return i
        const gross = i.quantity * i.unitPrice
        const disc  = Math.min(discountAmount, gross)
        return { ...i, discountAmount: round2(disc), subtotal: round2(gross - disc) }
      }),
    })
  },

  removeItem:        (productId) => set({ items: get().items.filter((i) => i.product.id !== productId) }),
  setCustomer:       (customer)  => set({ customer }),
  setGlobalDiscount: (percent)   => set({ globalDiscount: Math.max(0, Math.min(100, percent)) }),
  clearCart:         ()          => set({ items: [], customer: null, globalDiscount: 0 }),

  // ── Selectores (calculados on-the-fly) ────────────────────────────

  getSubtotal: () => {
    const { items, customer } = get()
    const itemsTotal = items.reduce((s, i) => s + i.subtotal, 0)
    if (customer?.discount_percent > 0) {
      return round2(itemsTotal * (1 - customer.discount_percent / 100))
    }
    return round2(itemsTotal)
  },

  getGlobalDiscountAmount: () => {
    const { items, globalDiscount, customer } = get()
    const itemsTotal = items.reduce((s, i) => s + i.subtotal, 0)
    const custDisc   = customer?.discount_percent ?? 0
    const afterCust  = itemsTotal - round2(itemsTotal * (custDisc / 100))
    return round2(afterCust * (globalDiscount / 100))
  },

  getIvaTotal: () => {
    const { items, customer, globalDiscount } = get()
    const custDisc = customer?.discount_percent ?? 0
    return round2(
      items.reduce((sum, i) => {
        if (i.ivaRate === 0) return sum
        const gross = i.subtotal * (1 - custDisc / 100) * (1 - globalDiscount / 100)
        if (i.ivaIncluded) return sum + gross * i.ivaRate / (100 + i.ivaRate)
        return sum + gross * i.ivaRate / 100
      }, 0)
    )
  },

  getTotal: () => {
    const { items, customer, globalDiscount } = get()
    const custDisc = customer?.discount_percent ?? 0
    return round2(
      items.reduce((sum, i) => {
        const afterCustDisc   = i.subtotal * (1 - custDisc / 100)
        const afterGlobalDisc = afterCustDisc * (1 - globalDiscount / 100)
        const ivaExtra = i.ivaIncluded ? 0 : afterGlobalDisc * i.ivaRate / 100
        return sum + afterGlobalDisc + ivaExtra
      }, 0)
    )
  },

  getDiscountTotal: () => {
    const { items } = get()
    const gross = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0)
    return round2(gross - get().getTotal())
  },
}))
