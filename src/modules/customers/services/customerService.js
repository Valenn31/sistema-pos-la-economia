/**
 * customerService.js — CRUD de clientes y gestión de cuenta corriente.
 *
 * Funciones exportadas:
 *  - getCustomers({ search, activeOnly })       → Lista de clientes con filtros opcionales
 *  - getCustomerById(id)                        → Detalle de un cliente por ID
 *  - createCustomer(payload)                    → Crea un nuevo cliente
 *  - updateCustomer(id, payload)                → Actualiza datos de un cliente
 *  - toggleCustomerActive(id, isActive)         → Activa/desactiva un cliente
 *  - registerPayment({ customerId, ... })       → Registra un abono de deuda
 *  - getCustomerSales(customerId, limit)        → Historial de compras del cliente
 *  - getAccountStatement(customerId)            → Estado de cuenta con movimientos y saldo acumulado
 */
import { supabase } from '@/supabase/client'

/**
 * Obtiene la lista de clientes con filtros opcionales de búsqueda y estado.
 * La búsqueda se aplica sobre nombre, documento y teléfono.
 *
 * @param {object} [opciones] - Filtros opcionales
 * @param {string} [opciones.search=''] - Texto de búsqueda (nombre, documento o teléfono)
 * @param {boolean} [opciones.activeOnly=false] - Si es true, solo devuelve clientes activos
 * @returns {Promise<object[]>} Lista de clientes ordenados alfabéticamente
 * @throws {Error} Si falla la consulta a Supabase
 */
export async function getCustomers({ search = '', activeOnly = false } = {}) {
  let query = supabase
    .from('customers')
    .select('*')
    .order('full_name')

  if (search) {
    query = query.or(`full_name.ilike.%${search}%,document_number.ilike.%${search}%,phone.ilike.%${search}%`)
  }
  if (activeOnly) {
    query = query.eq('is_active', true)
  }

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

/**
 * Obtiene un cliente específico por su ID.
 *
 * @param {string} id - UUID del cliente
 * @returns {Promise<object>} Datos completos del cliente
 * @throws {Error} Si no se encuentra el cliente o falla la consulta
 */
export async function getCustomerById(id) {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

/**
 * Crea un nuevo cliente en la base de datos.
 *
 * @param {object} payload - Datos del cliente
 * @param {string} payload.full_name - Nombre completo del cliente
 * @param {string|null} [payload.document_type] - Tipo de documento (DNI, CUIT, etc.)
 * @param {string|null} [payload.document_number] - Número de documento
 * @param {string|null} [payload.phone] - Teléfono
 * @param {string|null} [payload.email] - Email
 * @param {string|null} [payload.address] - Dirección
 * @param {number} [payload.credit_limit=0] - Límite de crédito en cuenta corriente
 * @param {number} [payload.discount_percent=0] - Porcentaje de descuento asignado al cliente
 * @param {boolean} [payload.is_active=true] - Si el cliente está activo
 * @returns {Promise<object>} El cliente creado
 * @throws {Error} Si falla la inserción en Supabase
 */
export async function createCustomer(payload) {
  const { data, error } = await supabase
    .from('customers')
    .insert(cleanPayload(payload))
    .select()
    .single()
  if (error) throw error
  return data
}

/**
 * Actualiza los datos de un cliente existente.
 *
 * @param {string} id - UUID del cliente a actualizar
 * @param {object} payload - Nuevos datos del cliente (misma estructura que createCustomer)
 * @returns {Promise<object>} El cliente actualizado
 * @throws {Error} Si falla la actualización en Supabase
 */
export async function updateCustomer(id, payload) {
  const { data, error } = await supabase
    .from('customers')
    .update(cleanPayload(payload))
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

/**
 * Activa o desactiva un cliente.
 *
 * @param {string} id - UUID del cliente
 * @param {boolean} isActive - true para activar, false para desactivar
 * @returns {Promise<void>}
 * @throws {Error} Si falla la actualización en Supabase
 */
export async function toggleCustomerActive(id, isActive) {
  const { error } = await supabase
    .from('customers')
    .update({ is_active: isActive })
    .eq('id', id)
  if (error) throw error
}

/**
 * Registra un abono de deuda del cliente.
 * Reduce el current_balance del cliente y registra el pago en `customer_payments`.
 *
 * Primero intenta usar el RPC `increment_customer_balance` (con monto negativo).
 * Si el RPC falla, calcula el nuevo saldo manualmente como fallback.
 *
 * @param {object} params - Datos del pago
 * @param {string} params.customerId - UUID del cliente
 * @param {number} params.amount - Monto del abono (siempre positivo, se convierte internamente)
 * @param {string} [params.method='efectivo'] - Método de pago (efectivo, transferencia, etc.)
 * @param {string|null} [params.notes] - Notas u observaciones del pago
 * @param {string|null} [params.userId] - UUID del usuario que registra el pago
 * @returns {Promise<void>}
 * @throws {Error} Si falla el registro del pago en `customer_payments`
 */
export async function registerPayment({ customerId, amount, method = 'efectivo', notes, userId }) {
  /** Intenta reducir el saldo vía RPC atómica */
  const { error: rpcErr } = await supabase.rpc('increment_customer_balance', {
    p_customer_id: customerId,
    p_amount:      -Math.abs(amount),
  })

  /** Fallback: si el RPC falla, calcula y actualiza manualmente */
  if (rpcErr) {
    const { data: cust } = await supabase
      .from('customers').select('current_balance').eq('id', customerId).single()
    const newBalance = Math.max(0, (Number(cust?.current_balance) || 0) - Math.abs(amount))
    const { error: updErr } = await supabase.from('customers').update({ current_balance: newBalance }).eq('id', customerId)
    if (updErr) throw updErr
  }

  /** Registra el pago en la tabla de pagos de clientes */
  const { error: payErr } = await supabase.from('customer_payments').insert({
    customer_id: customerId,
    amount:      Math.abs(amount),
    method:      method || 'efectivo',
    notes:       notes || null,
    user_id:     userId || null,
  })
  if (payErr) throw payErr
}

/**
 * Obtiene las últimas ventas completadas de un cliente con total y métodos de pago.
 *
 * @param {string} customerId - UUID del cliente
 * @param {number} [limit=20] - Cantidad máxima de ventas a devolver
 * @returns {Promise<object[]>} Lista de ventas con sus pagos asociados
 * @throws {Error} Si falla la consulta a Supabase
 */
export async function getCustomerSales(customerId, limit = 20) {
  const { data, error } = await supabase
    .from('sales')
    .select('id, sale_number, created_at, total, receipt_type, sale_payments(method, amount)')
    .eq('customer_id', customerId)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data ?? []
}

/**
 * Genera el estado de cuenta completo de un cliente.
 * Combina ventas en cuenta corriente (débitos) y pagos/abonos (créditos),
 * los ordena cronológicamente y calcula el saldo acumulado.
 *
 * Cada movimiento incluye:
 *  - type: 'debit' (venta en cta cte) o 'credit' (pago/abono)
 *  - date: Fecha del movimiento
 *  - amount: Monto del movimiento
 *  - description: Descripción legible
 *  - balance: Saldo acumulado hasta ese punto
 *
 * @param {string} customerId - UUID del cliente
 * @returns {Promise<object[]>} Array de movimientos ordenados por fecha con saldo acumulado
 * @throws {Error} Si falla alguna consulta a Supabase
 */
export async function getAccountStatement(customerId) {
  /** Consulta ventas y pagos en paralelo */
  const [salesRes, paymentsRes] = await Promise.all([
    supabase
      .from('sales')
      .select(`
        id, sale_number, created_at, total,
        sale_payments(method, amount),
        sale_items(quantity, unit_price, subtotal, products(name))
      `)
      .eq('customer_id', customerId)
      .eq('status', 'completed')
      .order('created_at', { ascending: true }),
    supabase
      .from('customer_payments')
      .select('id, amount, method, notes, created_at')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: true }),
  ])
  if (salesRes.error) throw salesRes.error
  if (paymentsRes.error) throw paymentsRes.error

  /** @type {object[]} Array unificado de movimientos (débitos + créditos) */
  const movements = []

  /** Agrega como débito solo las ventas que tuvieron pago en "cuenta" */
  for (const sale of (salesRes.data ?? [])) {
    const cuentaPayment = (sale.sale_payments ?? []).find((p) => p.method === 'cuenta')
    if (cuentaPayment) {
      movements.push({
        type: 'debit',
        date: sale.created_at,
        amount: Number(cuentaPayment.amount),
        description: `Venta #${sale.sale_number}`,
        saleTotal: Number(sale.total),
        items: sale.sale_items ?? [],
        id: sale.id,
      })
    }
  }

  /** Agrega los pagos/abonos como créditos */
  for (const pay of (paymentsRes.data ?? [])) {
    movements.push({
      type: 'credit',
      date: pay.created_at,
      amount: Number(pay.amount),
      description: `Pago — ${pay.method}`,
      notes: pay.notes,
      id: pay.id,
    })
  }

  /** Ordena todos los movimientos cronológicamente */
  movements.sort((a, b) => new Date(a.date) - new Date(b.date))

  /** Calcula el saldo acumulado recorriendo los movimientos en orden */
  let balance = 0
  for (const m of movements) {
    if (m.type === 'debit') balance += m.amount
    else balance -= m.amount
    m.balance = Math.round(balance * 100) / 100
  }

  return movements
}

/**
 * Limpia y normaliza el payload de un cliente antes de enviarlo a Supabase.
 * Convierte campos numéricos con parseFloat y establece defaults para campos opcionales.
 *
 * @param {object} d - Datos crudos del formulario
 * @returns {object} Objeto limpio listo para insertar/actualizar en la tabla `customers`
 */
function cleanPayload(d) {
  return {
    full_name:        d.full_name,
    document_type:    d.document_type    || null,
    document_number:  d.document_number  || null,
    phone:            d.phone            || null,
    email:            d.email            || null,
    address:          d.address          || null,
    credit_limit:     parseFloat(d.credit_limit)     || 0,
    discount_percent: parseFloat(d.discount_percent) || 0,
    is_active:        d.is_active !== false,
  }
}
