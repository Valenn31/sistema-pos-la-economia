/**
 * DiscountsPage — ABM (Alta/Baja/Modificación) de reglas de descuento.
 * Accesible para admin y superadmin desde /admin/discounts.
 * Permite crear, editar, activar/desactivar y eliminar descuentos
 * que se aplican automáticamente en el POS durante las ventas.
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

/** Etiquetas legibles para cada tipo de descuento */
const TYPE_LABELS = {
  product:          'Producto',
  category:         'Categoría',
  quantity_rule:    'Cant. / Promo',
  percentage_total: '% Total',
  fixed_total:      'Monto fijo',
}

/** Colores de badge asociados a cada tipo de descuento */
const TYPE_COLORS = {
  product:          'blue',
  category:         'purple',
  quantity_rule:    'orange',
  percentage_total: 'green',
  fixed_total:      'yellow',
}

/**
 * Genera una descripción legible de la regla de descuento.
 * Por ejemplo: "10% off — Coca Cola" o "Comprá 3 llevá 4 — Galletitas".
 *
 * @param {object} d - Objeto de descuento con sus relaciones (products, categories)
 * @returns {string} Descripción textual del descuento
 */
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

/**
 * DiscountsPage — Componente principal de la página de gestión de descuentos.
 * Renderiza la tabla con todas las reglas, permite CRUD completo y toggle de estado.
 */
export function DiscountsPage() {
  // Lista de descuentos cargados desde la base de datos
  const [discounts,     setDiscounts]     = useState([])
  // Indicador de carga inicial
  const [loading,       setLoading]       = useState(true)
  // Controla la visibilidad del modal de formulario (crear/editar)
  const [formOpen,      setFormOpen]      = useState(false)
  // Descuento actualmente en edición (null = modo creación)
  const [editing,       setEditing]       = useState(null)
  // Descuento seleccionado para eliminar (abre el diálogo de confirmación)
  const [deleteTarget,  setDeleteTarget]  = useState(null)

  /** Carga todos los descuentos desde el servicio */
  const load = useCallback(async () => {
    try {
      setDiscounts(await getDiscounts())
    } catch { toast.error('Error al cargar descuentos') }
    finally { setLoading(false) }
  }, [])

  // Cargar descuentos al montar el componente
  useEffect(() => { load() }, [load])

  /** Guarda un descuento (creación o actualización) y recarga la lista */
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

  /** Alterna el estado activo/inactivo de un descuento */
  const handleToggle = async (d) => {
    try {
      await toggleDiscountActive(d.id, !d.is_active)
      toast.success(d.is_active ? 'Descuento desactivado' : 'Descuento activado')
      load()
    } catch { toast.error('Error al cambiar estado') }
  }

  /** Elimina el descuento seleccionado y recarga la lista */
  const handleDelete = async () => {
    try {
      await deleteDiscount(deleteTarget.id)
      toast.success('Descuento eliminado')
      setDeleteTarget(null)
      load()
    } catch { toast.error('Error al eliminar') }
  }

  /** Abre el modal en modo creación */
  const openCreate = () => { setEditing(null); setFormOpen(true) }
  /** Abre el modal en modo edición con los datos del descuento seleccionado */
  const openEdit   = (d) => { setEditing(d);   setFormOpen(true) }

  return (
    <div className="p-6 space-y-4">
      {/* Encabezado con título e ícono + botón de nueva regla */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Tag className="w-6 h-6 text-primary-400" />
          <h1 className="text-2xl font-bold text-white">Descuentos</h1>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4" /> Nueva regla
        </Button>
      </div>

      {/* Contenido principal: spinner, estado vacío o tabla de descuentos */}
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
                  {/* Nombre del descuento */}
                  <td className="px-4 py-3 font-medium text-white">{d.name}</td>
                  {/* Badge de tipo con color distintivo */}
                  <td className="px-4 py-3">
                    <Badge color={TYPE_COLORS[d.type] ?? 'gray'}>
                      {TYPE_LABELS[d.type] ?? d.type}
                    </Badge>
                  </td>
                  {/* Descripción generada automáticamente */}
                  <td className="px-4 py-3 text-surface-400">{describeDiscount(d)}</td>
                  {/* Botón toggle para activar/desactivar */}
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => handleToggle(d)} className="text-surface-400 hover:text-primary-400 transition-colors" title={d.is_active ? 'Desactivar' : 'Activar'}>
                      {d.is_active
                        ? <ToggleRight className="w-6 h-6 text-primary-400" />
                        : <ToggleLeft  className="w-6 h-6" />
                      }
                    </button>
                  </td>
                  {/* Botones de editar y eliminar */}
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

      {/* Modal de formulario para crear/editar descuentos */}
      <DiscountFormModal
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null) }}
        onSave={handleSave}
        initialData={editing}
      />

      {/* Diálogo de confirmación para eliminar un descuento */}
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
