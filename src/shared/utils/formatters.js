/**
 * Formatea un número como moneda argentina (ARS).
 * @param {number} amount
 * @returns {string} "$1.234,56"
 */
export function formatCurrency(amount) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
  }).format(amount ?? 0)
}

/**
 * Formatea una fecha/hora en formato legible argentino.
 * @param {string|Date} date
 * @returns {string} "22/06/2026 14:35"
 */
export function formatDateTime(date) {
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(date))
}

/**
 * Formatea una fecha sin hora.
 * @param {string|Date} date
 * @returns {string} "22/06/2026"
 */
export function formatDate(date) {
  return new Intl.DateTimeFormat('es-AR', { dateStyle: 'short' }).format(new Date(date))
}

/**
 * Redondea a 2 decimales evitando errores de punto flotante.
 * @param {number} n
 * @returns {number}
 */
export function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100
}
