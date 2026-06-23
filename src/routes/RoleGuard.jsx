/**
 * RoleGuard — Verifica que el rol activo tenga permiso para acceder a la ruta.
 * Si no tiene permiso, redirige a la home del rol activo.
 *
 * @param {string[]} allowed - roles permitidos en esta ruta
 */
import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/shared/store/authStore'
import { ROLE_HOME } from './roleRoutes'

export function RoleGuard({ allowed }) {
  const activeRole = useAuthStore((s) => s.activeRole)

  if (!allowed.includes(activeRole)) {
    return <Navigate to={ROLE_HOME[activeRole] ?? '/login'} replace />
  }

  return <Outlet />
}
