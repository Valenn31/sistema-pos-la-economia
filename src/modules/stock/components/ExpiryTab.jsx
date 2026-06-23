/**
 * ExpiryTab — Pestaña de alertas de vencimiento por lote.
 *
 * Muestra los movimientos de compra que tienen fecha de vencimiento (expiry_date)
 * registrada. Cada lote se clasifica en uno de cuatro estados:
 * - expired: ya vencido
 * - critical: vence en 7 días o menos
 * - warning: vence en 30 días o menos
 * - ok: vigente (más de 30 días)
 *
 * Permite filtrar por estado de vencimiento.
 *
 * @module stock/components/ExpiryTab
 */
import { useState, useEffect } from 'react'
import { Calendar } from 'lucide-react'
import toast from 'react-hot-toast'
import { Badge }   from '@/shared/components/Badge'
import { Spinner } from '@/shared/components/Spinner'
import { getExpiryAlerts } from '../services/movementService'

/**
 * Configuración visual por estado de vencimiento.
 * Define la etiqueta y el color del badge para cada estado.
 */
const STATUS_CONFIG = {
  expired:  { label: 'Vencido',           color: 'red'    },
  critical: { label: 'Vence en ≤7 días',  color: 'orange' },
  warning:  { label: 'Vence en ≤30 días', color: 'yellow' },
  ok:       { label: 'Vigente',            color: 'green'  },
}

/** Lista de filtros disponibles (incluye 'all' para mostrar todos) */
const FILTERS = ['all', 'expired', 'critical', 'warning', 'ok']

/**
 * Calcula los días restantes hasta una fecha de vencimiento.
 * Retorna un número negativo si ya venció.
 * @param {string} dateStr - Fecha de vencimiento en formato ISO
 * @returns {number} Días hasta el vencimiento (negativo si ya venció)
 */
function daysUntil(dateStr) {
  const exp   = new Date(dateStr)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  return Math.floor((exp - today) / (1000 * 60 * 60 * 24))
}

/**
 * Componente que renderiza la pestaña de alertas de vencimiento.
 * Carga los lotes con fecha de vencimiento al montarse y permite
 * filtrar por estado (vencido, crítico, advertencia, vigente).
 *
 * @returns {JSX.Element} Pestaña de vencimientos
 */
export function ExpiryTab() {
  /** Estado: lista de lotes con fecha de vencimiento */
  const [rows,    setRows]    = useState([])
  /** Estado: indica si se están cargando los datos */
  const [loading, setLoading] = useState(true)
  /** Estado: filtro activo ('all' | 'expired' | 'critical' | 'warning' | 'ok') */
  const [filter,  setFilter]  = useState('all')

  /**
   * Hook de efecto: carga las alertas de vencimiento al montar el componente.
   * Cada registro incluye el producto, cantidad del lote, fecha de vencimiento y estado.
   */
  useEffect(() => {
    getExpiryAlerts()
      .then(setRows)
      .catch(() => toast.error('Error al cargar vencimientos'))
      .finally(() => setLoading(false))
  }, [])

  /** Conteo de lotes por cada estado de vencimiento */
  const counts   = rows.reduce((acc, r) => { acc[r.status] = (acc[r.status] ?? 0) + 1; return acc }, {})
  /** Lista filtrada según el filtro seleccionado */
  const filtered = filter === 'all' ? rows : rows.filter((r) => r.status === filter)

  /**
   * Genera la etiqueta del botón de filtro con el conteo correspondiente.
   * @param {string} s - Identificador del filtro
   * @returns {string} Etiqueta con formato "Estado (N)"
   */
  const filterLabel = (s) =>
    s === 'all' ? `Todos (${rows.length})` : `${STATUS_CONFIG[s].label} (${counts[s] ?? 0})`

  return (
    <div className="space-y-4">
      {/* Botones de filtro rápido por estado de vencimiento */}
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
        /* Estado vacío: no hay registros de vencimiento */
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
        /* Tabla de lotes con fecha de vencimiento */
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
                /** Días restantes hasta el vencimiento de este lote */
                const days = daysUntil(row.expiry_date)
                /** Configuración visual del estado (etiqueta + color) */
                const cfg  = STATUS_CONFIG[row.status]
                return (
                  <tr key={row.id} className="hover:bg-surface-800/40 transition-colors">
                    {/* Nombre y SKU del producto */}
                    <td className="px-4 py-3">
                      <p className="font-medium text-white">{row.products?.name ?? '—'}</p>
                      {row.products?.sku && (
                        <p className="text-xs text-surface-500 font-mono">{row.products.sku}</p>
                      )}
                    </td>
                    {/* Cantidad del lote */}
                    <td className="px-4 py-3 text-center font-semibold text-white">{row.quantity ?? '—'}</td>
                    {/* Fecha de vencimiento formateada */}
                    <td className="px-4 py-3 text-surface-300">
                      {new Date(row.expiry_date).toLocaleDateString('es-AR')}
                    </td>
                    {/* Indicador de días restantes con colores según urgencia */}
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
                    {/* Badge de estado */}
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
