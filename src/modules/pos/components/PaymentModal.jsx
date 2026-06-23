/**
 * PaymentModal — Modal de cobro. Permite seleccionar uno o varios métodos de pago.
 * Calcula el vuelto si se paga en efectivo. Habilita "Confirmar" solo cuando
 * el monto pagado cubre el total.
 *
 * @param {object}   session   - Sesión de caja activa
 * @param {object}   cashier   - Perfil del cajero activo
 * @param {Function} onSuccess - (sale) => void
 * @param {Function} onClose   - () => void
 */
import { useState } from 'react'
import { X, DollarSign, CreditCard, Smartphone, Building2, Wallet, User } from 'lucide-react'
import toast from 'react-hot-toast'
import { useCartStore } from '@/modules/pos/hooks/useCartStore'
import { createSale } from '@/modules/pos/services/salesService'
import { Button } from '@/shared/components/Button'
import { formatCurrency, round2 } from '@/shared/utils/formatters'

const METHODS = [
  { id: 'efectivo',      label: 'Efectivo',      icon: DollarSign,  color: 'text-green-400'  },
  { id: 'debito',        label: 'Débito',         icon: CreditCard,  color: 'text-blue-400'   },
  { id: 'credito',       label: 'Crédito',        icon: CreditCard,  color: 'text-purple-400' },
  { id: 'qr',            label: 'QR / MP',        icon: Smartphone,  color: 'text-yellow-400' },
  { id: 'transferencia', label: 'Transferencia',  icon: Building2,   color: 'text-cyan-400'   },
  { id: 'cuenta',        label: 'Cta. Cte.',      icon: Wallet,      color: 'text-orange-400' },
]

export function PaymentModal({ session, cashier, onSuccess, onClose }) {
  const { items, customer, getTotal, getSubtotal, getDiscountTotal, getIvaTotal, clearCart } = useCartStore()

  const total    = getTotal()
  const [payments, setPayments]       = useState([])
  const [activeMethod, setActive]     = useState(null)
  const [methodAmount, setMethodAmt]  = useState('')
  const [receiptType, setReceiptType] = useState('ticket')
  const [loading, setLoading]         = useState(false)

  const paid      = round2(payments.reduce((s, p) => s + p.amount, 0))
  const remaining = round2(Math.max(0, total - paid))
  const change    = round2(Math.max(0, paid - total))
  const canConfirm = paid >= total && payments.length > 0

  const addPayment = () => {
    const amount = parseFloat(methodAmount)
    if (isNaN(amount) || amount <= 0) return

    // Verificar que "cuenta" solo se pueda si hay cliente con cuenta
    if (activeMethod === 'cuenta' && !customer) {
      toast.error('Seleccioná un cliente con cuenta corriente primero')
      return
    }
    if (activeMethod === 'cuenta' && customer?.credit_limit > 0) {
      const newBalance = (customer.current_balance ?? 0) + amount
      if (newBalance > customer.credit_limit) {
        toast.error(`Límite de crédito excedido (límite: ${formatCurrency(customer.credit_limit)})`)
        return
      }
    }

    setPayments((prev) => {
      const existing = prev.findIndex((p) => p.method === activeMethod)
      if (existing !== -1) {
        const updated = [...prev]
        updated[existing] = { ...updated[existing], amount: round2(updated[existing].amount + amount) }
        return updated
      }
      return [...prev, { method: activeMethod, amount }]
    })
    setActive(null)
    setMethodAmt('')
  }

  const removePayment = (method) => setPayments((p) => p.filter((x) => x.method !== method))

  const handleConfirm = async () => {
    setLoading(true)
    try {
      const sale = await createSale({
        sessionId:    session.id,
        registerId:   session.register_id,
        cashierId:    cashier.id,
        customerId:   customer?.id ?? null,
        items,
        payments,
        subtotal:     getSubtotal(),
        discountTotal: getDiscountTotal(),
        ivaTotal:     getIvaTotal(),
        total,
        receiptType,
      })
      clearCart()
      onSuccess(sale)
    } catch (err) {
      toast.error(err.message ?? 'Error al registrar la venta')
    } finally {
      setLoading(false)
    }
  }

  const setQuickAmount = (amount) => setMethodAmt(String(amount))

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-4">
      <div className="bg-surface-900 border border-surface-800 rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="sticky top-0 bg-surface-900 flex items-center justify-between p-5 border-b border-surface-800 z-10">
          <div>
            <h2 className="font-bold text-white text-lg">Cobrar venta</h2>
            {customer && (
              <p className="text-surface-400 text-sm flex items-center gap-1">
                <User className="w-3 h-3" /> {customer.full_name}
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-primary-400">{formatCurrency(total)}</p>
            <p className="text-surface-500 text-xs">{items.length} ítem{items.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        <div className="p-5 space-y-5">

          {/* Métodos de pago */}
          <div>
            <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-2">
              Método de pago
            </p>
            <div className="grid grid-cols-3 gap-2">
              {METHODS.map(({ id, label, icon: Icon, color }) => (
                <button
                  key={id}
                  onClick={() => { setActive(id); setMethodAmt(String(remaining || '')) }}
                  className={`
                    flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all text-xs font-medium
                    ${activeMethod === id
                      ? 'border-primary-500 bg-primary-600/15 text-primary-400'
                      : payments.find((p) => p.method === id)
                        ? 'border-green-600 bg-green-600/10 text-green-400'
                        : 'border-surface-700 bg-surface-800 text-surface-400 hover:border-surface-600'}
                  `}
                >
                  <Icon className={`w-5 h-5 ${activeMethod === id ? 'text-primary-400' : color}`} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Input de monto para el método seleccionado */}
          {activeMethod && (
            <div className="bg-surface-800 rounded-xl p-4 space-y-3">
              <p className="text-sm text-surface-300 font-medium">
                Monto en {METHODS.find((m) => m.id === activeMethod)?.label}
              </p>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                <input
                  type="number"
                  autoFocus
                  min="0"
                  step="0.01"
                  value={methodAmount}
                  onChange={(e) => setMethodAmt(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addPayment()}
                  className="input-base pl-9"
                  placeholder="0.00"
                />
              </div>
              {/* Atajos de monto */}
              {activeMethod === 'efectivo' && remaining > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {[remaining, Math.ceil(remaining / 100) * 100, Math.ceil(remaining / 500) * 500, Math.ceil(remaining / 1000) * 1000]
                    .filter((v, i, a) => a.indexOf(v) === i && v >= remaining)
                    .slice(0, 4)
                    .map((v) => (
                      <button
                        key={v}
                        onClick={() => setQuickAmount(v)}
                        className="badge bg-surface-700 text-surface-300 hover:bg-surface-600 cursor-pointer transition-colors"
                      >
                        {formatCurrency(v)}
                      </button>
                    ))}
                </div>
              )}
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setActive(null)} className="flex-1">Cancelar</Button>
                <Button onClick={addPayment} className="flex-1">Agregar</Button>
              </div>
            </div>
          )}

          {/* Pagos agregados */}
          {payments.length > 0 && (
            <div className="space-y-2">
              {payments.map((p) => {
                const m = METHODS.find((x) => x.id === p.method)
                const Icon = m?.icon ?? DollarSign
                return (
                  <div key={p.method} className="flex items-center gap-3 bg-surface-800 rounded-lg px-3 py-2.5">
                    <Icon className={`w-4 h-4 ${m?.color}`} />
                    <span className="flex-1 text-sm text-surface-300 capitalize">{m?.label ?? p.method}</span>
                    <span className="font-semibold text-white">{formatCurrency(p.amount)}</span>
                    <button onClick={() => removePayment(p.method)} className="text-surface-600 hover:text-red-400 ml-1">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          {/* Resumen: restante / vuelto */}
          {payments.length > 0 && (
            <div className="bg-surface-800 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between text-surface-400">
                <span>Total a cobrar</span><span>{formatCurrency(total)}</span>
              </div>
              <div className="flex justify-between text-surface-400">
                <span>Pagado</span><span>{formatCurrency(paid)}</span>
              </div>
              {remaining > 0 && (
                <div className="flex justify-between text-yellow-400 font-semibold pt-1 border-t border-surface-700">
                  <span>Falta</span><span>{formatCurrency(remaining)}</span>
                </div>
              )}
              {change > 0 && (
                <div className="flex justify-between text-green-400 font-bold text-base pt-1 border-t border-surface-700">
                  <span>VUELTO</span><span>{formatCurrency(change)}</span>
                </div>
              )}
            </div>
          )}

          {/* Tipo de comprobante */}
          <div>
            <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-2">Comprobante</p>
            <div className="flex gap-2 flex-wrap">
              {['ticket','factura_b','factura_c','factura_a'].map((type) => (
                <button
                  key={type}
                  onClick={() => setReceiptType(type)}
                  className={`badge cursor-pointer transition-colors ${
                    receiptType === type
                      ? 'bg-primary-600/20 text-primary-400 border border-primary-600/40'
                      : 'bg-surface-800 text-surface-400 border border-surface-700 hover:border-surface-600'
                  }`}
                >
                  {type.replace('_', ' ').toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Botones finales */}
          <div className="flex gap-3 pt-1">
            <Button variant="secondary" onClick={onClose} className="flex-1" disabled={loading}>
              Cancelar
            </Button>
            <Button onClick={handleConfirm} loading={loading} disabled={!canConfirm} className="flex-1 font-bold">
              Confirmar venta
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
