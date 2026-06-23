/**
 * Pagination — Paginación reutilizable.
 * Props: page (1-based), totalPages, onPageChange(page), pageSize, onPageSizeChange (opcional)
 */
import { ChevronLeft, ChevronRight } from 'lucide-react'

const SIZES = [20, 50, 100]

export function Pagination({ page, totalPages, onPageChange, pageSize, onPageSizeChange, totalItems }) {
  if (totalPages <= 1 && !onPageSizeChange) return null

  const pages = []
  const start = Math.max(1, page - 2)
  const end   = Math.min(totalPages, page + 2)
  for (let i = start; i <= end; i++) pages.push(i)

  return (
    <div className="flex items-center justify-between gap-4 py-3 px-1 text-sm">
      <div className="flex items-center gap-2 text-surface-500">
        {totalItems !== undefined && (
          <span>{totalItems} resultado{totalItems !== 1 ? 's' : ''}</span>
        )}
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

      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
            className="p-1.5 rounded-lg disabled:opacity-30 text-surface-400 hover:text-white hover:bg-surface-700 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {start > 1 && (
            <>
              <PageBtn n={1} current={page} onClick={onPageChange} />
              {start > 2 && <span className="px-1 text-surface-600">…</span>}
            </>
          )}

          {pages.map((n) => <PageBtn key={n} n={n} current={page} onClick={onPageChange} />)}

          {end < totalPages && (
            <>
              {end < totalPages - 1 && <span className="px-1 text-surface-600">…</span>}
              <PageBtn n={totalPages} current={page} onClick={onPageChange} />
            </>
          )}

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

function PageBtn({ n, current, onClick }) {
  return (
    <button
      onClick={() => onClick(n)}
      className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
        n === current
          ? 'bg-primary-600 text-white'
          : 'text-surface-400 hover:text-white hover:bg-surface-700'
      }`}
    >
      {n}
    </button>
  )
}
