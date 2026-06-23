/**
 * ProductSearch — Panel izquierdo del POS.
 * Búsqueda de productos por nombre, SKU o código de barras.
 *
 * Funcionalidades:
 *  - Búsqueda por texto con debounce (250ms)
 *  - Escaneo de código de barras: al presionar Enter con un código exacto, agrega directo al carrito
 *  - Si hay exactamente 1 resultado al presionar Enter, lo agrega automáticamente
 *  - Muestra stock de estantería extraído del join con locations
 *  - Animación visual al agregar un producto (flash en la tarjeta)
 *  - Alerta si el producto no tiene stock disponible
 *
 * @param {Object}   props
 * @param {Function} props.onAdd - Callback al agregar un producto: (product) => void
 */
import { useState, useRef, useCallback, useEffect } from 'react'
import { Search, Barcode, Plus, Package } from 'lucide-react'
import toast from 'react-hot-toast'
import { useDebounce } from '@/shared/hooks/useDebounce'
import { searchProducts, getProductByBarcode } from '@/modules/pos/services/salesService'
import { formatCurrency } from '@/shared/utils/formatters'
import { Spinner } from '@/shared/components/Spinner'

/**
 * Componente de búsqueda y selección de productos para el POS.
 * Ocupa el panel izquierdo y muestra una grilla de productos encontrados.
 */
export function ProductSearch({ onAdd }) {
  // Estado: texto de búsqueda actual
  const [query,    setQuery]    = useState('')
  // Estado: productos encontrados en la búsqueda
  const [results,  setResults]  = useState([])
  // Estado: indicador de carga durante la búsqueda
  const [loading,  setLoading]  = useState(false)
  // Estado: ID del producto recién agregado (para animación visual)
  const [addedId,  setAddedId]  = useState(null)
  // Ref al input de búsqueda para mantener el foco
  const inputRef = useRef(null)
  // Valor de búsqueda con debounce de 250ms
  const debounced = useDebounce(query, 250)

  /**
   * Efecto: ejecuta la búsqueda de productos cada vez que cambia el texto debounceado.
   * Si el texto está vacío, limpia los resultados.
   */
  useEffect(() => {
    if (!debounced) { setResults([]); return }
    setLoading(true)
    searchProducts(debounced)
      .then(setResults)
      .catch(() => setResults([]))
      .finally(() => setLoading(false))
  }, [debounced])

  /**
   * Maneja la tecla Enter en el input de búsqueda.
   * Flujo de escaneo rápido:
   *  1. Busca coincidencia exacta por código de barras
   *  2. Si encuentra, agrega al carrito y limpia el input
   *  3. Si no, pero hay exactamente 1 resultado, lo agrega directamente
   */
  const handleKeyDown = useCallback(async (e) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const q = query.trim()
    if (!q) return

    // Intento 1: buscar coincidencia exacta por barcode/SKU
    const product = await getProductByBarcode(q)
    if (product) {
      handleAdd(product)
      setQuery('')
      return
    }
    // Intento 2: si hay exactamente 1 resultado en la búsqueda, agregarlo
    if (results.length === 1) {
      handleAdd(results[0])
      setQuery('')
    }
  }, [query, results])

  /**
   * Agrega un producto al carrito. Muestra alerta si no tiene stock.
   * Dispara animación visual temporal y devuelve el foco al input.
   * @param {Object} product - Producto a agregar al carrito
   */
  const handleAdd = (product) => {
    // Calcular stock total sumando todas las ubicaciones
    const totalStock = (product.stock ?? []).reduce((sum, s) => sum + (s.quantity ?? 0), 0)
    // Alertar al cajero si el producto no tiene existencias
    if (totalStock <= 0) {
      toast(`⚠️ Sin existencias: ${product.name}`, {
        duration: 4000,
        style: { background: '#92400e', color: '#fef3c7', fontWeight: '600' },
      })
    }
    onAdd(product)
    // Activar animación visual en la tarjeta del producto agregado
    setAddedId(product.id)
    setTimeout(() => setAddedId(null), 600)
    // Devolver el foco al input de búsqueda para escaneo continuo
    inputRef.current?.focus()
  }

  /**
   * Extrae la cantidad en stock de la ubicación "En Estantería" del producto.
   * Los productos traen un array stock[] con join a locations.
   * @param {Object} product - Producto con su relación stock[]
   * @returns {number|null} Cantidad en estantería, o null si no hay datos
   */
  const getStock = (product) => {
    if (Array.isArray(product.stock)) {
      const shelf = product.stock.find((s) => s.locations?.name === 'En Estantería')
      return shelf?.quantity ?? null
    }
    return null
  }

  return (
    <div className="h-full flex flex-col bg-surface-950">

      {/* ── Barra de búsqueda ── */}
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
          {/* Ícono de barcode (visible cuando hay texto en el input) */}
          {query && (
            <Barcode className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
          )}
        </div>
      </div>

      {/* ── Área de resultados ── */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Estado: cargando resultados */}
        {loading && (
          <div className="flex justify-center py-12">
            <Spinner size="md" />
          </div>
        )}

        {/* Estado: sin resultados para la búsqueda */}
        {!loading && query && results.length === 0 && (
          <div className="text-center py-12 text-surface-500">
            <Package className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>Sin resultados para "{query}"</p>
          </div>
        )}

        {/* Estado: sin búsqueda activa (placeholder inicial) */}
        {!loading && !query && (
          <div className="text-center py-12 text-surface-600">
            <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Escribí o escaneá para buscar productos</p>
          </div>
        )}

        {/* Estado: resultados encontrados — grilla de tarjetas de productos */}
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
                  {/* Badge de categoría del producto */}
                  {product.categories?.name && (
                    <span className="badge bg-surface-800 text-surface-400 text-[10px] mb-2">
                      {product.categories.name}
                    </span>
                  )}

                  {/* Nombre del producto (máximo 2 líneas) */}
                  <p className="font-medium text-white text-sm leading-tight line-clamp-2 mb-2">
                    {product.name}
                  </p>

                  {/* Precio de venta */}
                  <p className="text-primary-400 font-bold text-base">
                    {formatCurrency(product.price_sell)}
                  </p>

                  {/* Indicador de stock (coloreado según nivel) */}
                  {stock !== null && (
                    <p className={`text-xs mt-1 ${stock <= 0 ? 'text-red-400' : stock <= 3 ? 'text-yellow-400' : 'text-surface-500'}`}>
                      {stock <= 0 ? 'Sin stock' : `Stock: ${stock} ${product.unit_of_measure}`}
                    </p>
                  )}

                  {/* Botón "+" en esquina superior derecha (se resalta al agregar) */}
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
