/**
 * PinSwitchModal — Cambio rápido de cajero mediante PIN de 4 dígitos.
 * No hace logout; solo cambia la identidad del cajero activo en el POS.
 *
 * @param {Function} onSwitch  - ({ profile, roles }) => void  al verificar PIN con éxito
 * @param {Function} onClose   - () => void
 */
import { useState } from 'react'
import { X, Delete } from 'lucide-react'
import toast from 'react-hot-toast'
import { verifyPin } from '@/modules/auth/services/authService'

const KEYS = ['1','2','3','4','5','6','7','8','9','','0','⌫']

export function PinSwitchModal({ onSwitch, onClose }) {
  const [pin, setPin]     = useState('')
  const [loading, setLoading] = useState(false)
  const [shake, setShake] = useState(false)

  const handleKey = async (key) => {
    if (key === '⌫') {
      setPin((p) => p.slice(0, -1))
      return
    }
    if (key === '') return
    const next = pin + key
    setPin(next)

    if (next.length === 4) {
      setLoading(true)
      const result = await verifyPin(next)
      setLoading(false)

      if (!result) {
        // PIN incorrecto → sacudir y limpiar
        setShake(true)
        setTimeout(() => { setShake(false); setPin('') }, 500)
        toast.error('PIN incorrecto')
        return
      }
      toast.success(`Bienvenido/a, ${result.profile.full_name}`)
      onSwitch(result)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface-900 border border-surface-800 rounded-2xl w-full max-w-xs shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-surface-800">
          <h2 className="font-bold text-white">Cambiar cajero</h2>
          <button onClick={onClose} className="text-surface-500 hover:text-surface-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <p className="text-center text-surface-400 text-sm">
            Ingresá el PIN del cajero entrante
          </p>

          {/* Indicador de dígitos */}
          <div className={`flex justify-center gap-4 ${shake ? 'animate-[shake_0.4s_ease-in-out]' : ''}`}>
            {[0,1,2,3].map((i) => (
              <div
                key={i}
                className={`w-4 h-4 rounded-full border-2 transition-colors ${
                  pin.length > i ? 'bg-primary-500 border-primary-500' : 'border-surface-600'
                }`}
              />
            ))}
          </div>

          {/* Numpad */}
          <div className="grid grid-cols-3 gap-2">
            {KEYS.map((key, idx) => (
              <button
                key={idx}
                onClick={() => !loading && handleKey(key)}
                disabled={loading || key === ''}
                className={`
                  h-14 rounded-xl font-bold text-xl transition-all
                  ${key === '' ? 'invisible' : ''}
                  ${key === '⌫'
                    ? 'bg-surface-800 text-surface-300 hover:bg-surface-700 flex items-center justify-center'
                    : 'bg-surface-800 text-white hover:bg-primary-600/20 hover:text-primary-400 active:scale-95'}
                  disabled:opacity-50
                `}
              >
                {key === '⌫' ? <Delete className="w-5 h-5 mx-auto" /> : key}
              </button>
            ))}
          </div>

          {loading && (
            <p className="text-center text-surface-400 text-sm animate-pulse">Verificando…</p>
          )}
        </div>
      </div>
    </div>
  )
}
