/**
 * CategoriesTab — ABM de categorías de producto.
 */
import { useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Button } from '@/shared/components/Button'
import { Modal } from '@/shared/components/Modal'
import { ConfirmDialog } from '@/shared/components/ConfirmDialog'
import { createCategory, updateCategory, deleteCategory } from '../services/productService'

export function CategoriesTab({ categories, onRefresh }) {
  const [formOpen, setFormOpen]     = useState(false)
  const [editCat, setEditCat]       = useState(null)
  const [deleteCat, setDeleteCat]   = useState(null)
  const [saving, setSaving]         = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  const openCreate = () => { setEditCat(null); reset({ name: '', description: '' }); setFormOpen(true) }
  const openEdit   = (cat) => { setEditCat(cat); reset({ name: cat.name, description: cat.description ?? '' }); setFormOpen(true) }

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
      <div className="flex justify-end">
        <Button onClick={openCreate}><Plus className="w-4 h-4" /> Nueva categoría</Button>
      </div>

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
            {categories.length === 0 && (
              <tr><td colSpan={3} className="text-center text-surface-600 py-10">Sin categorías</td></tr>
            )}
            {categories.map((cat) => (
              <tr key={cat.id} className="hover:bg-surface-800/50 transition-colors">
                <td className="px-4 py-3 font-medium text-white">{cat.name}</td>
                <td className="px-4 py-3 text-surface-400">{cat.description || '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => openEdit(cat)} className="p-1.5 text-surface-500 hover:text-primary-400 hover:bg-primary-400/10 rounded-lg transition-colors">
                      <Pencil className="w-4 h-4" />
                    </button>
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

      {/* Form modal */}
      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editCat ? 'Editar categoría' : 'Nueva categoría'} size="sm">
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className="label-base">Nombre *</label>
            <input className="input-base" placeholder="Ej: Lácteos" {...register('name', { required: 'Requerido' })} />
            {errors.name && <p className="field-error">{errors.name.message}</p>}
          </div>
          <div>
            <label className="label-base">Descripción</label>
            <input className="input-base" placeholder="Opcional…" {...register('description')} />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setFormOpen(false)} className="flex-1">Cancelar</Button>
            <Button type="submit" loading={saving} className="flex-1">{editCat ? 'Guardar' : 'Crear'}</Button>
          </div>
        </form>
      </Modal>

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
