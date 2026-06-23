/**
 * DiscountsPage — ABM de reglas de descuento.
 * Accesible para admin y superadmin desde /admin/discounts.
 */
import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Tag } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button }        from '@/shared/components/Button'
import { Badge }         from '@/shared/components/Badge'
import { ConfirmDialog } from '@/shared/components/ConfirmDialog'
import { Spinner }       from '@/shared/components/Spinner'
import { DiscountFormModal } from './DiscountFormModal'
import {
  getDiscounts, createDiscount, updateDiscount,
  toggleDiscountActive, deleteDiscount,
} from '../services/discountService'

const TYPE_LABELS = {
  product:          'Producto',
  category:         'Categoría',
  quantity_rule:    'Cant. / Promo',
  percentage_total: '% Total',
  fixed_total:      'Monto fijo',
}

const TYPE_COLORS = {
  product:          'blue',
  category:         'purple',
  quantity_rule:    'orange',
  percentage_total: 'green',
  fixed_total:      'yellow',
}

function describeDiscount(d) {
  switch (d.type) {
    case 'product':          return `${d.value}% off — ${d.products?.name ?? '—'}`
    case 'category':         return `${d.value}% off — cat. ${d.categories?.name ?? '—'}`
    case 'quantity_rule':    return `Comprá ${d.min_quantity} llevá ${Number(d.min_quantity) + Number(d.free_quantity)} — ${d.products?.name ?? '—'}`
    case 'percentage_total': return `${d.value}% off el total`
    case 'fixed_total':      return `$${d.value} off el total`
    default:                 return '—'
  }
}

export function DiscountsPage() {
  const [discounts,     setDiscounts]     = useState([])
  const [loading,       setLoading]       = useState(true)
  const [formOpen,      setFormOpen]      = useState(false)
  const [editing,       setEditing]       = useState(null)
  const [deleteTarget,  setDeleteTarget]  = useState(null)

  const load = useCallback(async () => {
    try {
      setDiscounts(await getDiscounts())
    } catch { toast.error('Error al cargar descuentos') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleSave = async (data) => {
    try {
      if (editing) {
        await updateDiscount(editing.id, data)
        toast.success('Descuento actualizado')
      } else {
        await createDiscount(data)
        toast.success('Descuento creado')
      }
      setFormOpen(false)
      setEditing(null)
      load()
    } catch (e) { toast.error(e.message ?? 'Error al guardar') }
  }

  const handleToggle = async (d) => {
    try {
      await toggleDiscountActive(d.id, !d.is_active)
      toast.success(d.is_active ? 'Descuento desactivado' : 'Descuento activado')
      load()
    } catch { toast.error('Error al cambiar estado') }
  }

  const handleDelete = async () => {
    try {
      await deleteDiscount(deleteTarget.id)
      toast.success('Descuento eliminado')
      setDeleteTarget(null)
      load()
    } catch { toast.error('Error al eliminar') }
  }

  const openCreate = () => { setEditing(null); setFormOpen(true) }
  const openEdit   = (d) => { setEditing(d);   setFormOpen(true) }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Tag className="w-6 h-6 text-primary-400" />
          <h1 className="text-2xl font-bold text-white">Descuentos</h1>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4" /> Nueva regla
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : discounts.length === 0 ? (
        <div className="card text-center py-16 text-surface-500">
          <Tag className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No hay reglas de descuento configuradas</p>
          <p className="text-sm mt-1">Creá una para que se aplique automáticamente en el POS</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-surface-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-800 text-surface-400 text-left">
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Descripción</th>
                <th className="px-4 py-3 text-center">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-800">
              {discounts.map((d) => (
                <tr key={d.id} className={`hover:bg-surface-800/40 transition-colors ${!d.is_active ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3 font-medium text-white">{d.name}</td>
                  <td className="px-4 py-3">
                    <Badge color={TYPE_COLORS[d.type] ?? 'gray'}>
                      {TYPE_LABELS[d.type] ?? d.type}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-surface-400">{describeDiscount(d)}</td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => handleToggle(d)} className="text-surface-400 hover:text-primary-400 transition-colors" title={d.is_active ? 'Desactivar' : 'Activar'}>
                      {d.is_active
                        ? <ToggleRight className="w-6 h-6 text-primary-400" />
                        : <ToggleLeft  className="w-6 h-6" />
                      }
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => openEdit(d)} className="p-1.5 rounded-lg text-surface-400 hover:text-white hover:bg-surface-700 transition-colors" title="Editar">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => setDeleteTarget(d)} className="p-1.5 rounded-lg text-surface-400 hover:text-red-400 hover:bg-red-900/20 transition-colors" title="Eliminar">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <DiscountFormModal
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null) }}
        onSave={handleSave}
        initialData={editing}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Eliminar descuento"
        message={`¿Eliminás la regla "${deleteTarget?.name}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
