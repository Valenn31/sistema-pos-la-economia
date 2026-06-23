/**
 * Spinner — Indicador de carga circular animado.
 *
 * Muestra un círculo giratorio con una parte coloreada (borde superior)
 * y el resto en gris oscuro, usando la animación `animate-spin` de Tailwind.
 *
 * Incluye atributos de accesibilidad: role="status" y aria-label="Cargando"
 * para que los lectores de pantalla anuncien el estado de carga.
 *
 * @param {object} props
 * @param {'sm'|'md'|'lg'} [props.size='md'] - Tamaño del spinner:
 *   sm → 16px (4x4), borde de 2px — para usar dentro de botones
 *   md → 32px (8x8), borde de 2px — tamaño estándar para contenido
 *   lg → 48px (12x12), borde de 3px — para pantallas de carga completa
 * @param {string} [props.className=''] - Clases CSS adicionales de Tailwind
 * @returns {JSX.Element} Elemento <div> con animación de giro
 */
export function Spinner({ size = 'md', className = '' }) {
  /**
   * Mapa de clases de tamaño.
   * Cada entrada define ancho, alto y grosor del borde.
   */
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
