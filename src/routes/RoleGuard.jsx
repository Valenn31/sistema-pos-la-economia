/**
 * RoleGuard — Guardia de autorización basada en roles.
 *
 * Verifica que el rol activo del usuario esté incluido en la lista
 * de roles permitidos para la ruta actual. Si no tiene permiso,
 * redirige automáticamente a la página de inicio correspondiente
 * a su rol (definida en ROLE_HOME).
 *
 * Se usa como layout route anidada dentro de ProtectedRoute en router.jsx.
 * Ejemplo de uso:
 *   <RoleGuard allowed={['superadmin', 'admin']} />
 *
 * @param {object} props
 * @param {string[]} props.allowed - Lista de roles que tienen acceso a esta ruta.
 *                                   Ej: ['superadmin', 'admin', 'cajero']
 */
import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/shared/store/authStore'
import { ROLE_HOME } from './roleRoutes'

/**
 * Componente guardia de roles.
 *
 * @param {object} props
 * @param {string[]} props.allowed - Roles autorizados para acceder
 * @returns {JSX.Element} Redirección si no autorizado, o rutas hijas si autorizado
 */
export function RoleGuard({ allowed }) {
  /* Obtener el rol activo del store de autenticación */
  const activeRole = useAuthStore((s) => s.activeRole)

  /* Si el rol activo no está en la lista de permitidos, redirigir a su home */
  if (!allowed.includes(activeRole)) {
    return <Navigate to={ROLE_HOME[activeRole] ?? '/login'} replace />
  }

  /* Rol autorizado: renderizar las rutas hijas */
  return <Outlet />
}
