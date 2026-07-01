/**
 * SetupWizard — Panel de configuración inicial del sistema.
 * Se muestra la primera vez que se accede al sistema (setup_completed = false).
 * Guía al usuario para crear el primer Superadmin y configurar datos básicos del negocio.
 *
 * Pasos del wizard:
 *  1. Bienvenida — Introducción al proceso de configuración
 *  2. Datos del negocio — Nombre, CUIT, dirección, condición fiscal, teléfono
 *  3. Crear cuenta Superadmin — Email, contraseña, PIN y nombre completo
 *  4. Confirmación — Todo listo, redirige al login
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { ShoppingCart, Building2, UserCog, CheckCircle2, ArrowRight, ArrowLeft } from 'lucide-react'
import { createFirstSuperadmin, checkSetupCompleted } from '@/modules/auth/services/authService'
import { Button } from '@/shared/components/Button'
import { Spinner } from '@/shared/components/Spinner'

/** Nombres de los pasos para el indicador de progreso superior */
const STEPS = ['Bienvenida', 'Negocio', 'Superadmin', 'Listo']

/**
 * SetupWizard — Componente orquestador del wizard de configuración inicial.
 * Controla el paso actual y los datos del negocio que se pasan entre pasos.
 * Si el setup ya fue completado, redirige a /login: este wizard es solo
 * para la primera vez, no debe poder re-ejecutarse entrando a /setup a mano.
 */
export function SetupWizard() {
  // Paso actual del wizard (0-3)
  const [step, setStep] = useState(0)
  // Datos del negocio capturados en el paso 2, pasados al paso 3
  const [businessData, setBusinessData] = useState(null)
  // null mientras se verifica el estado del setup; evita el flash del wizard
  const [alreadySetup, setAlreadySetup] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    checkSetupCompleted()
      .then((done) => {
        if (done) navigate('/login', { replace: true })
        else setAlreadySetup(false)
      })
      // Si falla la verificación (ej: Supabase inalcanzable), no bloquear
      // el wizard: puede ser justamente la primera configuración.
      .catch(() => setAlreadySetup(false))
  }, [navigate])

  /** Avanza al siguiente paso del wizard */
  const next = () => setStep((s) => s + 1)
  /** Retrocede al paso anterior del wizard */
  const prev = () => setStep((s) => s - 1)

  if (alreadySetup === null) {
    return (
      <div className="min-h-screen bg-surface-950 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Indicador visual de pasos (stepper) con círculos numerados y líneas conectoras */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors
                ${i < step ? 'bg-primary-600 text-white' : i === step ? 'bg-primary-600 text-white ring-4 ring-primary-600/20' : 'bg-surface-800 text-surface-500'}
              `}>
                {i < step ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
              </div>
              {/* Línea conectora entre pasos (excepto después del último) */}
              {i < STEPS.length - 1 && (
                <div className={`w-8 h-0.5 ${i < step ? 'bg-primary-600' : 'bg-surface-800'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Contenedor principal que renderiza el componente del paso actual */}
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

/**
 * StepWelcome — Paso introductorio del wizard.
 * Muestra un mensaje de bienvenida y el botón para comenzar la configuración.
 *
 * @param {object} props
 * @param {Function} props.onNext - Callback para avanzar al siguiente paso
 */
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

/**
 * StepBusiness — Formulario para capturar los datos fiscales del negocio.
 * Los datos se pasan al paso siguiente para enviarse junto con la cuenta Superadmin.
 *
 * @param {object} props
 * @param {Function} props.onNext - Callback que recibe los datos del formulario al avanzar
 * @param {Function} props.onPrev - Callback para retroceder al paso anterior
 */
function StepBusiness({ onNext, onPrev }) {
  const { register, handleSubmit, formState: { errors } } = useForm()

  return (
    <div>
      {/* Encabezado del paso con ícono */}
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
        {/* Campo: Nombre o razón social del negocio (obligatorio) */}
        <div>
          <label className="label-base">Nombre / Razón Social *</label>
          <input className="input-base" placeholder="Supermercado La Economía"
            {...register('business_name', { required: 'Obligatorio' })} />
          {errors.business_name && <p className="text-red-400 text-xs mt-1">{errors.business_name.message}</p>}
        </div>

        {/* Campos: CUIT y condición fiscal en grilla de 2 columnas */}
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

        {/* Campo: Dirección del negocio */}
        <div>
          <label className="label-base">Dirección</label>
          <input className="input-base" placeholder="Av. Principal 1234, Ciudad"
            {...register('address')} />
        </div>

        {/* Campo: Teléfono del negocio */}
        <div>
          <label className="label-base">Teléfono</label>
          <input className="input-base" placeholder="0351 123-4567"
            {...register('phone')} />
        </div>

        {/* Botones de navegación: Atrás y Siguiente */}
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onPrev} className="flex-1">
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

/**
 * StepSuperadmin — Formulario para crear la cuenta del primer Superadmin.
 * Envía los datos del negocio (del paso anterior) junto con los del usuario
 * al RPC complete_initial_setup de Supabase.
 *
 * @param {object} props
 * @param {object} props.businessData - Datos del negocio capturados en el paso anterior
 * @param {Function} props.onNext - Callback para avanzar al paso de confirmación
 * @param {Function} props.onPrev - Callback para retroceder al paso anterior
 */
function StepSuperadmin({ businessData, onNext, onPrev }) {
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm()
  // Observar el campo password para validar que la confirmación coincida
  const password = watch('password')

  /**
   * Envía los datos al RPC de Supabase para completar el setup inicial.
   * El RPC usa SECURITY DEFINER, no necesita sesión autenticada.
   */
  const onSubmit = async (data) => {
    try {
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
      {/* Encabezado del paso con ícono */}
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
        {/* Campo: Nombre completo del superadmin */}
        <div>
          <label className="label-base">Nombre completo *</label>
          <input className="input-base" placeholder="Juan Pérez"
            {...register('fullName', { required: 'Obligatorio' })} />
          {errors.fullName && <p className="text-red-400 text-xs mt-1">{errors.fullName.message}</p>}
        </div>

        {/* Campo: Email del superadmin */}
        <div>
          <label className="label-base">Email *</label>
          <input type="email" className="input-base" placeholder="admin@laeconomia.com"
            {...register('email', { required: 'Obligatorio', pattern: { value: /\S+@\S+\.\S+/, message: 'Email inválido' } })} />
          {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
        </div>

        {/* Campos: Contraseña y confirmación en grilla de 2 columnas */}
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

        {/* Campo: PIN de 4 dígitos para cambio rápido de cajero */}
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

        {/* Botones de navegación: Atrás y Crear cuenta */}
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onPrev} className="flex-1" disabled={isSubmitting}>
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

/**
 * StepDone — Paso final de confirmación.
 * Indica que el setup se completó exitosamente y ofrece un botón
 * para ir a la pantalla de login.
 *
 * @param {object} props
 * @param {Function} props.onFinish - Callback para navegar al login
 */
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
