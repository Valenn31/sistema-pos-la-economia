/**
 * MovementsTab — Historial de movimientos de stock.
 */
import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Badge }      from '@/shared/components/Badge'
import { Spinner }    from '@/shared/components/Spinner'
import { Pagination } from '@/shared/components/Pagination'
import { getMovements } from '../services/movementService'
import { formatDateTime } from '@/shared/utils/formatters'

const TYPE_COLORS = {
  venta:     'red',
  compra:    'green',
  ajuste:    'yellow',
  traslado:  'blue',
  devolucion:'purple',
  vencimiento:'gray',
}

const TYPE_LABELS = {
  venta:      'Venta',
  compra:     'Compra',
  ajuste:     'Ajuste',
  traslado:   'Traslado',
  devolucion: 'Devolución',
  vencimiento:'Vencimiento',
}

export function MovementsTab() {
  const [movements,  setMovements]  = useState([])
  const [loading,    setLoading]    = useState(true)
  const [page,       setPage]       = useState(1)
  const [pageSize,   setPageSize]   = useState(50)
  const [typeFilter, setTypeFilter] = useState('')

  useEffect(() => {
    getMovements({ limit: 500 })
      .then(setMovements)
      .catch(() => toast.error('Error al cargar movimientos'))
      .finally(() => setLoading(false))
  }, [])

  const filtered   = typeFilter ? movements.filter((m) => m.movement_type === typeFilter) : movements
  const totalPages = Math.ceil(filtered.length / pageSize)
  const paged      = filtered.slice((page - 1) * pageSize, page * pageSize)

  if (loading) return <div className="flex justify-center py-16"><Spinner /></div>

  return (
    <div className="space-y-3">
      {/* Filtro por tipo */}
      <div className="flex items-center gap-3">
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1) }}
          className="input-base w-48"
        >
          <option value="">Todos los tipos</option>
          {Object.entries(TYPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <span className="text-xs text-surface-500">{filtered.length} movimiento{filtered.length !== 1 ? 's' : ''}</span>
      </div>

    <div className="overflow-x-auto rounded-xl border border-surface-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-surface-800 text-surface-400 text-left">
            <th className="px-4 py-3 font-medium">Fecha</th>
            <th className="px-4 py-3 font-medium">Tipo</th>
            <th className="px-4 py-3 font-medium">Producto</th>
            <th className="px-4 py-3 font-medium text-center">Cantidad</th>
            <th className="px-4 py-3 font-medium">Desde → Hasta</th>
            <th className="px-4 py-3 font-medium">Usuario</th>
            <th className="px-4 py-3 font-medium">Notas</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-800">
          {paged.length === 0 && (
            <tr><td colSpan={7} className="text-center text-surface-600 py-10">Sin movimientos</td></tr>
          )}
          {paged.map((m) => (
            <tr key={m.id} className="hover:bg-surface-800/50 transition-colors">
              <td className="px-4 py-3 text-surface-400 text-xs whitespace-nowrap">{formatDateTime(m.created_at)}</td>
              <td className="px-4 py-3">
                <Badge color={TYPE_COLORS[m.movement_type] ?? 'gray'}>
                  {TYPE_LABELS[m.movement_type] ?? m.movement_type}
                </Badge>
              </td>
              <td className="px-4 py-3 text-white">{m.products?.name ?? '—'}</td>
              <td className="px-4 py-3 text-center font-mono font-semibold text-white">{m.quantity}</td>
              <td className="px-4 py-3 text-surface-400 text-xs">
                {m.from_loc?.name ?? '—'} → {m.to_loc?.name ?? '—'}
              </td>
              <td className="px-4 py-3 text-surface-400">{m.profiles?.full_name ?? '—'}</td>
              <td className="px-4 py-3 text-surface-500 text-xs">{m.notes || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <Pagination
      page={page}
      totalPages={totalPages}
      onPageChange={setPage}
      pageSize={pageSize}
      onPageSizeChange={(s) => { setPageSize(s); setPage(1) }}
      totalItems={filtered.length}
    />
    </div>
  )
}
