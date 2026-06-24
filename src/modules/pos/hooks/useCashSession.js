/**
 * useCashSession — Hook personalizado para gestionar el turno de caja activo.
 *
 * Responsabilidades:
 *  - Cargar las cajas registradoras activas al montar
 *  - Buscar si hay una sesión de caja abierta en alguna de las cajas
 *  - Proveer funciones para abrir y cerrar sesiones de caja
 *  - Exponer función de recarga manual (refresh) para sincronizar estado
 *
 * @returns {Object} Estado y acciones de la sesión de caja
 * @returns {Object|null}   return.session      - Sesión de caja activa (null si no hay)
 * @returns {Object[]}      return.registers    - Lista de cajas registradoras activas
 * @returns {boolean}       return.loading      - Indica si se está cargando el estado inicial
 * @returns {Function}      return.openSession  - Abre una nueva sesión: (registerId, amount) => Promise<session>
 * @returns {Function}      return.closeSession - Cierra la sesión activa: (closingAmount) => Promise<void>
 * @returns {Function}      return.refresh      - Recarga el estado de sesiones y cajas: () => void
 */
import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '@/shared/store/authStore'
import { useUIStore }   from '@/shared/store/uiStore'
import {
  getActiveRegisters,
  getActiveSession,
  openCashSession,
  closeCashSession,
} from '@/modules/pos/services/cashSessionService'

/**
 * Hook que encapsula toda la lógica de gestión de turnos de caja.
 * Se usa en POSPage para controlar el flujo de apertura/cierre.
 */
export function useCashSession() {
  // Perfil del usuario autenticado (cajero)
  const { profile } = useAuthStore()
  // Estado: sesión de caja activa (null si no hay turno abierto)
  const [session,   setSession]   = useState(null)
  // Estado: lista de cajas registradoras activas disponibles
  const [registers, setRegisters] = useState([])
  // Estado: indicador de carga durante la inicialización
  const [loading,   setLoading]   = useState(true)

  /**
   * Carga las cajas registradoras activas y busca si hay una sesión abierta.
   * Recorre todas las cajas activas buscando una sesión abierta en alguna de ellas.
   * Se ejecuta al montar y puede llamarse manualmente con refresh().
   */
  const load = useCallback(async () => {
    setLoading(true)
    try {
      // Obtener todas las cajas registradoras activas
      const regs = await getActiveRegisters()
      setRegisters(regs)

      // Buscar sesión abierta en cualquier caja activa (se detiene en la primera encontrada)
      let found = null
      for (const reg of regs) {
        const s = await getActiveSession(reg.id)
        if (s) { found = s; break }
      }
      setSession(found)
      useUIStore.getState().setActiveSessionId(found?.id ?? null)
    } finally {
      setLoading(false)
    }
  }, [])

  // Efecto: cargar estado inicial al montar el hook
  useEffect(() => { load() }, [load])

  /**
   * Abre una nueva sesión/turno de caja.
   * Registra quién la abrió y con qué monto inicial de efectivo.
   *
   * @param {number|string} registerId - ID de la caja registradora seleccionada
   * @param {number}        amount     - Monto inicial de efectivo en la caja
   * @returns {Promise<Object>} La sesión de caja creada
   */
  const openSession = async (registerId, amount) => {
    const s = await openCashSession({
      registerId,
      openedBy:      profile.id,
      openingAmount: amount,
    })
    setSession(s)
    useUIStore.getState().setActiveSessionId(s.id)
    return s
  }

  /**
   * Cierra la sesión/turno de caja activa.
   * Registra el monto de efectivo contado al momento del cierre.
   *
   * @param {number} closingAmount - Monto de efectivo contado al cerrar la caja
   * @returns {Promise<void>}
   */
  const closeSession = async (closingAmount) => {
    if (!session) return
    await closeCashSession(session.id, closingAmount)
    // Limpiar la sesión del estado local (vuelve a mostrar el modal de apertura)
    setSession(null)
    useUIStore.getState().setActiveSessionId(null)
  }

  return { session, registers, loading, openSession, closeSession, refresh: load }
}
