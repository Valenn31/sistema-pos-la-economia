/**
 * SettingsPage — Página de configuración general del negocio.
 * Solo accesible para el rol Superadmin.
 * Permite editar datos fiscales, pie de ticket, ancho de papel
 * y días de alerta de vencimiento.
 */
import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Button } from '@/shared/components/Button'
import { Spinner } from '@/shared/components/Spinner'
import { getSettings, saveSettings } from '../services/adminService'

/** Opciones de condición fiscal disponibles para el negocio */
const FISCAL_CONDITIONS = ['Responsable Inscripto', 'Monotributista', 'Exento', 'Consumidor Final']

/**
 * SettingsPage — Componente de configuración del sistema.
 * Contiene dos formularios: datos del negocio e impresora/tickets.
 * Ambos comparten la misma acción de guardado.
 */
export function SettingsPage() {
  // Indicador de carga mientras se obtiene la configuración actual
  const [loading, setLoading] = useState(true)
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm()

  // Cargar la configuración existente al montar y rellenar el formulario
  useEffect(() => {
    getSettings()
      .then((s) => reset({
        business_name:      s.business_name      ?? '',
        cuit:               s.cuit               ?? '',
        address:            s.address            ?? '',
        fiscal_condition:   s.fiscal_condition   ?? '',
        receipt_footer:     s.receipt_footer     ?? '',
        paper_width:        s.paper_width        ?? '80',
        expiry_alert_days:  s.expiry_alert_days  ?? '30',
      }))
      .catch(() => toast.error('Error al cargar configuración'))
      .finally(() => setLoading(false))
  }, [reset])

  /** Envía los datos del formulario al servicio para persistir los cambios */
  const onSubmit = async (data) => {
    try {
      await saveSettings(data)
      toast.success('Configuración guardada')
    } catch (err) {
      toast.error(err.message ?? 'Error al guardar')
    }
  }

  // Mostrar spinner mientras se carga la configuración
  if (loading) return <div className="flex justify-center py-16"><Spinner /></div>

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-white">Configuración</h1>

        {/* Formulario 1: Datos del negocio (nombre, CUIT, dirección, condición fiscal, pie de ticket) */}
        <form onSubmit={handleSubmit(onSubmit)} className="card space-y-5">
          <h2 className="text-base font-semibold text-white">Datos del negocio</h2>

          {/* Campo: Nombre del negocio */}
          <div>
            <label className="label-base">Nombre del negocio *</label>
            <input className="input-base" placeholder="Ej: Supermercado La Economía" {...register('business_name')} />
          </div>

          {/* Campos: CUIT y condición fiscal en grilla de 2 columnas */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-base">CUIT</label>
              <input className="input-base" placeholder="20-12345678-0" {...register('cuit')} />
            </div>
            <div>
              <label className="label-base">Condición fiscal</label>
              <select className="input-base" {...register('fiscal_condition')}>
                <option value="">Seleccionar…</option>
                {FISCAL_CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Campo: Dirección del negocio */}
          <div>
            <label className="label-base">Dirección</label>
            <input className="input-base" placeholder="Av. San Martín 123, Ciudad" {...register('address')} />
          </div>

          {/* Campo: Mensaje de pie del ticket impreso */}
          <div>
            <label className="label-base">Pie del ticket / Mensaje de cierre</label>
            <textarea
              rows={3}
              className="input-base resize-none"
              placeholder="¡Gracias por su compra! Vuelva pronto."
              {...register('receipt_footer')}
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" loading={isSubmitting}>Guardar configuración</Button>
          </div>
        </form>

        {/* Formulario 2: Configuración de impresora y alertas de vencimiento */}
        <form onSubmit={handleSubmit(onSubmit)} className="card space-y-5">
          <h2 className="text-base font-semibold text-white">Impresora / Tickets</h2>

          <div className="grid grid-cols-2 gap-4">
            {/* Campo: Ancho de papel para la ticketera térmica */}
            <div>
              <label className="label-base">Ancho de papel</label>
              <select className="input-base" {...register('paper_width')}>
                <option value="58">58 mm (térmico chico)</option>
                <option value="80">80 mm (térmico estándar)</option>
              </select>
              <p className="text-xs text-surface-500 mt-1">Ajusta el formato del ticket al tamaño del rollo</p>
            </div>
            {/* Campo: Días de anticipación para alertar vencimientos en el dashboard */}
            <div>
              <label className="label-base">Alerta de vencimiento (días)</label>
              <input type="number" min="1" max="365" step="1" className="input-base" {...register('expiry_alert_days')} />
              <p className="text-xs text-surface-500 mt-1">Productos que vencen dentro de estos días se alertan en el dashboard</p>
            </div>
          </div>

          {/* Bloque informativo: instrucciones para impresión silenciosa */}
          <div className="bg-surface-800 border border-surface-700 rounded-xl p-4 space-y-2">
            <p className="text-sm font-medium text-white">Impresión silenciosa (sin diálogo)</p>
            <p className="text-xs text-surface-400">
              Para que el ticket se imprima directo al tocar "Imprimir" sin abrir el cuadro de impresión de Chrome,
              configurá la ticketera como impresora predeterminada en Windows y abrí el sistema desde el acceso
              directo <span className="text-primary-400 font-medium">POS La Economía.bat</span> que está en la carpeta del proyecto.
            </p>
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" loading={isSubmitting}>Guardar configuración</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
