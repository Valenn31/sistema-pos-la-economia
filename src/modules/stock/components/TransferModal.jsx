/**
 * TransferModal — Modal para trasladar stock entre ubicaciones.
 * Usado principalmente para mover de Depósito → En Estantería.
 */
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { Modal } from '@/shared/components/Modal'
import { Button } from '@/shared/components/Button'
import { useAuthStore } from '@/shared/store/authStore'
import { transferStock } from '../services/movementService'

export function TransferModal({ open, onClose, onSaved, product, locations, stockByLocation }) {
  const { profile } = useAuthStore()
  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm()

  useEffect(() => {
    if (open && locations.length >= 2) {
      reset({ from_location_id: locations[0].id, to_location_id: locations[1].id, quantity: '', notes: '' })
    }
  }, [open, locations, reset])

  const fromId = watch('from_location_id')
  const fromStock = stockByLocation?.[fromId]?.quantity ?? 0

  const onSubmit = async (data) => {
    const qty = parseFloat(data.quantity)
    if (isNaN(qty) || qty <= 0) return toast.error('Cantidad inválida')
    if (qty > fromStock) return toast.error(`Stock insuficiente en origen (disponible: ${fromStock})`)
    if (data.from_location_id === data.to_location_id) return toast.error('Origen y destino deben ser distintos')

    try {
      await transferStock({
        productId:       product.id,
        fromLocationId:  parseInt(data.from_location_id),
        toLocationId:    parseInt(data.to_location_id),
        quantity:        qty,
        userId:          profile.id,
        notes:           data.notes || null,
      })
      toast.success('Traslado registrado')
      onSaved()
      onClose()
    } catch (err) {
      toast.error(err.message ?? 'Error al trasladar')
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Trasladar stock" size="sm">
      {product && (
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <p className="text-surface-300 text-sm font-medium">{product.name}</p>

          {/* Origen → Destino */}
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <label className="label-base">Desde</label>
              <select className="input-base" {...register('from_location_id', { required: true })}>
                {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
              <p className="text-xs text-surface-500 mt-1">Disponible: <span className="text-white">{fromStock}</span></p>
            </div>
            <ArrowRight className="w-4 h-4 text-surface-500 mt-4 flex-shrink-0" />
            <div className="flex-1">
              <label className="label-base">Hacia</label>
              <select className="input-base" {...register('to_location_id', { required: true })}>
                {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
          </div>

          {/* Cantidad */}
          <div>
            <label className="label-base">Cantidad *</label>
            <input
              type="number" min="0" step="any"
              className="input-base"
              placeholder="0"
              {...register('quantity', { required: 'Requerido', min: { value: 0.001, message: 'Mayor a 0' } })}
            />
            {errors.quantity && <p className="field-error">{errors.quantity.message}</p>}
          </div>

          {/* Notas */}
          <div>
            <label className="label-base">Notas (opcional)</label>
            <input className="input-base" placeholder="Motivo del traslado…" {...register('notes')} />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancelar</Button>
            <Button type="submit" loading={isSubmitting} className="flex-1">Trasladar</Button>
          </div>
        </form>
      )}
    </Modal>
  )
}
