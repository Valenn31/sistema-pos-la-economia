/**
 * PurchaseOrderFormModal — Crear Orden de Compra (directa o desde Nota).
 */
import { useState, useEffect } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { Plus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { Modal } from '@/shared/components/Modal'
import { Button } from '@/shared/components/Button'
import { useAuthStore } from '@/shared/store/authStore'
import { createPurchaseOrder } from '../services/purchaseService'
import { getProducts } from '@/modules/stock/services/productService'
import { formatCurrency } from '@/shared/utils/formatters'

export function PurchaseOrderFormModal({ open, onClose, onSaved, fromNote, suppliers }) {
  const { profile } = useAuthStore()
  const [products, setProducts] = useState([])

  const { register, control, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm()
  const { fields, append, remove } = useFieldArray({ control, name: 'items' })

  useEffect(() => {
    getProducts({ activeOnly: true }).then(setProducts).catch(() => {})
  }, [])

  useEffect(() => {
    if (open) {
      if (fromNote) {
        reset({
          supplier_id:   fromNote.supplier_id ?? '',
          expected_date: '',
          notes:         fromNote.notes ?? '',
          items: (fromNote.items ?? []).map((i) => ({
            product_id:       i.product_id,
            quantity_ordered: i.quantity_requested,
            unit_price:       i.unit_price ?? '',
          })),
        })
      } else {
        reset({ supplier_id: '', expected_date: '', notes: '', items: [] })
      }
    }
  }, [open, fromNote, reset])

  const items = watch('items') ?? []
  const total = items.reduce((s, i) => {
    const qty = parseFloat(i.quantity_ordered) || 0
    const price = parseFloat(i.unit_price) || 0
    return s + qty * price
  }, 0)

  const onSubmit = async (data) => {
    if (!data.items.length) return toast.error('Agregá al menos un producto')
    try {
      await createPurchaseOrder({
        supplierId:    data.supplier_id,
        noteId:        fromNote?.id ?? null,
        items:         data.items,
        totalAmount:   total,
        expectedDate:  data.expected_date || null,
        notes:         data.notes || null,
        createdBy:     profile.id,
      })
      toast.success('Orden de compra creada')
      onSaved()
      onClose()
    } catch (err) {
      toast.error(err.message ?? 'Error al crear OC')
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={fromNote ? `OC desde Nota #${fromNote.note_number}` : 'Nueva Orden de Compra'}
      size="xl"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">

        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <label className="label-base">Proveedor *</label>
            <select className="input-base" disabled={!!fromNote} {...register('supplier_id', { required: 'Requerido' })}>
              <option value="">Seleccionar…</option>
              {suppliers.filter((s) => s.is_active).map((s) => (
                <option key={s.id} value={s.id}>{s.razon_social}</option>
              ))}
            </select>
            {errors.supplier_id && <p className="field-error">{errors.supplier_id.message}</p>}
          </div>
          <div>
            <label className="label-base">Fecha de entrega esperada</label>
            <input type="date" className="input-base" {...register('expected_date')} />
          </div>
        </div>

        {/* Ítems */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="label-base mb-0">Ítems</label>
            <Button
              type="button" size="sm" variant="secondary"
              onClick={() => append({ product_id: '', quantity_ordered: 1, unit_price: '' })}
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
            <div className="grid grid-cols-[1fr_80px_100px_80px_32px] gap-2 text-xs text-surface-500 px-1">
              <span>Producto</span><span>Cant.</span><span>Precio u.</span><span>Subtotal</span><span></span>
            </div>
            {fields.map((field, idx) => {
              const qty = parseFloat(watch(`items.${idx}.quantity_ordered`)) || 0
              const price = parseFloat(watch(`items.${idx}.unit_price`)) || 0
              return (
                <div key={field.id} className="grid grid-cols-[1fr_80px_100px_80px_32px] gap-2 items-center">
                  <select className="input-base" {...register(`items.${idx}.product_id`, { required: true })}>
                    <option value="">Seleccionar…</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} {p.sku ? `(${p.sku})` : ''}</option>
                    ))}
                  </select>
                  <input
                    type="number" min="0.001" step="0.001"
                    className="input-base"
                    placeholder="Cant."
                    {...register(`items.${idx}.quantity_ordered`, { required: true })}
                  />
                  <input
                    type="number" min="0" step="0.01"
                    className="input-base"
                    placeholder="$"
                    {...register(`items.${idx}.unit_price`, { required: 'Req.' })}
                  />
                  <span className="text-sm text-surface-400 text-right">{formatCurrency(qty * price)}</span>
                  <button
                    type="button" onClick={() => remove(idx)}
                    className="p-1.5 text-surface-500 hover:text-red-400 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )
            })}
          </div>

          {total > 0 && (
            <p className="text-right text-sm text-surface-400 mt-3">
              Total OC: <span className="text-white font-bold text-base">{formatCurrency(total)}</span>
            </p>
          )}
        </div>

        <div>
          <label className="label-base">Observaciones</label>
          <input className="input-base" placeholder="Opcional…" {...register('notes')} />
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancelar</Button>
          <Button type="submit" loading={isSubmitting} className="flex-1">Emitir orden de compra</Button>
        </div>
      </form>
    </Modal>
  )
}
