/**
 * PlaceholderPage — Página temporal que ocupa el lugar de módulos aún no desarrollados.
 * Se reemplaza módulo por módulo en los sprints siguientes.
 *
 * @param {string} title - Nombre del módulo
 * @param {string} icon  - Nombre del ícono de lucide-react
 */
import * as Icons from 'lucide-react'

export function PlaceholderPage({ title, icon = 'Construction' }) {
  const Icon = Icons[icon] ?? Icons.Construction

  return (
    <div className="page-container flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="w-20 h-20 bg-surface-800 rounded-3xl flex items-center justify-center mb-6">
        <Icon className="w-10 h-10 text-surface-500" />
      </div>
      <h1 className="text-2xl font-bold text-white mb-2">{title}</h1>
      <p className="text-surface-500 max-w-xs">
        Este módulo está en desarrollo y estará disponible en el próximo sprint.
      </p>
    </div>
  )
}
