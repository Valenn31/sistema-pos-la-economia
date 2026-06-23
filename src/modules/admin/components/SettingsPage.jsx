/**
 * SettingsPage — Configuración general del negocio.
 * Solo accesible para Superadmin.
 */
import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Button } from '@/shared/components/Button'
import { Spinner } from '@/shared/components/Spinner'
import { getSettings, saveSettings } from '../services/adminService'

const FISCAL_CONDITIONS = ['Responsable Inscripto', 'Monotributista', 'Exento', 'Consumidor Final']

export function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm()

  useEffect(() => {
    getSettings()
      .then((s) => reset({
        business_name:    s.business_name    ?? '',
        cuit:             s.cuit             ?? '',
        address:          s.address          ?? '',
        fiscal_condition: s.fiscal_condition ?? '',
        receipt_footer:   s.receipt_footer   ?? '',
      }))
      .catch(() => toast.error('Error al cargar configuración'))
      .finally(() => setLoading(false))
  }, [reset])

  const onSubmit = async (data) => {
    try {
      await saveSettings(data)
      toast.success('Configuración guardada')
    } catch (err) {
      toast.error(err.message ?? 'Error al guardar')
    }
  }

  if (loading) return <div className="flex justify-center py-16"><Spinner /></div>

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-white">Configuración</h1>

        <form onSubmit={handleSubmit(onSubmit)} className="card space-y-5">
          <h2 className="text-base font-semibold text-white">Datos del negocio</h2>

          <div>
            <label className="label-base">Nombre del negocio *</label>
            <input className="input-base" placeholder="Ej: Supermercado La Economía" {...register('business_name')} />
          </div>

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

          <div>
            <label className="label-base">Dirección</label>
            <input className="input-base" placeholder="Av. San Martín 123, Ciudad" {...register('address')} />
          </div>

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
      </div>
    </div>
  )
}
