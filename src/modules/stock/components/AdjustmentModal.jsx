/**
 * AdjustmentModal — Modal para ajuste manual de stock.
 *
 * Permite realizar ajustes de inventario (ingreso o egreso) sobre un
 * producto en una ubicación específica. Admite cantidades positivas
 * (ingreso/reconteo) y negativas (merma/corrección/vencimiento).
 * Requiere un motivo obligatorio para trazabilidad.
 *
 * @module stock/components/AdjustmentModal
 */
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Modal } from '@/shared/components/Modal'
import { Button } from '@/shared/components/Button'
import { useAuthStore } from '@/shared/store/authStore'
import { adjustStock } from '../services/movementService'

/**
 * Modal de ajuste manual de stock para un producto específico.
 *
 * @param {Object} props
 * @param {boolean} props.open - Controla la visibilidad del modal
 * @param {Function} props.onClose - Callback al cerrar el modal
 * @param {Function} props.onSaved - Callback al guardar exitosamente el ajuste
 * @param {Object} props.product - Producto sobre el cual se ajusta el stock
 * @param {Array} props.locations - Lista de ubicaciones disponibles (depósito, estantería, etc.)
 * @param {Object} props.stockByLocation - Mapa { locationId: { quantity } } con stock actual por ubicación
 * @returns {JSX.Element} Modal de ajuste de stock
 */
export function AdjustmentModal({ open, onClose, onSaved, product, locations, stockByLocation }) {
  /** Perfil del usuario autenticado (se usa para registrar quién hizo el ajuste) */
  const { profile } = useAuthStore()

  /** Hook de formulario con validación (react-hook-form) */
  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm()

  /**
   * Hook de efecto: resetea el formulario al abrir el modal,
   * preseleccionando la primera ubicación disponible.
   */
  useEffect(() => {
    if (open && locations.length) {
      reset({ location_id: locations[0].id, quantity: '', notes: '' })
    }
  }, [open, locations, reset])

  /** ID de la ubicación seleccionada actualmente en el formulario */
  const locationId = watch('location_id')
  /** Cantidad de stock actual en la ubicación seleccionada */
  const currentQty = stockByLocation?.[locationId]?.quantity ?? 0

  /**
   * Procesa el envío del formulario de ajuste.
   * Valida que la cantidad sea distinta de 0, luego llama al servicio
   * para registrar el movimiento de ajuste en la base de datos.
   * @param {Object} data - Datos del formulario { location_id, quantity, notes }
   */
  const onSubmit = async (data) => {
    const qty = parseFloat(data.quantity)
    if (isNaN(qty) || qty === 0) return toast.error('Ingresá una cantidad distinta de 0')

    try {
      await adjustStock({
        productId:  product.id,
        locationId: parseInt(data.location_id),
        quantity:   qty,
        userId:     profile.id,
        notes:      data.notes || null,
      })
      toast.success(`Stock ajustado (${qty > 0 ? '+' : ''}${qty})`)
      onSaved()
      onClose()
    } catch (err) {
      toast.error(err.message ?? 'Error al ajustar stock')
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Ajuste de stock" size="sm">
      {product && (
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          {/* Nombre del producto que se está ajustando */}
          <p className="text-surface-300 text-sm font-medium">{product.name}</p>

          {/* Selector de ubicación + indicador de stock actual */}
          <div>
            <label className="label-base">Ubicación</label>
            <select className="input-base" {...register('location_id', { required: true })}>
              {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
            <p className="text-xs text-surface-500 mt-1">
              Stock actual: <span className="text-white">{currentQty}</span>
            </p>
          </div>

          {/* Campo de cantidad a ajustar (positivo = ingreso, negativo = merma) */}
          <div>
            <label className="label-base">Cantidad a agregar / restar *</label>
            <input
              type="number" step="any"
              className="input-base"
              placeholder="Ej: +10 o -3"
              {...register('quantity', { required: 'Requerido', validate: (v) => v !== '0' || 'Debe ser distinto de 0' })}
            />
            {errors.quantity && <p className="field-error">{errors.quantity.message}</p>}
            <p className="text-xs text-surface-500 mt-1">
              Positivo = ingreso &nbsp;·&nbsp; Negativo = merma / corrección
            </p>
          </div>

          {/* Campo de motivo del ajuste (obligatorio para trazabilidad) */}
          <div>
            <label className="label-base">Motivo *</label>
            <input
              className="input-base"
              placeholder="Ej: Reconteo físico, merma, vencimiento…"
              {...register('notes', { required: 'Ingresá el motivo del ajuste' })}
            />
            {errors.notes && <p className="field-error">{errors.notes.message}</p>}
          </div>

          {/* Botones de acción: cancelar y guardar */}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancelar</Button>
            <Button type="submit" loading={isSubmitting} className="flex-1">Guardar ajuste</Button>
          </div>
        </form>
      )}
    </Modal>
  )
}
