/**
 * PaymentModal — Modal de cobro de venta.
 *
 * Permite seleccionar uno o varios métodos de pago (efectivo, débito, crédito,
 * QR/MercadoPago, transferencia, cuenta corriente). Calcula automáticamente
 * el monto restante y el vuelto. Solo habilita "Confirmar" cuando el monto
 * pagado cubre el total de la venta.
 *
 * Funcionalidades:
 *  - Pago mixto (combinar varios métodos)
 *  - Atajos rápidos de monto para efectivo (redondeo a 100, 500, 1000)
 *  - Validación de límite de crédito para pagos con cuenta corriente
 *  - Selección de tipo de comprobante (ticket, factura A/B/C)
 *
 * @param {Object}   props
 * @param {Object}   props.session - Sesión de caja activa
 * @param {Object}   props.cashier - Perfil del cajero que realiza el cobro
 * @param {Function} props.onSuccess - Callback al confirmar venta exitosamente: (sale) => void
 * @param {Function} props.onClose   - Callback para cerrar el modal: () => void
 */
import { useState } from 'react'
import { X, DollarSign, CreditCard, Smartphone, Building2, Wallet, User } from 'lucide-react'
import toast from 'react-hot-toast'
import { useCartStore } from '@/modules/pos/hooks/useCartStore'
import { createSale } from '@/modules/pos/services/salesService'
import { Button } from '@/shared/components/Button'
import { formatCurrency, round2 } from '@/shared/utils/formatters'

/**
 * Configuración de los métodos de pago disponibles.
 * Cada método tiene un id interno, etiqueta visible, ícono y color.
 */
const METHODS = [
  { id: 'efectivo',      label: 'Efectivo',      icon: DollarSign,  color: 'text-green-400'  },
  { id: 'debito',        label: 'Débito',         icon: CreditCard,  color: 'text-blue-400'   },
  { id: 'credito',       label: 'Crédito',        icon: CreditCard,  color: 'text-purple-400' },
  { id: 'qr',            label: 'QR / MP',        icon: Smartphone,  color: 'text-yellow-400' },
  { id: 'transferencia', label: 'Transferencia',  icon: Building2,   color: 'text-cyan-400'   },
  { id: 'cuenta',        label: 'Cta. Cte.',      icon: Wallet,      color: 'text-orange-400' },
]

/**
 * Componente modal de cobro. Gestiona el flujo completo de pago:
 * selección de método, ingreso de monto, resumen y confirmación.
 */
export function PaymentModal({ session, cashier, onSuccess, onClose }) {
  // Datos del carrito necesarios para el cobro
  const { items, customer, getTotal, getSubtotal, getDiscountTotal, getIvaTotal, clearCart } = useCartStore()

  // Total a cobrar calculado desde el store
  const total    = getTotal()
  // Lista de pagos ingresados: [{method, amount}, ...]
  const [payments, setPayments]       = useState([])
  // Método de pago actualmente seleccionado (null = ninguno)
  const [activeMethod, setActive]     = useState(null)
  // Monto ingresado para el método activo
  const [methodAmount, setMethodAmt]  = useState('')
  // Tipo de comprobante seleccionado
  const [receiptType, setReceiptType] = useState('ticket')
  // Estado de carga durante la confirmación de la venta
  const [loading, setLoading]         = useState(false)

  // Cálculos derivados del estado de pagos
  const paid      = round2(payments.reduce((s, p) => s + p.amount, 0))  // Total pagado hasta ahora
  const remaining = round2(Math.max(0, total - paid))                   // Monto restante por cubrir
  const change    = round2(Math.max(0, paid - total))                   // Vuelto a entregar
  const canConfirm = paid >= total && payments.length > 0               // Habilitación del botón confirmar

  /**
   * Agrega un pago con el método activo y el monto ingresado.
   * Valida el monto, verifica restricciones de cuenta corriente,
   * y acumula el pago (si ya existe el método, suma al existente).
   */
  const addPayment = () => {
    const amount = parseFloat(methodAmount)
    if (isNaN(amount) || amount <= 0) return

    // Validación: "cuenta corriente" requiere un cliente seleccionado
    if (activeMethod === 'cuenta' && !customer) {
      toast.error('Seleccioná un cliente con cuenta corriente primero')
      return
    }
    // Validación: verificar que no se exceda el límite de crédito del cliente
    if (activeMethod === 'cuenta' && customer?.credit_limit > 0) {
      const newBalance = (customer.current_balance ?? 0) + amount
      if (newBalance > customer.credit_limit) {
        toast.error(`Límite de crédito excedido (límite: ${formatCurrency(customer.credit_limit)})`)
        return
      }
    }

    // Agregar o acumular el pago en la lista
    setPayments((prev) => {
      const existing = prev.findIndex((p) => p.method === activeMethod)
      if (existing !== -1) {
        // Si ya hay un pago con el mismo método, sumar los montos
        const updated = [...prev]
        updated[existing] = { ...updated[existing], amount: round2(updated[existing].amount + amount) }
        return updated
      }
      // Si es un nuevo método, agregarlo como entrada nueva
      return [...prev, { method: activeMethod, amount }]
    })
    // Limpiar la selección del método activo
    setActive(null)
    setMethodAmt('')
  }

  /**
   * Elimina un pago de la lista por su método.
   * @param {string} method - ID del método de pago a eliminar
   */
  const removePayment = (method) => setPayments((p) => p.filter((x) => x.method !== method))

  /**
   * Confirma la venta: envía todos los datos al backend (createSale),
   * limpia el carrito y notifica al componente padre.
   */
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
      // Limpiar el carrito tras venta exitosa
      clearCart()
      onSuccess(sale)
    } catch (err) {
      toast.error(err.message ?? 'Error al registrar la venta')
    } finally {
      setLoading(false)
    }
  }

  /**
   * Establece un monto rápido en el input del método activo.
   * @param {number} amount - Monto a establecer
   */
  const setQuickAmount = (amount) => setMethodAmt(String(amount))

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-4">
      <div className="bg-surface-900 border border-surface-800 rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">

        {/* ── Encabezado del modal: título, cliente y total ── */}
        <div className="sticky top-0 bg-surface-900 flex items-center justify-between p-5 border-b border-surface-800 z-10">
          <div>
            <h2 className="font-bold text-white text-lg">Cobrar venta</h2>
            {/* Nombre del cliente (si hay uno seleccionado) */}
            {customer && (
              <p className="text-surface-400 text-sm flex items-center gap-1">
                <User className="w-3 h-3" /> {customer.full_name}
              </p>
            )}
          </div>
          <div className="text-right">
            {/* Total a cobrar destacado */}
            <p className="text-2xl font-bold text-primary-400">{formatCurrency(total)}</p>
            <p className="text-surface-500 text-xs">{items.length} ítem{items.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        <div className="p-5 space-y-5">

          {/* ── Grilla de métodos de pago ── */}
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

          {/* ── Input de monto para el método de pago seleccionado ── */}
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
                  step="any"
                  value={methodAmount}
                  onChange={(e) => setMethodAmt(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addPayment()}
                  className="input-base pl-9"
                  placeholder="0.00"
                />
              </div>
              {/* Atajos rápidos de monto (solo para efectivo y si falta cubrir algo) */}
              {activeMethod === 'efectivo' && remaining > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {/* Genera montos redondeados: exacto, a 100, a 500, a 1000 */}
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
              {/* Botones: cancelar selección de método o agregar el pago */}
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setActive(null)} className="flex-1">Cancelar</Button>
                <Button onClick={addPayment} className="flex-1">Agregar</Button>
              </div>
            </div>
          )}

          {/* ── Lista de pagos ya agregados ── */}
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
                    {/* Botón para eliminar este pago */}
                    <button onClick={() => removePayment(p.method)} className="text-surface-600 hover:text-red-400 ml-1">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          {/* ── Resumen: total, pagado, restante y vuelto ── */}
          {payments.length > 0 && (
            <div className="bg-surface-800 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between text-surface-400">
                <span>Total a cobrar</span><span>{formatCurrency(total)}</span>
              </div>
              <div className="flex justify-between text-surface-400">
                <span>Pagado</span><span>{formatCurrency(paid)}</span>
              </div>
              {/* Monto que falta cubrir (visible solo si queda algo pendiente) */}
              {remaining > 0 && (
                <div className="flex justify-between text-yellow-400 font-semibold pt-1 border-t border-surface-700">
                  <span>Falta</span><span>{formatCurrency(remaining)}</span>
                </div>
              )}
              {/* Vuelto a entregar al cliente (visible solo si sobra) */}
              {change > 0 && (
                <div className="flex justify-between text-green-400 font-bold text-base pt-1 border-t border-surface-700">
                  <span>VUELTO</span><span>{formatCurrency(change)}</span>
                </div>
              )}
            </div>
          )}

          {/* ── Selector de tipo de comprobante ── */}
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

          {/* ── Botones finales: cancelar y confirmar venta ── */}
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
