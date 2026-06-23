/**
 * AdjustmentModal — Ajuste manual de stock (ingreso o egreso).
 * Admite cantidades positivas (ingreso) y negativas (salida/merma).
 */
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Modal } from '@/shared/components/Modal'
import { Button } from '@/shared/components/Button'
import { useAuthStore } from '@/shared/store/authStore'
import { adjustStock } from '../services/movementService'

export function AdjustmentModal({ open, onClose, onSaved, product, locations, stockByLocation }) {
  const { profile } = useAuthStore()
  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm()

  useEffect(() => {
    if (open && locations.length) {
      reset({ location_id: locations[0].id, quantity: '', notes: '' })
    }
  }, [open, locations, reset])

  const locationId = watch('location_id')
  const currentQty = stockByLocation?.[locationId]?.quantity ?? 0

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
          <p className="text-surface-300 text-sm font-medium">{product.name}</p>

          <div>
            <label className="label-base">Ubicación</label>
            <select className="input-base" {...register('location_id', { required: true })}>
              {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
            <p className="text-xs text-surface-500 mt-1">
              Stock actual: <span className="text-white">{currentQty}</span>
            </p>
          </div>

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

          <div>
            <label className="label-base">Motivo *</label>
            <input
              className="input-base"
              placeholder="Ej: Reconteo físico, merma, vencimiento…"
              {...register('notes', { required: 'Ingresá el motivo del ajuste' })}
            />
            {errors.notes && <p className="field-error">{errors.notes.message}</p>}
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancelar</Button>
            <Button type="submit" loading={isSubmitting} className="flex-1">Guardar ajuste</Button>
          </div>
        </form>
      )}
    </Modal>
  )
}
