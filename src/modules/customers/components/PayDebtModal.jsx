/**
 * PayDebtModal — Modal para registrar un abono de deuda de un cliente.
 * Muestra el saldo actual del cliente y permite ingresar el monto a pagar,
 * el método de pago y observaciones opcionales.
 * Reduce current_balance via increment_customer_balance (valor negativo).
 *
 * @param {object} props
 * @param {boolean} props.open - Controla si el modal está visible
 * @param {Function} props.onClose - Callback para cerrar el modal
 * @param {Function} props.onSave - Callback que recibe { amount, method, notes } al confirmar
 * @param {object|null} props.customer - Cliente al que se le registra el pago
 */
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Modal }  from '@/shared/components/Modal'
import { Button } from '@/shared/components/Button'
import { formatCurrency } from '@/shared/utils/formatters'

/** Métodos de pago disponibles para abonar deuda */
const METHODS = [
  { value: 'efectivo',      label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'debito',        label: 'Débito' },
  { value: 'qr',            label: 'QR / MP' },
]

export function PayDebtModal({ open, onClose, onSave, customer }) {
  // Indicador de guardado en curso para deshabilitar el botón
  const [saving, setSaving] = useState(false)

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm({
    defaultValues: { amount: '', method: 'efectivo', notes: '' },
  })

  // Observa el monto ingresado para calcular el saldo restante en tiempo real
  const amount = parseFloat(watch('amount')) || 0
  // Monto máximo permitido = saldo actual del cliente
  const maxAmount = customer?.current_balance ?? 0

  /**
   * Procesa el envío del formulario de pago.
   * Convierte el monto a número y llama al callback onSave.
   */
  const onSubmit = async (data) => {
    setSaving(true)
    try {
      await onSave({ ...data, amount: parseFloat(data.amount) })
      reset()
    } finally {
      setSaving(false)
    }
  }

  // No renderizar nada si no hay cliente seleccionado
  if (!customer) return null

  return (
    <Modal open={open} onClose={onClose} title="Registrar pago de deuda" size="sm">
      <div className="space-y-4 p-5">

        {/* Tarjeta informativa: nombre del cliente, saldo actual y límite de crédito */}
        <div className="bg-surface-800 rounded-xl p-4 space-y-1">
          <p className="text-white font-semibold">{customer.full_name}</p>
          <div className="flex items-center justify-between">
            <span className="text-sm text-surface-400">Saldo actual</span>
            <span className={`text-lg font-bold ${maxAmount > 0 ? 'text-red-400' : 'text-primary-400'}`}>
              {formatCurrency(maxAmount)}
            </span>
          </div>
          {/* Mostrar límite de crédito solo si está configurado */}
          {customer.credit_limit > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-surface-500">Límite de crédito</span>
              <span className="text-xs text-surface-400">{formatCurrency(customer.credit_limit)}</span>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Campo: Monto a abonar (validado entre 0.01 y el saldo actual) */}
          <div>
            <label className="label-base">Monto a abonar ($) <span className="text-red-400">*</span></label>
            <input
              type="number" min="0" step="any"
              className="input-base text-lg"
              placeholder="0.00"
              {...register('amount', {
                required: 'Requerido',
                min: { value: 0.01, message: 'Debe ser mayor a 0' },
                max: { value: maxAmount, message: `Máximo ${formatCurrency(maxAmount)}` },
              })}
            />
            {errors.amount && <p className="field-error">{errors.amount.message}</p>}
            {/* Preview del saldo restante después del pago */}
            {amount > 0 && (
              <p className="text-xs text-surface-500 mt-1">
                Saldo restante: {formatCurrency(Math.max(0, maxAmount - amount))}
              </p>
            )}
          </div>

          {/* Campo: Selector de método de pago */}
          <div>
            <label className="label-base">Método de pago</label>
            <select className="input-base" {...register('method')}>
              {METHODS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          {/* Campo: Observaciones opcionales sobre el pago */}
          <div>
            <label className="label-base">Observaciones</label>
            <input className="input-base" placeholder="Opcional"
              {...register('notes')} />
          </div>

          {/* Botones de acción: Cancelar y Registrar pago */}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button type="submit" loading={saving} disabled={maxAmount <= 0}>
              Registrar pago
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}
