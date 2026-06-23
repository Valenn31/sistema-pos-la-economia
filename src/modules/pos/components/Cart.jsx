/**
 * Cart — Panel derecho del POS. Muestra los ítems del carrito,
 * totales, selector de cliente y botón de cobro.
 *
 * Responsabilidades:
 *  - Renderizar la lista de ítems del carrito (delegando cada fila a CartItem)
 *  - Mostrar el selector de cliente (CustomerSelector)
 *  - Permitir aplicar un descuento global porcentual
 *  - Calcular y mostrar subtotal, descuentos, IVA y total
 *  - Exponer el botón "Cobrar" que dispara el modal de pago
 *
 * @param {Object} props
 * @param {Function} props.onCheckout - Callback que se ejecuta al presionar "Cobrar" (abre PaymentModal)
 */
import { ShoppingCart, Trash2, Tag } from 'lucide-react'
import { useCartStore } from '@/modules/pos/hooks/useCartStore'
import { CartItem } from './CartItem'
import { CustomerSelector } from './CustomerSelector'
import { Button } from '@/shared/components/Button'
import { formatCurrency } from '@/shared/utils/formatters'
import { useState } from 'react'

/**
 * Componente principal del carrito de ventas.
 * Se ubica en el panel derecho de la interfaz del POS.
 */
export function Cart({ onCheckout }) {
  // Hook del store Zustand: extrae estado y acciones del carrito
  const {
    items, customer, globalDiscount,
    addItem, updateQuantity, removeItem, applyItemDiscount,
    setCustomer, setGlobalDiscount, clearCart,
    getSubtotal, getTotal, getDiscountTotal, getIvaTotal, getIvaExtra,
  } = useCartStore()

  // Estado local para controlar la edición del descuento global
  const [editGlobalDisc, setEditGlobalDisc] = useState(false)
  // Estado local para el valor del input de descuento global
  const [discInput, setDiscInput] = useState('')

  // Valores calculados a partir del store
  const subtotal       = getSubtotal()       // Subtotal con descuentos por ítem y de cliente aplicados
  const discountTotal  = getDiscountTotal()   // Total de descuentos en pesos
  const ivaTotal       = getIvaTotal()        // IVA total (incluido + extra)
  const ivaExtra       = getIvaExtra()        // IVA adicional (solo ítems con IVA no incluido)
  const total          = getTotal()           // Total final a cobrar
  const isEmpty        = items.length === 0   // Indica si el carrito está vacío
  // Bruto: suma de (cantidad * precioUnitario) sin descuentos, para mostrar el subtotal original
  const gross          = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0)

  /**
   * Aplica el descuento global porcentual ingresado por el usuario.
   * Parsea el valor del input y lo guarda en el store. Cierra el modo edición.
   */
  const applyGlobalDiscount = () => {
    const v = parseFloat(discInput)
    if (!isNaN(v)) setGlobalDiscount(v)
    setEditGlobalDisc(false)
    setDiscInput('')
  }

  return (
    <div className="h-full flex flex-col bg-surface-900 border-l border-surface-800">

      {/* ── Encabezado del carrito: título + botón vaciar ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-800 flex-shrink-0">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-4 h-4 text-primary-400" />
          <span className="font-semibold text-white text-sm">
            Carrito {items.length > 0 && <span className="text-surface-400">({items.length})</span>}
          </span>
        </div>
        {/* Botón para vaciar el carrito completo (solo visible si hay ítems) */}
        {!isEmpty && (
          <button
            onClick={clearCart}
            className="text-surface-500 hover:text-red-400 transition-colors p-1"
            title="Vaciar carrito"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* ── Lista de ítems del carrito ── */}
      <div className="flex-1 overflow-y-auto px-4">
        {isEmpty ? (
          /* Estado vacío: mensaje indicando que no hay productos */
          <div className="flex flex-col items-center justify-center h-full text-surface-600 py-12">
            <ShoppingCart className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">El carrito está vacío</p>
            <p className="text-xs mt-1 opacity-60">Buscá y agregá productos</p>
          </div>
        ) : (
          /* Listado de ítems: cada uno renderizado con CartItem */
          <div className="py-2">
            {items.map((item) => (
              <CartItem
                key={item.product.id}
                item={item}
                onQtyChange={updateQuantity}
                onRemove={removeItem}
                onDiscount={applyItemDiscount}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Sección inferior: cliente + descuento global + totales + cobrar ── */}
      {!isEmpty && (
        <div className="flex-shrink-0 border-t border-surface-800 p-4 space-y-3">

          {/* Selector de cliente (venta anónima o con cliente registrado) */}
          <CustomerSelector value={customer} onChange={setCustomer} />

          {/* ── Descuento global porcentual ── */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-surface-400 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5" /> Descuento global
            </span>
            {editGlobalDisc ? (
              /* Modo edición: input numérico para ingresar el porcentaje */
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  autoFocus
                  min="0"
                  max="100"
                  placeholder="0"
                  value={discInput}
                  onChange={(e) => setDiscInput(e.target.value)}
                  onBlur={applyGlobalDiscount}
                  onKeyDown={(e) => e.key === 'Enter' && applyGlobalDiscount()}
                  className="w-14 text-center bg-surface-800 border border-surface-700 rounded px-2 py-0.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
                <span className="text-surface-500 text-xs">%</span>
              </div>
            ) : (
              /* Modo lectura: muestra el % actual o botón para agregar */
              <button
                onClick={() => { setDiscInput(String(globalDiscount)); setEditGlobalDisc(true) }}
                className="text-surface-400 hover:text-primary-400 transition-colors text-xs"
              >
                {globalDiscount > 0 ? `${globalDiscount}%` : '+ agregar'}
              </button>
            )}
          </div>

          {/* ── Líneas de totales ── */}
          <div className="space-y-1.5 text-sm">
            {/* Subtotal bruto (sin descuentos) */}
            <div className="flex justify-between text-surface-400">
              <span>Subtotal</span>
              <span>{formatCurrency(gross)}</span>
            </div>
            {/* Total de descuentos aplicados (solo si hay) */}
            {discountTotal > 0 && (
              <div className="flex justify-between text-green-400">
                <span>Descuentos</span>
                <span>− {formatCurrency(discountTotal)}</span>
              </div>
            )}
            {/* IVA adicional (solo para productos con IVA no incluido en precio) */}
            {ivaExtra > 0 && (
              <div className="flex justify-between text-surface-400">
                <span>+ IVA</span>
                <span>{formatCurrency(ivaExtra)}</span>
              </div>
            )}
            {/* IVA incluido en precio (informativo, no suma al total) */}
            {ivaTotal > 0 && ivaTotal !== ivaExtra && (
              <div className="flex justify-between text-surface-500 text-xs">
                <span>IVA incluido</span>
                <span>{formatCurrency(ivaTotal - ivaExtra)}</span>
              </div>
            )}
            {/* Total final a cobrar */}
            <div className="flex justify-between font-bold text-lg pt-2 border-t border-surface-700">
              <span className="text-white">TOTAL</span>
              <span className="text-primary-400">{formatCurrency(total)}</span>
            </div>
          </div>

          {/* ── Botón "Cobrar": abre el modal de pago ── */}
          <Button onClick={onCheckout} size="lg" className="w-full text-base font-bold">
            Cobrar {formatCurrency(total)}
          </Button>
        </div>
      )}
    </div>
  )
}
