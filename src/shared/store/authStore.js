/**
 * Store global de autenticación (Zustand).
 *
 * Estado:
 *  - user:        objeto del usuario de Supabase Auth
 *  - profile:     datos de la tabla `profiles`
 *  - roles:       array de strings con los roles del usuario ['admin', 'cajero', ...]
 *  - activeRole:  rol actualmente seleccionado para esta sesión
 *  - loading:     true mientras se verifica la sesión inicial
 *
 * Acciones:
 *  - setSession(user, profile, roles): carga la sesión tras login
 *  - setActiveRole(role):              selecciona el rol activo
 *  - clearSession():                   limpia todo (logout)
 */
import { create } from 'zustand'

export const useAuthStore = create((set) => ({
  user:       null,
  profile:    null,
  roles:      [],
  activeRole: null,
  loading:    true,

  setSession: (user, profile, roles) =>
    set({ user, profile, roles, loading: false }),

  setActiveRole: (role) =>
    set({ activeRole: role }),

  clearSession: () =>
    set({ user: null, profile: null, roles: [], activeRole: null, loading: false }),

  setLoading: (loading) =>
    set({ loading }),
}))
