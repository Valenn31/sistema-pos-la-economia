/**
 * AppLayout — Layout principal de la aplicación autenticada.
 *
 * Provee la estructura visual base: sidebar de navegación + topbar + contenido.
 *
 * Comportamiento responsivo:
 *  - Desktop (>= 1024px): sidebar fijo visible, colapsable a íconos.
 *  - Mobile/Tablet (< 1024px): sidebar oculto por defecto, se abre como
 *    drawer con overlay oscuro. Se cierra al hacer click en el overlay.
 *
 * Filtrado por rol:
 *  El sidebar muestra solo los ítems de navegación permitidos para el
 *  rol activo del usuario, según la propiedad `roles` de cada ítem.
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

/**
 * NAV_ITEMS — Configuración de los ítems del menú de navegación.
 *
 * Cada ítem define:
 *  @property {string}   label - Texto a mostrar en el sidebar
 *  @property {Function} icon  - Componente de ícono de lucide-react
 *  @property {string}   to    - Ruta de destino del NavLink
 *  @property {string[]} roles - Roles que pueden ver este ítem
 */
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

/**
 * ROLE_ICON — Mapeo de cada rol a su ícono representativo.
 * Se usa en el sidebar (sección de perfil) y en el badge del topbar.
 *
 * @type {Record<string, import('lucide-react').LucideIcon>}
 */
const ROLE_ICON = {
  superadmin: ShieldCheck,   /* Escudo — acceso total */
  admin:      Users,         /* Usuarios — gestión administrativa */
  cajero:     ShoppingCart,  /* Carrito — punto de venta */
  repositor:  Package,       /* Paquete — gestión de stock */
}

/**
 * AppLayout — Componente de layout principal.
 *
 * Estructura renderizada:
 *  <div flex>
 *    <aside>    ← sidebar con navegación y perfil
 *    <div>      ← contenedor principal
 *      <header> ← topbar con botón hamburguesa y badge de rol
 *      <main>   ← contenido de la página activa (<Outlet />)
 *    </div>
 *  </div>
 *
 * @returns {JSX.Element} Layout completo con sidebar, topbar y contenido
 */
export function AppLayout() {
  /** Estado local del sidebar: abierto (true) o cerrado (false) */
  const [sidebarOpen, setSidebarOpen] = useState(true)

  /** Datos del usuario y rol activo desde el store global */
  const { profile, activeRole, clearSession } = useAuthStore()

  /** Hook de navegación programática de React Router */
  const navigate = useNavigate()

  /**
   * Efecto: en pantallas pequeñas (< 1024px) el sidebar empieza cerrado.
   * Se ejecuta al montar y escucha cambios de tamaño de ventana.
   */
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) setSidebarOpen(false)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  /**
   * handleLogout — Cierra la sesión del usuario.
   * 1. Llama a signOut() en Supabase para invalidar la sesión.
   * 2. Limpia el store de autenticación local.
   * 3. Redirige al login.
   * Si falla, muestra un toast de error.
   */
  const handleLogout = async () => {
    try {
      await signOut()
      clearSession()
      navigate('/login')
    } catch {
      toast.error('Error al cerrar sesión')
    }
  }

  /** Filtrar ítems de navegación según el rol activo del usuario */
  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(activeRole))

  /** Obtener el componente de ícono correspondiente al rol activo */
  const RoleIcon = ROLE_ICON[activeRole] ?? ShieldCheck

  return (
    <div className="flex h-screen bg-surface-950 overflow-hidden">

      {/* ── Overlay móvil ──────────────────────────────────────── */}
      {/* Fondo oscuro semitransparente visible solo en mobile cuando el sidebar está abierto */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────────────── */}
      {/* En desktop: fijo, colapsable entre 256px (abierto) y 64px (cerrado con íconos) */}
      {/* En mobile: drawer que se desliza desde la izquierda */}
      <aside className={`
        fixed lg:relative z-30 flex flex-col h-full
        bg-surface-900 border-r border-surface-800
        transition-all duration-300 ease-in-out flex-shrink-0
        ${sidebarOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full lg:w-16 lg:translate-x-0'}
      `}>
        {/* ── Logo y nombre de la tienda ──────────────────────── */}
        <div className="flex items-center gap-3 px-4 h-16 border-b border-surface-800 flex-shrink-0">
          {/* Ícono cuadrado con fondo primario */}
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <ShoppingCart className="w-4 h-4 text-white" />
          </div>
          {/* Nombre de la tienda — solo visible con sidebar abierto */}
          {sidebarOpen && (
            <div className="overflow-hidden">
              <p className="font-bold text-white text-sm leading-tight truncate">La Economía</p>
              <p className="text-surface-500 text-xs truncate">Sistema POS</p>
            </div>
          )}
        </div>

        {/* ── Navegación principal ────────────────────────────── */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
          {visibleItems.map(({ label, icon: Icon, to }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150
                ${isActive
                  ? 'bg-primary-600/15 text-primary-400'       /* Estilo activo: fondo y texto primario */
                  : 'text-surface-400 hover:bg-surface-800 hover:text-surface-100'}  /* Estilo inactivo */
              `}
              title={!sidebarOpen ? label : undefined}  /* Tooltip cuando el sidebar está colapsado */
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {/* Texto del ítem — solo visible con sidebar abierto */}
              {sidebarOpen && <span className="truncate">{label}</span>}
              {/* Flecha indicadora — solo visible con sidebar abierto */}
              {sidebarOpen && <ChevronRight className="w-3 h-3 ml-auto opacity-30" />}
            </NavLink>
          ))}
        </nav>

        {/* ── Sección de perfil y logout ──────────────────────── */}
        <div className="border-t border-surface-800 p-3 flex-shrink-0">
          {sidebarOpen ? (
            /* Vista expandida: avatar + nombre + rol + botón logout */
            <div className="flex items-center gap-3">
              {/* Avatar con ícono del rol */}
              <div className="w-8 h-8 bg-surface-800 rounded-full flex items-center justify-center flex-shrink-0">
                <RoleIcon className="w-4 h-4 text-primary-400" />
              </div>
              {/* Nombre completo y etiqueta del rol */}
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-medium text-white truncate">{profile?.full_name}</p>
                <p className="text-xs text-surface-500 truncate">{ROLE_LABELS[activeRole]}</p>
              </div>
              {/* Botón de cerrar sesión */}
              <button
                onClick={handleLogout}
                className="text-surface-500 hover:text-red-400 transition-colors p-1"
                title="Cerrar sesión"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            /* Vista colapsada: solo ícono de logout centrado */
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

      {/* ── Contenido principal ──────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* ── Topbar ──────────────────────────────────────────── */}
        <header className="h-16 bg-surface-900 border-b border-surface-800 flex items-center gap-4 px-4 flex-shrink-0">
          {/* Botón hamburguesa para abrir/cerrar el sidebar */}
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="text-surface-400 hover:text-surface-100 transition-colors"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          {/* Espaciador flexible que empuja el badge a la derecha */}
          <div className="flex-1" />
          {/* Badge del rol activo — siempre visible en el topbar */}
          <span className="badge bg-primary-600/15 text-primary-400 border border-primary-600/20">
            <RoleIcon className="w-3 h-3 mr-1" />
            {ROLE_LABELS[activeRole]}
          </span>
        </header>

        {/* ── Área de contenido de la página activa ───────────── */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
