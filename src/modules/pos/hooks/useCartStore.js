/**
 * useCartStore — Store Zustand del carrito de ventas del POS.
 *
 * Estado principal:
 *  - items[]        → Lista de ítems en el carrito (producto, cantidad, precios, descuentos)
 *  - customer       → Cliente seleccionado (null = venta anónima)
 *  - globalDiscount → Descuento porcentual global aplicado manualmente por el cajero
 *  - discounts[]    → Reglas de descuento activas cargadas desde la base de datos
 *
 * Descuentos automáticos por ítem (se calculan en addItem / updateQuantity):
 *  - 'product'       → Porcentaje de descuento sobre un producto específico
 *  - 'category'      → Porcentaje de descuento sobre una categoría completa
 *  - 'quantity_rule' → N unidades gratis al alcanzar min_quantity (ej: 3x2, pague 2 lleve 3)
 *
 * Descuentos manuales:
 *  - 'percentage_total' y 'fixed_total' se gestionan como globalDiscount
 *    desde la interfaz del carrito — no se auto-aplican.
 *
 * Flujo de cálculo de totales:
 *  1. Cada ítem tiene su subtotal = (cantidad * precioUnitario) - descuentoÍtem
 *  2. Se aplica descuento de cliente (%) sobre la suma de subtotales
 *  3. Se aplica descuento global (%) sobre el resultado anterior
 *  4. Se calcula IVA según corresponda (incluido o adicional)
 */
import { create } from 'zustand'
import { round2 } from '@/shared/utils/formatters'

/**
 * Calcula el descuento en pesos ($) que aplica automáticamente a un ítem
 * según las reglas de descuento activas cargadas desde la base de datos.
 *
 * Recorre todas las reglas activas y acumula los descuentos aplicables:
 *  - 'product': descuento porcentual si el producto coincide
 *  - 'category': descuento porcentual si la categoría coincide
 *  - 'quantity_rule': unidades gratis al alcanzar cantidad mínima
 *
 * El descuento total nunca puede superar el valor bruto del ítem.
 *
 * @param {Object}   product   - Producto del catálogo
 * @param {number}   quantity  - Cantidad del producto en el carrito
 * @param {number}   unitPrice - Precio unitario de venta
 * @param {Object[]} discounts - Array de reglas de descuento activas
 * @returns {number} Monto de descuento en pesos, redondeado a 2 decimales
 */
function computeItemDiscount(product, quantity, unitPrice, discounts) {
  let discount = 0
  for (const d of discounts) {
    // Descuento por producto específico: aplica un % sobre el total del ítem
    if (d.type === 'product' && d.product_id === product.id) {
      discount += quantity * unitPrice * (d.value / 100)
    }
    // Descuento por categoría: aplica un % sobre todos los productos de esa categoría
    if (d.type === 'category' && d.category_id === product.category_id) {
      discount += quantity * unitPrice * (d.value / 100)
    }
    // Regla de cantidad (ej: 3x2): al alcanzar min_quantity, se regalan free_quantity unidades
    if (d.type === 'quantity_rule' && d.product_id === product.id) {
      if (quantity >= d.min_quantity) {
        const groups    = Math.floor(quantity / d.min_quantity) // Grupos completos de la promo
        const freeItems = groups * d.free_quantity              // Total de unidades gratis
        discount += Math.min(freeItems, quantity) * unitPrice   // No dar más gratis que las compradas
      }
    }
  }
  // El descuento no puede superar el valor total del ítem
  return round2(Math.min(discount, quantity * unitPrice))
}

/**
 * Store Zustand del carrito de ventas.
 * Expone estado, mutaciones y selectores calculados para el módulo POS.
 */
export const useCartStore = create((set, get) => ({
  /** @type {Object[]} Lista de ítems del carrito */
  items:          [],
  /** @type {Object|null} Cliente seleccionado (null = venta anónima) */
  customer:       null,
  /** @type {number} Porcentaje de descuento global (0-100) */
  globalDiscount: 0,
  /** @type {Object[]} Reglas de descuento activas desde la DB */
  discounts:      [],

  // ── Mutaciones ─────────────────────────────────────────────────────

  /**
   * Carga las reglas de descuento activas.
   * Se llama desde POSPage al montar el componente.
   * @param {Object[]} discounts - Reglas de descuento activas
   */
  setDiscounts: (discounts) => set({ discounts }),

  /**
   * Agrega un producto al carrito.
   * Si el producto ya existe en el carrito, incrementa la cantidad.
   * Recalcula el descuento automático en ambos casos.
   *
   * @param {Object} product  - Producto del catálogo a agregar
   * @param {number} quantity - Cantidad a agregar (por defecto 1)
   */
  addItem: (product, quantity = 1) => {
    const { items, discounts } = get()
    const idx = items.findIndex((i) => i.product.id === product.id)

    if (idx !== -1) {
      // El producto ya está en el carrito: incrementar cantidad y recalcular
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
      // Producto nuevo: crear entrada con precio, IVA y descuento calculado
      const unitPrice = Number(product.price_sell)
      const discAmt   = computeItemDiscount(product, quantity, unitPrice, discounts)
      set({
        items: [
          ...items,
          {
            product,                                              // Referencia al producto completo
            quantity,                                             // Cantidad en el carrito
            unitPrice,                                            // Precio unitario de venta
            ivaRate:        Number(product.iva_rate ?? 21),       // Tasa de IVA (default 21%)
            ivaIncluded:    product.iva_included ?? true,         // Si el IVA está incluido en el precio
            discountAmount: discAmt,                              // Descuento automático calculado en $
            subtotal:       round2(unitPrice * quantity - discAmt), // Subtotal de la línea
          },
        ],
      })
    }
  },

  /**
   * Actualiza la cantidad de un ítem existente en el carrito.
   * Si la cantidad es <= 0, elimina el ítem.
   * Recalcula el descuento automático con la nueva cantidad.
   *
   * @param {number|string} productId - ID del producto a actualizar
   * @param {number}        quantity  - Nueva cantidad
   */
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

  /**
   * Aplica un descuento manual en pesos a un ítem específico.
   * Sobreescribe el descuento automático calculado.
   * El descuento no puede superar el valor bruto del ítem.
   *
   * @param {number|string} productId      - ID del producto
   * @param {number}        discountAmount - Monto de descuento en pesos ($)
   */
  applyItemDiscount: (productId, discountAmount) => {
    set({
      items: get().items.map((i) => {
        if (i.product.id !== productId) return i
        const gross = i.quantity * i.unitPrice                  // Valor bruto del ítem
        const disc  = Math.min(discountAmount, gross)           // Limitar al valor bruto
        return { ...i, discountAmount: round2(disc), subtotal: round2(gross - disc) }
      }),
    })
  },

  /**
   * Elimina un ítem del carrito por ID de producto.
   * @param {number|string} productId - ID del producto a eliminar
   */
  removeItem: (productId) => set({ items: get().items.filter((i) => i.product.id !== productId) }),

  /**
   * Asigna el cliente seleccionado al carrito.
   * @param {Object|null} customer - Cliente seleccionado o null para venta anónima
   */
  setCustomer: (customer) => set({ customer }),

  /**
   * Establece el porcentaje de descuento global (0-100).
   * Se acota automáticamente al rango válido.
   * @param {number} percent - Porcentaje de descuento
   */
  setGlobalDiscount: (percent) => set({ globalDiscount: Math.max(0, Math.min(100, percent)) }),

  /**
   * Vacía el carrito completamente: elimina ítems, cliente y descuento global.
   * Se llama tras confirmar una venta exitosa.
   */
  clearCart: () => set({ items: [], customer: null, globalDiscount: 0 }),

  // ── Selectores (calculados on-the-fly, no se almacenan) ───────────

  /**
   * Calcula el subtotal del carrito aplicando el descuento del cliente.
   * Subtotal = suma de subtotales de ítems * (1 - descuento_cliente%)
   * @returns {number} Subtotal en pesos
   */
  getSubtotal: () => {
    const { items, customer } = get()
    const itemsTotal = items.reduce((s, i) => s + i.subtotal, 0)
    // Si el cliente tiene descuento porcentual, aplicarlo sobre el total de ítems
    if (customer?.discount_percent > 0) {
      return round2(itemsTotal * (1 - customer.discount_percent / 100))
    }
    return round2(itemsTotal)
  },

  /**
   * Calcula el monto en $ del descuento global aplicado.
   * Se calcula después del descuento de cliente, sobre el subtotal restante.
   * @returns {number} Monto de descuento global en pesos
   */
  getGlobalDiscountAmount: () => {
    const { items, globalDiscount, customer } = get()
    const itemsTotal = items.reduce((s, i) => s + i.subtotal, 0)
    const custDisc   = customer?.discount_percent ?? 0
    const afterCust  = itemsTotal - round2(itemsTotal * (custDisc / 100))
    return round2(afterCust * (globalDiscount / 100))
  },

  /**
   * Calcula el IVA total (tanto incluido como adicional) del carrito.
   * Aplica los descuentos de cliente y global antes de calcular el IVA.
   *
   * Para IVA incluido: IVA = bruto * tasa / (100 + tasa)
   * Para IVA no incluido: IVA = bruto * tasa / 100
   *
   * @returns {number} IVA total en pesos
   */
  getIvaTotal: () => {
    const { items, customer, globalDiscount } = get()
    const custDisc = customer?.discount_percent ?? 0
    return round2(
      items.reduce((sum, i) => {
        if (i.ivaRate === 0) return sum
        // Valor bruto del ítem después de descuentos de cliente y global
        const gross = i.subtotal * (1 - custDisc / 100) * (1 - globalDiscount / 100)
        // IVA incluido: extraer IVA del precio (el precio ya contiene IVA)
        if (i.ivaIncluded) return sum + gross * i.ivaRate / (100 + i.ivaRate)
        // IVA no incluido: calcular IVA sobre el precio neto
        return sum + gross * i.ivaRate / 100
      }, 0)
    )
  },

  /**
   * Calcula el IVA adicional (solo ítems con IVA no incluido en el precio).
   * Este monto se suma al total porque el precio de venta no lo contempla.
   * @returns {number} IVA adicional en pesos
   */
  getIvaExtra: () => {
    const { items, customer, globalDiscount } = get()
    const custDisc = customer?.discount_percent ?? 0
    return round2(
      items.reduce((sum, i) => {
        // Solo calcular para ítems sin IVA incluido y con tasa > 0
        if (i.ivaRate === 0 || i.ivaIncluded) return sum
        const gross = i.subtotal * (1 - custDisc / 100) * (1 - globalDiscount / 100)
        return sum + gross * i.ivaRate / 100
      }, 0)
    )
  },

  /**
   * Calcula el total final a cobrar al cliente.
   * Fórmula por ítem: (subtotal - desc_cliente% - desc_global%) + IVA_extra
   * Donde IVA_extra solo aplica si el producto tiene IVA no incluido.
   * @returns {number} Total final en pesos
   */
  getTotal: () => {
    const { items, customer, globalDiscount } = get()
    const custDisc = customer?.discount_percent ?? 0
    return round2(
      items.reduce((sum, i) => {
        const afterCustDisc   = i.subtotal * (1 - custDisc / 100)        // Después de desc. cliente
        const afterGlobalDisc = afterCustDisc * (1 - globalDiscount / 100) // Después de desc. global
        // IVA adicional: solo si no está incluido en el precio
        const ivaExtra = i.ivaIncluded ? 0 : afterGlobalDisc * i.ivaRate / 100
        return sum + afterGlobalDisc + ivaExtra
      }, 0)
    )
  },

  /**
   * Calcula el total de descuentos aplicados en la venta.
   * Se obtiene como la diferencia entre el bruto original y el total final + IVA extra.
   * @returns {number} Total de descuentos en pesos
   */
  getDiscountTotal: () => {
    const { items } = get()
    // Bruto original: suma de (cantidad * precio unitario) sin ningún descuento
    const gross = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0)
    return round2(gross - get().getTotal() + get().getIvaExtra())
  },
}))
