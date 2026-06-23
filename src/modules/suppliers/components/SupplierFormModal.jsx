/**
 * SupplierFormModal — Modal para crear y editar proveedores.
 */
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Modal } from '@/shared/components/Modal'
import { Button } from '@/shared/components/Button'
import { createSupplier, updateSupplier } from '../services/supplierService'

const PAYMENT_CONDITIONS = ['Contado', '7 días', '15 días', '30 días', '60 días', '90 días']

export function SupplierFormModal({ open, onClose, onSaved, supplier }) {
  const isEditing = !!supplier
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm()

  useEffect(() => {
    if (open) {
      reset(supplier ? {
        razon_social:      supplier.razon_social      ?? '',
        cuit:              supplier.cuit              ?? '',
        phone:             supplier.phone             ?? '',
        email:             supplier.email             ?? '',
        payment_condition: supplier.payment_condition ?? '',
        delivery_days:     supplier.delivery_days     ?? '',
      } : {})
    }
  }, [open, supplier, reset])

  const onSubmit = async (data) => {
    try {
      if (isEditing) {
        await updateSupplier(supplier.id, data)
        toast.success('Proveedor actualizado')
      } else {
        await createSupplier(data)
        toast.success('Proveedor creado')
      }
      onSaved()
      onClose()
    } catch (err) {
      toast.error(err.message ?? 'Error al guardar')
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? 'Editar proveedor' : 'Nuevo proveedor'} size="md">
      <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
        <div>
          <label className="label-base">Razón social *</label>
          <input className="input-base" placeholder="Ej: Distribuidora García SA" {...register('razon_social', { required: 'Requerido' })} />
          {errors.razon_social && <p className="field-error">{errors.razon_social.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label-base">CUIT</label>
            <input className="input-base" placeholder="20-12345678-0" {...register('cuit')} />
          </div>
          <div>
            <label className="label-base">Teléfono</label>
            <input className="input-base" placeholder="Ej: 2645001234" {...register('phone')} />
          </div>
        </div>

        <div>
          <label className="label-base">Email</label>
          <input type="email" className="input-base" placeholder="ventas@proveedor.com" {...register('email')} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label-base">Condición de pago</label>
            <select className="input-base" {...register('payment_condition')}>
              <option value="">Sin definir</option>
              {PAYMENT_CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label-base">Días de entrega</label>
            <input type="number" min="0" className="input-base" placeholder="Ej: 3" {...register('delivery_days')} />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancelar</Button>
          <Button type="submit" loading={isSubmitting} className="flex-1">
            {isEditing ? 'Guardar cambios' : 'Crear proveedor'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
