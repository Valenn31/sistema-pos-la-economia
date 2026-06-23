/**
 * DiscountFormModal — Crear / editar reglas de descuento.
 * Los campos visibles cambian según el tipo seleccionado.
 */
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Modal }   from '@/shared/components/Modal'
import { Button }  from '@/shared/components/Button'
import { getCategories } from '@/modules/stock/services/productService'
import { getProducts }   from '@/modules/stock/services/productService'

const TYPE_OPTIONS = [
  { value: 'product',          label: '% sobre producto específico' },
  { value: 'category',         label: '% sobre categoría' },
  { value: 'quantity_rule',    label: 'Regla de cantidad (ej: 3×2)' },
  { value: 'percentage_total', label: '% sobre total de la venta' },
  { value: 'fixed_total',      label: 'Monto fijo sobre el total' },
]

export function DiscountFormModal({ open, onClose, onSave, initialData }) {
  const isEditing = !!initialData
  const [saving,     setSaving]     = useState(false)
  const [categories, setCategories] = useState([])
  const [products,   setProducts]   = useState([])

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm({
    defaultValues: {
      name: '', type: 'product', value: '', is_active: true,
      product_id: '', category_id: '', min_quantity: '', free_quantity: '',
    },
  })

  const selectedType = watch('type')

  useEffect(() => {
    if (!open) return
    getCategories().then(setCategories).catch(() => {})
    getProducts({ activeOnly: true }).then(setProducts).catch(() => {})
  }, [open])

  useEffect(() => {
    if (open) {
      reset(initialData
        ? {
            name:          initialData.name,
            type:          initialData.type,
            value:         initialData.value          ?? '',
            product_id:    initialData.product_id     ?? '',
            category_id:   initialData.category_id    ?? '',
            min_quantity:  initialData.min_quantity   ?? '',
            free_quantity: initialData.free_quantity  ?? '',
            is_active:     initialData.is_active,
          }
        : { name: '', type: 'product', value: '', is_active: true,
            product_id: '', category_id: '', min_quantity: '', free_quantity: '' }
      )
    }
  }, [open, initialData, reset])

  const onSubmit = async (data) => {
    setSaving(true)
    try { await onSave(data) } finally { setSaving(false) }
  }

  const needsProduct  = ['product', 'quantity_rule'].includes(selectedType)
  const needsCategory = selectedType === 'category'
  const needsValue    = selectedType !== 'quantity_rule'
  const needsQtyRule  = selectedType === 'quantity_rule'

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? 'Editar descuento' : 'Nuevo descuento'} size="md">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

        {/* Nombre */}
        <div>
          <label className="label-base">Nombre <span className="text-red-400">*</span></label>
          <input className="input-base" placeholder="Ej: 3×2 en bebidas, 10% en carnes…"
            {...register('name', { required: 'Requerido' })} />
          {errors.name && <p className="field-error">{errors.name.message}</p>}
        </div>

        {/* Tipo */}
        <div>
          <label className="label-base">Tipo <span className="text-red-400">*</span></label>
          <select className="input-base" {...register('type')}>
            {TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Producto (para product y quantity_rule) */}
        {needsProduct && (
          <div>
            <label className="label-base">Producto <span className="text-red-400">*</span></label>
            <select className="input-base"
              {...register('product_id', { required: 'Seleccioná un producto' })}>
              <option value="">— Seleccionar —</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}{p.sku ? ` (${p.sku})` : ''}
                </option>
              ))}
            </select>
            {errors.product_id && <p className="field-error">{errors.product_id.message}</p>}
          </div>
        )}

        {/* Categoría */}
        {needsCategory && (
          <div>
            <label className="label-base">Categoría <span className="text-red-400">*</span></label>
            <select className="input-base"
              {...register('category_id', { required: 'Seleccioná una categoría' })}>
              <option value="">— Seleccionar —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {errors.category_id && <p className="field-error">{errors.category_id.message}</p>}
          </div>
        )}

        {/* Valor (%, $ o vacío para qty_rule) */}
        {needsValue && (
          <div>
            <label className="label-base">
              {selectedType === 'fixed_total' ? 'Monto a descontar ($)' : 'Descuento (%)'}
              <span className="text-red-400"> *</span>
            </label>
            <input type="number" min="0" step="any" className="input-base"
              placeholder={selectedType === 'fixed_total' ? '500' : '10'}
              {...register('value', {
                required: 'Requerido',
                min: { value: 0.01, message: 'Debe ser mayor a 0' },
                ...(selectedType !== 'fixed_total'
                  ? { max: { value: 100, message: 'Máximo 100%' } }
                  : {}),
              })} />
            {errors.value && <p className="field-error">{errors.value.message}</p>}
          </div>
        )}

        {/* Regla de cantidad */}
        {needsQtyRule && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-base">Cantidad mínima <span className="text-red-400">*</span></label>
              <input type="number" min="1" step="1" className="input-base" placeholder="3"
                {...register('min_quantity', { required: 'Requerido', min: { value: 1, message: '>0' } })} />
              {errors.min_quantity && <p className="field-error">{errors.min_quantity.message}</p>}
            </div>
            <div>
              <label className="label-base">Unidades gratis <span className="text-red-400">*</span></label>
              <input type="number" min="1" step="1" className="input-base" placeholder="1"
                {...register('free_quantity', { required: 'Requerido', min: { value: 1, message: '>0' } })} />
              {errors.free_quantity && <p className="field-error">{errors.free_quantity.message}</p>}
            </div>
          </div>
        )}

        {/* Activo */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" className="checkbox-base" {...register('is_active')} />
          <span className="text-sm text-surface-300">Activo</span>
        </label>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={saving}>{isEditing ? 'Guardar' : 'Crear'}</Button>
        </div>
      </form>
    </Modal>
  )
}
