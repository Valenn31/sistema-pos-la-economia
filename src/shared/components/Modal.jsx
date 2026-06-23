/**
 * Modal — Contenedor base para diálogos.
 * Cierra con Escape o click en el backdrop.
 *
 * @param {boolean}         open       - Controla visibilidad
 * @param {Function}        onClose    - () => void
 * @param {string}          title      - Título del header
 * @param {React.ReactNode} children   - Contenido
 * @param {string}          size       - 'sm' | 'md' | 'lg' | 'xl'
 */
import { useEffect } from 'react'
import { X } from 'lucide-react'

const SIZES = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
  '2xl': 'max-w-4xl',
}

export function Modal({ open, onClose, title, children, size = 'md' }) {
  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className={`bg-surface-900 border border-surface-800 rounded-2xl shadow-2xl w-full ${SIZES[size] ?? SIZES.md} max-h-[90vh] flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-surface-800 flex-shrink-0">
            <h2 className="font-bold text-white text-lg">{title}</h2>
            <button
              onClick={onClose}
              className="text-surface-500 hover:text-surface-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Body — scrollable */}
        <div className="overflow-y-auto flex-1">
          {children}
        </div>
      </div>
    </div>
  )
}
