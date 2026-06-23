/**
 * StockAlertTab — Pestaña de reporte de alertas de stock.
 *
 * Muestra todos los productos con sus niveles de stock actual,
 * permitiendo filtrar por: todos, stock bajo (debajo del mínimo),
 * y sin stock (cantidad = 0). Incluye exportación a Excel.
 *
 * @module reports/components/StockAlertTab
 */
import { useState, useEffect } from 'react'
import { FileSpreadsheet, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '@/shared/components/Button'
import { Badge } from '@/shared/components/Badge'
import { Spinner } from '@/shared/components/Spinner'
import { getStockReport } from '../services/reportsService'
import { exportToExcel } from '@/shared/utils/exporters'
import { formatCurrency } from '@/shared/utils/formatters'

/**
 * Componente que renderiza el reporte de niveles de stock con alertas.
 * Carga los productos al montarse, permite filtrar por estado de stock
 * y exportar el resultado a Excel.
 *
 * @returns {JSX.Element} Pestaña de alertas de stock
 */
export function StockAlertTab() {
  /** Estado: lista de productos con datos de stock agregados */
  const [products, setProducts] = useState([])
  /** Estado: indica si se están cargando los datos */
  const [loading, setLoading]   = useState(true)
  /** Estado: filtro activo ('all' | 'low' | 'empty') */
  const [filter, setFilter]     = useState('all')

  /**
   * Hook de efecto: carga el reporte de stock al montar el componente.
   * Cada producto incluye totalStock y stockByLoc calculados en el servicio.
   */
  useEffect(() => {
    getStockReport()
      .then(setProducts)
      .catch(() => toast.error('Error al cargar stock'))
      .finally(() => setLoading(false))
  }, [])

  /**
   * Filtra los productos según el filtro seleccionado.
   * - 'low': productos con stock igual o menor al mínimo (y mínimo > 0)
   * - 'empty': productos con stock = 0
   * - 'all': sin filtro
   */
  const filtered = products.filter((p) => {
    if (filter === 'low')   return p.min_stock > 0 && p.totalStock <= p.min_stock
    if (filter === 'empty') return p.totalStock === 0
    return true
  })

  /**
   * Exporta los productos filtrados a un archivo Excel.
   * Incluye nombre, SKU, categoría, stock por ubicación, stock total,
   * stock mínimo y precio de venta.
   */
  const doExport = () => {
    const rows = filtered.map((p) => ({
      Nombre:    p.name,
      SKU:       p.sku ?? '',
      Categoría: p.categories?.name ?? '',
      ...Object.fromEntries(Object.entries(p.stockByLoc).map(([loc, qty]) => [loc, qty])),
      'Stock total': p.totalStock,
      'Stock mínimo': p.min_stock,
      'Precio venta': p.price_sell,
    }))
    exportToExcel(rows, 'reporte_stock', 'Stock')
  }

  /** Cantidad de productos que están bajo su stock mínimo */
  const lowCount = products.filter((p) => p.min_stock > 0 && p.totalStock <= p.min_stock).length

  /* Mostrar spinner mientras se cargan los datos */
  if (loading) return <div className="flex justify-center py-16"><Spinner /></div>

  return (
    <div className="space-y-4">
      {/* Barra de herramientas: filtros rápidos + badge de alerta + botón exportar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Grupo de botones de filtro */}
        <div className="flex gap-1 bg-surface-800 p-1 rounded-lg">
          {[['all','Todos'],['low','Stock bajo'],['empty','Sin stock']].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setFilter(val)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                filter === val ? 'bg-surface-700 text-white' : 'text-surface-500 hover:text-surface-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {/* Badge de alerta si hay productos bajo el mínimo */}
        {lowCount > 0 && <Badge color="yellow"><AlertTriangle className="w-3 h-3" /> {lowCount} bajo mínimo</Badge>}
        {/* Botón de exportación a Excel */}
        <Button variant="secondary" className="ml-auto" onClick={doExport}>
          <FileSpreadsheet className="w-4 h-4" /> Excel
        </Button>
      </div>

      {/* Tabla de productos con niveles de stock */}
      <div className="overflow-x-auto rounded-xl border border-surface-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-800 text-surface-400 text-left">
              <th className="px-4 py-3">Producto</th>
              <th className="px-4 py-3">Categoría</th>
              <th className="px-4 py-3 text-center">Total stock</th>
              <th className="px-4 py-3 text-center">Mínimo</th>
              <th className="px-4 py-3 text-right">P. Venta</th>
              <th className="px-4 py-3 text-center">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-800">
            {/* Mensaje cuando no hay productos para mostrar */}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="text-center text-surface-600 py-10">Sin productos</td></tr>
            )}
            {filtered.map((p) => {
              /** Flag: producto con stock bajo (bajo el mínimo configurado) */
              const low   = p.min_stock > 0 && p.totalStock <= p.min_stock
              /** Flag: producto sin stock (cantidad = 0) */
              const empty = p.totalStock === 0
              return (
                <tr key={p.id} className="hover:bg-surface-800/50 transition-colors">
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-white">{p.name}</p>
                    {p.sku && <p className="text-xs text-surface-500 font-mono">{p.sku}</p>}
                  </td>
                  <td className="px-4 py-2.5 text-surface-400">{p.categories?.name || '—'}</td>
                  <td className="px-4 py-2.5 text-center">
                    {/* Color del stock según estado: rojo (sin stock), amarillo (bajo), blanco (OK) */}
                    <span className={`font-mono font-semibold ${empty ? 'text-red-400' : low ? 'text-yellow-400' : 'text-white'}`}>
                      {p.totalStock}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-center text-surface-400">{p.min_stock || '—'}</td>
                  <td className="px-4 py-2.5 text-right text-primary-400">{formatCurrency(p.price_sell)}</td>
                  <td className="px-4 py-2.5 text-center">
                    {/* Badge de estado: Sin stock / Stock bajo / OK */}
                    {empty ? <Badge color="red">Sin stock</Badge>
                           : low ? <Badge color="yellow">Stock bajo</Badge>
                           : <Badge color="green">OK</Badge>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
