/**
 * Cart — Panel derecho del POS. Muestra los ítems del carrito,
 * totales, selector de cliente y botón de cobro.
 *
 * @param {Function} onCheckout - () => void  (abre PaymentModal)
 * @param {Function} onClear    - () => void
 */
import { ShoppingCart, Trash2, Tag } from 'lucide-react'
import { useCartStore } from '@/modules/pos/hooks/useCartStore'
import { CartItem } from './CartItem'
import { CustomerSelector } from './CustomerSelector'
import { Button } from '@/shared/components/Button'
import { formatCurrency } from '@/shared/utils/formatters'
import { useState } from 'react'

export function Cart({ onCheckout }) {
  const {
    items, customer, globalDiscount,
    addItem, updateQuantity, removeItem, applyItemDiscount,
    setCustomer, setGlobalDiscount, clearCart,
    getSubtotal, getTotal, getDiscountTotal, getIvaTotal,
  } = useCartStore()

  const [editGlobalDisc, setEditGlobalDisc] = useState(false)
  const [discInput, setDiscInput] = useState('')

  const subtotal       = getSubtotal()
  const discountTotal  = getDiscountTotal()
  const ivaTotal       = getIvaTotal()
  const total          = getTotal()
  const isEmpty        = items.length === 0

  const applyGlobalDiscount = () => {
    const v = parseFloat(discInput)
    if (!isNaN(v)) setGlobalDiscount(v)
    setEditGlobalDisc(false)
    setDiscInput('')
  }

  return (
    <div className="h-full flex flex-col bg-surface-900 border-l border-surface-800">

      {/* Header del carrito */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-800 flex-shrink-0">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-4 h-4 text-primary-400" />
          <span className="font-semibold text-white text-sm">
            Carrito {items.length > 0 && <span className="text-surface-400">({items.length})</span>}
          </span>
        </div>
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

      {/* Lista de ítems */}
      <div className="flex-1 overflow-y-auto px-4">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full text-surface-600 py-12">
            <ShoppingCart className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">El carrito está vacío</p>
            <p className="text-xs mt-1 opacity-60">Buscá y agregá productos</p>
          </div>
        ) : (
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

      {/* Sección inferior: cliente + totales + cobrar */}
      {!isEmpty && (
        <div className="flex-shrink-0 border-t border-surface-800 p-4 space-y-3">

          {/* Selector de cliente */}
          <CustomerSelector value={customer} onChange={setCustomer} />

          {/* Descuento global */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-surface-400 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5" /> Descuento global
            </span>
            {editGlobalDisc ? (
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
              <button
                onClick={() => { setDiscInput(String(globalDiscount)); setEditGlobalDisc(true) }}
                className="text-surface-400 hover:text-primary-400 transition-colors text-xs"
              >
                {globalDiscount > 0 ? `${globalDiscount}%` : '+ agregar'}
              </button>
            )}
          </div>

          {/* Líneas de totales */}
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between text-surface-400">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal + discountTotal)}</span>
            </div>
            {discountTotal > 0 && (
              <div className="flex justify-between text-green-400">
                <span>Descuentos</span>
                <span>− {formatCurrency(discountTotal)}</span>
              </div>
            )}
            {ivaTotal > 0 && (
              <div className="flex justify-between text-surface-500 text-xs">
                <span>IVA (incluido)</span>
                <span>{formatCurrency(ivaTotal)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg pt-2 border-t border-surface-700">
              <span className="text-white">TOTAL</span>
              <span className="text-primary-400">{formatCurrency(total)}</span>
            </div>
          </div>

          {/* Botón cobrar */}
          <Button onClick={onCheckout} size="lg" className="w-full text-base font-bold">
            Cobrar {formatCurrency(total)}
          </Button>
        </div>
      )}
    </div>
  )
}
