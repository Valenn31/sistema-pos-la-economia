/**
 * Button — Componente de botón reutilizable con variantes visuales y estados.
 *
 * Soporta cuatro variantes de estilo, tres tamaños, estado de carga
 * (muestra spinner y deshabilita el botón) y estado deshabilitado.
 *
 * @param {object} props
 * @param {'primary'|'secondary'|'danger'|'ghost'} [props.variant='primary']
 *   - Variante visual del botón:
 *     primary   → fondo azul primario, texto blanco (acción principal)
 *     secondary → fondo gris oscuro, texto claro (acción secundaria)
 *     danger    → fondo rojo, texto blanco (acción destructiva)
 *     ghost     → transparente, texto gris (acción terciaria/sutil)
 * @param {'sm'|'md'|'lg'} [props.size='md']
 *   - Tamaño del botón:
 *     sm → texto xs, padding compacto
 *     md → texto sm, padding estándar
 *     lg → texto base, padding amplio
 * @param {boolean} [props.loading=false] - Si true, muestra un spinner y deshabilita el botón
 * @param {boolean} [props.disabled=false] - Si true, el botón aparece opaco y no es clickeable
 * @param {React.ReactNode} props.children - Contenido del botón (texto, íconos, etc.)
 * @param {string} [props.className=''] - Clases CSS adicionales de Tailwind
 * @param {object} props....rest - Cualquier otra prop se pasa al elemento <button>
 * @returns {JSX.Element} Elemento <button> estilizado
 */
import { Spinner } from './Spinner'

/**
 * variants — Mapa de clases Tailwind para cada variante visual del botón.
 * @type {Record<string, string>}
 */
const variants = {
  primary:   'bg-primary-600 hover:bg-primary-500 text-white border-transparent',
  secondary: 'bg-surface-800 hover:bg-surface-700 text-surface-100 border-surface-700',
  danger:    'bg-red-600 hover:bg-red-500 text-white border-transparent',
  ghost:     'bg-transparent hover:bg-surface-800 text-surface-300 border-transparent',
}

/**
 * sizes — Mapa de clases Tailwind para cada tamaño de botón.
 * Define tamaño de fuente, padding horizontal/vertical y gap entre hijos.
 * @type {Record<string, string>}
 */
const sizes = {
  sm: 'text-xs px-3 py-1.5 gap-1.5',
  md: 'text-sm px-4 py-2 gap-2',
  lg: 'text-base px-5 py-2.5 gap-2.5',
}

/**
 * Button — Renderiza un botón con estilos según variante y tamaño.
 *
 * El botón se deshabilita automáticamente cuando `loading` o `disabled` es true.
 * En estado loading, muestra un Spinner pequeño a la izquierda del contenido.
 *
 * @returns {JSX.Element}
 */
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
      {/* Spinner de carga — solo visible cuando loading es true */}
      {loading && <Spinner size="sm" />}
      {children}
    </button>
  )
}
