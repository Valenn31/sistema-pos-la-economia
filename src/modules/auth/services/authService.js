/**
 * authService.js — Capa de acceso a Supabase para autenticación y perfiles.
 *
 * Funciones exportadas:
 *  - signIn(email, password)       → { user, profile, roles } | error
 *  - signOut()                     → void
 *  - getSessionData(userId)        → { profile, roles }
 *  - checkSetupCompleted()         → boolean
 *  - createFirstSuperadmin(data)   → { user, profile } | error
 *  - verifyPin(pin)                → { profile, roles } | null
 */
import { supabase } from '@/supabase/client'

/**
 * Obtiene perfil y roles de un usuario dado su ID.
 * Usa queries separadas en lugar del join de PostgREST para mayor compatibilidad.
 * @param {string} userId - UUID del usuario en auth.users
 * @returns {{ profile: object, roles: string[] }}
 */
export async function getSessionData(userId) {
  // 1. Obtener perfil
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (profileError) throw profileError

  // 2. Obtener IDs de roles asignados al usuario
  const { data: userRoles, error: userRolesError } = await supabase
    .from('user_roles')
    .select('role_id')
    .eq('user_id', userId)

  if (userRolesError) throw userRolesError

  // Si el usuario no tiene roles asignados, devolver array vacío
  if (!userRoles || userRoles.length === 0) return { profile, roles: [] }

  // 3. Obtener nombres de esos roles
  const roleIds = userRoles.map((r) => r.role_id)
  const { data: rolesData, error: rolesError } = await supabase
    .from('roles')
    .select('name')
    .in('id', roleIds)

  if (rolesError) throw rolesError

  const roles = (rolesData ?? []).map((r) => r.name)
  return { profile, roles }
}

/**
 * Inicia sesión con email y contraseña.
 * @param {string} email
 * @param {string} password
 * @returns {{ user, profile, roles }}
 */
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error

  const sessionData = await getSessionData(data.user.id)
  return { user: data.user, ...sessionData }
}

/**
 * Cierra la sesión actual.
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

/**
 * Verifica si el setup inicial ya fue completado (existe al menos un superadmin).
 * @returns {boolean}
 */
export async function checkSetupCompleted() {
  const { data, error } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'setup_completed')
    .single()

  if (error) return false
  return data?.value === 'true'
}

/**
 * Crea el primer usuario Superadmin durante el setup inicial.
 * Usa una función RPC con SECURITY DEFINER para escribir en la DB
 * sin necesitar una sesión autenticada (el usuario aún no existe).
 *
 * @param {{ fullName, email, password, pin, businessData }} data
 * @returns {{ user }}
 */
export async function createFirstSuperadmin({ fullName, email, password, pin, businessData }) {
  // 1. Crear usuario en Supabase Auth (no requiere sesión)
  const { data: authData, error: authError } = await supabase.auth.signUp({ email, password })
  if (authError) throw authError

  const userId = authData.user?.id
  if (!userId) throw new Error('No se pudo obtener el ID del usuario. Verificá si el email ya está registrado.')

  // 2. Llamar al RPC con SECURITY DEFINER — bypasea RLS sin exponer service key
  const { error: rpcError } = await supabase.rpc('complete_initial_setup', {
    p_business_name:    businessData.business_name,
    p_cuit:             businessData.cuit             ?? '',
    p_fiscal_condition: businessData.fiscal_condition ?? 'responsable_inscripto',
    p_address:          businessData.address          ?? '',
    p_phone:            businessData.phone            ?? '',
    p_full_name:        fullName,
    p_pin:              pin,
    p_user_id:          userId,
  })
  if (rpcError) throw rpcError

  return { user: authData.user }
}

/**
 * Verifica un PIN numérico de 4 dígitos para cambio rápido de cajero en POS.
 * @param {string} pin - 4 dígitos
 * @returns {{ profile, roles } | null} null si el PIN no corresponde a ningún usuario activo
 */
export async function verifyPin(pin) {
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('pin', pin)
    .eq('is_active', true)

  if (error || !profiles || profiles.length === 0) return null

  // Si hay más de un usuario con el mismo PIN (no debería), tomamos el primero
  const profile = profiles[0]
  const { data: userRoles } = await supabase
    .from('user_roles')
    .select('roles(name)')
    .eq('user_id', profile.id)

  const roles = (userRoles ?? []).map((r) => r.roles.name)
  return { profile, roles }
}
