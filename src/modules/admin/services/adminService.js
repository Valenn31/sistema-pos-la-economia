/**
 * adminService.js — Gestión de usuarios, roles y configuración de la app.
 *
 * Funciones exportadas:
 *  - getUsers()                → Lista de usuarios con sus roles
 *  - getRoles()                → Lista de roles disponibles
 *  - createUser(data)          → Crea usuario en Auth + perfil + roles
 *  - updateUser(userId, data)  → Actualiza perfil y/o roles de un usuario
 *  - toggleUserActive(userId, isActive) → Activa/desactiva un usuario
 *  - getSettings()             → Configuración de la app (clave-valor)
 *  - saveSettings(settings)    → Guarda configuración de la app
 *  - getWeeklySales()          → Ventas agrupadas por día (últimos 7 días)
 *  - getDashboardStats()       → KPIs del dashboard principal
 */
import { supabase } from '@/supabase/client'
import { adminSupabase } from '@/supabase/adminClient'

// ── Usuarios ──────────────────────────────────────────────────────────

/**
 * Obtiene todos los usuarios (perfiles) junto con sus roles asignados.
 * Combina la tabla `profiles` con `user_roles` → `roles` para armar
 * un array de roles por cada usuario.
 *
 * @returns {Promise<object[]>} Lista de perfiles, cada uno con la propiedad `roles: { id, name }[]`
 * @throws {Error} Si falla alguna consulta a Supabase
 */
export async function getUsers() {
  const { data: profiles, error: profErr } = await supabase
    .from('profiles')
    .select('*')
    .order('full_name')
  if (profErr) throw profErr

  const { data: userRoles, error: rolesErr } = await supabase
    .from('user_roles')
    .select('user_id, roles(id, name)')
  if (rolesErr) throw rolesErr

  /** @type {Record<string, object[]>} Mapa de userId → array de roles */
  const rolesByUser = {}
  for (const ur of userRoles) {
    if (!rolesByUser[ur.user_id]) rolesByUser[ur.user_id] = []
    if (ur.roles) rolesByUser[ur.user_id].push(ur.roles)
  }

  return profiles.map((p) => ({ ...p, roles: rolesByUser[p.id] ?? [] }))
}

/**
 * Obtiene todos los roles del sistema ordenados por ID.
 *
 * @returns {Promise<object[]>} Lista de roles ({ id, name, ... })
 * @throws {Error} Si falla la consulta a Supabase
 */
export async function getRoles() {
  const { data, error } = await supabase.from('roles').select('*').order('id')
  if (error) throw error
  return data
}

/**
 * Crea un usuario en Supabase Auth + perfil + roles.
 * Requiere adminSupabase (service role key configurada en .env).
 *
 * Pasos:
 *  1. Crea el usuario en Auth con la admin API (confirma email automáticamente)
 *  2. Inserta el perfil en la tabla `profiles`
 *  3. Asigna los roles indicados en la tabla `user_roles`
 *
 * @param {object} params - Datos del nuevo usuario
 * @param {string} params.email - Email del usuario
 * @param {string} params.password - Contraseña
 * @param {string} params.fullName - Nombre completo
 * @param {string|null} params.pin - PIN numérico opcional para acceso rápido
 * @param {number[]} params.roleIds - IDs de los roles a asignar
 * @returns {Promise<string>} UUID del usuario creado
 * @throws {Error} Si la service key no está configurada o falla alguna operación
 */
export async function createUser({ email, password, fullName, pin, roleIds }) {
  if (!adminSupabase) throw new Error('Service role key no configurada. Agregá VITE_SUPABASE_SERVICE_KEY al .env')

  const { data: authData, error: authErr } = await adminSupabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  })
  if (authErr) throw authErr

  const userId = authData.user.id

  const { error: profErr } = await supabase.from('profiles').insert({
    id: userId,
    full_name: fullName,
    pin: pin || null,
    is_active: true,
  })
  if (profErr) throw profErr

  if (roleIds?.length) {
    const { error: rolesErr } = await supabase.from('user_roles').insert(
      roleIds.map((rid) => ({ user_id: userId, role_id: rid }))
    )
    if (rolesErr) throw rolesErr
  }

  return userId
}

/**
 * Actualiza los datos del perfil y/o los roles de un usuario existente.
 * Solo actualiza los campos que se pasan explícitamente (los undefined se ignoran).
 * Si se pasan roleIds, se eliminan todos los roles actuales y se insertan los nuevos.
 *
 * @param {string} userId - UUID del usuario a actualizar
 * @param {object} params - Campos a actualizar
 * @param {string} [params.fullName] - Nuevo nombre completo
 * @param {string|null} [params.pin] - Nuevo PIN (null para eliminar)
 * @param {number[]} [params.roleIds] - Nuevos IDs de roles (reemplaza todos los anteriores)
 * @param {boolean} [params.isActive] - Nuevo estado activo/inactivo
 * @returns {Promise<void>}
 * @throws {Error} Si falla alguna operación en Supabase
 */
export async function updateUser(userId, { fullName, pin, roleIds, isActive }) {
  const updates = {}
  if (fullName !== undefined) updates.full_name = fullName
  if (pin !== undefined) updates.pin = pin || null
  if (isActive !== undefined) updates.is_active = isActive

  if (Object.keys(updates).length) {
    const { error } = await supabase.from('profiles').update(updates).eq('id', userId)
    if (error) throw error
  }

  if (roleIds !== undefined) {
    await supabase.from('user_roles').delete().eq('user_id', userId)
    if (roleIds.length) {
      const { error } = await supabase.from('user_roles').insert(
        roleIds.map((rid) => ({ user_id: userId, role_id: rid }))
      )
      if (error) throw error
    }
  }
}

/**
 * Activa o desactiva un usuario cambiando el campo `is_active` en su perfil.
 *
 * @param {string} userId - UUID del usuario
 * @param {boolean} isActive - true para activar, false para desactivar
 * @returns {Promise<void>}
 * @throws {Error} Si falla la actualización en Supabase
 */
export async function toggleUserActive(userId, isActive) {
  const { error } = await supabase
    .from('profiles')
    .update({ is_active: isActive })
    .eq('id', userId)
  if (error) throw error
}

// ── Configuración de la app ───────────────────────────────────────────

/**
 * Obtiene toda la configuración de la app desde la tabla `app_settings`.
 * Retorna un mapa clave-valor (ej: { business_name: 'La Economía', ... }).
 *
 * @returns {Promise<Record<string, string>>} Mapa de configuraciones
 * @throws {Error} Si falla la consulta a Supabase
 */
export async function getSettings() {
  const { data, error } = await supabase.from('app_settings').select('*')
  if (error) throw error
  /** @type {Record<string, string>} */
  const map = {}
  for (const row of data) map[row.key] = row.value
  return map
}

/**
 * Guarda configuraciones de la app (upsert por clave).
 * Acepta un objeto con pares clave-valor y los inserta o actualiza uno por uno.
 *
 * @param {Record<string, string>} settings - Pares clave-valor a guardar
 * @returns {Promise<void>}
 * @throws {Error} Si falla algún upsert en Supabase
 */
export async function saveSettings(settings) {
  const entries = Object.entries(settings).map(([key, value]) => ({ key, value: value ?? '' }))
  for (const entry of entries) {
    const { error } = await supabase
      .from('app_settings')
      .upsert(entry, { onConflict: 'key' })
    if (error) throw error
  }
}

// ── Dashboard gráficos ────────────────────────────────────────────────

/**
 * Obtiene las ventas de los últimos 7 días agrupadas por día.
 * Se usa para generar el gráfico de barras del dashboard.
 *
 * @returns {Promise<Array<{ fecha: string, ventas: number, total: number }>>}
 *   Array de 7 elementos, uno por día, con la fecha formateada (ej: "lun 16"),
 *   la cantidad de ventas y el monto total facturado.
 * @throws {Error} Si falla la consulta a Supabase
 */
export async function getWeeklySales() {
  /** Genera un array con las fechas de los últimos 7 días (incluye hoy) */
  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - (6 - i))
    return d
  })

  const { data, error } = await supabase
    .from('sales')
    .select('created_at, total')
    .gte('created_at', dates[0].toISOString())
    .eq('status', 'completed')
  if (error) throw error

  /** @type {Record<string, { ventas: number, total: number }>} Acumulador por día */
  const byDay = {}
  for (const d of dates) byDay[d.toISOString().slice(0, 10)] = { ventas: 0, total: 0 }
  for (const sale of data ?? []) {
    const key = new Date(sale.created_at).toISOString().slice(0, 10)
    if (byDay[key]) { byDay[key].ventas++; byDay[key].total += Number(sale.total) }
  }

  return dates.map((d) => ({
    fecha: d.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric' }),
    ...byDay[d.toISOString().slice(0, 10)],
  }))
}

// ── Dashboard KPIs ────────────────────────────────────────────────────

/**
 * Obtiene las estadísticas principales (KPIs) del dashboard.
 * Ejecuta múltiples consultas en paralelo para obtener:
 *  - Ventas del día (cantidad y monto total)
 *  - Productos con stock bajo (por debajo del mínimo configurado)
 *  - Clientes con deuda pendiente
 *  - Sesiones de caja abiertas actualmente
 *  - Productos próximos a vencer (según configuración de días de alerta)
 *
 * @returns {Promise<{
 *   ventasHoy: number,
 *   totalHoy: number,
 *   lowStockCount: number,
 *   lowStockItems: object[],
 *   customersDebt: number,
 *   topDebtors: object[],
 *   activeSessions: object[],
 *   expiryCount: number,
 *   expiryItems: object[],
 *   expiryAlertDays: number
 * }>} Objeto con todos los KPIs del dashboard
 * @throws {Error} Si falla alguna consulta a Supabase
 */
export async function getDashboardStats() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayIso = today.toISOString()

  /** Ejecuta todas las consultas en paralelo para mayor velocidad */
  const [salesRes, stockRes, customersRes, sessionsRes, expiryRes, settingsRes] = await Promise.all([
    supabase
      .from('sales')
      .select('id, total, created_at')
      .gte('created_at', todayIso)
      .eq('status', 'completed'),
    supabase
      .from('stock')
      .select('product_id, quantity, products!inner(min_stock, name, is_active)')
      .eq('products.is_active', true),
    supabase
      .from('customers')
      .select('id, full_name, current_balance, credit_limit')
      .gt('current_balance', 0)
      .eq('is_active', true),
    supabase
      .from('cash_sessions')
      .select('id, register_id, opened_at, status, cash_registers(name)')
      .eq('status', 'open'),
    supabase
      .from('products')
      .select('id, name, expiry_date')
      .eq('is_active', true)
      .eq('has_expiry', true)
      .not('expiry_date', 'is', null),
    supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'expiry_alert_days')
      .maybeSingle(),
  ])

  const todaySales = salesRes.data ?? []
  const totalHoy   = todaySales.reduce((s, v) => s + Number(v.total), 0)

  /**
   * Agrupa el stock por producto sumando las cantidades de todas las ubicaciones.
   * Luego filtra los que están por debajo del stock mínimo configurado.
   */
  const stockByProduct = {}
  for (const row of (stockRes.data ?? [])) {
    if (!stockByProduct[row.product_id]) {
      stockByProduct[row.product_id] = { qty: 0, minStock: row.products.min_stock, name: row.products.name }
    }
    stockByProduct[row.product_id].qty += row.quantity
  }
  const lowStockProducts = Object.values(stockByProduct)
    .filter((p) => p.minStock > 0 && p.qty <= p.minStock)

  /** Días de anticipación para alertas de vencimiento (default: 30) */
  const alertDays = parseInt(settingsRes.data?.value) || 30
  const now = new Date()

  /**
   * Calcula los días restantes hasta el vencimiento de cada producto
   * y filtra solo los que están dentro del rango de alerta.
   */
  const expiryProducts = (expiryRes.data ?? [])
    .map((p) => {
      const daysLeft = Math.ceil((new Date(p.expiry_date) - now) / 86400000)
      return { ...p, daysLeft }
    })
    .filter((p) => p.daysLeft <= alertDays)
    .sort((a, b) => a.daysLeft - b.daysLeft)

  return {
    ventasHoy:       todaySales.length,
    totalHoy,
    lowStockCount:   lowStockProducts.length,
    lowStockItems:   lowStockProducts.slice(0, 5),
    customersDebt:   (customersRes.data ?? []).length,
    topDebtors:      (customersRes.data ?? []).slice(0, 5),
    activeSessions:  sessionsRes.data ?? [],
    expiryCount:     expiryProducts.length,
    expiryItems:     expiryProducts.slice(0, 5),
    expiryAlertDays: alertDays,
  }
}
