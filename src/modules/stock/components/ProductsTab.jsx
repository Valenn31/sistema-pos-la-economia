/**
 * ProductsTab — Pestaña principal de gestión de productos.
 *
 * Lista de productos con búsqueda en tiempo real, filtro por categoría,
 * toggle de productos inactivos, ordenamiento por columnas y paginación.
 * Incluye acciones de ABM: crear, editar, activar/desactivar productos,
 * y acciones de stock: trasladar entre ubicaciones y ajustar manualmente.
 * Los permisos de escritura están restringidos a roles específicos.
 *
 * @module stock/components/ProductsTab
 */
import { useState, useEffect, useMemo } from 'react'
import { Plus, Search, Pencil, Power, ArrowLeftRight, SlidersHorizontal, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '@/shared/components/Button'
import { Badge } from '@/shared/components/Badge'
import { Spinner } from '@/shared/components/Spinner'
import { ConfirmDialog } from '@/shared/components/ConfirmDialog'
import { Pagination } from '@/shared/components/Pagination'
import { useAuthStore } from '@/shared/store/authStore'
import { getProducts, toggleProductActive } from '../services/productService'
import { getLocations, getProductStock } from '../services/movementService'
import { formatCurrency } from '@/shared/utils/formatters'
import { ProductFormModal } from './ProductFormModal'
import { TransferModal } from './TransferModal'
import { AdjustmentModal } from './AdjustmentModal'

/** Roles con permisos de escritura (crear, editar, ajustar stock) */
const ROLES_WRITE = ['superadmin', 'admin', 'repositor']

/**
 * Componente que renderiza la lista de productos con búsqueda, filtros,
 * ordenamiento, paginación y acciones de gestión.
 *
 * @param {Object} props
 * @param {Array} props.categories - Lista de categorías disponibles para filtrar
 * @param {Function} props.onRefreshNeeded - Callback para notificar al padre que se requiere recargar datos
 * @returns {JSX.Element} Pestaña de productos
 */
export function ProductsTab({ categories, onRefreshNeeded }) {
  /** Rol activo del usuario autenticado */
  const { activeRole } = useAuthStore()
  /** Flag: indica si el usuario tiene permisos de escritura */
  const canWrite = ROLES_WRITE.includes(activeRole)

  /** Estado: lista de productos cargados desde el servidor */
  const [products, setProducts]       = useState([])
  /** Estado: lista de ubicaciones de stock (depósito, estantería, etc.) */
  const [locations, setLocations]     = useState([])
  /** Estado: indica si se están cargando los datos */
  const [loading, setLoading]         = useState(true)
  /** Estado: texto de búsqueda (filtra por nombre, SKU, código) */
  const [search, setSearch]           = useState('')
  /** Estado: filtro por categoría (vacío = todas) */
  const [catFilter, setCatFilter]     = useState('')
  /** Estado: si true, muestra también los productos inactivos */
  const [showInactive, setShowInactive] = useState(false)

  /** Estado: controla la visibilidad del modal de formulario de producto */
  const [formOpen, setFormOpen]         = useState(false)
  /** Estado: producto seleccionado para editar (null = modo creación) */
  const [editProduct, setEditProduct]   = useState(null)
  /** Estado: datos para el modal de traslado { product, stockByLocation } */
  const [transferData, setTransferData] = useState(null)
  /** Estado: datos para el modal de ajuste { product, stockByLocation } */
  const [adjustData, setAdjustData]     = useState(null)
  /** Estado: producto seleccionado para activar/desactivar */
  const [toggleTarget, setToggleTarget] = useState(null)
  /** Estado: página actual de la paginación */
  const [page,     setPage]     = useState(1)
  /** Estado: cantidad de filas por página */
  const [pageSize, setPageSize] = useState(20)
  /** Estado: clave de la columna de ordenamiento actual */
  const [sortKey,  setSortKey]  = useState('name')
  /** Estado: dirección de ordenamiento ('asc' | 'desc') */
  const [sortDir,  setSortDir]  = useState('asc')

  /**
   * Carga los productos y ubicaciones desde el servidor.
   * Se ejecuta cada vez que cambia el texto de búsqueda o el filtro de categoría.
   */
  const load = async () => {
    setLoading(true)
    try {
      const [prods, locs] = await Promise.all([
        getProducts({ search, categoryId: catFilter || null }),
        getLocations(),
      ])
      setProducts(prods)
      setLocations(locs)
    } catch {
      toast.error('Error al cargar productos')
    } finally {
      setLoading(false)
    }
  }

  /** Efecto: recargar datos cuando cambia búsqueda o filtro de categoría */
  useEffect(() => { load() }, [search, catFilter])
  /** Efecto: volver a la primera página cuando cambian los filtros */
  useEffect(() => { setPage(1) }, [search, catFilter, showInactive])

  /**
   * Abre el modal de traslado de stock para un producto.
   * Primero obtiene el stock actual por ubicación del producto.
   * @param {Object} product - Producto seleccionado
   */
  const openTransfer = async (product) => {
    const stockByLocation = await getProductStock(product.id).catch(() => ({}))
    setTransferData({ product, stockByLocation })
  }

  /**
   * Abre el modal de ajuste de stock para un producto.
   * Primero obtiene el stock actual por ubicación del producto.
   * @param {Object} product - Producto seleccionado
   */
  const openAdjust = async (product) => {
    const stockByLocation = await getProductStock(product.id).catch(() => ({}))
    setAdjustData({ product, stockByLocation })
  }

  /**
   * Alterna el estado activo/inactivo de un producto.
   * Muestra un toast de confirmación y recarga la lista.
   */
  const handleToggle = async () => {
    try {
      await toggleProductActive(toggleTarget.id, !toggleTarget.is_active)
      toast.success(toggleTarget.is_active ? 'Producto desactivado' : 'Producto activado')
      setToggleTarget(null)
      load()
    } catch {
      toast.error('Error al cambiar estado')
    }
  }

  /**
   * Calcula el stock total de un producto sumando todas las ubicaciones.
   * @param {Object} p - Producto con array de stock por ubicación
   * @returns {number} Stock total
   */
  const totalStock = (p) => (p.stock ?? []).reduce((s, r) => s + Number(r.quantity), 0)

  /**
   * Alterna la columna de ordenamiento o invierte la dirección.
   * Reinicia a la primera página al cambiar el orden.
   * @param {string} key - Clave de la columna para ordenar
   */
  const toggleSort = (key) => {
    if (sortKey === key) setSortDir((d) => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
    setPage(1)
  }

  /**
   * Lista de productos filtrada (activos/inactivos) y ordenada
   * según la columna y dirección seleccionada.
   * Memorizada para evitar recálculos innecesarios.
   */
  const sorted = useMemo(() => {
    const filtered = showInactive ? products : products.filter((p) => p.is_active)
    return [...filtered].sort((a, b) => {
      let va, vb
      switch (sortKey) {
        case 'name':       va = a.name.toLowerCase(); vb = b.name.toLowerCase(); break
        case 'sku':        va = a.sku ?? ''; vb = b.sku ?? ''; break
        case 'category':   va = a.categories?.name ?? ''; vb = b.categories?.name ?? ''; break
        case 'price':      va = Number(a.price_sell); vb = Number(b.price_sell); break
        case 'stock':      va = totalStock(a); vb = totalStock(b); break
        case 'expiry':     va = a.expiry_date ?? '9999'; vb = b.expiry_date ?? '9999'; break
        default:           va = a.name; vb = b.name
      }
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [products, showInactive, sortKey, sortDir])

  /** Total de páginas según productos ordenados y filtrados */
  const totalPages = Math.ceil(sorted.length / pageSize)
  /** Productos de la página actual */
  const paged      = sorted.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div className="space-y-4">
      {/* Barra de herramientas: búsqueda, filtro categoría, toggle inactivos, botón crear */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Campo de búsqueda con ícono */}
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
          <input
            type="text"
            placeholder="Buscar por nombre, SKU, código..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-base pl-10"
          />
        </div>
        {/* Selector de filtro por categoría */}
        <select
          value={catFilter}
          onChange={(e) => setCatFilter(e.target.value)}
          className="input-base w-44"
        >
          <option value="">Todas las categorías</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {/* Checkbox para mostrar/ocultar productos inactivos */}
        <label className="flex items-center gap-2 text-sm text-surface-400 cursor-pointer select-none">
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} className="checkbox-base" />
          Ver inactivos
        </label>
        {/* Botón crear producto (solo visible con permisos de escritura) */}
        {canWrite && (
          <Button onClick={() => { setEditProduct(null); setFormOpen(true) }}>
            <Plus className="w-4 h-4" /> Nuevo producto
          </Button>
        )}
      </div>

      {/* Tabla de productos con ordenamiento por columnas */}
      {loading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : (
        <>
        <div className="overflow-x-auto rounded-xl border border-surface-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-800 text-surface-400 text-left">
                {/* Encabezados de columna con botón de ordenamiento */}
                {[
                  { key: 'name',     label: 'Nombre',       align: '' },
                  { key: 'sku',      label: 'SKU',          align: '' },
                  { key: 'category', label: 'Categoría',    align: '' },
                  { key: 'price',    label: 'P. Venta',     align: 'text-right' },
                  { key: 'stock',    label: 'Stock',        align: 'text-center' },
                  { key: 'expiry',   label: 'Vencimiento',  align: 'text-center' },
                ].map(({ key, label, align }) => {
                  const SortIcon = sortKey === key ? (sortDir === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown
                  return (
                    <th key={key} className={`px-4 py-3 font-medium ${align}`}>
                      <button onClick={() => toggleSort(key)} className="inline-flex items-center gap-1 hover:text-white transition-colors">
                        {label} <SortIcon className={`w-3 h-3 ${sortKey === key ? 'text-primary-400' : 'opacity-40'}`} />
                      </button>
                    </th>
                  )
                })}
                <th className="px-4 py-3 font-medium text-center">Estado</th>
                {canWrite && <th className="px-4 py-3 font-medium text-right">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-800">
              {/* Mensaje cuando no hay productos */}
              {paged.length === 0 && (
                <tr><td colSpan={canWrite ? 9 : 8} className="text-center text-surface-600 py-10">Sin productos</td></tr>
              )}
              {/* Filas de productos */}
              {paged.map((p) => {
                /** Stock total sumado de todas las ubicaciones */
                const qty = totalStock(p)
                /** Flag: stock bajo (menor o igual al mínimo configurado) */
                const isLow = p.min_stock > 0 && qty <= p.min_stock
                /** Fecha de vencimiento del producto (si existe) */
                const expDate = p.expiry_date
                /** Días restantes hasta el vencimiento (null si no tiene) */
                const daysLeft = expDate ? Math.ceil((new Date(expDate) - new Date()) / 86400000) : null
                return (
                  <tr key={p.id} className={`hover:bg-surface-800/50 transition-colors ${!p.is_active ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3 font-medium text-white">{p.name}</td>
                    <td className="px-4 py-3 text-surface-400 font-mono text-xs">{p.sku || '—'}</td>
                    <td className="px-4 py-3 text-surface-400">{p.categories?.name || '—'}</td>
                    <td className="px-4 py-3 text-right font-semibold text-primary-400">{formatCurrency(p.price_sell)}</td>
                    {/* Celda de stock con indicadores de alerta */}
                    <td className="px-4 py-3 text-center">
                      <span className={`font-medium ${isLow ? 'text-yellow-400' : qty === 0 ? 'text-red-400' : 'text-surface-300'}`}>
                        {qty}
                      </span>
                      {isLow && <span className="text-xs text-yellow-500 ml-1">(mín {p.min_stock})</span>}
                    </td>
                    {/* Celda de vencimiento con colores según urgencia */}
                    <td className="px-4 py-3 text-center">
                      {expDate ? (
                        <span className={`text-xs font-medium ${
                          daysLeft <= 0 ? 'text-red-400' : daysLeft <= 7 ? 'text-orange-400' : daysLeft <= 30 ? 'text-yellow-400' : 'text-surface-400'
                        }`}>
                          {new Date(expDate).toLocaleDateString('es-AR')}
                          {daysLeft <= 0 ? ' (vencido)' : daysLeft <= 30 ? ` (${daysLeft}d)` : ''}
                        </span>
                      ) : <span className="text-surface-600">—</span>}
                    </td>
                    {/* Badge de estado activo/inactivo */}
                    <td className="px-4 py-3 text-center">
                      <Badge color={p.is_active ? 'green' : 'gray'}>
                        {p.is_active ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </td>
                    {/* Botones de acción (solo con permisos de escritura) */}
                    {canWrite && (
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {/* Botón: trasladar stock entre ubicaciones */}
                          <button
                            title="Trasladar stock"
                            onClick={() => openTransfer(p)}
                            className="p-1.5 text-surface-500 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"
                          >
                            <ArrowLeftRight className="w-4 h-4" />
                          </button>
                          {/* Botón: ajuste manual de stock */}
                          <button
                            title="Ajuste de stock"
                            onClick={() => openAdjust(p)}
                            className="p-1.5 text-surface-500 hover:text-yellow-400 hover:bg-yellow-400/10 rounded-lg transition-colors"
                          >
                            <SlidersHorizontal className="w-4 h-4" />
                          </button>
                          {/* Botón: editar producto */}
                          <button
                            title="Editar"
                            onClick={() => { setEditProduct(p); setFormOpen(true) }}
                            className="p-1.5 text-surface-500 hover:text-primary-400 hover:bg-primary-400/10 rounded-lg transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          {/* Botón: activar/desactivar producto */}
                          <button
                            title={p.is_active ? 'Desactivar' : 'Activar'}
                            onClick={() => setToggleTarget(p)}
                            className="p-1.5 text-surface-500 hover:text-orange-400 hover:bg-orange-400/10 rounded-lg transition-colors"
                          >
                            <Power className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {/* Componente de paginación */}
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          pageSize={pageSize}
          onPageSizeChange={(s) => { setPageSize(s); setPage(1) }}
          totalItems={sorted.length}
        />
        </>
      )}

      {/* Modal de formulario para crear/editar producto */}
      <ProductFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={load}
        product={editProduct}
        categories={categories}
      />

      {/* Modal de traslado de stock entre ubicaciones */}
      {transferData && (
        <TransferModal
          open={!!transferData}
          onClose={() => setTransferData(null)}
          onSaved={() => { load(); setTransferData(null) }}
          product={transferData.product}
          locations={locations}
          stockByLocation={transferData.stockByLocation}
        />
      )}

      {/* Modal de ajuste manual de stock */}
      {adjustData && (
        <AdjustmentModal
          open={!!adjustData}
          onClose={() => setAdjustData(null)}
          onSaved={() => { load(); setAdjustData(null) }}
          product={adjustData.product}
          locations={locations}
          stockByLocation={adjustData.stockByLocation}
        />
      )}

      {/* Diálogo de confirmación para activar/desactivar producto */}
      <ConfirmDialog
        open={!!toggleTarget}
        title={toggleTarget?.is_active ? 'Desactivar producto' : 'Activar producto'}
        message={`${toggleTarget?.is_active ? 'Desactivar' : 'Activar'} "${toggleTarget?.name}"?`}
        confirmLabel={toggleTarget?.is_active ? 'Desactivar' : 'Activar'}
        variant={toggleTarget?.is_active ? 'danger' : 'primary'}
        onConfirm={handleToggle}
        onCancel={() => setToggleTarget(null)}
      />
    </div>
  )
}
