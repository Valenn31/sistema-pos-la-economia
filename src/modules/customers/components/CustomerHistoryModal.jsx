/**
 * CustomerHistoryModal — Historial de compras de un cliente.
 * Muestra las últimas 30 ventas con fecha, número, total y métodos de pago.
 */
import { useState, useEffect } from 'react'
import { ShoppingCart } from 'lucide-react'
import { Modal }   from '@/shared/components/Modal'
import { Spinner } from '@/shared/components/Spinner'
import { Badge }   from '@/shared/components/Badge'
import { getCustomerSales } from '../services/customerService'
import { formatCurrency, formatDateTime } from '@/shared/utils/formatters'
import toast from 'react-hot-toast'

const METHOD_LABELS = {
  efectivo: 'Efectivo', debito: 'Débito', credito: 'Crédito',
  qr: 'QR/MP', transferencia: 'Transf.', cuenta: 'Cta.Cte.',
}

export function CustomerHistoryModal({ open, onClose, customer }) {
  const [sales,   setSales]   = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !customer) return
    setLoading(true)
    getCustomerSales(customer.id, 30)
      .then(setSales)
      .catch(() => toast.error('Error al cargar historial'))
      .finally(() => setLoading(false))
  }, [open, customer])

  const totalAmount = sales.reduce((s, v) => s + Number(v.total ?? 0), 0)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Historial — ${customer?.full_name ?? ''}`}
      size="xl"
    >
      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-surface-800 rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-white">{sales.length}</p>
              <p className="text-xs text-surface-500">compras</p>
            </div>
            <div className="bg-surface-800 rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-primary-400">{formatCurrency(totalAmount)}</p>
              <p className="text-xs text-surface-500">total comprado</p>
            </div>
          </div>

          {sales.length === 0 ? (
            <div className="text-center py-12 text-surface-500">
              <ShoppingCart className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>Sin compras registradas</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-surface-800 max-h-[55vh] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-surface-900">
                  <tr className="border-b border-surface-800 text-surface-400 text-left">
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Métodos</th>
                    <th className="px-4 py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-800">
                  {sales.map((s) => (
                    <tr key={s.id} className="hover:bg-surface-800/40 transition-colors">
                      <td className="px-4 py-2.5 font-mono text-surface-400 text-xs">
                        #{s.sale_number}
                      </td>
                      <td className="px-4 py-2.5 text-surface-400 text-xs whitespace-nowrap">
                        {formatDateTime(s.created_at)}
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge color="gray">{s.receipt_type}</Badge>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          {(s.sale_payments ?? []).map((p, i) => (
                            <span key={i} className="text-xs text-surface-400">
                              {METHOD_LABELS[p.method] ?? p.method}
                              <span className="text-white ml-1">{formatCurrency(p.amount)}</span>
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-right font-semibold text-white">
                        {formatCurrency(s.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </Modal>
  )
}
