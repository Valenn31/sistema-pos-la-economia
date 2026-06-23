/**
 * AppLayout — Layout principal con sidebar + topbar.
 * Responsivo: sidebar colapsable en mobile/tablet, fijo en desktop.
 * El sidebar muestra solo los ítems permitidos según el rol activo.
 */
import { useState, useEffect } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  ShoppingCart, Package, Truck, BarChart3, Settings, Users,
  LogOut, Menu, X, ChevronRight, ShieldCheck, LayoutDashboard, Tag, UserCheck,
} from 'lucide-react'
import { signOut } from '@/modules/auth/services/authService'
import { useAuthStore } from '@/shared/store/authStore'
import { ROLE_LABELS } from '@/routes/roleRoutes'
import toast from 'react-hot-toast'

/* Ítems del sidebar con los roles que pueden verlos */
const NAV_ITEMS = [
  { label: 'Dashboard',   icon: LayoutDashboard, to: '/admin/dashboard', roles: ['superadmin', 'admin'] },
  { label: 'POS / Ventas', icon: ShoppingCart,   to: '/pos',             roles: ['superadmin', 'admin', 'cajero'] },
  { label: 'Stock',        icon: Package,        to: '/stock',           roles: ['superadmin', 'admin', 'cajero', 'repositor'] },
  { label: 'Proveedores',  icon: Truck,          to: '/suppliers',       roles: ['superadmin', 'admin', 'repositor'] },
  { label: 'Clientes',     icon: UserCheck,      to: '/customers',       roles: ['superadmin', 'admin'] },
  { label: 'Reportes',     icon: BarChart3,      to: '/reports',         roles: ['superadmin', 'admin'] },
  { label: 'Usuarios',     icon: Users,          to: '/admin/users',     roles: ['superadmin', 'admin'] },
  { label: 'Descuentos',   icon: Tag,            to: '/admin/discounts', roles: ['superadmin', 'admin'] },
  { label: 'Configuración',icon: Settings,       to: '/admin/settings',  roles: ['superadmin'] },
]

const ROLE_ICON = {
  superadmin: ShieldCheck,
  admin:      Users,
  cajero:     ShoppingCart,
  repositor:  Package,
}

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const { profile, activeRole, clearSession } = useAuthStore()
  const navigate = useNavigate()

  // En mobile el sidebar empieza cerrado
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) setSidebarOpen(false)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleLogout = async () => {
    try {
      await signOut()
      clearSession()
      navigate('/login')
    } catch {
      toast.error('Error al cerrar sesión')
    }
  }

  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(activeRole))
  const RoleIcon = ROLE_ICON[activeRole] ?? ShieldCheck

  return (
    <div className="flex h-screen bg-surface-950 overflow-hidden">

      {/* Overlay mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────── */}
      <aside className={`
        fixed lg:relative z-30 flex flex-col h-full
        bg-surface-900 border-r border-surface-800
        transition-all duration-300 ease-in-out flex-shrink-0
        ${sidebarOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full lg:w-16 lg:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 h-16 border-b border-surface-800 flex-shrink-0">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <ShoppingCart className="w-4 h-4 text-white" />
          </div>
          {sidebarOpen && (
            <div className="overflow-hidden">
              <p className="font-bold text-white text-sm leading-tight truncate">La Economía</p>
              <p className="text-surface-500 text-xs truncate">Sistema POS</p>
            </div>
          )}
        </div>

        {/* Navegación */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
          {visibleItems.map(({ label, icon: Icon, to }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150
                ${isActive
                  ? 'bg-primary-600/15 text-primary-400'
                  : 'text-surface-400 hover:bg-surface-800 hover:text-surface-100'}
              `}
              title={!sidebarOpen ? label : undefined}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && <span className="truncate">{label}</span>}
              {sidebarOpen && <ChevronRight className="w-3 h-3 ml-auto opacity-30" />}
            </NavLink>
          ))}
        </nav>

        {/* Perfil + Logout */}
        <div className="border-t border-surface-800 p-3 flex-shrink-0">
          {sidebarOpen ? (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-surface-800 rounded-full flex items-center justify-center flex-shrink-0">
                <RoleIcon className="w-4 h-4 text-primary-400" />
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-medium text-white truncate">{profile?.full_name}</p>
                <p className="text-xs text-surface-500 truncate">{ROLE_LABELS[activeRole]}</p>
              </div>
              <button
                onClick={handleLogout}
                className="text-surface-500 hover:text-red-400 transition-colors p-1"
                title="Cerrar sesión"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center py-2 text-surface-500 hover:text-red-400 transition-colors"
              title="Cerrar sesión"
            >
              <LogOut className="w-5 h-5" />
            </button>
          )}
        </div>
      </aside>

      {/* ── Contenido principal ──────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Topbar */}
        <header className="h-16 bg-surface-900 border-b border-surface-800 flex items-center gap-4 px-4 flex-shrink-0">
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="text-surface-400 hover:text-surface-100 transition-colors"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="flex-1" />
          {/* Badge de rol activo */}
          <span className="badge bg-primary-600/15 text-primary-400 border border-primary-600/20">
            <RoleIcon className="w-3 h-3 mr-1" />
            {ROLE_LABELS[activeRole]}
          </span>
        </header>

        {/* Página activa */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
