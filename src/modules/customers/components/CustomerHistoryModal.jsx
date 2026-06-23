/**
 * CustomerHistoryModal — Ficha de cuenta corriente del cliente.
 * Timeline de movimientos (compras en cta cte + pagos) con saldo acumulado.
 * Permite registrar pagos de deuda desde el mismo modal.
 */
import { useState, useEffect } from 'react'
import { ShoppingCart, Wallet, ChevronDown, ChevronUp, DollarSign } from 'lucide-react'
import toast from 'react-hot-toast'
import { Modal }   from '@/shared/components/Modal'
import { Spinner } from '@/shared/components/Spinner'
import { Badge }   from '@/shared/components/Badge'
import { Button }  from '@/shared/components/Button'
import { getAccountStatement, getCustomerSales, registerPayment, getCustomerById } from '../services/customerService'
import { formatCurrency, formatDateTime } from '@/shared/utils/formatters'

const METHOD_LABELS = {
  efectivo: 'Efectivo', debito: 'Débito', credito: 'Crédito',
  qr: 'QR/MP', transferencia: 'Transf.', cuenta: 'Cta.Cte.',
}

const PAYMENT_METHODS = [
  { value: 'efectivo',      label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'debito',        label: 'Débito' },
  { value: 'qr',            label: 'QR / MP' },
]

export function CustomerHistoryModal({ open, onClose, customer, userId, onPaymentDone }) {
  const [tab, setTab]               = useState('cuenta')
  const [movements, setMovements]   = useState([])
  const [sales, setSales]           = useState([])
  const [loading, setLoading]       = useState(false)
  const [expanded, setExpanded]     = useState({})
  const [currentCustomer, setCurrentCustomer] = useState(customer)

  // Payment form
  const [showPayForm, setShowPayForm] = useState(false)
  const [payAmount, setPayAmount]     = useState('')
  const [payMethod, setPayMethod]     = useState('efectivo')
  const [payNotes, setPayNotes]       = useState('')
  const [paying, setPaying]           = useState(false)

  const loadData = async () => {
    if (!customer) return
    setLoading(true)
    try {
      const [stmt, salesData, fresh] = await Promise.all([
        getAccountStatement(customer.id),
        getCustomerSales(customer.id, 50),
        getCustomerById(customer.id),
      ])
      setMovements(stmt)
      setSales(salesData)
      setCurrentCustomer(fresh)
    } catch { toast.error('Error al cargar historial') }
    finally { setLoading(false) }
  }

  useEffect(() => {
    if (open && customer) {
      setTab('cuenta')
      setShowPayForm(false)
      setExpanded({})
      loadData()
    }
  }, [open, customer])

  const toggleExpand = (id) => setExpanded((p) => ({ ...p, [id]: !p[id] }))

  const handlePay = async () => {
    const amount = parseFloat(payAmount)
    if (!amount || amount <= 0) return
    setPaying(true)
    try {
      await registerPayment({ customerId: customer.id, amount, method: payMethod, notes: payNotes, userId })
      toast.success(`Pago de ${formatCurrency(amount)} registrado`)
      setShowPayForm(false)
      setPayAmount('')
      setPayNotes('')
      await loadData()
      onPaymentDone?.()
    } catch (e) { toast.error(e.message ?? 'Error al registrar pago') }
    finally { setPaying(false) }
  }

  const totalDebit  = movements.filter((m) => m.type === 'debit').reduce((s, m) => s + m.amount, 0)
  const totalCredit = movements.filter((m) => m.type === 'credit').reduce((s, m) => s + m.amount, 0)
  const balance     = movements.length > 0 ? movements[movements.length - 1].balance : (currentCustomer?.current_balance ?? 0)
  const totalSales  = sales.reduce((s, v) => s + Number(v.total ?? 0), 0)

  return (
    <Modal open={open} onClose={onClose} title={`${currentCustomer?.full_name ?? customer?.full_name ?? ''}`} size="xl">
      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : (
        <div className="space-y-4 p-5">

          {/* Header con saldo */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-surface-800 border border-surface-700 rounded-xl p-4 text-center">
              <p className="text-xs text-surface-500 mb-1">Comprado en cta cte</p>
              <p className="text-lg font-bold text-red-400">{formatCurrency(totalDebit)}</p>
            </div>
            <div className="bg-surface-800 border border-surface-700 rounded-xl p-4 text-center">
              <p className="text-xs text-surface-500 mb-1">Total pagado</p>
              <p className="text-lg font-bold text-green-400">{formatCurrency(totalCredit)}</p>
            </div>
            <div className={`border rounded-xl p-4 text-center ${balance > 0 ? 'bg-red-900/20 border-red-700/40' : 'bg-surface-800 border-surface-700'}`}>
              <p className="text-xs text-surface-500 mb-1">Saldo actual</p>
              <p className={`text-lg font-bold ${balance > 0 ? 'text-red-400' : 'text-primary-400'}`}>
                {formatCurrency(balance)}
              </p>
            </div>
          </div>

          {/* Botón pagar */}
          {balance > 0 && !showPayForm && (
            <Button onClick={() => setShowPayForm(true)} className="w-full" size="lg">
              <Wallet className="w-4 h-4" /> Registrar pago de deuda
            </Button>
          )}

          {/* Form de pago inline */}
          {showPayForm && (
            <div className="bg-green-900/15 border border-green-700/40 rounded-xl p-4 space-y-3">
              <p className="text-sm font-semibold text-green-400">Registrar pago — Deuda: {formatCurrency(balance)}</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-base">Monto ($)</label>
                  <input
                    type="number" min="0" max={balance} step="any"
                    className="input-base" placeholder="0.00" autoFocus
                    value={payAmount} onChange={(e) => setPayAmount(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label-base">Método</label>
                  <select className="input-base" value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
                    {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="label-base">Observaciones</label>
                <input className="input-base" placeholder="Opcional" value={payNotes} onChange={(e) => setPayNotes(e.target.value)} />
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setShowPayForm(false)} className="flex-1">Cancelar</Button>
                <Button onClick={handlePay} loading={paying} disabled={!parseFloat(payAmount)} className="flex-1">
                  Confirmar pago
                </Button>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 border-b border-surface-800">
            <button
              onClick={() => setTab('cuenta')}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === 'cuenta' ? 'border-primary-500 text-primary-400' : 'border-transparent text-surface-500 hover:text-surface-300'
              }`}
            >
              Cuenta corriente
            </button>
            <button
              onClick={() => setTab('compras')}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === 'compras' ? 'border-primary-500 text-primary-400' : 'border-transparent text-surface-500 hover:text-surface-300'
              }`}
            >
              Todas las compras ({sales.length})
            </button>
          </div>

          {/* Tab: Cuenta corriente */}
          {tab === 'cuenta' && (
            movements.length === 0 ? (
              <div className="text-center py-10 text-surface-500">
                <Wallet className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>Sin movimientos en cuenta corriente</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-surface-800 max-h-[45vh] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-surface-900 z-10">
                    <tr className="border-b border-surface-800 text-surface-400 text-left">
                      <th className="px-4 py-3 w-8"></th>
                      <th className="px-4 py-3">Fecha</th>
                      <th className="px-4 py-3">Detalle</th>
                      <th className="px-4 py-3 text-right">Debe</th>
                      <th className="px-4 py-3 text-right">Haber</th>
                      <th className="px-4 py-3 text-right">Saldo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-800">
                    {movements.map((m) => (
                      <>
                        <tr
                          key={m.id}
                          className={`transition-colors ${m.items ? 'cursor-pointer hover:bg-surface-800/40' : 'hover:bg-surface-800/40'}`}
                          onClick={() => m.items && toggleExpand(m.id)}
                        >
                          <td className="px-4 py-2.5 text-center">
                            {m.type === 'debit'
                              ? <ShoppingCart className="w-4 h-4 text-red-400 inline" />
                              : <Wallet className="w-4 h-4 text-green-400 inline" />
                            }
                          </td>
                          <td className="px-4 py-2.5 text-surface-400 text-xs whitespace-nowrap">
                            {formatDateTime(m.date)}
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="text-white text-sm">{m.description}</span>
                            {m.items && (
                              expanded[m.id]
                                ? <ChevronUp className="w-3.5 h-3.5 inline ml-1 text-surface-500" />
                                : <ChevronDown className="w-3.5 h-3.5 inline ml-1 text-surface-500" />
                            )}
                            {m.notes && <span className="text-xs text-surface-500 ml-2">({m.notes})</span>}
                          </td>
                          <td className="px-4 py-2.5 text-right font-medium text-red-400">
                            {m.type === 'debit' ? formatCurrency(m.amount) : ''}
                          </td>
                          <td className="px-4 py-2.5 text-right font-medium text-green-400">
                            {m.type === 'credit' ? formatCurrency(m.amount) : ''}
                          </td>
                          <td className={`px-4 py-2.5 text-right font-semibold ${m.balance > 0 ? 'text-red-400' : 'text-primary-400'}`}>
                            {formatCurrency(m.balance)}
                          </td>
                        </tr>
                        {expanded[m.id] && m.items && (
                          <tr key={`${m.id}-detail`}>
                            <td colSpan={6} className="bg-surface-800/30 px-8 py-2">
                              <div className="space-y-1">
                                {m.items.map((it, idx) => (
                                  <div key={idx} className="flex justify-between text-xs text-surface-400">
                                    <span>{it.products?.name ?? '—'} × {it.quantity}</span>
                                    <span>{formatCurrency(it.subtotal)}</span>
                                  </div>
                                ))}
                                {m.saleTotal && (
                                  <div className="flex justify-between text-xs font-medium text-surface-300 pt-1 border-t border-surface-700">
                                    <span>Total de la venta</span>
                                    <span>{formatCurrency(m.saleTotal)}</span>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}

          {/* Tab: Todas las compras */}
          {tab === 'compras' && (
            sales.length === 0 ? (
              <div className="text-center py-10 text-surface-500">
                <ShoppingCart className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>Sin compras registradas</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-surface-800 rounded-xl p-3 text-center">
                  <p className="text-xs text-surface-500">Total comprado (todas las ventas)</p>
                  <p className="text-xl font-bold text-primary-400">{formatCurrency(totalSales)}</p>
                </div>
                <div className="overflow-x-auto rounded-xl border border-surface-800 max-h-[45vh] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-surface-900 z-10">
                      <tr className="border-b border-surface-800 text-surface-400 text-left">
                        <th className="px-4 py-3">#</th>
                        <th className="px-4 py-3">Fecha</th>
                        <th className="px-4 py-3">Métodos</th>
                        <th className="px-4 py-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-800">
                      {sales.map((s) => (
                        <tr key={s.id} className="hover:bg-surface-800/40 transition-colors">
                          <td className="px-4 py-2.5 font-mono text-surface-400 text-xs">#{s.sale_number}</td>
                          <td className="px-4 py-2.5 text-surface-400 text-xs whitespace-nowrap">{formatDateTime(s.created_at)}</td>
                          <td className="px-4 py-2.5">
                            <div className="flex flex-wrap gap-1">
                              {(s.sale_payments ?? []).map((p, i) => (
                                <Badge key={i} color={p.method === 'cuenta' ? 'yellow' : 'gray'}>
                                  {METHOD_LABELS[p.method] ?? p.method} {formatCurrency(p.amount)}
                                </Badge>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-right font-semibold text-white">{formatCurrency(s.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </Modal>
  )
}
