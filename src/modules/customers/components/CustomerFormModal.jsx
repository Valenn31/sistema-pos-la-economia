/**
 * CustomerFormModal — Crear / editar cliente completo.
 */
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Modal }  from '@/shared/components/Modal'
import { Button } from '@/shared/components/Button'

const DOC_TYPES = ['DNI', 'CUIT', 'CUIL', 'Pasaporte']

export function CustomerFormModal({ open, onClose, onSave, initialData }) {
  const isEditing = !!initialData
  const [saving, setSaving] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: {
      full_name: '', document_type: 'DNI', document_number: '',
      phone: '', email: '', address: '',
      credit_limit: '0', discount_percent: '0', is_active: true,
    },
  })

  useEffect(() => {
    if (open) {
      reset(initialData
        ? {
            full_name:        initialData.full_name,
            document_type:    initialData.document_type    ?? 'DNI',
            document_number:  initialData.document_number  ?? '',
            phone:            initialData.phone            ?? '',
            email:            initialData.email            ?? '',
            address:          initialData.address          ?? '',
            credit_limit:     initialData.credit_limit     ?? 0,
            discount_percent: initialData.discount_percent ?? 0,
            is_active:        initialData.is_active,
          }
        : {
            full_name: '', document_type: 'DNI', document_number: '',
            phone: '', email: '', address: '',
            credit_limit: '0', discount_percent: '0', is_active: true,
          }
      )
    }
  }, [open, initialData, reset])

  const onSubmit = async (data) => {
    setSaving(true)
    try { await onSave(data) } finally { setSaving(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? 'Editar cliente' : 'Nuevo cliente'} size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

        {/* Nombre */}
        <div>
          <label className="label-base">Nombre completo <span className="text-red-400">*</span></label>
          <input className="input-base" placeholder="Juan García"
            {...register('full_name', { required: 'Requerido' })} />
          {errors.full_name && <p className="field-error">{errors.full_name.message}</p>}
        </div>

        {/* Documento */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label-base">Tipo doc.</label>
            <select className="input-base" {...register('document_type')}>
              <option value="">—</option>
              {DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className="label-base">Número</label>
            <input className="input-base" placeholder="30123456"
              {...register('document_number')} />
          </div>
        </div>

        {/* Contacto */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label-base">Teléfono</label>
            <input className="input-base" placeholder="3512345678"
              {...register('phone')} />
          </div>
          <div>
            <label className="label-base">Email</label>
            <input type="email" className="input-base" placeholder="juan@mail.com"
              {...register('email')} />
          </div>
        </div>

        {/* Dirección */}
        <div>
          <label className="label-base">Dirección</label>
          <input className="input-base" placeholder="San Martín 1234"
            {...register('address')} />
        </div>

        {/* Condiciones comerciales */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label-base">Límite de crédito ($)</label>
            <input type="number" min="0" step="any" className="input-base"
              {...register('credit_limit', { min: { value: 0, message: '≥ 0' } })} />
            {errors.credit_limit && <p className="field-error">{errors.credit_limit.message}</p>}
          </div>
          <div>
            <label className="label-base">Descuento especial (%)</label>
            <input type="number" min="0" max="100" step="any" className="input-base"
              {...register('discount_percent', {
                min: { value: 0,   message: '≥ 0'   },
                max: { value: 100, message: '≤ 100' },
              })} />
            {errors.discount_percent && <p className="field-error">{errors.discount_percent.message}</p>}
          </div>
        </div>

        {/* Activo */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" className="checkbox-base" {...register('is_active')} />
          <span className="text-sm text-surface-300">Cliente activo</span>
        </label>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={saving}>{isEditing ? 'Guardar' : 'Crear'}</Button>
        </div>
      </form>
    </Modal>
  )
}
