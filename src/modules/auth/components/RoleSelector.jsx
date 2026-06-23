/**
 * RoleSelector — Pantalla de selección de rol cuando el usuario tiene múltiples roles.
 * Se muestra después del login exitoso si el usuario tiene más de un rol asignado.
 * El usuario elige con qué rol quiere operar en esta sesión y se navega
 * al dashboard correspondiente a ese rol.
 */
import { useNavigate } from 'react-router-dom'
import { ShieldCheck, ShoppingCart, Package, Users } from 'lucide-react'
import { useAuthStore } from '@/shared/store/authStore'
import { ROLE_HOME, ROLE_LABELS } from '@/routes/roleRoutes'

/** Mapa de íconos asociados a cada rol del sistema */
const ROLE_ICONS = {
  superadmin: ShieldCheck,
  admin:      Users,
  cajero:     ShoppingCart,
  repositor:  Package,
}

/** Descripciones breves de los permisos de cada rol */
const ROLE_DESCRIPTIONS = {
  superadmin: 'Acceso total al sistema',
  admin:      'Ventas, stock, reportes y compras',
  cajero:     'Módulo de ventas (POS)',
  repositor:  'Gestión de stock y notas de pedido',
}

/**
 * RoleSelector — Componente de selección de rol post-login.
 * Lee los roles del usuario desde el authStore y renderiza
 * un botón por cada rol disponible.
 */
export function RoleSelector() {
  const { profile, roles, setActiveRole } = useAuthStore()
  const navigate = useNavigate()

  /**
   * Establece el rol activo en el store y navega al home correspondiente.
   * @param {string} role - Nombre del rol seleccionado (ej: 'cajero', 'admin')
   */
  const handleSelect = (role) => {
    setActiveRole(role)
    navigate(ROLE_HOME[role] ?? '/dashboard')
  }

  return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Encabezado de bienvenida con nombre del usuario */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white">Bienvenido/a</h1>
          <p className="text-surface-400 mt-1">
            {profile?.full_name} — ¿Con qué rol querés ingresar?
          </p>
        </div>

        {/* Lista de botones, uno por cada rol disponible del usuario */}
        <div className="space-y-3">
          {roles.map((role) => {
            const Icon = ROLE_ICONS[role] ?? ShieldCheck
            return (
              <button
                key={role}
                onClick={() => handleSelect(role)}
                className="w-full card hover:border-primary-600 hover:bg-surface-800 transition-all duration-150 text-left flex items-center gap-4 group"
              >
                {/* Ícono del rol */}
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary-600/10 group-hover:bg-primary-600/20 flex items-center justify-center transition-colors">
                  <Icon className="w-6 h-6 text-primary-400" />
                </div>
                {/* Nombre y descripción del rol */}
                <div>
                  <p className="font-semibold text-white">{ROLE_LABELS[role]}</p>
                  <p className="text-surface-400 text-sm">{ROLE_DESCRIPTIONS[role]}</p>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
