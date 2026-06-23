/**
 * Modal — Componente base reutilizable para diálogos modales.
 *
 * Provee la estructura visual común para cualquier ventana modal:
 * backdrop oscuro con blur, contenedor centrado con header y cuerpo scrollable.
 *
 * Se cierra de dos formas:
 *  1. Presionando la tecla Escape.
 *  2. Haciendo click en el backdrop (fondo oscuro).
 *
 * @param {object} props
 * @param {boolean}         props.open      - Controla si el modal es visible
 * @param {Function}        props.onClose   - Callback para cerrar el modal
 * @param {string}          [props.title]   - Título del header (si no se pasa, no se muestra header)
 * @param {React.ReactNode} props.children  - Contenido del cuerpo del modal
 * @param {'sm'|'md'|'lg'|'xl'|'2xl'} [props.size='md'] - Ancho máximo del modal
 * @returns {JSX.Element|null} El modal o null si `open` es false
 */
import { useEffect } from 'react'
import { X } from 'lucide-react'

/**
 * SIZES — Mapa de clases Tailwind para cada tamaño de modal.
 * Define el max-width del contenedor.
 *
 * @type {Record<string, string>}
 */
const SIZES = {
  sm:   'max-w-sm',   /* ~384px */
  md:   'max-w-md',   /* ~448px */
  lg:   'max-w-lg',   /* ~512px */
  xl:   'max-w-2xl',  /* ~672px */
  '2xl': 'max-w-4xl', /* ~896px */
}

/**
 * Modal — Renderiza un diálogo modal centrado con backdrop.
 *
 * @returns {JSX.Element|null}
 */
export function Modal({ open, onClose, title, children, size = 'md' }) {
  /**
   * Efecto: registra un listener de teclado para cerrar el modal
   * al presionar Escape. Se limpia al desmontar o cuando open cambia.
   */
  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  /* Si no está abierto, no renderizar nada */
  if (!open) return null

  return (
    /* Backdrop oscuro con blur — cierra el modal al hacer click */
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Contenedor del modal — detiene propagación para no cerrar al clickear dentro */}
      <div
        className={`bg-surface-900 border border-surface-800 rounded-2xl shadow-2xl w-full ${SIZES[size] ?? SIZES.md} max-h-[90vh] flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header con título y botón de cierre ──────────────── */}
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-surface-800 flex-shrink-0">
            <h2 className="font-bold text-white text-lg">{title}</h2>
            {/* Botón X para cerrar el modal */}
            <button
              onClick={onClose}
              className="text-surface-500 hover:text-surface-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* ── Cuerpo del modal — scrollable si el contenido excede la altura ── */}
        <div className="overflow-y-auto flex-1">
          {children}
        </div>
      </div>
    </div>
  )
}
