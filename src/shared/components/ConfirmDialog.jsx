/**
 * ConfirmDialog — Modal de confirmación para acciones destructivas o importantes.
 *
 * Muestra un diálogo centrado con título, mensaje descriptivo y dos botones:
 * "Cancelar" (siempre secondary) y un botón de confirmación cuyo estilo
 * depende de la variante (danger para eliminaciones, primary para confirmaciones).
 *
 * Se cierra al hacer click en el fondo oscuro (backdrop).
 *
 * @param {object} props
 * @param {boolean}  props.open          - Controla si el diálogo es visible
 * @param {string}   props.title         - Título del diálogo (ej: "Eliminar producto")
 * @param {string}   [props.message]     - Mensaje descriptivo opcional (ej: "Esta acción no se puede deshacer")
 * @param {Function} props.onConfirm     - Callback ejecutado al confirmar la acción
 * @param {Function} props.onCancel      - Callback ejecutado al cancelar o cerrar
 * @param {string}   [props.confirmLabel='Confirmar'] - Texto del botón de confirmación
 * @param {'danger'|'primary'} [props.variant='danger'] - Variante visual del botón de confirmación
 * @returns {JSX.Element|null} El diálogo o null si `open` es false
 */
import { Button } from './Button'

/**
 * ConfirmDialog — Renderiza el modal de confirmación.
 *
 * @returns {JSX.Element|null}
 */
export function ConfirmDialog({ open, title, message, onConfirm, onCancel, confirmLabel = 'Confirmar', variant = 'danger' }) {
  /* Si no está abierto, no renderizar nada */
  if (!open) return null

  return (
    /* Backdrop oscuro con blur — cierra el diálogo al hacer click */
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[60] flex items-center justify-center p-4" onClick={onCancel}>
      {/* Contenedor del diálogo — detiene la propagación del click para no cerrar */}
      <div className="bg-surface-900 border border-surface-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        {/* Título del diálogo */}
        <h2 className="font-bold text-white text-lg">{title}</h2>

        {/* Mensaje descriptivo (opcional) */}
        {message && <p className="text-surface-400 text-sm">{message}</p>}

        {/* Botones de acción: Cancelar y Confirmar */}
        <div className="flex gap-3 pt-2">
          <Button variant="secondary" onClick={onCancel} className="flex-1">Cancelar</Button>
          <Button variant={variant} onClick={onConfirm} className="flex-1">{confirmLabel}</Button>
        </div>
      </div>
    </div>
  )
}
