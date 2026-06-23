/**
 * LoginForm — Pantalla de inicio de sesión del sistema POS.
 * Llama a signIn y, si el usuario tiene múltiples roles, navega a /role-select.
 * Si tiene un solo rol, navega directo al dashboard correspondiente.
 * Si el setup inicial nunca se completó, redirige automáticamente al wizard.
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Eye, EyeOff, ShoppingCart } from 'lucide-react'
import { signIn, checkSetupCompleted } from '@/modules/auth/services/authService'
import { useAuthStore } from '@/shared/store/authStore'
import { Button } from '@/shared/components/Button'
import { Spinner } from '@/shared/components/Spinner'
import { ROLE_HOME } from '@/routes/roleRoutes'

/**
 * LoginForm — Componente del formulario de login.
 * Verifica si el setup inicial está completo antes de mostrar el formulario.
 */
export function LoginForm() {
  const navigate  = useNavigate()
  const { setSession, setActiveRole } = useAuthStore()
  // Controla la visibilidad de la contraseña en el campo de texto
  const [showPass, setShowPass] = useState(false)
  // Indica si se está verificando el estado del setup inicial
  const [checkingSetup, setCheckingSetup] = useState(true)

  // Inicializar react-hook-form (debe ir antes de cualquier return condicional)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm()

  // Al montar: verificar si el setup inicial fue completado, si no redirigir al wizard
  useEffect(() => {
    checkSetupCompleted().then((done) => {
      if (!done) navigate('/setup', { replace: true })
      else setCheckingSetup(false)
    })
  }, [navigate])

  // Mostrar spinner mientras se verifica el estado del setup
  if (checkingSetup) {
    return (
      <div className="min-h-screen bg-surface-950 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  /**
   * Procesa el envío del formulario de login.
   * Autentica al usuario, guarda la sesión en el store y navega
   * según la cantidad de roles: directo al home del rol o a la pantalla de selección.
   *
   * @param {object} param0
   * @param {string} param0.email - Email del usuario
   * @param {string} param0.password - Contraseña del usuario
   */
  const onSubmit = async ({ email, password }) => {
    try {
      const { user, profile, roles } = await signIn(email, password)
      setSession(user, profile, roles)

      // Si no tiene roles asignados, mostrar error y no navegar
      if (roles.length === 0) {
        toast.error('Tu cuenta no tiene roles asignados. Contactá al administrador.')
        return
      }

      // Un solo rol: entrar directo al dashboard correspondiente
      if (roles.length === 1) {
        setActiveRole(roles[0])
        navigate(ROLE_HOME[roles[0]] ?? '/dashboard')
      } else {
        // Múltiples roles: ir a la pantalla de selección de rol
        navigate('/role-select')
      }
    } catch (err) {
      toast.error(err.message ?? 'Error al iniciar sesión')
    }
  }

  return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo y encabezado del sistema */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl mb-4">
            <ShoppingCart className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">La Economía</h1>
          <p className="text-surface-400 text-sm mt-1">Sistema de Punto de Venta</p>
        </div>

        {/* Tarjeta del formulario de login */}
        <div className="card">
          <h2 className="text-lg font-semibold text-white mb-6">Iniciar sesión</h2>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            {/* Campo: Email del usuario */}
            <div>
              <label className="label-base">Correo electrónico</label>
              <input
                type="email"
                autoComplete="email"
                placeholder="usuario@laeconomia.com"
                className="input-base"
                {...register('email', {
                  required: 'El email es obligatorio',
                  pattern: { value: /\S+@\S+\.\S+/, message: 'Email inválido' },
                })}
              />
              {errors.email && (
                <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>
              )}
            </div>

            {/* Campo: Contraseña con botón para mostrar/ocultar */}
            <div>
              <label className="label-base">Contraseña</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="input-base pr-10"
                  {...register('password', { required: 'La contraseña es obligatoria' })}
                />
                {/* Botón para alternar visibilidad de la contraseña */}
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-200 transition-colors"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>
              )}
            </div>

            {/* Botón de submit */}
            <Button type="submit" loading={isSubmitting} className="w-full mt-2" size="lg">
              Ingresar
            </Button>
          </form>
        </div>

        {/* Versión del sistema */}
        <p className="text-center text-surface-600 text-xs mt-6">
          v1.0.0 — Sistema POS La Economía
        </p>
      </div>
    </div>
  )
}
