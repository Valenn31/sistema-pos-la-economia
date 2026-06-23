/**
 * StockLevelsTab — Pestaña de niveles de stock actual por producto y ubicación.
 *
 * Muestra una tabla con el stock desglosado por cada ubicación (depósito,
 * estantería, etc.) para cada producto, junto con el total y un indicador
 * de estado (OK, stock bajo, sin stock). Permite trasladar y ajustar
 * stock directamente desde los botones de acción de cada fila.
 *
 * @module stock/components/StockLevelsTab
 */
import { useState } from 'react'
import { ArrowLeftRight, SlidersHorizontal, AlertTriangle } from 'lucide-react'
import { Badge } from '@/shared/components/Badge'
import { TransferModal } from './TransferModal'
import { AdjustmentModal } from './AdjustmentModal'

/**
 * Componente que renderiza la vista de niveles de stock por producto y ubicación.
 *
 * @param {Object} props
 * @param {Array} props.stockLevels - Lista de productos con stock por ubicación (cada uno tiene .stock como mapa)
 * @param {Array} props.locations - Lista de ubicaciones disponibles
 * @param {Function} props.onRefresh - Callback para recargar los datos de stock
 * @returns {JSX.Element} Pestaña de niveles de stock
 */
export function StockLevelsTab({ stockLevels, locations, onRefresh }) {
  /** Estado: producto seleccionado para trasladar stock (null = sin selección) */
  const [transferProduct, setTransferProduct] = useState(null)
  /** Estado: producto seleccionado para ajustar stock (null = sin selección) */
  const [adjustProduct, setAdjustProduct]     = useState(null)

  /**
   * Convierte el mapa de stock del producto a un objeto indexado por ubicación.
   * @param {Object} productStock - Mapa de stock { locationId: { quantity, ... } }
   * @returns {Object} Mapa normalizado por ID de ubicación
   */
  const getProductStock = (productStock) => {
    const byLoc = {}
    for (const [locId, info] of Object.entries(productStock)) {
      byLoc[locId] = info
    }
    return byLoc
  }

  return (
    <div className="space-y-4">
      {/* Tabla de niveles de stock */}
      <div className="overflow-x-auto rounded-xl border border-surface-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-800 text-surface-400 text-left">
              <th className="px-4 py-3 font-medium">Producto</th>
              <th className="px-4 py-3 font-medium">Categoría</th>
              {/* Columna dinámica por cada ubicación registrada */}
              {locations.map((l) => (
                <th key={l.id} className="px-4 py-3 font-medium text-center">{l.name}</th>
              ))}
              <th className="px-4 py-3 font-medium text-center">Total</th>
              <th className="px-4 py-3 font-medium text-center">Estado</th>
              <th className="px-4 py-3 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-800">
            {/* Mensaje cuando no hay datos de stock */}
            {stockLevels.length === 0 && (
              <tr><td colSpan={5 + locations.length} className="text-center text-surface-600 py-10">Sin datos de stock</td></tr>
            )}
            {stockLevels.map((p) => {
              /** Mapa de stock por ubicación para este producto */
              const stockByLoc = getProductStock(p.stock)
              /** Stock total sumado de todas las ubicaciones */
              const total = Object.values(stockByLoc).reduce((s, x) => s + (x.quantity ?? 0), 0)
              /** Flag: stock bajo (menor o igual al mínimo configurado) */
              const low = p.min_stock > 0 && total <= p.min_stock

              return (
                <tr key={p.id} className="hover:bg-surface-800/50 transition-colors">
                  {/* Nombre y SKU del producto */}
                  <td className="px-4 py-3">
                    <p className="font-medium text-white">{p.name}</p>
                    {p.sku && <p className="text-xs text-surface-500 font-mono">{p.sku}</p>}
                  </td>
                  <td className="px-4 py-3 text-surface-400">{p.categories?.name || '—'}</td>
                  {/* Celdas dinámicas: cantidad por cada ubicación */}
                  {locations.map((l) => (
                    <td key={l.id} className="px-4 py-3 text-center font-mono">
                      <span className={stockByLoc[l.id]?.quantity > 0 ? 'text-white' : 'text-surface-600'}>
                        {stockByLoc[l.id]?.quantity ?? 0}
                      </span>
                    </td>
                  ))}
                  {/* Stock total con color según estado */}
                  <td className="px-4 py-3 text-center font-semibold">
                    <span className={low ? 'text-yellow-400' : 'text-white'}>{total}</span>
                  </td>
                  {/* Badge de estado: Stock bajo / Sin stock / OK */}
                  <td className="px-4 py-3 text-center">
                    {low ? (
                      <Badge color="yellow"><AlertTriangle className="w-3 h-3" /> Stock bajo</Badge>
                    ) : total === 0 ? (
                      <Badge color="red">Sin stock</Badge>
                    ) : (
                      <Badge color="green">OK</Badge>
                    )}
                  </td>
                  {/* Botones de acción: trasladar y ajustar stock */}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {/* Botón: trasladar stock entre ubicaciones */}
                      <button
                        title="Trasladar"
                        onClick={() => setTransferProduct(p)}
                        className="p-1.5 text-surface-500 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"
                      >
                        <ArrowLeftRight className="w-4 h-4" />
                      </button>
                      {/* Botón: ajuste manual de stock */}
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

      {/* Modal de traslado de stock (se abre al seleccionar un producto para trasladar) */}
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

      {/* Modal de ajuste de stock (se abre al seleccionar un producto para ajustar) */}
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
