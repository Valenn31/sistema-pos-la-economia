/**
 * roleRoutes.js — Mapeo de roles a rutas y etiquetas.
 * Centraliza la lógica de navegación por rol para no repetirla en múltiples componentes.
 */

/** Ruta de inicio por rol */
export const ROLE_HOME = {
  superadmin: '/admin/dashboard',
  admin:      '/admin/dashboard',
  cajero:     '/pos',
  repositor:  '/stock',
}

/** Etiquetas legibles por rol */
export const ROLE_LABELS = {
  superadmin: 'Super Administrador',
  admin:      'Administrador',
  cajero:     'Cajero/a',
  repositor:  'Repositor/a',
}

/** Qué roles tienen acceso a cada sección */
export const ROUTE_ROLES = {
  '/admin/dashboard': ['superadmin', 'admin'],
  '/pos':             ['superadmin', 'admin', 'cajero'],
  '/stock':           ['superadmin', 'admin', 'cajero', 'repositor'],
  '/suppliers':       ['superadmin', 'admin', 'repositor'],
  '/reports':         ['superadmin', 'admin'],
  '/admin/users':     ['superadmin', 'admin'],
  '/admin/settings':  ['superadmin'],
}
