/**
 * CashReportTab — Historial de sesiones de caja.
 */
import { useState } from 'react'
import { Search, FileSpreadsheet } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '@/shared/components/Button'
import { Badge } from '@/shared/components/Badge'
import { Spinner } from '@/shared/components/Spinner'
import { getCashReport } from '../services/reportsService'
import { exportToExcel } from '@/shared/utils/exporters'
import { formatCurrency, formatDateTime } from '@/shared/utils/formatters'

const today = () => new Date().toISOString().slice(0, 10)
const firstOfMonth = () => { const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10) }

export function CashReportTab() {
  const [from, setFrom]       = useState(firstOfMonth())
  const [to, setTo]           = useState(today())
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  const search = async () => {
    setLoading(true)
    try {
      const [fy, fm, fd] = from.split('-').map(Number)
      const [ty, tm, td] = to.split('-').map(Number)
      const fromDt = new Date(fy, fm - 1, fd, 0, 0, 0, 0)
      const toDt   = new Date(ty, tm - 1, td, 23, 59, 59, 999)
      setSessions(await getCashReport({ from: fromDt.toISOString(), to: toDt.toISOString() }))
      setSearched(true)
    } catch { toast.error('Error al cargar sesiones') }
    finally { setLoading(false) }
  }

  const doExport = () => {
    const rows = sessions.map((s) => ({
      Caja:             s.cash_registers?.name ?? '',
      Operador:         s.profiles?.full_name ?? '',
      'Apertura':       formatDateTime(s.opened_at),
      'Cierre':         s.closed_at ? formatDateTime(s.closed_at) : 'Abierta',
      'Monto apertura': s.opening_amount,
      'Monto cierre':   s.closing_amount ?? '',
      Estado:           s.status,
    }))
    exportToExcel(rows, `cajas_${from}_${to}`, 'Sesiones de caja')
  }

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-end gap-4">
        <div>
          <label className="label-base">Desde</label>
          <input type="date" className="input-base" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="label-base">Hasta</label>
          <input type="date" className="input-base" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <Button onClick={search} loading={loading}><Search className="w-4 h-4" /> Buscar</Button>
        {searched && sessions.length > 0 && (
          <Button variant="secondary" onClick={doExport}><FileSpreadsheet className="w-4 h-4" /> Excel</Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : searched && (
        <div className="overflow-x-auto rounded-xl border border-surface-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-800 text-surface-400 text-left">
                <th className="px-4 py-3">Caja</th>
                <th className="px-4 py-3">Operador</th>
                <th className="px-4 py-3">Apertura</th>
                <th className="px-4 py-3">Cierre</th>
                <th className="px-4 py-3 text-right">Apertura ($)</th>
                <th className="px-4 py-3 text-right">Cierre ($)</th>
                <th className="px-4 py-3 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-800">
              {sessions.length === 0 && (
                <tr><td colSpan={7} className="text-center text-surface-600 py-10">Sin sesiones</td></tr>
              )}
              {sessions.map((s) => (
                <tr key={s.id} className="hover:bg-surface-800/50 transition-colors">
                  <td className="px-4 py-2.5 font-medium text-white">{s.cash_registers?.name ?? '—'}</td>
                  <td className="px-4 py-2.5 text-surface-300">{s.profiles?.full_name ?? '—'}</td>
                  <td className="px-4 py-2.5 text-surface-400 text-xs">{formatDateTime(s.opened_at)}</td>
                  <td className="px-4 py-2.5 text-surface-400 text-xs">
                    {s.closed_at ? formatDateTime(s.closed_at) : <Badge color="green">Abierta</Badge>}
                  </td>
                  <td className="px-4 py-2.5 text-right text-surface-300">{formatCurrency(s.opening_amount)}</td>
                  <td className="px-4 py-2.5 text-right text-surface-300">
                    {s.closing_amount ? formatCurrency(s.closing_amount) : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <Badge color={s.status === 'open' ? 'green' : 'gray'}>
                      {s.status === 'open' ? 'Abierta' : 'Cerrada'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
