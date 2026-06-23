/**
 * ProductSearch — Panel izquierdo del POS.
 * Búsqueda de productos por nombre, SKU o código de barras.
 * Soporta escaneo: al presionar Enter con un código exacto, agrega directo al carrito.
 *
 * @param {Function} onAdd - (product) => void
 */
import { useState, useRef, useCallback, useEffect } from 'react'
import { Search, Barcode, Plus, Package } from 'lucide-react'
import toast from 'react-hot-toast'
import { useDebounce } from '@/shared/hooks/useDebounce'
import { searchProducts, getProductByBarcode } from '@/modules/pos/services/salesService'
import { formatCurrency } from '@/shared/utils/formatters'
import { Spinner } from '@/shared/components/Spinner'

export function ProductSearch({ onAdd }) {
  const [query,    setQuery]    = useState('')
  const [results,  setResults]  = useState([])
  const [loading,  setLoading]  = useState(false)
  const [addedId,  setAddedId]  = useState(null)
  const inputRef = useRef(null)
  const debounced = useDebounce(query, 250)

  // Buscar cuando cambia el query debounceado
  useEffect(() => {
    if (!debounced) { setResults([]); return }
    setLoading(true)
    searchProducts(debounced)
      .then(setResults)
      .catch(() => setResults([]))
      .finally(() => setLoading(false))
  }, [debounced])

  // Manejar Enter → intento de escaneo exacto por barcode/SKU
  const handleKeyDown = useCallback(async (e) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const q = query.trim()
    if (!q) return

    // Buscar match exacto por barcode
    const product = await getProductByBarcode(q)
    if (product) {
      handleAdd(product)
      setQuery('')
      return
    }
    // Si hay exactamente 1 resultado, agregar directo
    if (results.length === 1) {
      handleAdd(results[0])
      setQuery('')
    }
  }, [query, results])

  const handleAdd = (product) => {
    const totalStock = (product.stock ?? []).reduce((sum, s) => sum + (s.quantity ?? 0), 0)
    if (totalStock <= 0) {
      toast(`⚠️ Sin existencias: ${product.name}`, {
        duration: 4000,
        style: { background: '#92400e', color: '#fef3c7', fontWeight: '600' },
      })
    }
    onAdd(product)
    setAddedId(product.id)
    setTimeout(() => setAddedId(null), 600)
    inputRef.current?.focus()
  }

  // Extraer stock de "En Estantería" del join
  const getStock = (product) => {
    if (Array.isArray(product.stock)) {
      const shelf = product.stock.find((s) => s.locations?.name === 'En Estantería')
      return shelf?.quantity ?? null
    }
    return null
  }

  return (
    <div className="h-full flex flex-col bg-surface-950">

      {/* Barra de búsqueda */}
      <div className="p-4 border-b border-surface-800">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
          <input
            ref={inputRef}
            type="text"
            autoFocus
            placeholder="Buscar por nombre, código o escanear barcode…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="input-base pl-9 pr-10"
          />
          {query && (
            <Barcode className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
          )}
        </div>
      </div>

      {/* Resultados */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading && (
          <div className="flex justify-center py-12">
            <Spinner size="md" />
          </div>
        )}

        {!loading && query && results.length === 0 && (
          <div className="text-center py-12 text-surface-500">
            <Package className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>Sin resultados para "{query}"</p>
          </div>
        )}

        {!loading && !query && (
          <div className="text-center py-12 text-surface-600">
            <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Escribí o escaneá para buscar productos</p>
          </div>
        )}

        {!loading && results.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
            {results.map((product) => {
              const stock   = getStock(product)
              const isAdded = addedId === product.id
              return (
                <button
                  key={product.id}
                  onClick={() => handleAdd(product)}
                  className={`
                    group relative text-left bg-surface-900 border rounded-xl p-3 transition-all duration-150
                    hover:border-primary-600 hover:shadow-lg hover:shadow-primary-600/10 active:scale-95
                    ${isAdded ? 'border-primary-500 bg-primary-600/10' : 'border-surface-800'}
                  `}
                >
                  {/* Badge de categoría */}
                  {product.categories?.name && (
                    <span className="badge bg-surface-800 text-surface-400 text-[10px] mb-2">
                      {product.categories.name}
                    </span>
                  )}

                  <p className="font-medium text-white text-sm leading-tight line-clamp-2 mb-2">
                    {product.name}
                  </p>

                  <p className="text-primary-400 font-bold text-base">
                    {formatCurrency(product.price_sell)}
                  </p>

                  {/* Stock */}
                  {stock !== null && (
                    <p className={`text-xs mt-1 ${stock <= 0 ? 'text-red-400' : stock <= 3 ? 'text-yellow-400' : 'text-surface-500'}`}>
                      {stock <= 0 ? 'Sin stock' : `Stock: ${stock} ${product.unit_of_measure}`}
                    </p>
                  )}

                  {/* Botón + */}
                  <div className={`
                    absolute top-2 right-2 w-7 h-7 rounded-lg flex items-center justify-center transition-all
                    ${isAdded
                      ? 'bg-primary-500 text-white scale-110'
                      : 'bg-surface-800 text-surface-400 group-hover:bg-primary-600 group-hover:text-white'}
                  `}>
                    <Plus className="w-4 h-4" />
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
