/**
 * SetupWizard — Panel de configuración inicial del sistema.
 * Se muestra la primera vez que se accede al sistema (setup_completed = false).
 * Guía al usuario para crear el primer Superadmin y configura datos básicos del negocio.
 *
 * Pasos:
 *  1. Bienvenida
 *  2. Datos del negocio (nombre, CUIT, dirección, condición fiscal)
 *  3. Crear cuenta Superadmin
 *  4. Confirmación
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { ShoppingCart, Building2, UserCog, CheckCircle2, ArrowRight, ArrowLeft } from 'lucide-react'
import { createFirstSuperadmin } from '@/modules/auth/services/authService'
import { Button } from '@/shared/components/Button'

const STEPS = ['Bienvenida', 'Negocio', 'Superadmin', 'Listo']

export function SetupWizard() {
  const [step, setStep] = useState(0)
  const [businessData, setBusinessData] = useState(null)
  const navigate = useNavigate()

  const next = () => setStep((s) => s + 1)
  const prev = () => setStep((s) => s - 1)

  return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Indicador de pasos */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors
                ${i < step ? 'bg-primary-600 text-white' : i === step ? 'bg-primary-600 text-white ring-4 ring-primary-600/20' : 'bg-surface-800 text-surface-500'}
              `}>
                {i < step ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-8 h-0.5 ${i < step ? 'bg-primary-600' : 'bg-surface-800'}`} />
              )}
            </div>
          ))}
        </div>

        <div className="card">
          {step === 0 && <StepWelcome onNext={next} />}
          {step === 1 && <StepBusiness onNext={(data) => { setBusinessData(data); next() }} onPrev={prev} />}
          {step === 2 && <StepSuperadmin businessData={businessData} onNext={next} onPrev={prev} />}
          {step === 3 && <StepDone onFinish={() => navigate('/login')} />}
        </div>
      </div>
    </div>
  )
}

/* ─── Paso 1: Bienvenida ─────────────────────────────────────────── */
function StepWelcome({ onNext }) {
  return (
    <div className="text-center py-4">
      <div className="inline-flex items-center justify-center w-20 h-20 bg-primary-600 rounded-3xl mb-6">
        <ShoppingCart className="w-10 h-10 text-white" />
      </div>
      <h1 className="text-2xl font-bold text-white mb-2">Bienvenido al Sistema POS</h1>
      <p className="text-surface-400 mb-8 leading-relaxed">
        Vamos a configurar el sistema por primera vez. Solo tomará unos minutos.
        <br />
        Necesitarás los datos del negocio y crear la cuenta de administrador principal.
      </p>
      <Button onClick={onNext} size="lg" className="w-full">
        Comenzar configuración <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  )
}

/* ─── Paso 2: Datos del negocio ──────────────────────────────────── */
function StepBusiness({ onNext, onPrev }) {
  const { register, handleSubmit, formState: { errors } } = useForm()

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-primary-600/10 rounded-xl flex items-center justify-center">
          <Building2 className="w-5 h-5 text-primary-400" />
        </div>
        <div>
          <h2 className="font-bold text-white">Datos del negocio</h2>
          <p className="text-surface-400 text-sm">Se usarán en los comprobantes</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onNext)} className="space-y-4">
        <div>
          <label className="label-base">Nombre / Razón Social *</label>
          <input className="input-base" placeholder="Supermercado La Economía"
            {...register('business_name', { required: 'Obligatorio' })} />
          {errors.business_name && <p className="text-red-400 text-xs mt-1">{errors.business_name.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label-base">CUIT</label>
            <input className="input-base" placeholder="30-12345678-9"
              {...register('cuit')} />
          </div>
          <div>
            <label className="label-base">Condición fiscal</label>
            <select className="input-base" {...register('fiscal_condition')}>
              <option value="responsable_inscripto">Resp. Inscripto</option>
              <option value="monotributo">Monotributo</option>
              <option value="exento">Exento</option>
            </select>
          </div>
        </div>

        <div>
          <label className="label-base">Dirección</label>
          <input className="input-base" placeholder="Av. Principal 1234, Ciudad"
            {...register('address')} />
        </div>

        <div>
          <label className="label-base">Teléfono</label>
          <input className="input-base" placeholder="0351 123-4567"
            {...register('phone')} />
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="secondary" onClick={onPrev} className="flex-1">
            <ArrowLeft className="w-4 h-4" /> Atrás
          </Button>
          <Button type="submit" className="flex-1">
            Siguiente <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </form>
    </div>
  )
}

/* ─── Paso 3: Crear Superadmin ───────────────────────────────────── */
function StepSuperadmin({ businessData, onNext, onPrev }) {
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm()
  const password = watch('password')

  const onSubmit = async (data) => {
    try {
      // El RPC complete_initial_setup maneja toda la escritura en DB
      // con SECURITY DEFINER, sin necesitar sesión autenticada
      await createFirstSuperadmin({
        fullName:     data.fullName,
        email:        data.email,
        password:     data.password,
        pin:          data.pin,
        businessData: businessData,
      })

      toast.success('¡Cuenta creada correctamente!')
      onNext()
    } catch (err) {
      toast.error(err.message ?? 'Error al crear la cuenta')
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-primary-600/10 rounded-xl flex items-center justify-center">
          <UserCog className="w-5 h-5 text-primary-400" />
        </div>
        <div>
          <h2 className="font-bold text-white">Cuenta Superadmin</h2>
          <p className="text-surface-400 text-sm">Acceso total al sistema</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="label-base">Nombre completo *</label>
          <input className="input-base" placeholder="Juan Pérez"
            {...register('fullName', { required: 'Obligatorio' })} />
          {errors.fullName && <p className="text-red-400 text-xs mt-1">{errors.fullName.message}</p>}
        </div>

        <div>
          <label className="label-base">Email *</label>
          <input type="email" className="input-base" placeholder="admin@laeconomia.com"
            {...register('email', { required: 'Obligatorio', pattern: { value: /\S+@\S+\.\S+/, message: 'Email inválido' } })} />
          {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label-base">Contraseña *</label>
            <input type="password" className="input-base"
              {...register('password', { required: 'Obligatorio', minLength: { value: 8, message: 'Mínimo 8 caracteres' } })} />
            {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
          </div>
          <div>
            <label className="label-base">Confirmar *</label>
            <input type="password" className="input-base"
              {...register('confirmPassword', {
                required: 'Obligatorio',
                validate: (v) => v === password || 'Las contraseñas no coinciden',
              })} />
            {errors.confirmPassword && <p className="text-red-400 text-xs mt-1">{errors.confirmPassword.message}</p>}
          </div>
        </div>

        <div>
          <label className="label-base">PIN de caja (4 dígitos) *</label>
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            placeholder="••••"
            className="input-base w-32 text-center tracking-widest text-lg"
            {...register('pin', {
              required: 'Obligatorio',
              pattern: { value: /^\d{4}$/, message: 'Debe ser exactamente 4 dígitos' },
            })}
          />
          {errors.pin && <p className="text-red-400 text-xs mt-1">{errors.pin.message}</p>}
          <p className="text-surface-500 text-xs mt-1">Se usa para cambio rápido de cajero en el POS</p>
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="secondary" onClick={onPrev} className="flex-1" disabled={isSubmitting}>
            <ArrowLeft className="w-4 h-4" /> Atrás
          </Button>
          <Button type="submit" loading={isSubmitting} className="flex-1">
            Crear cuenta
          </Button>
        </div>
      </form>
    </div>
  )
}

/* ─── Paso 4: Listo ──────────────────────────────────────────────── */
function StepDone({ onFinish }) {
  return (
    <div className="text-center py-4">
      <div className="inline-flex items-center justify-center w-20 h-20 bg-primary-600/10 rounded-3xl mb-6">
        <CheckCircle2 className="w-12 h-12 text-primary-400" />
      </div>
      <h2 className="text-2xl font-bold text-white mb-2">¡Todo listo!</h2>
      <p className="text-surface-400 mb-8 leading-relaxed">
        El sistema quedó configurado. Ya podés iniciar sesión con la cuenta que acabás de crear.
      </p>
      <Button onClick={onFinish} size="lg" className="w-full">
        Ir al inicio de sesión <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  )
}
