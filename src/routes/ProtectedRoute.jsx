/**
 * ProtectedRoute — Guardia de autenticación para rutas protegidas.
 *
 * Verifica dos condiciones antes de permitir el acceso:
 *  1. Que exista un usuario autenticado (sesión activa en Supabase).
 *  2. Que el usuario haya seleccionado un rol activo para esta sesión.
 *
 * Comportamiento:
 *  - Si el authStore aún está cargando → muestra un spinner a pantalla completa.
 *  - Si no hay usuario → redirige a /login.
 *  - Si hay usuario pero no hay rol seleccionado → redirige a /role-select.
 *  - Si ambas condiciones se cumplen → renderiza las rutas hijas (<Outlet />).
 *
 * Se usa como layout route en el árbol de rutas (router.jsx) para envolver
 * todas las rutas que requieren autenticación.
 */
import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/shared/store/authStore'
import { Spinner } from '@/shared/components/Spinner'

/**
 * Componente de ruta protegida.
 *
 * @returns {JSX.Element} Spinner, redirección o las rutas hijas
 */
export function ProtectedRoute() {
  /* Se extraen los valores necesarios del store de autenticación */
  const { user, activeRole, loading } = useAuthStore()

  /* Mientras se verifica la sesión, mostrar indicador de carga */
  if (loading) {
    return (
      <div className="min-h-screen bg-surface-950 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  /* Si no hay usuario autenticado, redirigir al login */
  if (!user) return <Navigate to="/login" replace />

  /* Si hay usuario pero no eligió rol, redirigir al selector de roles */
  if (!activeRole) return <Navigate to="/role-select" replace />

  /* Todo OK: renderizar las rutas hijas protegidas */
  return <Outlet />
}
