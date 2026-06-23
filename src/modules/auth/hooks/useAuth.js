/**
 * useAuth — Hook principal de autenticación.
 *
 * Escucha cambios de sesión de Supabase y sincroniza el authStore.
 * Debe montarse una sola vez en App.jsx.
 *
 * @returns {{ loading: boolean }}
 */
import { useEffect } from 'react'
import { supabase }   from '@/supabase/client'
import { useAuthStore } from '@/shared/store/authStore'
import { getSessionData } from '@/modules/auth/services/authService'

export function useAuth() {
  const { setSession, clearSession, setLoading } = useAuthStore()

  useEffect(() => {
    // Verifica la sesión existente al montar la app
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        try {
          const { profile, roles } = await getSessionData(session.user.id)
          setSession(session.user, profile, roles)
        } catch {
          clearSession()
        }
      } else {
        clearSession()
      }
    })

    // Escucha cambios en tiempo real (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          clearSession()
          return
        }
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

    return () => subscription.unsubscribe()
  }, [setSession, clearSession, setLoading])

  return { loading: useAuthStore((s) => s.loading) }
}
