/**
 * CategoriesTab — Pestaña de ABM (Alta/Baja/Modificación) de categorías de producto.
 *
 * Permite crear, editar y eliminar categorías de productos.
 * Las categorías se usan para clasificar productos en el inventario.
 * La eliminación muestra un diálogo de confirmación y puede fallar
 * si hay productos asignados a la categoría.
 *
 * @module stock/components/CategoriesTab
 */
import { useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Button } from '@/shared/components/Button'
import { Modal } from '@/shared/components/Modal'
import { ConfirmDialog } from '@/shared/components/ConfirmDialog'
import { createCategory, updateCategory, deleteCategory } from '../services/productService'

/**
 * Componente que gestiona el CRUD de categorías de producto.
 *
 * @param {Object} props
 * @param {Array} props.categories - Lista de categorías existentes
 * @param {Function} props.onRefresh - Callback para recargar la lista de categorías desde el padre
 * @returns {JSX.Element} Pestaña de gestión de categorías
 */
export function CategoriesTab({ categories, onRefresh }) {
  /** Estado: controla la visibilidad del modal de formulario */
  const [formOpen, setFormOpen]     = useState(false)
  /** Estado: categoría en edición (null = modo creación) */
  const [editCat, setEditCat]       = useState(null)
  /** Estado: categoría seleccionada para eliminar (null = sin selección) */
  const [deleteCat, setDeleteCat]   = useState(null)
  /** Estado: indica si se está guardando */
  const [saving, setSaving]         = useState(false)

  /** Hook de formulario con validación (react-hook-form) */
  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  /** Abre el modal en modo creación, reseteando el formulario vacío */
  const openCreate = () => { setEditCat(null); reset({ name: '', description: '' }); setFormOpen(true) }

  /** Abre el modal en modo edición, precargando los datos de la categoría */
  const openEdit   = (cat) => { setEditCat(cat); reset({ name: cat.name, description: cat.description ?? '' }); setFormOpen(true) }

  /**
   * Envía el formulario de creación o edición de categoría.
   * Según el modo (crear/editar), llama al servicio correspondiente
   * y refresca la lista al completar.
   * @param {Object} data - Datos del formulario { name, description }
   */
  const onSubmit = async (data) => {
    setSaving(true)
    try {
      if (editCat) {
        await updateCategory(editCat.id, data)
        toast.success('Categoría actualizada')
      } else {
        await createCategory(data)
        toast.success('Categoría creada')
      }
      setFormOpen(false)
      onRefresh()
    } catch (err) {
      toast.error(err.message ?? 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  /**
   * Elimina la categoría seleccionada.
   * Puede fallar si hay productos asignados a ella.
   */
  const handleDelete = async () => {
    try {
      await deleteCategory(deleteCat.id)
      toast.success('Categoría eliminada')
      setDeleteCat(null)
      onRefresh()
    } catch (err) {
      toast.error(err.message ?? 'No se puede eliminar (hay productos asignados)')
    }
  }

  return (
    <div className="space-y-4">
      {/* Botón para crear nueva categoría */}
      <div className="flex justify-end">
        <Button onClick={openCreate}><Plus className="w-4 h-4" /> Nueva categoría</Button>
      </div>

      {/* Tabla de categorías existentes */}
      <div className="overflow-x-auto rounded-xl border border-surface-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-800 text-surface-400 text-left">
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Descripción</th>
              <th className="px-4 py-3 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-800">
            {/* Mensaje cuando no hay categorías */}
            {categories.length === 0 && (
              <tr><td colSpan={3} className="text-center text-surface-600 py-10">Sin categorías</td></tr>
            )}
            {/* Filas de categorías con botones de editar y eliminar */}
            {categories.map((cat) => (
              <tr key={cat.id} className="hover:bg-surface-800/50 transition-colors">
                <td className="px-4 py-3 font-medium text-white">{cat.name}</td>
                <td className="px-4 py-3 text-surface-400">{cat.description || '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    {/* Botón editar categoría */}
                    <button onClick={() => openEdit(cat)} className="p-1.5 text-surface-500 hover:text-primary-400 hover:bg-primary-400/10 rounded-lg transition-colors">
                      <Pencil className="w-4 h-4" />
                    </button>
                    {/* Botón eliminar categoría */}
                    <button onClick={() => setDeleteCat(cat)} className="p-1.5 text-surface-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal de formulario para crear/editar categoría */}
      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editCat ? 'Editar categoría' : 'Nueva categoría'} size="sm">
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          {/* Campo nombre (obligatorio) */}
          <div>
            <label className="label-base">Nombre *</label>
            <input className="input-base" placeholder="Ej: Lácteos" {...register('name', { required: 'Requerido' })} />
            {errors.name && <p className="field-error">{errors.name.message}</p>}
          </div>
          {/* Campo descripción (opcional) */}
          <div>
            <label className="label-base">Descripción</label>
            <input className="input-base" placeholder="Opcional…" {...register('description')} />
          </div>
          {/* Botones de acción */}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setFormOpen(false)} className="flex-1">Cancelar</Button>
            <Button type="submit" loading={saving} className="flex-1">{editCat ? 'Guardar' : 'Crear'}</Button>
          </div>
        </form>
      </Modal>

      {/* Diálogo de confirmación para eliminar categoría */}
      <ConfirmDialog
        open={!!deleteCat}
        title="Eliminar categoría"
        message={`¿Eliminar "${deleteCat?.name}"? Los productos asignados quedarán sin categoría.`}
        confirmLabel="Eliminar"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteCat(null)}
      />
    </div>
  )
}
