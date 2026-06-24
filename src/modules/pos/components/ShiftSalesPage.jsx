/**
 * ShiftSalesPage — Listado informativo de ventas del turno activo.
 * Muestra las ventas realizadas en la sesión de caja actual con KPIs
 * de resumen (cantidad, total, desglose por método).
 * Solo visible cuando hay una caja abierta.
 */
import { useState, useEffect, useCallback } from 'react'
import { ClipboardList, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { Spinner } from '@/shared/components/Spinner'
import { Badge }   from '@/shared/components/Badge'
import { Button }  from '@/shared/components/Button'
import { useUIStore } from '@/shared/store/uiStore'
import { getSessionSales } from '../services/cashSessionService'
import { formatCurrency, formatDateTime } from '@/shared/utils/formatters'

const METHOD_LABELS = {
  efectivo: 'Efectivo', debito: 'Débito', credito: 'Crédito',
  qr: 'QR/MP', transferencia: 'Transf.', cuenta: 'Cta.Cte.',
}

export function ShiftSalesPage() {
  const sessionId = useUIStore((s) => s.activeSessionId)
  const [sales, setSales]     = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!sessionId) { setLoading(false); return }
    setLoading(true)
    try {
      setSales(await getSessionSales(sessionId))
    } catch { toast.error('Error al cargar ventas del turno') }
    finally { setLoading(false) }
  }, [sessionId])

  useEffect(() => { load() }, [load])

  if (!sessionId) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-surface-500">
          <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No hay caja abierta</p>
          <p className="text-xs mt-1">Abrí un turno desde el POS para ver las ventas.</p>
        </div>
      </div>
    )
  }

  const totalAmount = sales.reduce((s, v) => s + Number(v.total), 0)
  const byMethod = {}
  for (const sale of sales) {
    for (const p of (sale.sale_payments ?? [])) {
      byMethod[p.method] = (byMethod[p.method] ?? 0) + Number(p.amount)
    }
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 max-w-4xl mx-auto space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ClipboardList className="w-6 h-6 text-primary-400" />
            <h1 className="text-2xl font-bold text-white">Mi turno</h1>
          </div>
          <Button variant="ghost" size="sm" onClick={load}>
            <RefreshCw className="w-4 h-4" /> Actualizar
          </Button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="card text-center">
            <p className="text-2xl font-bold text-white">{sales.length}</p>
            <p className="text-xs text-surface-500">ventas</p>
          </div>
          <div className="card text-center">
            <p className="text-2xl font-bold text-primary-400">{formatCurrency(totalAmount)}</p>
            <p className="text-xs text-surface-500">recaudado</p>
          </div>
          {Object.entries(byMethod).filter(([, v]) => v > 0).slice(0, 2).map(([method, amount]) => (
            <div key={method} className="card text-center">
              <p className="text-2xl font-bold text-white">{formatCurrency(amount)}</p>
              <p className="text-xs text-surface-500">{METHOD_LABELS[method] ?? method}</p>
            </div>
          ))}
        </div>

        {/* Tabla de ventas */}
        {loading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : sales.length === 0 ? (
          <div className="card text-center py-12 text-surface-500">
            <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>Todavía no hay ventas en este turno</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-surface-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-800 text-surface-400 text-left">
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Hora</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Métodos</th>
                  <th className="px-4 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-800">
                {sales.map((s) => (
                  <tr key={s.id} className="hover:bg-surface-800/40 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-surface-400 text-xs">#{s.sale_number}</td>
                    <td className="px-4 py-2.5 text-surface-400 text-xs whitespace-nowrap">
                      {new Date(s.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-2.5 text-surface-300">{s.customers?.full_name ?? 'Anónimo'}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {(s.sale_payments ?? []).map((p, i) => (
                          <Badge key={i} color={p.method === 'cuenta' ? 'yellow' : 'gray'}>
                            {METHOD_LABELS[p.method] ?? p.method}
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
        )}
      </div>
    </div>
  )
}
