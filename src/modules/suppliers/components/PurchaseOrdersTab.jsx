/**
 * PurchaseOrdersTab — Lista y gestión de Órdenes de Compra.
 * Admin puede crear, confirmar y registrar recepción.
 */
import { useState, useEffect } from 'react'
import { Plus, Package, CheckCircle, Truck, FileText } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '@/shared/components/Button'
import { Badge } from '@/shared/components/Badge'
import { Spinner } from '@/shared/components/Spinner'
import { getPurchaseOrders, updateOrderStatus, getPurchaseOrderById } from '../services/purchaseService'
import { formatDateTime, formatCurrency } from '@/shared/utils/formatters'
import { exportToPDF } from '@/shared/utils/exporters'
import { PurchaseOrderFormModal } from './PurchaseOrderFormModal'
import { ReceiveOrderModal } from './ReceiveOrderModal'

const STATUS_COLORS = {
  pending:   'yellow',
  confirmed: 'blue',
  received:  'green',
  cancelled: 'red',
}

const STATUS_LABELS = {
  pending:   'Pendiente',
  confirmed: 'Confirmada',
  received:  'Recibida',
  cancelled: 'Cancelada',
}

export function PurchaseOrdersTab({ suppliers }) {
  const [orders, setOrders]         = useState([])
  const [loading, setLoading]       = useState(true)
  const [formOpen, setFormOpen]     = useState(false)
  const [receiveId, setReceiveId]   = useState(null)

  const load = async () => {
    setLoading(true)
    try { setOrders(await getPurchaseOrders()) }
    catch { toast.error('Error al cargar órdenes') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const printOrderPdf = async (id) => {
    try {
      const order = await getPurchaseOrderById(id)
      const cols = [
        { header: 'Producto', dataKey: 'producto' },
        { header: 'SKU',      dataKey: 'sku'      },
        { header: 'Cantidad', dataKey: 'cantidad'  },
        { header: 'P. Unit.', dataKey: 'precio'   },
        { header: 'Subtotal', dataKey: 'subtotal'  },
      ]
      const rows = (order.items ?? []).map((i) => ({
        producto: i.products?.name ?? '—',
        sku:      i.products?.sku  ?? '—',
        cantidad: i.quantity_ordered,
        precio:   formatCurrency(i.unit_price),
        subtotal: formatCurrency(i.subtotal),
      }))
      const title = `Orden de Compra #${order.order_number} — ${order.suppliers?.razon_social ?? ''}`
      exportToPDF(cols, rows, title, `oc_${order.order_number}`)
    } catch { toast.error('Error al generar PDF') }
  }

  const changeStatus = async (id, status) => {
    try {
      await updateOrderStatus(id, status)
      toast.success(`OC marcada como "${STATUS_LABELS[status]}"`)
      load()
    } catch (err) {
      toast.error(err.message ?? 'Error')
    }
  }

  if (loading) return <div className="flex justify-center py-16"><Spinner /></div>

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="w-4 h-4" /> Nueva OC
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-surface-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-800 text-surface-400 text-left">
              <th className="px-4 py-3 font-medium">OC #</th>
              <th className="px-4 py-3 font-medium">Proveedor</th>
              <th className="px-4 py-3 font-medium">Entrega esperada</th>
              <th className="px-4 py-3 font-medium text-right">Total</th>
              <th className="px-4 py-3 font-medium text-center">Estado</th>
              <th className="px-4 py-3 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-800">
            {orders.length === 0 && (
              <tr><td colSpan={6} className="text-center text-surface-600 py-10">Sin órdenes de compra</td></tr>
            )}
            {orders.map((o) => (
              <tr key={o.id} className="hover:bg-surface-800/50 transition-colors">
                <td className="px-4 py-3 font-mono text-surface-400 text-xs">#{o.order_number}</td>
                <td className="px-4 py-3 font-medium text-white">{o.suppliers?.razon_social ?? '—'}</td>
                <td className="px-4 py-3 text-surface-400 text-xs">
                  {o.expected_date ? new Date(o.expected_date).toLocaleDateString('es-AR') : '—'}
                </td>
                <td className="px-4 py-3 text-right font-semibold text-white">
                  {o.total_amount ? formatCurrency(o.total_amount) : '—'}
                </td>
                <td className="px-4 py-3 text-center">
                  <Badge color={STATUS_COLORS[o.status] ?? 'gray'}>{STATUS_LABELS[o.status] ?? o.status}</Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      title="Exportar PDF"
                      onClick={() => printOrderPdf(o.id)}
                      className="p-1.5 text-surface-500 hover:text-white hover:bg-surface-700 rounded-lg transition-colors"
                    >
                      <FileText className="w-4 h-4" />
                    </button>
                    {o.status === 'pending' && (
                      <button
                        title="Confirmar OC"
                        onClick={() => changeStatus(o.id, 'confirmed')}
                        className="p-1.5 text-surface-500 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                    )}
                    {(o.status === 'confirmed' || o.status === 'pending') && (
                      <button
                        title="Registrar recepción"
                        onClick={() => setReceiveId(o.id)}
                        className="p-1.5 text-surface-500 hover:text-green-400 hover:bg-green-400/10 rounded-lg transition-colors"
                      >
                        <Truck className="w-4 h-4" />
                      </button>
                    )}
                    {o.status !== 'received' && o.status !== 'cancelled' && (
                      <button
                        title="Cancelar OC"
                        onClick={() => changeStatus(o.id, 'cancelled')}
                        className="p-1.5 text-surface-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                      >
                        <Package className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <PurchaseOrderFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={load}
        fromNote={null}
        suppliers={suppliers}
      />

      {receiveId && (
        <ReceiveOrderModal
          open={!!receiveId}
          onClose={() => setReceiveId(null)}
          onSaved={load}
          orderId={receiveId}
        />
      )}
    </div>
  )
}
