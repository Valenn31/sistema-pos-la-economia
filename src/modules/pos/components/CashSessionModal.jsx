/**
 * CashSessionModal — Modal de apertura y cierre de caja.
 *
 * Se muestra cuando:
 *  - No hay sesión abierta (mode='open') → el cajero selecciona una caja e ingresa el monto inicial
 *  - El cajero quiere cerrar el turno (mode='close') → muestra los totales del turno e ingresa el efectivo contado
 *
 * @param {Object}         props
 * @param {'open'|'close'} props.mode      - Modo del modal: apertura o cierre de caja
 * @param {Object[]}       props.registers - Lista de cajas disponibles (solo para mode='open')
 * @param {Object|null}    props.session   - Sesión de caja activa (solo para mode='close')
 * @param {Object}         props.totals    - Totales del turno: salesCount, total, returnsCount, returnsTotal, totals por método (solo para mode='close')
 * @param {Function}       props.onOpen    - Callback al abrir caja: (registerId, montoInicial) => void
 * @param {Function}       props.onClose   - Callback al cerrar turno: (montoContado) => void
 * @param {Function}       props.onCancel  - Callback al cancelar el cierre: () => void (solo para mode='close')
 */
import { useState } from 'react'
import { DollarSign, X, Store, TrendingUp, CreditCard, RotateCcw } from 'lucide-react'
import { Button } from '@/shared/components/Button'
import { formatCurrency } from '@/shared/utils/formatters'

/**
 * Componente modal para gestionar la apertura y cierre de turnos de caja.
 * En modo apertura permite elegir la caja y el monto inicial.
 * En modo cierre muestra un resumen del turno y solicita el efectivo contado.
 */
export function CashSessionModal({ mode = 'open', registers = [], session, totals, onOpen, onClose, onCancel }) {
  // ID de la caja seleccionada (por defecto la primera disponible)
  const [registerId, setRegisterId] = useState(registers[0]?.id ?? '')
  // Monto ingresado por el cajero (apertura: monto inicial / cierre: efectivo contado)
  const [amount, setAmount]         = useState('')
  // Estado de carga durante la operación asíncrona
  const [loading, setLoading]       = useState(false)

  /**
   * Maneja el envío del formulario.
   * Valida el monto, ejecuta la operación correspondiente (abrir o cerrar)
   * y gestiona el estado de carga.
   * @param {Event} e - Evento del formulario
   */
  const handleSubmit = async (e) => {
    e.preventDefault()
    const value = parseFloat(amount)
    // Validar que el monto sea un número válido y no negativo
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

        {/* ── Encabezado del modal ── */}
        <div className="flex items-center gap-3 p-6 border-b border-surface-800">
          <div className="w-10 h-10 bg-primary-600/15 rounded-xl flex items-center justify-center">
            <Store className="w-5 h-5 text-primary-400" />
          </div>
          <div className="flex-1">
            {/* Título dinámico según el modo */}
            <h2 className="font-bold text-white">
              {mode === 'open' ? 'Abrir turno de caja' : 'Cerrar turno de caja'}
            </h2>
            {/* Nombre de la caja activa (solo en modo cierre) */}
            {session && (
              <p className="text-surface-400 text-sm">{session.cash_registers?.name}</p>
            )}
          </div>
          {/* Botón cerrar modal (solo en modo cierre, porque en apertura es obligatorio) */}
          {mode === 'close' && (
            <button onClick={onCancel} className="text-surface-500 hover:text-surface-300">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">

          {/* ══ FORMULARIO DE APERTURA ══ */}
          {mode === 'open' && (
            <>
              {/* Selector de caja (solo si hay más de una caja disponible) */}
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
              {/* Campo de monto inicial en caja */}
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

          {/* ══ FORMULARIO DE CIERRE — Resumen de totales del turno ══ */}
          {mode === 'close' && totals && (
            <div className="space-y-3">
              {/* Tarjeta resumen: ventas, devoluciones y neto del turno */}
              <div className="card !p-4 space-y-2">
                {/* Cantidad y total de ventas del turno */}
                <div className="flex justify-between text-sm">
                  <span className="text-surface-400 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" /> Ventas del turno
                  </span>
                  <span className="font-semibold text-white">{totals.salesCount} ventas — {formatCurrency(totals.total)}</span>
                </div>
                {/* Devoluciones (solo si hay) */}
                {totals.returnsCount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-red-400 flex items-center gap-2">
                      <RotateCcw className="w-4 h-4" /> Devoluciones
                    </span>
                    <span className="font-semibold text-red-400">
                      {totals.returnsCount} dev. — −{formatCurrency(totals.returnsTotal)}
                    </span>
                  </div>
                )}
                {/* Neto del turno (ventas - devoluciones) */}
                <div className="flex justify-between font-bold text-lg pt-1 border-t border-surface-800">
                  <span className="text-surface-300">Neto del turno</span>
                  <span className="text-primary-400">{formatCurrency(totals.total - (totals.returnsTotal ?? 0))}</span>
                </div>
              </div>
              {/* Desglose de ventas por método de pago */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                {Object.entries(totals.totals).filter(([, v]) => v > 0).map(([method, value]) => (
                  <div key={method} className="bg-surface-800 rounded-lg p-2.5 flex justify-between">
                    <span className="text-surface-400 capitalize">{method}</span>
                    <span className="text-white font-medium">{formatCurrency(value)}</span>
                  </div>
                ))}
              </div>
              {/* Campo de efectivo contado al cerrar */}
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

          {/* ── Botones de acción ── */}
          <div className="flex gap-3 pt-1">
            {/* Botón cancelar (solo en modo cierre) */}
            {mode === 'close' && (
              <Button type="button" variant="secondary" onClick={onCancel} className="flex-1">
                Cancelar
              </Button>
            )}
            {/* Botón principal: abrir caja o cerrar turno */}
            <Button type="submit" loading={loading} className="flex-1">
              {mode === 'open' ? 'Abrir caja' : 'Cerrar turno'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
