/**
 * CartItem — Fila de un ítem dentro del carrito del POS.
 *
 * @param {object}   item          - Ítem del carrito
 * @param {Function} onQtyChange   - (productId, newQty) => void
 * @param {Function} onRemove      - (productId) => void
 * @param {Function} onDiscount    - (productId, amount) => void
 */
import { useState } from 'react'
import { Trash2, Minus, Plus, Tag } from 'lucide-react'
import { formatCurrency } from '@/shared/utils/formatters'

export function CartItem({ item, onQtyChange, onRemove, onDiscount }) {
  const [editingDisc, setEditingDisc] = useState(false)
  const [discInput,   setDiscInput]   = useState('')

  const applyDiscount = () => {
    const v = parseFloat(discInput)
    if (!isNaN(v) && v >= 0) onDiscount(item.product.id, v)
    setEditingDisc(false)
    setDiscInput('')
  }

  return (
    <div className="flex gap-3 py-3 border-b border-surface-800 last:border-0 group">
      {/* Info del producto */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white leading-tight truncate">
          {item.product.name}
        </p>
        <p className="text-xs text-surface-500 mt-0.5">
          {formatCurrency(item.unitPrice)} c/u
          {item.ivaRate > 0 && (
            <span className="ml-1 text-surface-600">
              · IVA {item.ivaRate}%{item.ivaIncluded ? ' inc.' : ''}
            </span>
          )}
        </p>

        {/* Descuento por ítem */}
        {item.discountAmount > 0 && !editingDisc && (
          <p className="text-xs text-green-400 mt-0.5">
            − {formatCurrency(item.discountAmount)} descuento
          </p>
        )}

        {editingDisc && (
          <div className="flex items-center gap-1 mt-1">
            <span className="text-surface-400 text-xs">$</span>
            <input
              type="number"
              autoFocus
              min="0"
              placeholder="0"
              value={discInput}
              onChange={(e) => setDiscInput(e.target.value)}
              onBlur={applyDiscount}
              onKeyDown={(e) => e.key === 'Enter' && applyDiscount()}
              className="w-20 bg-surface-800 border border-surface-700 rounded px-2 py-0.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
            <span className="text-surface-500 text-xs">desc.</span>
          </div>
        )}
      </div>

      {/* Controles de cantidad */}
      <div className="flex flex-col items-end gap-2 flex-shrink-0">
        <div className="flex items-center gap-1">
          <button
            onClick={() => onQtyChange(item.product.id, item.quantity - 1)}
            className="w-6 h-6 rounded bg-surface-800 hover:bg-surface-700 flex items-center justify-center text-surface-300 hover:text-white transition-colors"
          >
            <Minus className="w-3 h-3" />
          </button>
          <input
            type="number"
            min="1"
            value={item.quantity}
            onChange={(e) => {
              const v = parseInt(e.target.value)
              if (!isNaN(v)) onQtyChange(item.product.id, v)
            }}
            className="w-10 text-center bg-surface-800 border border-surface-700 rounded text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary-500 py-0.5"
          />
          <button
            onClick={() => onQtyChange(item.product.id, item.quantity + 1)}
            className="w-6 h-6 rounded bg-surface-800 hover:bg-surface-700 flex items-center justify-center text-surface-300 hover:text-white transition-colors"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>

        <div className="flex items-center gap-1">
          {/* Botón descuento ítem */}
          <button
            onClick={() => setEditingDisc(true)}
            className="opacity-0 group-hover:opacity-100 text-surface-500 hover:text-yellow-400 transition-all p-1"
            title="Descuento en este ítem"
          >
            <Tag className="w-3.5 h-3.5" />
          </button>
          {/* Eliminar */}
          <button
            onClick={() => onRemove(item.product.id)}
            className="opacity-0 group-hover:opacity-100 text-surface-500 hover:text-red-400 transition-all p-1"
            title="Eliminar del carrito"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          {/* Subtotal */}
          <p className="text-sm font-bold text-white w-20 text-right">
            {formatCurrency(item.subtotal)}
          </p>
        </div>
      </div>
    </div>
  )
}
