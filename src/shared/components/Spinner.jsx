/**
 * Spinner — Indicador de carga circular.
 * @param {string} size  - 'sm' | 'md' | 'lg' (default: 'md')
 * @param {string} className - clases adicionales de Tailwind
 */
export function Spinner({ size = 'md', className = '' }) {
  const sizes = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-2',
    lg: 'w-12 h-12 border-[3px]',
  }

  return (
    <div
      className={`${sizes[size]} rounded-full border-surface-700 border-t-primary-500 animate-spin ${className}`}
      role="status"
      aria-label="Cargando"
    />
  )
}
