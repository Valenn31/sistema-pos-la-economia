/**
 * RootRedirect — Componente raíz que decide a dónde mandar al usuario.
 * - Si el setup nunca fue completado → /setup
 * - Si hay sesión activa → /role-select o home del rol
 * - Si no hay sesión → /login
 */
import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { checkSetupCompleted } from '@/modules/auth/services/authService'
import { useAuthStore } from '@/shared/store/authStore'
import { Spinner } from '@/shared/components/Spinner'
import { ROLE_HOME } from './roleRoutes'

export function RootRedirect() {
  const [destination, setDestination] = useState(null)
  const { user, activeRole, loading } = useAuthStore()

  useEffect(() => {
    // Esperar a que el authStore termine de verificar la sesión
    if (loading) return

    checkSetupCompleted().then((done) => {
      if (!done) {
        setDestination('/setup')
        return
      }
      if (user && activeRole) {
        setDestination(ROLE_HOME[activeRole] ?? '/login')
        return
      }
      setDestination('/login')
    })
  }, [loading, user, activeRole])

  if (!destination) {
    return (
      <div className="min-h-screen bg-surface-950 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  return <Navigate to={destination} replace />
}
