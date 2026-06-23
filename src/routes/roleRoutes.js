/**
 * roleRoutes.js — Mapeo centralizado de roles a rutas y etiquetas.
 *
 * Este módulo centraliza toda la lógica de navegación basada en roles
 * para evitar duplicación en múltiples componentes. Es consumido por:
 *  - RoleGuard.jsx      → para redirigir si el rol no tiene acceso
 *  - RootRedirect.jsx   → para saber a dónde enviar al usuario
 *  - AppLayout.jsx      → para mostrar etiquetas de rol en el sidebar
 *  - RoleSelector.jsx   → para listar los roles disponibles con sus nombres
 */

/**
 * ROLE_HOME — Ruta de inicio (home) para cada rol.
 *
 * Cuando un usuario selecciona un rol o se autentica, es redirigido
 * a la ruta correspondiente según su rol activo.
 *
 * @type {Record<string, string>}
 */
export const ROLE_HOME = {
  superadmin: '/admin/dashboard', /* Panel de administración completo */
  admin:      '/admin/dashboard', /* Panel de administración */
  cajero:     '/pos',             /* Punto de venta directo */
  repositor:  '/stock',           /* Gestión de inventario */
}

/**
 * ROLE_LABELS — Etiquetas legibles en español para cada rol.
 *
 * Se usan en la interfaz para mostrar el nombre del rol en formato
 * amigable (sidebar, topbar, selector de roles, etc.).
 *
 * @type {Record<string, string>}
 */
export const ROLE_LABELS = {
  superadmin: 'Super Administrador',
  admin:      'Administrador',
  cajero:     'Cajero/a',
  repositor:  'Repositor/a',
}

/**
 * ROUTE_ROLES — Mapa de permisos: qué roles pueden acceder a cada ruta.
 *
 * Cada clave es un path de ruta y su valor es un array con los roles
 * autorizados para acceder. Se puede usar para validaciones genéricas
 * fuera del árbol de rutas de React Router.
 *
 * @type {Record<string, string[]>}
 */
export const ROUTE_ROLES = {
  '/admin/dashboard': ['superadmin', 'admin'],
  '/pos':             ['superadmin', 'admin', 'cajero'],
  '/stock':           ['superadmin', 'admin', 'cajero', 'repositor'],
  '/suppliers':       ['superadmin', 'admin', 'repositor'],
  '/reports':         ['superadmin', 'admin'],
  '/admin/users':     ['superadmin', 'admin'],
  '/admin/settings':  ['superadmin'],
}
