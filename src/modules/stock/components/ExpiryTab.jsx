/**
 * ExpiryTab — Alertas de vencimiento por lote.
 * Muestra los movimientos de compra que tienen expiry_date registrado.
 * Estados: expired | critical (≤7d) | warning (≤30d) | ok
 */
import { useState, useEffect } from 'react'
import { Calendar } from 'lucide-react'
import toast from 'react-hot-toast'
import { Badge }   from '@/shared/components/Badge'
import { Spinner } from '@/shared/components/Spinner'
import { getExpiryAlerts } from '../services/movementService'

const STATUS_CONFIG = {
  expired:  { label: 'Vencido',           color: 'red'    },
  critical: { label: 'Vence en ≤7 días',  color: 'orange' },
  warning:  { label: 'Vence en ≤30 días', color: 'yellow' },
  ok:       { label: 'Vigente',            color: 'green'  },
}

const FILTERS = ['all', 'expired', 'critical', 'warning', 'ok']

function daysUntil(dateStr) {
  const exp   = new Date(dateStr)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  return Math.floor((exp - today) / (1000 * 60 * 60 * 24))
}

export function ExpiryTab() {
  const [rows,    setRows]    = useState([])
  const [loading, setLoading] = useState(true)
  const [filter,  setFilter]  = useState('all')

  useEffect(() => {
    getExpiryAlerts()
      .then(setRows)
      .catch(() => toast.error('Error al cargar vencimientos'))
      .finally(() => setLoading(false))
  }, [])

  const counts   = rows.reduce((acc, r) => { acc[r.status] = (acc[r.status] ?? 0) + 1; return acc }, {})
  const filtered = filter === 'all' ? rows : rows.filter((r) => r.status === filter)

  const filterLabel = (s) =>
    s === 'all' ? `Todos (${rows.length})` : `${STATUS_CONFIG[s].label} (${counts[s] ?? 0})`

  return (
    <div className="space-y-4">
      {/* Filtros rápidos */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === s
                ? 'bg-primary-600 text-white'
                : 'bg-surface-800 text-surface-300 hover:bg-surface-700'
            }`}
          >
            {filterLabel(s)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-16 text-surface-500">
          <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>
            {rows.length === 0
              ? 'No hay productos con fecha de vencimiento registrada'
              : 'Sin registros para este filtro'}
          </p>
          {rows.length === 0 && (
            <p className="text-xs mt-2 text-surface-600">
              Podés cargar la fecha de vencimiento desde el formulario de producto o al recibir mercadería.
            </p>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-surface-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-800 text-surface-400 text-left">
                <th className="px-4 py-3">Producto</th>
                <th className="px-4 py-3 text-center">Cant. lote</th>
                <th className="px-4 py-3">Fecha vencimiento</th>
                <th className="px-4 py-3">Días restantes</th>
                <th className="px-4 py-3 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-800">
              {filtered.map((row) => {
                const days = daysUntil(row.expiry_date)
                const cfg  = STATUS_CONFIG[row.status]
                return (
                  <tr key={row.id} className="hover:bg-surface-800/40 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-white">{row.products?.name ?? '—'}</p>
                      {row.products?.sku && (
                        <p className="text-xs text-surface-500 font-mono">{row.products.sku}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center font-semibold text-white">{row.quantity ?? '—'}</td>
                    <td className="px-4 py-3 text-surface-300">
                      {new Date(row.expiry_date).toLocaleDateString('es-AR')}
                    </td>
                    <td className="px-4 py-3">
                      {days < 0 ? (
                        <span className="text-red-400 font-semibold">Vencido hace {Math.abs(days)}d</span>
                      ) : days === 0 ? (
                        <span className="text-orange-400 font-bold">Vence hoy</span>
                      ) : (
                        <span className={
                          days <= 7  ? 'text-orange-400 font-semibold' :
                          days <= 30 ? 'text-yellow-400' :
                          'text-surface-400'
                        }>
                          {days} días
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge color={cfg.color}>{cfg.label}</Badge>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
