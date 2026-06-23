/**
 * Badge — Etiqueta de estado con colores semánticos.
 *
 * @param {'green'|'yellow'|'red'|'blue'|'purple'|'gray'|'orange'} color
 * @param {React.ReactNode} children
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

export function Badge({ color = 'gray', children, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${COLORS[color] ?? COLORS.gray} ${className}`}>
      {children}
    </span>
  )
}
