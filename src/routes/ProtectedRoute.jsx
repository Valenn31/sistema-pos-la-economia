/**
 * ProtectedRoute — Redirige a /login si no hay sesión activa.
 * Si hay sesión pero no hay rol seleccionado, redirige a /role-select.
 */
import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/shared/store/authStore'
import { Spinner } from '@/shared/components/Spinner'

export function ProtectedRoute() {
  const { user, activeRole, loading } = useAuthStore()

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-950 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  if (!activeRole) return <Navigate to="/role-select" replace />

  return <Outlet />
}
