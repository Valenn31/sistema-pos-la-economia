/**
 * Pagination — Componente de paginación reutilizable.
 *
 * Renderiza controles de navegación por páginas con:
 *  - Botones de página anterior / siguiente (flechas).
 *  - Botones numéricos para las páginas cercanas a la actual (ventana de 5).
 *  - Puntos suspensivos (...) cuando hay páginas intermedias omitidas.
 *  - Contador opcional de resultados totales.
 *  - Selector opcional de cantidad de ítems por página (20, 50, 100).
 *
 * Se oculta automáticamente si hay una sola página y no hay selector de tamaño.
 *
 * @param {object} props
 * @param {number}   props.page             - Página actual (1-based, empieza en 1)
 * @param {number}   props.totalPages       - Cantidad total de páginas
 * @param {Function} props.onPageChange     - Callback al cambiar de página: (nuevaPagina) => void
 * @param {number}   [props.pageSize]       - Cantidad de ítems por página actual
 * @param {Function} [props.onPageSizeChange] - Callback al cambiar tamaño de página: (nuevoTamaño) => void
 * @param {number}   [props.totalItems]     - Cantidad total de resultados (para mostrar el contador)
 * @returns {JSX.Element|null} Controles de paginación o null si no se necesitan
 */
import { ChevronLeft, ChevronRight } from 'lucide-react'

/** Opciones disponibles para el selector de ítems por página */
const SIZES = [20, 50, 100]

/**
 * Pagination — Componente principal de paginación.
 *
 * @returns {JSX.Element|null}
 */
export function Pagination({ page, totalPages, onPageChange, pageSize, onPageSizeChange, totalItems }) {
  /* Si solo hay una página y no hay selector de tamaño, no mostrar nada */
  if (totalPages <= 1 && !onPageSizeChange) return null

  /**
   * Calcular la ventana de páginas visibles.
   * Se muestran hasta 5 botones numéricos centrados en la página actual
   * (2 antes + actual + 2 después), limitados por los extremos.
   */
  const pages = []
  const start = Math.max(1, page - 2)
  const end   = Math.min(totalPages, page + 2)
  for (let i = start; i <= end; i++) pages.push(i)

  return (
    <div className="flex items-center justify-between gap-4 py-3 px-1 text-sm">
      {/* ── Lado izquierdo: contador de resultados y selector de tamaño ── */}
      <div className="flex items-center gap-2 text-surface-500">
        {/* Contador de resultados totales (opcional) */}
        {totalItems !== undefined && (
          <span>{totalItems} resultado{totalItems !== 1 ? 's' : ''}</span>
        )}
        {/* Selector de cantidad de ítems por página (opcional) */}
        {onPageSizeChange && (
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="bg-surface-800 border border-surface-700 text-surface-300 rounded-lg px-2 py-1 text-xs"
          >
            {SIZES.map((s) => <option key={s} value={s}>{s} por página</option>)}
          </select>
        )}
      </div>

      {/* ── Lado derecho: botones de navegación por página ──────────── */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          {/* Botón "página anterior" */}
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
            className="p-1.5 rounded-lg disabled:opacity-30 text-surface-400 hover:text-white hover:bg-surface-700 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Primera página + elipsis si la ventana no empieza en 1 */}
          {start > 1 && (
            <>
              <PageBtn n={1} current={page} onClick={onPageChange} />
              {start > 2 && <span className="px-1 text-surface-600">…</span>}
            </>
          )}

          {/* Botones numéricos de la ventana visible */}
          {pages.map((n) => <PageBtn key={n} n={n} current={page} onClick={onPageChange} />)}

          {/* Última página + elipsis si la ventana no llega al final */}
          {end < totalPages && (
            <>
              {end < totalPages - 1 && <span className="px-1 text-surface-600">…</span>}
              <PageBtn n={totalPages} current={page} onClick={onPageChange} />
            </>
          )}

          {/* Botón "página siguiente" */}
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page === totalPages}
            className="p-1.5 rounded-lg disabled:opacity-30 text-surface-400 hover:text-white hover:bg-surface-700 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}

/**
 * PageBtn — Botón individual de número de página.
 *
 * Muestra un estilo destacado (fondo primario) si la página
 * coincide con la página actual, o un estilo neutro si no.
 *
 * @param {object} props
 * @param {number}   props.n       - Número de página que representa este botón
 * @param {number}   props.current - Número de la página actualmente activa
 * @param {Function} props.onClick - Callback al hacer click: (numeroPagina) => void
 * @returns {JSX.Element} Botón de página estilizado
 */
function PageBtn({ n, current, onClick }) {
  return (
    <button
      onClick={() => onClick(n)}
      className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
        n === current
          ? 'bg-primary-600 text-white'                                    /* Página activa */
          : 'text-surface-400 hover:text-white hover:bg-surface-700'       /* Página inactiva */
      }`}
    >
      {n}
    </button>
  )
}
