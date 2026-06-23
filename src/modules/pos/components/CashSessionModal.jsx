/**
 * CashSessionModal — Modal de apertura y cierre de caja.
 *
 * Se muestra cuando:
 *  - No hay sesión abierta (mode='open') → seleccionar caja + ingresar monto inicial
 *  - El cajero quiere cerrar el turno (mode='close') → ver totales + ingresar monto contado
 *
 * @param {'open'|'close'}  mode
 * @param {object[]}        registers  - Cajas disponibles (solo para mode='open')
 * @param {object|null}     session    - Sesión activa (solo para mode='close')
 * @param {object}          totals     - Totales del turno (solo para mode='close')
 * @param {Function}        onOpen     - (registerId, amount) => void
 * @param {Function}        onClose    - (closingAmount) => void
 * @param {Function}        onCancel   - () => void  (solo para mode='close')
 */
import { useState } from 'react'
import { DollarSign, X, Store, TrendingUp, CreditCard } from 'lucide-react'
import { Button } from '@/shared/components/Button'
import { formatCurrency } from '@/shared/utils/formatters'

export function CashSessionModal({ mode = 'open', registers = [], session, totals, onOpen, onClose, onCancel }) {
  const [registerId, setRegisterId] = useState(registers[0]?.id ?? '')
  const [amount, setAmount]         = useState('')
  const [loading, setLoading]       = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const value = parseFloat(amount)
    if (isNaN(value) || value < 0) return
    setLoading(true)
    try {
      if (mode === 'open') await onOpen(registerId, value)
      else                 await onClose(value)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface-900 border border-surface-800 rounded-2xl w-full max-w-md shadow-2xl">

        {/* Header */}
        <div className="flex items-center gap-3 p-6 border-b border-surface-800">
          <div className="w-10 h-10 bg-primary-600/15 rounded-xl flex items-center justify-center">
            <Store className="w-5 h-5 text-primary-400" />
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-white">
              {mode === 'open' ? 'Abrir turno de caja' : 'Cerrar turno de caja'}
            </h2>
            {session && (
              <p className="text-surface-400 text-sm">{session.cash_registers?.name}</p>
            )}
          </div>
          {mode === 'close' && (
            <button onClick={onCancel} className="text-surface-500 hover:text-surface-300">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">

          {/* APERTURA */}
          {mode === 'open' && (
            <>
              {registers.length > 1 && (
                <div>
                  <label className="label-base">Caja</label>
                  <select
                    value={registerId}
                    onChange={(e) => setRegisterId(Number(e.target.value))}
                    className="input-base"
                  >
                    {registers.map((r) => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="label-base">Monto inicial en caja ($)</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0.00"
                    autoFocus
                    className="input-base pl-9"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                  />
                </div>
                <p className="text-surface-500 text-xs mt-1">
                  Ingresá el efectivo con el que empezás el turno
                </p>
              </div>
            </>
          )}

          {/* CIERRE — Totales del turno */}
          {mode === 'close' && totals && (
            <div className="space-y-3">
              <div className="card !p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-surface-400 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" /> Ventas del turno
                  </span>
                  <span className="font-semibold text-white">{totals.salesCount} ventas</span>
                </div>
                <div className="flex justify-between font-bold text-lg pt-1 border-t border-surface-800">
                  <span className="text-surface-300">Total recaudado</span>
                  <span className="text-primary-400">{formatCurrency(totals.total)}</span>
                </div>
              </div>
              {/* Desglose por método */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                {Object.entries(totals.totals).filter(([, v]) => v > 0).map(([method, value]) => (
                  <div key={method} className="bg-surface-800 rounded-lg p-2.5 flex justify-between">
                    <span className="text-surface-400 capitalize">{method}</span>
                    <span className="text-white font-medium">{formatCurrency(value)}</span>
                  </div>
                ))}
              </div>
              <div>
                <label className="label-base flex items-center gap-2">
                  <CreditCard className="w-4 h-4" /> Efectivo contado al cerrar ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0.00"
                  autoFocus
                  className="input-base"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            {mode === 'close' && (
              <Button type="button" variant="secondary" onClick={onCancel} className="flex-1">
                Cancelar
              </Button>
            )}
            <Button type="submit" loading={loading} className="flex-1">
              {mode === 'open' ? 'Abrir caja' : 'Cerrar turno'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
