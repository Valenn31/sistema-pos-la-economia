/**
 * ProductFormModal — Modal para crear y editar productos del inventario.
 *
 * Formulario completo con todos los campos del producto: nombre, SKU,
 * código de barras, categoría, unidad de medida, precios (costo/venta),
 * configuración de IVA, stock mínimo, vencimiento, estado activo/inactivo
 * y descripción opcional.
 *
 * @module stock/components/ProductFormModal
 */
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Modal } from '@/shared/components/Modal'
import { Button } from '@/shared/components/Button'
import { createProduct, updateProduct } from '../services/productService'

/** Unidades de medida disponibles para los productos */
const UNITS = ['unidad', 'kg', 'gramo', 'litro', 'ml', 'docena', 'caja', 'bolsa']

/** Tasas de IVA disponibles según normativa argentina */
const IVA_RATES = [0, 10.5, 21]

/**
 * Modal de formulario para crear o editar un producto.
 *
 * @param {Object} props
 * @param {boolean} props.open - Controla la visibilidad del modal
 * @param {Function} props.onClose - Callback al cerrar el modal
 * @param {Function} props.onSaved - Callback al guardar exitosamente
 * @param {Object|null} props.product - Producto a editar (null = modo creación)
 * @param {Array} props.categories - Lista de categorías disponibles para asignar
 * @returns {JSX.Element} Modal de formulario de producto
 */
export function ProductFormModal({ open, onClose, onSaved, product, categories }) {
  /** Flag: determina si estamos en modo edición (true) o creación (false) */
  const isEditing = !!product

  /** Hook de formulario con validación (react-hook-form) */
  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm()

  /**
   * Hook de efecto: resetea el formulario al abrir el modal.
   * En modo edición precarga los datos del producto existente.
   * En modo creación establece valores por defecto razonables.
   */
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
        expiry_date:     product.expiry_date     ?? '',
        is_active:       product.is_active       ?? true,
      } : {
        unit_of_measure: 'unidad',
        iva_rate: 21,
        iva_included: true,
        is_active: true,
        min_stock: 0,
        expiry_date: '',
      })
    }
  }, [open, product, reset])

  /**
   * Envía el formulario de creación o edición de producto.
   * @param {Object} data - Todos los campos del formulario
   */
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

  /** Valor actual del checkbox "IVA incluido en precio" (para texto dinámico) */
  const ivaIncluded = watch('iva_included')
  /** Valor actual del checkbox "Tiene vencimiento" (para mostrar/ocultar campo de fecha) */
  const hasExpiry   = watch('has_expiry')

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? 'Editar producto' : 'Nuevo producto'} size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">

        {/* Campo: Nombre del producto (obligatorio) */}
        <div>
          <label className="label-base">Nombre *</label>
          <input className="input-base" placeholder="Ej: Leche entera 1L" {...register('name', { required: 'Requerido' })} />
          {errors.name && <p className="field-error">{errors.name.message}</p>}
        </div>
        {/* Campos: SKU (código interno) y Código de barras (EAN) */}
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

        {/* Campos: Categoría y Unidad de medida */}
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

        {/* Campos: Precio de costo y Precio de venta */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label-base">Precio costo ($)</label>
            <input type="number" min="0" step="any" className="input-base" placeholder="0.00" {...register('price_cost')} />
          </div>
          <div>
            <label className="label-base">Precio venta ($) *</label>
            <input type="number" min="0" step="any" className="input-base" placeholder="0.00" {...register('price_sell', { required: 'Requerido' })} />
            {errors.price_sell && <p className="field-error">{errors.price_sell.message}</p>}
          </div>
        </div>

        {/* Campos: Tasa de IVA y checkbox de IVA incluido */}
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

        {/* Campos: Stock mínimo, checkbox de vencimiento y checkbox de activo */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label-base">Stock mínimo</label>
            <input type="number" min="0" step="any" className="input-base" placeholder="0" {...register('min_stock')} />
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

        {/* Campo condicional: Fecha de vencimiento (visible solo si has_expiry está marcado) */}
        {hasExpiry && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-base">Fecha de vencimiento</label>
              <input type="date" className="input-base" {...register('expiry_date')} />
            </div>
          </div>
        )}

        {/* Campo: Descripción opcional */}
        <div>
          <label className="label-base">Descripción</label>
          <textarea rows={2} className="input-base resize-none" placeholder="Descripción opcional…" {...register('description')} />
        </div>

        {/* Botones de acción: cancelar y guardar */}
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
