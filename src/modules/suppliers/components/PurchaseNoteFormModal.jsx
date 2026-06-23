/**
 * PurchaseNoteFormModal — Crear y editar Notas de Pedido.
 * Usada por Repositor (y Admin) para solicitar mercadería.
 */
import { useState, useEffect } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { Plus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { Modal } from '@/shared/components/Modal'
import { Button } from '@/shared/components/Button'
import { useAuthStore } from '@/shared/store/authStore'
import { createPurchaseNote, updatePurchaseNote } from '../services/purchaseService'
import { getProducts } from '@/modules/stock/services/productService'
import { formatCurrency } from '@/shared/utils/formatters'

export function PurchaseNoteFormModal({ open, onClose, onSaved, note, suppliers }) {
  const { profile } = useAuthStore()
  const isEditing = !!note

  const [products, setProducts] = useState([])
  const { register, control, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { supplier_id: '', notes: '', items: [] }
  })
  const { fields, append, remove } = useFieldArray({ control, name: 'items' })

  useEffect(() => {
    getProducts({ activeOnly: true }).then(setProducts).catch(() => {})
  }, [])

  useEffect(() => {
    if (open) {
      if (note) {
        reset({
          supplier_id: note.supplier_id ?? '',
          notes:       note.notes ?? '',
          items: (note.items ?? []).map((i) => ({
            product_id:         i.product_id,
            quantity_requested: i.quantity_requested,
            unit_price:         i.unit_price ?? '',
          })),
        })
      } else {
        reset({ supplier_id: '', notes: '', items: [] })
      }
    }
  }, [open, note, reset])

  const items = watch('items')
  const total = items.reduce((s, i) => {
    const qty = parseFloat(i.quantity_requested) || 0
    const price = parseFloat(i.unit_price) || 0
    return s + qty * price
  }, 0)

  const onSubmit = async (data) => {
    if (!data.items.length) return toast.error('Agregá al menos un producto')
    try {
      if (isEditing) {
        await updatePurchaseNote(note.id, { ...data, supplierId: data.supplier_id })
        toast.success('Nota actualizada')
      } else {
        await createPurchaseNote({ ...data, supplierId: data.supplier_id, createdBy: profile.id })
        toast.success('Nota de pedido creada')
      }
      onSaved()
      onClose()
    } catch (err) {
      toast.error(err.message ?? 'Error al guardar')
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? 'Editar nota de pedido' : 'Nueva nota de pedido'} size="xl">
      <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">

        {/* Proveedor + Notas */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label-base">Proveedor *</label>
            <select className="input-base" {...register('supplier_id', { required: 'Requerido' })}>
              <option value="">Seleccionar…</option>
              {suppliers.filter((s) => s.is_active).map((s) => (
                <option key={s.id} value={s.id}>{s.razon_social}</option>
              ))}
            </select>
            {errors.supplier_id && <p className="field-error">{errors.supplier_id.message}</p>}
          </div>
          <div>
            <label className="label-base">Observaciones</label>
            <input className="input-base" placeholder="Urgente, entrega en turno…" {...register('notes')} />
          </div>
        </div>

        {/* Ítems */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="label-base mb-0">Productos</label>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => append({ product_id: '', quantity_requested: 1, unit_price: '' })}
            >
              <Plus className="w-3.5 h-3.5" /> Agregar línea
            </Button>
          </div>

          {fields.length === 0 && (
            <p className="text-center text-surface-600 text-sm py-6 border border-dashed border-surface-700 rounded-xl">
              Agregá productos con el botón de arriba
            </p>
          )}

          <div className="space-y-2">
            {fields.map((field, idx) => (
              <div key={field.id} className="flex gap-2 items-start">
                <select
                  className="input-base flex-1"
                  {...register(`items.${idx}.product_id`, { required: true })}
                >
                  <option value="">Seleccionar producto…</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} {p.sku ? `(${p.sku})` : ''}</option>
                  ))}
                </select>
                <input
                  type="number" min="0" step="any"
                  className="input-base w-24"
                  placeholder="Cant."
                  {...register(`items.${idx}.quantity_requested`, { required: true, min: 0.001 })}
                />
                <input
                  type="number" min="0" step="any"
                  className="input-base w-28"
                  placeholder="Precio u."
                  {...register(`items.${idx}.unit_price`)}
                />
                <button
                  type="button"
                  onClick={() => remove(idx)}
                  className="p-2 text-surface-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors flex-shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {fields.length > 0 && total > 0 && (
            <p className="text-right text-sm text-surface-400 mt-2">
              Total estimado: <span className="text-white font-semibold">{formatCurrency(total)}</span>
            </p>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancelar</Button>
          <Button type="submit" loading={isSubmitting} className="flex-1">
            {isEditing ? 'Guardar cambios' : 'Crear nota'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
