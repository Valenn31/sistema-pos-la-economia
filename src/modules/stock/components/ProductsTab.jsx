/**
 * ProductsTab — Lista de productos con búsqueda, filtros y ABM.
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

const ROLES_WRITE = ['superadmin', 'admin', 'repositor']

export function ProductsTab({ categories, onRefreshNeeded }) {
  const { activeRole } = useAuthStore()
  const canWrite = ROLES_WRITE.includes(activeRole)

  const [products, setProducts]       = useState([])
  const [locations, setLocations]     = useState([])
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]           = useState('')
  const [catFilter, setCatFilter]     = useState('')
  const [showInactive, setShowInactive] = useState(false)

  const [formOpen, setFormOpen]         = useState(false)
  const [editProduct, setEditProduct]   = useState(null)
  const [transferData, setTransferData] = useState(null) // { product, stockByLocation }
  const [adjustData, setAdjustData]     = useState(null) // { product, stockByLocation }
  const [toggleTarget, setToggleTarget] = useState(null)
  const [page,     setPage]     = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [sortKey,  setSortKey]  = useState('name')
  const [sortDir,  setSortDir]  = useState('asc')

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

  useEffect(() => { load() }, [search, catFilter])
  useEffect(() => { setPage(1) }, [search, catFilter, showInactive])

  const openTransfer = async (product) => {
    const stockByLocation = await getProductStock(product.id).catch(() => ({}))
    setTransferData({ product, stockByLocation })
  }

  const openAdjust = async (product) => {
    const stockByLocation = await getProductStock(product.id).catch(() => ({}))
    setAdjustData({ product, stockByLocation })
  }

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

  const totalStock = (p) => (p.stock ?? []).reduce((s, r) => s + Number(r.quantity), 0)

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir((d) => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
    setPage(1)
  }

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

  const totalPages = Math.ceil(sorted.length / pageSize)
  const paged      = sorted.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
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
        <select
          value={catFilter}
          onChange={(e) => setCatFilter(e.target.value)}
          className="input-base w-44"
        >
          <option value="">Todas las categorías</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm text-surface-400 cursor-pointer select-none">
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} className="checkbox-base" />
          Ver inactivos
        </label>
        {canWrite && (
          <Button onClick={() => { setEditProduct(null); setFormOpen(true) }}>
            <Plus className="w-4 h-4" /> Nuevo producto
          </Button>
        )}
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : (
        <>
        <div className="overflow-x-auto rounded-xl border border-surface-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-800 text-surface-400 text-left">
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
              {paged.length === 0 && (
                <tr><td colSpan={canWrite ? 9 : 8} className="text-center text-surface-600 py-10">Sin productos</td></tr>
              )}
              {paged.map((p) => {
                const qty = totalStock(p)
                const isLow = p.min_stock > 0 && qty <= p.min_stock
                const expDate = p.expiry_date
                const daysLeft = expDate ? Math.ceil((new Date(expDate) - new Date()) / 86400000) : null
                return (
                  <tr key={p.id} className={`hover:bg-surface-800/50 transition-colors ${!p.is_active ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3 font-medium text-white">{p.name}</td>
                    <td className="px-4 py-3 text-surface-400 font-mono text-xs">{p.sku || '—'}</td>
                    <td className="px-4 py-3 text-surface-400">{p.categories?.name || '—'}</td>
                    <td className="px-4 py-3 text-right font-semibold text-primary-400">{formatCurrency(p.price_sell)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-medium ${isLow ? 'text-yellow-400' : qty === 0 ? 'text-red-400' : 'text-surface-300'}`}>
                        {qty}
                      </span>
                      {isLow && <span className="text-xs text-yellow-500 ml-1">(mín {p.min_stock})</span>}
                    </td>
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
                    <td className="px-4 py-3 text-center">
                      <Badge color={p.is_active ? 'green' : 'gray'}>
                        {p.is_active ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </td>
                    {canWrite && (
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            title="Trasladar stock"
                            onClick={() => openTransfer(p)}
                            className="p-1.5 text-surface-500 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"
                          >
                            <ArrowLeftRight className="w-4 h-4" />
                          </button>
                          <button
                            title="Ajuste de stock"
                            onClick={() => openAdjust(p)}
                            className="p-1.5 text-surface-500 hover:text-yellow-400 hover:bg-yellow-400/10 rounded-lg transition-colors"
                          >
                            <SlidersHorizontal className="w-4 h-4" />
                          </button>
                          <button
                            title="Editar"
                            onClick={() => { setEditProduct(p); setFormOpen(true) }}
                            className="p-1.5 text-surface-500 hover:text-primary-400 hover:bg-primary-400/10 rounded-lg transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
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

      {/* Modales */}
      <ProductFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={load}
        product={editProduct}
        categories={categories}
      />

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
