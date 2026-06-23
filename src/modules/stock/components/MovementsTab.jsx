/**
 * MovementsTab — Pestaña de historial de movimientos de stock.
 *
 * Muestra una tabla paginada con todos los movimientos de inventario
 * (ventas, compras, ajustes, traslados, devoluciones, vencimientos).
 * Permite filtrar por tipo de movimiento y paginar los resultados.
 *
 * @module stock/components/MovementsTab
 */
import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Badge }      from '@/shared/components/Badge'
import { Spinner }    from '@/shared/components/Spinner'
import { Pagination } from '@/shared/components/Pagination'
import { getMovements } from '../services/movementService'
import { formatDateTime } from '@/shared/utils/formatters'

/** Mapa de tipo de movimiento a color del badge */
const TYPE_COLORS = {
  venta:     'red',
  compra:    'green',
  ajuste:    'yellow',
  traslado:  'blue',
  devolucion:'purple',
  vencimiento:'gray',
}

/** Mapa de tipo de movimiento a etiqueta legible en español */
const TYPE_LABELS = {
  venta:      'Venta',
  compra:     'Compra',
  ajuste:     'Ajuste',
  traslado:   'Traslado',
  devolucion: 'Devolución',
  vencimiento:'Vencimiento',
}

/**
 * Componente que renderiza el historial de movimientos de stock.
 * Carga los últimos 500 movimientos al montarse, permite filtrar
 * por tipo y navegar con paginación.
 *
 * @returns {JSX.Element} Pestaña de movimientos de stock
 */
export function MovementsTab() {
  /** Estado: lista completa de movimientos de stock */
  const [movements,  setMovements]  = useState([])
  /** Estado: indica si se están cargando los datos */
  const [loading,    setLoading]    = useState(true)
  /** Estado: página actual de la paginación */
  const [page,       setPage]       = useState(1)
  /** Estado: cantidad de filas por página */
  const [pageSize,   setPageSize]   = useState(50)
  /** Estado: filtro por tipo de movimiento (vacío = todos) */
  const [typeFilter, setTypeFilter] = useState('')

  /**
   * Hook de efecto: carga los últimos 500 movimientos de stock
   * al montar el componente.
   */
  useEffect(() => {
    getMovements({ limit: 500 })
      .then(setMovements)
      .catch(() => toast.error('Error al cargar movimientos'))
      .finally(() => setLoading(false))
  }, [])

  /** Lista filtrada por tipo de movimiento (si hay filtro activo) */
  const filtered   = typeFilter ? movements.filter((m) => m.movement_type === typeFilter) : movements
  /** Total de páginas según los registros filtrados */
  const totalPages = Math.ceil(filtered.length / pageSize)
  /** Registros de la página actual */
  const paged      = filtered.slice((page - 1) * pageSize, page * pageSize)

  /* Mostrar spinner mientras se cargan los datos */
  if (loading) return <div className="flex justify-center py-16"><Spinner /></div>

  return (
    <div className="space-y-3">
      {/* Filtro por tipo de movimiento */}
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
        {/* Indicador de cantidad de movimientos filtrados */}
        <span className="text-xs text-surface-500">{filtered.length} movimiento{filtered.length !== 1 ? 's' : ''}</span>
      </div>

    {/* Tabla de movimientos de stock */}
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
          {/* Mensaje cuando no hay movimientos */}
          {paged.length === 0 && (
            <tr><td colSpan={7} className="text-center text-surface-600 py-10">Sin movimientos</td></tr>
          )}
          {/* Filas de movimientos paginados */}
          {paged.map((m) => (
            <tr key={m.id} className="hover:bg-surface-800/50 transition-colors">
              <td className="px-4 py-3 text-surface-400 text-xs whitespace-nowrap">{formatDateTime(m.created_at)}</td>
              <td className="px-4 py-3">
                {/* Badge con color según tipo de movimiento */}
                <Badge color={TYPE_COLORS[m.movement_type] ?? 'gray'}>
                  {TYPE_LABELS[m.movement_type] ?? m.movement_type}
                </Badge>
              </td>
              <td className="px-4 py-3 text-white">{m.products?.name ?? '—'}</td>
              <td className="px-4 py-3 text-center font-mono font-semibold text-white">{m.quantity}</td>
              {/* Ubicación origen → destino del movimiento */}
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
    {/* Componente de paginación */}
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
