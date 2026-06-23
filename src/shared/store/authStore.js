/**
 * authStore.js — Store global de autenticación (Zustand).
 *
 * Almacena y gestiona todo el estado relacionado con la sesión
 * del usuario autenticado. Es consumido por múltiples componentes
 * y guardias de ruta a lo largo de la aplicación.
 *
 * Estado:
 *  @property {object|null} user       - Objeto del usuario de Supabase Auth (contiene id, email, etc.)
 *  @property {object|null} profile    - Datos del perfil desde la tabla `profiles` (full_name, avatar, etc.)
 *  @property {string[]}   roles      - Array de roles asignados al usuario (ej: ['admin', 'cajero'])
 *  @property {string|null} activeRole - Rol actualmente seleccionado para esta sesión
 *  @property {boolean}    loading    - true mientras se verifica la sesión inicial con Supabase
 *
 * Acciones:
 *  @method setSession(user, profile, roles) - Carga la sesión completa tras un login exitoso
 *  @method setActiveRole(role)              - Establece el rol activo para la sesión actual
 *  @method clearSession()                   - Limpia todo el estado (se usa en logout)
 *  @method setLoading(loading)              - Controla manualmente el estado de carga
 */
import { create } from 'zustand'

/**
 * useAuthStore — Hook de Zustand para acceder al store de autenticación.
 *
 * Uso básico:
 *   const { user, activeRole } = useAuthStore()
 *
 * Uso con selector (mejor rendimiento, evita re-renders innecesarios):
 *   const activeRole = useAuthStore((s) => s.activeRole)
 */
export const useAuthStore = create((set) => ({
  /* ── Estado inicial ──────────────────────────────────────────── */

  /** Usuario de Supabase Auth — null si no hay sesión */
  user:       null,

  /** Perfil del usuario desde la tabla `profiles` — null si no hay sesión */
  profile:    null,

  /** Lista de roles asignados al usuario — vacío si no hay sesión */
  roles:      [],

  /** Rol activo seleccionado para esta sesión — null si no eligió aún */
  activeRole: null,

  /** Indica si se está verificando la sesión inicial con Supabase */
  loading:    true,

  /* ── Acciones ────────────────────────────────────────────────── */

  /**
   * setSession — Carga los datos de sesión tras un login exitoso.
   * También pone loading en false ya que la verificación terminó.
   *
   * @param {object} user    - Objeto de usuario de Supabase Auth
   * @param {object} profile - Datos del perfil desde la tabla `profiles`
   * @param {string[]} roles - Roles asignados al usuario
   */
  setSession: (user, profile, roles) =>
    set({ user, profile, roles, loading: false }),

  /**
   * setActiveRole — Establece el rol activo para la sesión.
   * Se llama desde el RoleSelector cuando el usuario elige un rol.
   *
   * @param {string} role - El rol a activar (ej: 'admin', 'cajero')
   */
  setActiveRole: (role) =>
    set({ activeRole: role }),

  /**
   * clearSession — Limpia completamente el estado de autenticación.
   * Se llama al cerrar sesión (logout). Resetea todos los valores
   * a su estado inicial excepto loading que queda en false.
   */
  clearSession: () =>
    set({ user: null, profile: null, roles: [], activeRole: null, loading: false }),

  /**
   * setLoading — Controla manualmente el indicador de carga.
   * Útil para el hook useAuth cuando necesita indicar que está
   * verificando la sesión.
   *
   * @param {boolean} loading - true si está cargando, false si terminó
   */
  setLoading: (loading) =>
    set({ loading }),
}))
