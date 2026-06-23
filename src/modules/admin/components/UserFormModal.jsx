/**
 * UserFormModal — Crear y editar usuarios con asignación de roles.
 */
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Modal } from '@/shared/components/Modal'
import { Button } from '@/shared/components/Button'
import { Badge } from '@/shared/components/Badge'
import { hasAdminClient } from '@/supabase/adminClient'
import { createUser, updateUser } from '../services/adminService'

export function UserFormModal({ open, onClose, onSaved, user, allRoles }) {
  const isEditing = !!user
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm()

  useEffect(() => {
    if (open) {
      reset(user ? {
        full_name: user.full_name ?? '',
        pin:       user.pin       ?? '',
        roleIds:   user.roles?.map((r) => String(r.id)) ?? [],
      } : {
        full_name: '', email: '', password: '', pin: '', roleIds: [],
      })
    }
  }, [open, user, reset])

  const onSubmit = async (data) => {
    const roleIds = data.roleIds ? [data.roleIds].flat().map(Number).filter(Boolean) : []
    try {
      if (isEditing) {
        await updateUser(user.id, {
          fullName: data.full_name,
          pin:      data.pin,
          roleIds,
        })
        toast.success('Usuario actualizado')
      } else {
        await createUser({
          email:    data.email,
          password: data.password,
          fullName: data.full_name,
          pin:      data.pin,
          roleIds,
        })
        toast.success('Usuario creado')
      }
      onSaved()
      onClose()
    } catch (err) {
      toast.error(err.message ?? 'Error al guardar usuario')
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? 'Editar usuario' : 'Nuevo usuario'} size="md">
      <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">

        {/* Aviso si falta service key (solo para crear) */}
        {!isEditing && !hasAdminClient && (
          <div className="bg-yellow-600/10 border border-yellow-600/30 rounded-xl p-4">
            <p className="text-yellow-400 text-sm font-medium">Service key no configurada</p>
            <p className="text-yellow-400/70 text-xs mt-1">
              Agregá VITE_SUPABASE_SERVICE_KEY al archivo .env para crear usuarios desde el panel.
            </p>
          </div>
        )}

        <div>
          <label className="label-base">Nombre completo *</label>
          <input className="input-base" placeholder="Ej: María García" {...register('full_name', { required: 'Requerido' })} />
          {errors.full_name && <p className="field-error">{errors.full_name.message}</p>}
        </div>

        {!isEditing && (
          <>
            <div>
              <label className="label-base">Email *</label>
              <input type="email" className="input-base" {...register('email', { required: 'Requerido' })} />
              {errors.email && <p className="field-error">{errors.email.message}</p>}
            </div>
            <div>
              <label className="label-base">Contraseña *</label>
              <input type="password" className="input-base" placeholder="Mínimo 6 caracteres" {...register('password', { required: 'Requerido', minLength: { value: 6, message: 'Mínimo 6 caracteres' } })} />
              {errors.password && <p className="field-error">{errors.password.message}</p>}
            </div>
          </>
        )}

        <div>
          <label className="label-base">PIN (4 dígitos) — para cambio rápido en POS</label>
          <input
            className="input-base font-mono tracking-widest"
            maxLength={4}
            placeholder="1234"
            {...register('pin', { pattern: { value: /^\d{4}$/, message: 'Debe ser exactamente 4 dígitos' } })}
          />
          {errors.pin && <p className="field-error">{errors.pin.message}</p>}
        </div>

        <div>
          <label className="label-base">Roles *</label>
          <div className="flex flex-wrap gap-2 mt-1">
            {allRoles.map((role) => (
              <label key={role.id} className="flex items-center gap-2 cursor-pointer bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 hover:border-primary-600 transition-colors">
                <input
                  type="checkbox"
                  value={String(role.id)}
                  className="checkbox-base"
                  {...register('roleIds')}
                />
                <span className="text-sm text-surface-300 capitalize">{role.name}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancelar</Button>
          <Button type="submit" loading={isSubmitting} disabled={!isEditing && !hasAdminClient} className="flex-1">
            {isEditing ? 'Guardar cambios' : 'Crear usuario'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
