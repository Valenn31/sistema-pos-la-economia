/**
 * StockLevelsTab — Vista de stock actual por producto y ubicación.
 * Permite trasladar y ajustar stock directamente desde la tabla.
 */
import { useState } from 'react'
import { ArrowLeftRight, SlidersHorizontal, AlertTriangle } from 'lucide-react'
import { Badge } from '@/shared/components/Badge'
import { TransferModal } from './TransferModal'
import { AdjustmentModal } from './AdjustmentModal'

export function StockLevelsTab({ stockLevels, locations, onRefresh }) {
  const [transferProduct, setTransferProduct] = useState(null)
  const [adjustProduct, setAdjustProduct]     = useState(null)

  const getProductStock = (productStock) => {
    const byLoc = {}
    for (const [locId, info] of Object.entries(productStock)) {
      byLoc[locId] = info
    }
    return byLoc
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-xl border border-surface-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-800 text-surface-400 text-left">
              <th className="px-4 py-3 font-medium">Producto</th>
              <th className="px-4 py-3 font-medium">Categoría</th>
              {locations.map((l) => (
                <th key={l.id} className="px-4 py-3 font-medium text-center">{l.name}</th>
              ))}
              <th className="px-4 py-3 font-medium text-center">Total</th>
              <th className="px-4 py-3 font-medium text-center">Estado</th>
              <th className="px-4 py-3 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-800">
            {stockLevels.length === 0 && (
              <tr><td colSpan={5 + locations.length} className="text-center text-surface-600 py-10">Sin datos de stock</td></tr>
            )}
            {stockLevels.map((p) => {
              const stockByLoc = getProductStock(p.stock)
              const total = Object.values(stockByLoc).reduce((s, x) => s + (x.quantity ?? 0), 0)
              const low = p.min_stock > 0 && total <= p.min_stock

              return (
                <tr key={p.id} className="hover:bg-surface-800/50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-white">{p.name}</p>
                    {p.sku && <p className="text-xs text-surface-500 font-mono">{p.sku}</p>}
                  </td>
                  <td className="px-4 py-3 text-surface-400">{p.categories?.name || '—'}</td>
                  {locations.map((l) => (
                    <td key={l.id} className="px-4 py-3 text-center font-mono">
                      <span className={stockByLoc[l.id]?.quantity > 0 ? 'text-white' : 'text-surface-600'}>
                        {stockByLoc[l.id]?.quantity ?? 0}
                      </span>
                    </td>
                  ))}
                  <td className="px-4 py-3 text-center font-semibold">
                    <span className={low ? 'text-yellow-400' : 'text-white'}>{total}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {low ? (
                      <Badge color="yellow"><AlertTriangle className="w-3 h-3" /> Stock bajo</Badge>
                    ) : total === 0 ? (
                      <Badge color="red">Sin stock</Badge>
                    ) : (
                      <Badge color="green">OK</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        title="Trasladar"
                        onClick={() => setTransferProduct(p)}
                        className="p-1.5 text-surface-500 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"
                      >
                        <ArrowLeftRight className="w-4 h-4" />
                      </button>
                      <button
                        title="Ajuste"
                        onClick={() => setAdjustProduct(p)}
                        className="p-1.5 text-surface-500 hover:text-yellow-400 hover:bg-yellow-400/10 rounded-lg transition-colors"
                      >
                        <SlidersHorizontal className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {transferProduct && (
        <TransferModal
          open={!!transferProduct}
          onClose={() => setTransferProduct(null)}
          onSaved={onRefresh}
          product={transferProduct}
          locations={locations}
          stockByLocation={transferProduct.stock}
        />
      )}

      {adjustProduct && (
        <AdjustmentModal
          open={!!adjustProduct}
          onClose={() => setAdjustProduct(null)}
          onSaved={onRefresh}
          product={adjustProduct}
          locations={locations}
          stockByLocation={adjustProduct.stock}
        />
      )}
    </div>
  )
}
