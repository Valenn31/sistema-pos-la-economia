/**
 * authService.js — Capa de acceso a Supabase para autenticación y perfiles.
 *
 * Funciones exportadas:
 *  - signIn(email, password)       → Inicia sesión y retorna { user, profile, roles }
 *  - signOut()                     → Cierra la sesión actual
 *  - getSessionData(userId)        → Obtiene perfil y roles de un usuario
 *  - checkSetupCompleted()         → Verifica si ya existe un superadmin configurado
 *  - createFirstSuperadmin(data)   → Crea el primer superadmin durante el setup inicial
 */
import { supabase } from '@/supabase/client'

/**
 * Obtiene el perfil y los roles de un usuario dado su UUID.
 * Usa queries separadas (en lugar del join de PostgREST) para mayor compatibilidad
 * con diferentes configuraciones de claves foráneas.
 *
 * Pasos:
 *  1. Consulta el perfil del usuario en la tabla `profiles`
 *  2. Obtiene los IDs de roles asignados en `user_roles`
 *  3. Resuelve los nombres de esos roles desde la tabla `roles`
 *
 * @param {string} userId - UUID del usuario en auth.users
 * @returns {Promise<{ profile: object, roles: string[] }>} Perfil completo y lista de nombres de roles
 * @throws {Error} Si falla alguna consulta a Supabase
 */
export async function getSessionData(userId) {
  // 1. Obtener perfil del usuario
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
 * Tras autenticar exitosamente, obtiene los datos de sesión (perfil + roles).
 *
 * @param {string} email - Email del usuario
 * @param {string} password - Contraseña del usuario
 * @returns {Promise<{ user: object, profile: object, roles: string[] }>}
 *   Objeto con el usuario de Supabase Auth, su perfil y sus roles
 * @throws {Error} Si las credenciales son incorrectas o falla la consulta
 */
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error

  const sessionData = await getSessionData(data.user.id)
  return { user: data.user, ...sessionData }
}

/**
 * Cierra la sesión actual de Supabase Auth.
 * Elimina el token de sesión del almacenamiento local.
 *
 * @returns {Promise<void>}
 * @throws {Error} Si falla el cierre de sesión
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

/**
 * Verifica si el setup inicial ya fue completado.
 * Consulta la clave 'setup_completed' en `app_settings`.
 * Si no existe la clave o su valor no es 'true', retorna false.
 *
 * @returns {Promise<boolean>} true si ya se completó el setup inicial
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
 * Pasos:
 *  1. Crea el usuario en Supabase Auth vía signUp (no requiere sesión previa)
 *  2. Llama al RPC `complete_initial_setup` que inserta perfil, asigna rol superadmin
 *     y guarda los datos del negocio en `app_settings`
 *
 * @param {object} data - Datos del superadmin y del negocio
 * @param {string} data.fullName - Nombre completo del administrador
 * @param {string} data.email - Email del administrador
 * @param {string} data.password - Contraseña del administrador
 * @param {string} data.pin - PIN numérico para acceso rápido
 * @param {object} data.businessData - Datos del negocio
 * @param {string} data.businessData.business_name - Nombre del comercio
 * @param {string} [data.businessData.cuit] - CUIT del comercio
 * @param {string} [data.businessData.fiscal_condition] - Condición fiscal (default: 'responsable_inscripto')
 * @param {string} [data.businessData.address] - Dirección del comercio
 * @param {string} [data.businessData.phone] - Teléfono del comercio
 * @returns {Promise<{ user: object }>} Objeto con el usuario creado en Auth
 * @throws {Error} Si el email ya está registrado o falla el RPC
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
