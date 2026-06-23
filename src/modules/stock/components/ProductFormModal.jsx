/**
 * ProductFormModal — Modal para crear y editar productos.
 */
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Modal } from '@/shared/components/Modal'
import { Button } from '@/shared/components/Button'
import { createProduct, updateProduct } from '../services/productService'

const UNITS = ['unidad', 'kg', 'gramo', 'litro', 'ml', 'docena', 'caja', 'bolsa']
const IVA_RATES = [0, 10.5, 21]

export function ProductFormModal({ open, onClose, onSaved, product, categories }) {
  const isEditing = !!product
  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm()

  useEffect(() => {
    if (open) {
      reset(product ? {
        sku:             product.sku             ?? '',
        barcode:         product.barcode         ?? '',
        name:            product.name            ?? '',
        description:     product.description     ?? '',
        category_id:     product.category_id     ?? '',
        unit_of_measure: product.unit_of_measure ?? 'unidad',
        price_cost:      product.price_cost      ?? '',
        price_sell:      product.price_sell      ?? '',
        iva_rate:        product.iva_rate        ?? 21,
        iva_included:    product.iva_included    ?? true,
        min_stock:       product.min_stock       ?? 0,
        has_expiry:      product.has_expiry      ?? false,
        is_active:       product.is_active       ?? true,
      } : {
        unit_of_measure: 'unidad',
        iva_rate: 21,
        iva_included: true,
        is_active: true,
        min_stock: 0,
      })
    }
  }, [open, product, reset])

  const onSubmit = async (data) => {
    try {
      if (isEditing) {
        await updateProduct(product.id, data)
        toast.success('Producto actualizado')
      } else {
        await createProduct(data)
        toast.success('Producto creado')
      }
      onSaved()
      onClose()
    } catch (err) {
      toast.error(err.message ?? 'Error al guardar')
    }
  }

  const ivaIncluded = watch('iva_included')

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? 'Editar producto' : 'Nuevo producto'} size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">

        {/* Nombre + SKU + Código de barras */}
        <div>
          <label className="label-base">Nombre *</label>
          <input className="input-base" placeholder="Ej: Leche entera 1L" {...register('name', { required: 'Requerido' })} />
          {errors.name && <p className="field-error">{errors.name.message}</p>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label-base">SKU (código interno)</label>
            <input className="input-base" placeholder="Ej: LAC-001" {...register('sku')} />
          </div>
          <div>
            <label className="label-base">Código de barras (EAN)</label>
            <input className="input-base" placeholder="7790001234567" {...register('barcode')} />
          </div>
        </div>

        {/* Categoría + Unidad */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label-base">Categoría</label>
            <select className="input-base" {...register('category_id')}>
              <option value="">Sin categoría</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label-base">Unidad de medida *</label>
            <select className="input-base" {...register('unit_of_measure', { required: true })}>
              {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>

        {/* Precios */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label-base">Precio costo ($)</label>
            <input type="number" min="0" step="0.01" className="input-base" placeholder="0.00" {...register('price_cost')} />
          </div>
          <div>
            <label className="label-base">Precio venta ($) *</label>
            <input type="number" min="0" step="0.01" className="input-base" placeholder="0.00" {...register('price_sell', { required: 'Requerido' })} />
            {errors.price_sell && <p className="field-error">{errors.price_sell.message}</p>}
          </div>
        </div>

        {/* IVA */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label-base">Tasa IVA (%)</label>
            <select className="input-base" {...register('iva_rate')}>
              {IVA_RATES.map((r) => <option key={r} value={r}>{r}%</option>)}
            </select>
          </div>
          <div className="flex items-end pb-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="checkbox-base" {...register('iva_included')} />
              <span className="text-sm text-surface-300">
                IVA {ivaIncluded ? 'incluido en precio' : 'se suma al precio'}
              </span>
            </label>
          </div>
        </div>

        {/* Stock mínimo + opciones */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label-base">Stock mínimo</label>
            <input type="number" min="0" step="0.001" className="input-base" placeholder="0" {...register('min_stock')} />
          </div>
          <div className="flex items-end pb-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="checkbox-base" {...register('has_expiry')} />
              <span className="text-sm text-surface-300">Tiene vencimiento</span>
            </label>
          </div>
          <div className="flex items-end pb-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="checkbox-base" {...register('is_active')} />
              <span className="text-sm text-surface-300">Activo</span>
            </label>
          </div>
        </div>

        {/* Descripción */}
        <div>
          <label className="label-base">Descripción</label>
          <textarea rows={2} className="input-base resize-none" placeholder="Descripción opcional…" {...register('description')} />
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancelar</Button>
          <Button type="submit" loading={isSubmitting} className="flex-1">
            {isEditing ? 'Guardar cambios' : 'Crear producto'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
