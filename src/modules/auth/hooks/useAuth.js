/**
 * useAuth — Hook principal de autenticación.
 *
 * Escucha cambios de sesión de Supabase (login, logout, token refresh)
 * y sincroniza el estado con el authStore global de Zustand.
 * Debe montarse una sola vez en App.jsx para mantener la sesión actualizada.
 *
 * @returns {{ loading: boolean }} - `loading` es true mientras se verifica la sesión inicial
 */
import { useEffect } from 'react'
import { supabase }   from '@/supabase/client'
import { useAuthStore } from '@/shared/store/authStore'
import { getSessionData } from '@/modules/auth/services/authService'

export function useAuth() {
  const { setSession, clearSession, setLoading } = useAuthStore()

  useEffect(() => {
    // Verificar si ya existe una sesión activa al montar la aplicación
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        try {
          // Obtener perfil y roles del usuario desde la base de datos
          const { profile, roles } = await getSessionData(session.user.id)
          setSession(session.user, profile, roles)
        } catch {
          // Si falla la obtención de datos, limpiar la sesión
          clearSession()
        }
      } else {
        // No hay sesión activa, limpiar el store
        clearSession()
      }
    })

    // Suscribirse a cambios de estado de autenticación en tiempo real
    // (login desde otra pestaña, logout, renovación automática de token)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Si se cerró sesión o no hay sesión, limpiar el store
        if (event === 'SIGNED_OUT' || !session) {
          clearSession()
          return
        }
        // Si se inició sesión o se renovó el token, actualizar el store
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          try {
            const { profile, roles } = await getSessionData(session.user.id)
            setSession(session.user, profile, roles)
          } catch {
            clearSession()
          }
        }
      }
    )

    // Desuscribirse al desmontar el componente que usa este hook
    return () => subscription.unsubscribe()
  }, [setSession, clearSession, setLoading])

  // Retorna el estado de carga desde el store para que App.jsx pueda mostrar un spinner global
  return { loading: useAuthStore((s) => s.loading) }
}
