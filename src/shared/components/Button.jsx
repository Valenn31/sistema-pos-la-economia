/**
 * Button — Botón reutilizable con variantes y estados.
 *
 * @param {'primary'|'secondary'|'danger'|'ghost'} variant
 * @param {'sm'|'md'|'lg'}                         size
 * @param {boolean}                                loading  - muestra spinner y deshabilita
 * @param {boolean}                                disabled
 * @param {React.ReactNode}                        children
 * @param {string}                                 className - clases extra
 */
import { Spinner } from './Spinner'

const variants = {
  primary:   'bg-primary-600 hover:bg-primary-500 text-white border-transparent',
  secondary: 'bg-surface-800 hover:bg-surface-700 text-surface-100 border-surface-700',
  danger:    'bg-red-600 hover:bg-red-500 text-white border-transparent',
  ghost:     'bg-transparent hover:bg-surface-800 text-surface-300 border-transparent',
}

const sizes = {
  sm: 'text-xs px-3 py-1.5 gap-1.5',
  md: 'text-sm px-4 py-2 gap-2',
  lg: 'text-base px-5 py-2.5 gap-2.5',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  children,
  className = '',
  ...props
}) {
  return (
    <button
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center font-medium rounded-lg border
        transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-surface-900
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant]} ${sizes[size]} ${className}
      `}
      {...props}
    >
      {loading && <Spinner size="sm" />}
      {children}
    </button>
  )
}
