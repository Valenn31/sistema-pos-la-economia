/**
 * PlaceholderPage — Página temporal de "en construcción".
 *
 * Se usa como reemplazo visual para módulos que aún no fueron
 * desarrollados. Muestra un ícono grande, el nombre del módulo
 * y un mensaje indicando que estará disponible en el próximo sprint.
 *
 * A medida que se implementan los módulos reales, esta página
 * se reemplaza por el componente definitivo en el router.
 *
 * @param {object} props
 * @param {string} props.title        - Nombre del módulo a mostrar (ej: "Reportes")
 * @param {string} [props.icon='Construction'] - Nombre del ícono de lucide-react a usar.
 *                                               Debe coincidir con una exportación válida
 *                                               del paquete lucide-react (ej: 'BarChart3', 'Package').
 *                                               Si el nombre no existe, se usa 'Construction' por defecto.
 * @returns {JSX.Element} Página centrada con ícono y mensaje de "en desarrollo"
 */
import * as Icons from 'lucide-react'

/**
 * PlaceholderPage — Renderiza la página placeholder.
 *
 * @returns {JSX.Element}
 */
export function PlaceholderPage({ title, icon = 'Construction' }) {
  /** Resolver el componente de ícono dinámicamente desde lucide-react */
  const Icon = Icons[icon] ?? Icons.Construction

  return (
    <div className="page-container flex flex-col items-center justify-center min-h-[60vh] text-center">
      {/* Contenedor del ícono con fondo redondeado */}
      <div className="w-20 h-20 bg-surface-800 rounded-3xl flex items-center justify-center mb-6">
        <Icon className="w-10 h-10 text-surface-500" />
      </div>
      {/* Título del módulo */}
      <h1 className="text-2xl font-bold text-white mb-2">{title}</h1>
      {/* Mensaje informativo */}
      <p className="text-surface-500 max-w-xs">
        Este módulo está en desarrollo y estará disponible en el próximo sprint.
      </p>
    </div>
  )
}
