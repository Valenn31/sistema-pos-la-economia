/**
 * LoginForm — Pantalla de inicio de sesión.
 * Llama a signIn y, si el usuario tiene múltiples roles, navega a /role-select.
 * Si tiene un solo rol, navega directo al dashboard correspondiente.
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

export function LoginForm() {
  const navigate  = useNavigate()
  const { setSession, setActiveRole } = useAuthStore()
  const [showPass, setShowPass] = useState(false)
  const [checkingSetup, setCheckingSetup] = useState(true)

  // Todos los hooks deben ir antes de cualquier return condicional
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm()

  // Si el setup nunca se completó, mandar al wizard
  useEffect(() => {
    checkSetupCompleted().then((done) => {
      if (!done) navigate('/setup', { replace: true })
      else setCheckingSetup(false)
    })
  }, [navigate])

  if (checkingSetup) {
    return (
      <div className="min-h-screen bg-surface-950 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  const onSubmit = async ({ email, password }) => {
    try {
      const { user, profile, roles } = await signIn(email, password)
      setSession(user, profile, roles)

      if (roles.length === 0) {
        toast.error('Tu cuenta no tiene roles asignados. Contactá al administrador.')
        return
      }

      // Un solo rol → entrar directo
      if (roles.length === 1) {
        setActiveRole(roles[0])
        navigate(ROLE_HOME[roles[0]] ?? '/dashboard')
      } else {
        // Múltiples roles → pantalla de selección
        navigate('/role-select')
      }
    } catch (err) {
      toast.error(err.message ?? 'Error al iniciar sesión')
    }
  }

  return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl mb-4">
            <ShoppingCart className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">La Economía</h1>
          <p className="text-surface-400 text-sm mt-1">Sistema de Punto de Venta</p>
        </div>

        {/* Formulario */}
        <div className="card">
          <h2 className="text-lg font-semibold text-white mb-6">Iniciar sesión</h2>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            {/* Email */}
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

            {/* Contraseña */}
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

            <Button type="submit" loading={isSubmitting} className="w-full mt-2" size="lg">
              Ingresar
            </Button>
          </form>
        </div>

        <p className="text-center text-surface-600 text-xs mt-6">
          v1.0.0 — Sistema POS La Economía
        </p>
      </div>
    </div>
  )
}
