/**
 * ConfirmDialog — Modal de confirmación de acción destructiva.
 *
 * @param {boolean}  open
 * @param {string}   title
 * @param {string}   message
 * @param {Function} onConfirm - () => void
 * @param {Function} onCancel  - () => void
 * @param {string}   confirmLabel
 * @param {'danger'|'primary'} variant
 */
import { Button } from './Button'

export function ConfirmDialog({ open, title, message, onConfirm, onCancel, confirmLabel = 'Confirmar', variant = 'danger' }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[60] flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-surface-900 border border-surface-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-bold text-white text-lg">{title}</h2>
        {message && <p className="text-surface-400 text-sm">{message}</p>}
        <div className="flex gap-3 pt-2">
          <Button variant="secondary" onClick={onCancel} className="flex-1">Cancelar</Button>
          <Button variant={variant} onClick={onConfirm} className="flex-1">{confirmLabel}</Button>
        </div>
      </div>
    </div>
  )
}
