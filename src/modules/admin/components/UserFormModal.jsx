/**
 * UserFormModal — Modal para crear y editar usuarios con asignación de roles.
 * En modo creación requiere email, contraseña y la service key de Supabase.
 * En modo edición solo permite cambiar nombre, PIN y roles.
 *
 * @param {object} props
 * @param {boolean} props.open - Controla si el modal está visible
 * @param {Function} props.onClose - Callback para cerrar el modal
 * @param {Function} props.onSaved - Callback que se ejecuta tras guardar exitosamente
 * @param {object|null} props.user - Usuario a editar (null = modo creación)
 * @param {Array<{id: number, name: string}>} props.allRoles - Lista completa de roles disponibles
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
  // Determina si estamos editando un usuario existente o creando uno nuevo
  const isEditing = !!user
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm()

  // Resetear el formulario con los datos del usuario al abrir el modal
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

  /**
   * Procesa el envío del formulario.
   * Normaliza los roleIds a un array de números y llama al servicio
   * correspondiente (createUser o updateUser) según el modo.
   */
  const onSubmit = async (data) => {
    // Normalizar roleIds: puede venir como string o array según la cantidad de checkboxes
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

        {/* Aviso: se muestra solo al crear si falta la service key de Supabase */}
        {!isEditing && !hasAdminClient && (
          <div className="bg-yellow-600/10 border border-yellow-600/30 rounded-xl p-4">
            <p className="text-yellow-400 text-sm font-medium">Service key no configurada</p>
            <p className="text-yellow-400/70 text-xs mt-1">
              Agregá VITE_SUPABASE_SERVICE_KEY al archivo .env para crear usuarios desde el panel.
            </p>
          </div>
        )}

        {/* Campo: Nombre completo del usuario */}
        <div>
          <label className="label-base">Nombre completo *</label>
          <input className="input-base" placeholder="Ej: María García" {...register('full_name', { required: 'Requerido' })} />
          {errors.full_name && <p className="field-error">{errors.full_name.message}</p>}
        </div>

        {/* Campos de email y contraseña: solo visibles en modo creación */}
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

        {/* Campo: PIN de 4 dígitos para cambio rápido de cajero en el POS */}
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

        {/* Selector de roles: checkboxes con todos los roles disponibles */}
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

        {/* Botones de acción: Cancelar y Guardar/Crear */}
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
