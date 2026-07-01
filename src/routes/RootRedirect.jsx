/**
 * RootRedirect — Componente raíz de redirección inteligente.
 *
 * Cuando el usuario accede a la URL raíz ("/"), este componente
 * decide a dónde redirigirlo basándose en tres condiciones:
 *
 *  1. Si el setup inicial nunca fue completado → redirige a /setup
 *     (para que el superadmin configure la tienda por primera vez).
 *  2. Si hay una sesión activa con rol seleccionado → redirige a la
 *     página de inicio del rol (ej: /admin/dashboard, /pos, /stock).
 *  3. Si no hay sesión activa → redirige a /login.
 *
 * Mientras se determina el destino, muestra un spinner de carga
 * a pantalla completa para evitar un flash de contenido vacío.
 */
import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { checkSetupCompleted } from '@/modules/auth/services/authService'
import { useAuthStore } from '@/shared/store/authStore'
import { Spinner } from '@/shared/components/Spinner'
import { ROLE_HOME } from './roleRoutes'

/**
 * Componente de redirección desde la ruta raíz.
 *
 * @returns {JSX.Element} Spinner mientras se resuelve, luego <Navigate /> al destino
 */
export function RootRedirect() {
  /** URL de destino; null mientras se está determinando */
  const [destination, setDestination] = useState(null)

  /** Estado de autenticación del store global */
  const { user, activeRole, loading } = useAuthStore()

  useEffect(() => {
    // Esperar a que el authStore termine de verificar la sesión
    if (loading) return

    /**
     * Verificar si el setup inicial fue completado consultando
     * la base de datos. Según el resultado, elegir el destino.
     */
    checkSetupCompleted().then((done) => {
      if (!done) {
        /* Setup no completado: llevar al wizard de configuración inicial */
        setDestination('/setup')
        return
      }
      if (user && activeRole) {
        /* Usuario logueado con rol activo: ir a la home de su rol */
        setDestination(ROLE_HOME[activeRole] ?? '/login')
        return
      }
      /* Sin sesión activa: ir al login */
      setDestination('/login')
    }).catch(() => {
      // No se pudo verificar el setup (ej: Supabase inalcanzable). No asumir
      // "no configurado" — eso mandaría al wizard a un negocio ya configurado.
      // Ir al login, que es el destino seguro por defecto.
      toast.error('No se pudo conectar con el servidor. Reintentá en unos segundos.')
      setDestination('/login')
    })
  }, [loading, user, activeRole])

  /* Mientras no se haya determinado el destino, mostrar spinner */
  if (!destination) {
    return (
      <div className="min-h-screen bg-surface-950 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  /* Redirigir al destino calculado */
  return <Navigate to={destination} replace />
}
