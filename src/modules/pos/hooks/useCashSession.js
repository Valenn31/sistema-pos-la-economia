/**
 * useCashSession — Hook para gestionar el turno de caja activo.
 *
 * @returns {{
 *   session:      object|null,   // sesión de caja activa
 *   registers:    object[],      // cajas disponibles
 *   loading:      boolean,
 *   openSession:  (registerId, amount) => Promise,
 *   closeSession: (amount) => Promise,
 *   refresh:      () => void,
 * }}
 */
import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '@/shared/store/authStore'
import {
  getActiveRegisters,
  getActiveSession,
  openCashSession,
  closeCashSession,
} from '@/modules/pos/services/cashSessionService'

export function useCashSession() {
  const { profile } = useAuthStore()
  const [session,   setSession]   = useState(null)
  const [registers, setRegisters] = useState([])
  const [loading,   setLoading]   = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const regs = await getActiveRegisters()
      setRegisters(regs)

      // Busca sesión abierta en cualquier caja activa
      let found = null
      for (const reg of regs) {
        const s = await getActiveSession(reg.id)
        if (s) { found = s; break }
      }
      setSession(found)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const openSession = async (registerId, amount) => {
    const s = await openCashSession({
      registerId,
      openedBy:      profile.id,
      openingAmount: amount,
    })
    setSession(s)
    return s
  }

  const closeSession = async (closingAmount) => {
    if (!session) return
    await closeCashSession(session.id, closingAmount)
    setSession(null)
  }

  return { session, registers, loading, openSession, closeSession, refresh: load }
}
