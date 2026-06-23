/**
 * PayDebtModal — Registrar abono de deuda de un cliente.
 * Reduce current_balance via increment_customer_balance(negativo).
 */
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Modal }  from '@/shared/components/Modal'
import { Button } from '@/shared/components/Button'
import { formatCurrency } from '@/shared/utils/formatters'

const METHODS = [
  { value: 'efectivo',      label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'debito',        label: 'Débito' },
  { value: 'qr',            label: 'QR / MP' },
]

export function PayDebtModal({ open, onClose, onSave, customer }) {
  const [saving, setSaving] = useState(false)

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm({
    defaultValues: { amount: '', method: 'efectivo', notes: '' },
  })

  const amount = parseFloat(watch('amount')) || 0
  const maxAmount = customer?.current_balance ?? 0

  const onSubmit = async (data) => {
    setSaving(true)
    try {
      await onSave({ ...data, amount: parseFloat(data.amount) })
      reset()
    } finally {
      setSaving(false)
    }
  }

  if (!customer) return null

  return (
    <Modal open={open} onClose={onClose} title="Registrar pago de deuda" size="sm">
      <div className="space-y-4 p-5">

        {/* Info del cliente */}
        <div className="bg-surface-800 rounded-xl p-4 space-y-1">
          <p className="text-white font-semibold">{customer.full_name}</p>
          <div className="flex items-center justify-between">
            <span className="text-sm text-surface-400">Saldo actual</span>
            <span className={`text-lg font-bold ${maxAmount > 0 ? 'text-red-400' : 'text-primary-400'}`}>
              {formatCurrency(maxAmount)}
            </span>
          </div>
          {customer.credit_limit > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-surface-500">Límite de crédito</span>
              <span className="text-xs text-surface-400">{formatCurrency(customer.credit_limit)}</span>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Monto */}
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
            {amount > 0 && (
              <p className="text-xs text-surface-500 mt-1">
                Saldo restante: {formatCurrency(Math.max(0, maxAmount - amount))}
              </p>
            )}
          </div>

          {/* Método */}
          <div>
            <label className="label-base">Método de pago</label>
            <select className="input-base" {...register('method')}>
              {METHODS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          {/* Notas */}
          <div>
            <label className="label-base">Observaciones</label>
            <input className="input-base" placeholder="Opcional"
              {...register('notes')} />
          </div>

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
