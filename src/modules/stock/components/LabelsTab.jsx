/**
 * LabelsTab — Generador de etiquetas de precios para góndolas.
 * Permite seleccionar productos por categoría o individualmente,
 * previsualizar las etiquetas e imprimirlas en formato A4.
 */
import { useState, useEffect, useMemo } from 'react'
import { Download, Search, CheckSquare, Square, X } from 'lucide-react'
import toast from 'react-hot-toast'
import jsPDF from 'jspdf'
import { Button }  from '@/shared/components/Button'
import { Badge }   from '@/shared/components/Badge'
import { Spinner } from '@/shared/components/Spinner'
import { getProducts, getCategories } from '../services/productService'
import { formatCurrency } from '@/shared/utils/formatters'

export function LabelsTab() {
  const [products, setProducts]     = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading]       = useState(true)
  const [selected, setSelected]     = useState(new Set())
  const [search, setSearch]         = useState('')
  const [cols, setCols]             = useState(3)

  useEffect(() => {
    Promise.all([
      getProducts({ activeOnly: true }),
      getCategories(),
    ])
      .then(([prods, cats]) => { setProducts(prods); setCategories(cats) })
      .catch(() => toast.error('Error al cargar productos'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    if (!search) return products
    const q = search.toLowerCase()
    return products.filter((p) =>
      p.name.toLowerCase().includes(q) ||
      (p.sku ?? '').toLowerCase().includes(q) ||
      (p.barcode ?? '').includes(q)
    )
  }, [products, search])

  // Selección
  const toggle = (id) => setSelected((prev) => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const selectAll = () => setSelected(new Set(filtered.map((p) => p.id)))
  const selectNone = () => setSelected(new Set())

  const selectCategory = (catId) => {
    const ids = products.filter((p) => p.category_id === catId).map((p) => p.id)
    setSelected((prev) => {
      const next = new Set(prev)
      const allSelected = ids.every((id) => next.has(id))
      ids.forEach((id) => allSelected ? next.delete(id) : next.add(id))
      return next
    })
  }

  const isCatSelected = (catId) => {
    const ids = products.filter((p) => p.category_id === catId).map((p) => p.id)
    return ids.length > 0 && ids.every((id) => selected.has(id))
  }

  const isCatPartial = (catId) => {
    const ids = products.filter((p) => p.category_id === catId).map((p) => p.id)
    return ids.some((id) => selected.has(id)) && !ids.every((id) => selected.has(id))
  }

  const selectedProducts = products.filter((p) => selected.has(p.id))

  // Genera PDF descargable con las etiquetas
  const handlePrint = () => {
    if (selectedProducts.length === 0) return toast.error('Seleccioná al menos un producto')

    const today = new Date().toLocaleDateString('es-AR')
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

    const margin = 8
    const pageW = 210 - margin * 2
    const gap = 4
    const colW = (pageW - gap * (cols - 1)) / cols
    const rowH = 30
    const rows = Math.floor((297 - margin * 2 + gap) / (rowH + gap))

    let idx = 0
    while (idx < selectedProducts.length) {
      if (idx > 0) doc.addPage()

      for (let r = 0; r < rows && idx < selectedProducts.length; r++) {
        for (let c = 0; c < cols && idx < selectedProducts.length; c++, idx++) {
          const p = selectedProducts[idx]
          const x = margin + c * (colW + gap)
          const y = margin + r * (rowH + gap)

          // Borde de la etiqueta
          doc.setDrawColor(200)
          doc.setLineWidth(0.3)
          doc.roundedRect(x, y, colW, rowH, 1.5, 1.5)

          // Nombre del producto
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(7)
          doc.setTextColor(40)
          const name = p.name.length > 30 ? p.name.substring(0, 29) + '…' : p.name
          doc.text(name.toUpperCase(), x + colW / 2, y + 6, { align: 'center' })

          // Precio grande
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(18)
          doc.setTextColor(22, 163, 74)
          doc.text(formatCurrency(p.price_sell), x + colW / 2, y + 16, { align: 'center' })

          // Código de barras / SKU
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(5.5)
          doc.setTextColor(130)
          const meta = [p.barcode, p.sku].filter(Boolean).join('  |  ')
          if (meta) doc.text(meta, x + colW / 2, y + 21, { align: 'center' })

          // Línea separadora
          doc.setDrawColor(230)
          doc.line(x + 2, y + 23.5, x + colW - 2, y + 23.5)

          // Categoría + fecha
          doc.setFontSize(5)
          doc.setTextColor(170)
          doc.text(p.categories?.name ?? '', x + 3, y + 27)
          doc.text(today, x + colW - 3, y + 27, { align: 'right' })
        }
      }
    }

    doc.save(`etiquetas_gondola_${today.replace(/\//g, '-')}.pdf`)
    toast.success('PDF descargado')
  }

  if (loading) return <div className="flex justify-center py-16"><Spinner /></div>

  return (
    <div className="space-y-4">

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
          <input
            type="text"
            placeholder="Buscar producto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-base pl-10"
          />
        </div>
        <Button variant="secondary" size="sm" onClick={selectAll}>Seleccionar todos</Button>
        <Button variant="secondary" size="sm" onClick={selectNone}>Limpiar</Button>
        <select
          className="input-base w-32"
          value={cols}
          onChange={(e) => setCols(Number(e.target.value))}
        >
          <option value={3}>3 columnas</option>
          <option value={4}>4 columnas</option>
        </select>
        <Button onClick={handlePrint} disabled={selected.size === 0}>
          <Download className="w-4 h-4" /> Descargar PDF {selected.size > 0 && `(${selected.size})`}
        </Button>
      </div>

      {/* Chips de categorías */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => {
          const full = isCatSelected(cat.id)
          const partial = isCatPartial(cat.id)
          return (
            <button
              key={cat.id}
              onClick={() => selectCategory(cat.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                full
                  ? 'bg-primary-600 text-white'
                  : partial
                    ? 'bg-primary-600/30 text-primary-400 border border-primary-600/40'
                    : 'bg-surface-800 text-surface-300 hover:bg-surface-700'
              }`}
            >
              {full ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
              {cat.name}
            </button>
          )
        })}
      </div>

      {/* Tabla de productos con checkboxes */}
      <div className="overflow-x-auto rounded-xl border border-surface-800 max-h-[45vh] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-surface-900 z-10">
            <tr className="border-b border-surface-800 text-surface-400 text-left">
              <th className="px-4 py-3 w-8">
                <input
                  type="checkbox"
                  className="checkbox-base"
                  checked={filtered.length > 0 && filtered.every((p) => selected.has(p.id))}
                  onChange={() => filtered.every((p) => selected.has(p.id)) ? selectNone() : selectAll()}
                />
              </th>
              <th className="px-4 py-3">Producto</th>
              <th className="px-4 py-3">Categoría</th>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3 text-right">Precio</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-800">
            {filtered.map((p) => (
              <tr
                key={p.id}
                className={`cursor-pointer transition-colors ${
                  selected.has(p.id) ? 'bg-primary-600/10' : 'hover:bg-surface-800/40'
                }`}
                onClick={() => toggle(p.id)}
              >
                <td className="px-4 py-2.5">
                  <input
                    type="checkbox"
                    className="checkbox-base"
                    checked={selected.has(p.id)}
                    onChange={() => toggle(p.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </td>
                <td className="px-4 py-2.5 font-medium text-white">{p.name}</td>
                <td className="px-4 py-2.5 text-surface-400">{p.categories?.name ?? '—'}</td>
                <td className="px-4 py-2.5 text-surface-400 font-mono text-xs">{p.sku ?? '—'}</td>
                <td className="px-4 py-2.5 text-right font-semibold text-primary-400">{formatCurrency(p.price_sell)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Preview de etiquetas seleccionadas */}
      {selectedProducts.length > 0 && (
        <div>
          <p className="text-sm text-surface-400 mb-3">
            Vista previa — {selectedProducts.length} etiqueta{selectedProducts.length !== 1 ? 's' : ''}
          </p>
          <div className={`grid gap-3 ${cols === 4 ? 'grid-cols-4' : 'grid-cols-3'}`}>
            {selectedProducts.map((p) => (
              <div
                key={p.id}
                className="bg-white rounded-lg p-3 text-center border border-surface-700 relative group"
              >
                <button
                  onClick={() => toggle(p.id)}
                  className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-surface-400 hover:text-red-400 transition-all"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                <p className="text-[9px] font-bold text-gray-800 uppercase leading-tight mb-1 line-clamp-2">{p.name}</p>
                <p className="text-2xl font-black text-green-600 leading-none mb-1">{formatCurrency(p.price_sell)}</p>
                <div className="flex justify-center gap-2 text-[7px] text-gray-400">
                  {p.barcode && <span>{p.barcode}</span>}
                  {p.sku && <span>{p.sku}</span>}
                </div>
                <div className="flex justify-between text-[6px] text-gray-300 mt-1 pt-1 border-t border-gray-100">
                  <span>{p.categories?.name ?? ''}</span>
                  <span>{new Date().toLocaleDateString('es-AR')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
