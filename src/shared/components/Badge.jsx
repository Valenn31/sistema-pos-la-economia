/**
 * Badge — Componente de etiqueta/insignia con colores semánticos.
 *
 * Se usa para mostrar estados, categorías o etiquetas visuales
 * en la interfaz (ej: "Activo", "Pendiente", "Agotado").
 *
 * Cada color tiene un fondo semitransparente, texto coloreado y
 * un borde sutil que coincide con la paleta del tema oscuro.
 *
 * @param {object} props
 * @param {'green'|'yellow'|'red'|'blue'|'purple'|'gray'|'orange'} props.color
 *   - Color semántico de la etiqueta. Por defecto: 'gray'.
 *     green  → éxito, activo
 *     yellow → advertencia, pendiente
 *     red    → error, eliminado, agotado
 *     blue   → información
 *     purple → categoría especial
 *     orange → alerta moderada
 *     gray   → neutro, deshabilitado
 * @param {React.ReactNode} props.children - Contenido de la etiqueta (texto, íconos, etc.)
 * @param {string} [props.className=''] - Clases CSS adicionales de Tailwind
 * @returns {JSX.Element} Elemento <span> estilizado como badge
 */

/**
 * COLORS — Mapa de clases Tailwind para cada variante de color.
 * Cada entrada define: fondo semitransparente + color de texto + borde.
 *
 * @type {Record<string, string>}
 */
const COLORS = {
  green:  'bg-green-600/15 text-green-400 border-green-600/30',
  yellow: 'bg-yellow-600/15 text-yellow-400 border-yellow-600/30',
  red:    'bg-red-600/15 text-red-400 border-red-600/30',
  blue:   'bg-blue-600/15 text-blue-400 border-blue-600/30',
  purple: 'bg-purple-600/15 text-purple-400 border-purple-600/30',
  orange: 'bg-orange-600/15 text-orange-400 border-orange-600/30',
  gray:   'bg-surface-700/50 text-surface-400 border-surface-600/30',
}

/**
 * Badge — Renderiza una etiqueta inline con estilo de pill (pastilla redondeada).
 *
 * @param {object} props
 * @param {'green'|'yellow'|'red'|'blue'|'purple'|'gray'|'orange'} [props.color='gray']
 * @param {React.ReactNode} props.children
 * @param {string} [props.className='']
 * @returns {JSX.Element}
 */
export function Badge({ color = 'gray', children, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${COLORS[color] ?? COLORS.gray} ${className}`}>
      {children}
    </span>
  )
}
