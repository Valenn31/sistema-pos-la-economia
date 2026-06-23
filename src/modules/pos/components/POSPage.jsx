/**
 * POSPage — Página principal del módulo de ventas.
 *
 * Flujo:
 *  1. Carga las cajas y busca si hay una sesión abierta.
 *  2. Si no hay sesión → muestra CashSessionModal (mode='open').
 *  3. Si hay sesión → muestra el POS completo (ProductSearch + Cart).
 *  4. El cajero puede:
 *     - Agregar productos al carrito y cobrar (PaymentModal)
 *     - Cambiar de cajero con PIN (PinSwitchModal) sin cerrar caja
 *     - Cerrar el turno (CashSessionModal mode='close')
 */
import { useState, useEffect } from 'react'
import { LogOut, ShoppingCart } from 'lucide-react'
import toast from 'react-hot-toast'

import { useCashSession }      from '@/modules/pos/hooks/useCashSession'
import { useCartStore }        from '@/modules/pos/hooks/useCartStore'
import { getSessionTotals }    from '@/modules/pos/services/cashSessionService'
import { getActiveDiscounts }  from '@/modules/admin/services/discountService'
import { useAuthStore }        from '@/shared/store/authStore'

import { CashSessionModal } from './CashSessionModal'
import { ProductSearch }    from './ProductSearch'
import { Cart }             from './Cart'
import { PaymentModal }     from './PaymentModal'
import { PinSwitchModal }   from './PinSwitchModal'
import { SaleSuccessModal } from './SaleSuccessModal'
import { Spinner }          from '@/shared/components/Spinner'
import { Button }           from '@/shared/components/Button'
import { formatCurrency, formatDateTime } from '@/shared/utils/formatters'
import { ROLE_LABELS }      from '@/routes/roleRoutes'

export function POSPage() {
  const { profile } = useAuthStore()
  const { session, registers, loading, openSession, closeSession, refresh } = useCashSession()

  // El cajero "activo" puede diferir del usuario logueado (PIN switch)
  const [activeCashier,   setActiveCashier]   = useState(null)
  const [showCloseModal,  setShowCloseModal]   = useState(false)
  const [showPayment,     setShowPayment]      = useState(false)
  const [showPinSwitch,   setShowPinSwitch]    = useState(false)
  const [lastSale,        setLastSale]         = useState(null)
  const [sessionTotals,   setSessionTotals]    = useState(null)

  const addItem      = useCartStore((s) => s.addItem)
  const setDiscounts = useCartStore((s) => s.setDiscounts)

  // Cargar reglas de descuento activas al montar
  useEffect(() => {
    getActiveDiscounts().then(setDiscounts).catch(() => {})
  }, [setDiscounts])

  // Cajero efectivo: el del PIN switch o el perfil logueado
  const cashier = activeCashier ?? profile

  // ── Handlers ──────────────────────────────────────────────────────

  const handleOpenSession = async (registerId, amount) => {
    try {
      await openSession(registerId, amount)
      toast.success('Caja abierta')
    } catch (err) {
      toast.error(err.message ?? 'Error al abrir caja')
    }
  }

  const handleRequestClose = async () => {
    try {
      const totals = await getSessionTotals(session.id)
      setSessionTotals(totals)
      setShowCloseModal(true)
    } catch {
      toast.error('Error al obtener totales del turno')
    }
  }

  const handleCloseSession = async (closingAmount) => {
    try {
      await closeSession(closingAmount)
      setShowCloseModal(false)
      toast.success('Turno cerrado correctamente')
    } catch (err) {
      toast.error(err.message ?? 'Error al cerrar caja')
    }
  }

  const handleSaleSuccess = (sale) => {
    setLastSale(sale)
    setShowPayment(false)
    toast.success(`Venta #${sale.sale_number} registrada`)
  }

  // ── Loading ───────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  // ── Sin sesión → abrir caja ───────────────────────────────────────

  if (!session) {
    return (
      <CashSessionModal
        mode="open"
        registers={registers}
        onOpen={handleOpenSession}
      />
    )
  }

  // ── POS activo ────────────────────────────────────────────────────

  return (
    <div className="h-full flex flex-col overflow-hidden">

      {/* ── Topbar del POS ──────────────────────────────────────────── */}
      <header className="flex-shrink-0 flex items-center gap-3 px-4 py-2.5 bg-surface-900 border-b border-surface-800">
        {/* Icono + nombre de caja */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-primary-600 rounded-lg flex items-center justify-center">
            <ShoppingCart className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-white text-sm hidden sm:block">
            {session.cash_registers?.name ?? 'POS'}
          </span>
        </div>

        {/* Cajero activo */}
        <div className="flex-1 flex items-center gap-2">
          <span className="text-surface-500 text-xs hidden md:block">
            {formatDateTime(session.opened_at)}
          </span>
          <span className="badge bg-surface-800 text-surface-300 text-xs">
            {cashier?.full_name ?? 'Cajero'}
          </span>
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowPinSwitch(true)}
            className="hidden sm:flex text-surface-400"
          >
            Cambiar cajero
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRequestClose}
            className="text-xs"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Cerrar turno</span>
          </Button>
        </div>
      </header>

      {/* ── Layout principal: búsqueda + carrito ───────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Panel izquierdo: búsqueda de productos */}
        <div className="flex-1 overflow-hidden">
          <ProductSearch onAdd={addItem} />
        </div>

        {/* Panel derecho: carrito */}
        <div className="w-80 xl:w-96 flex-shrink-0 overflow-hidden">
          <Cart onCheckout={() => setShowPayment(true)} />
        </div>
      </div>

      {/* ── Modales ────────────────────────────────────────────────── */}

      {showPayment && (
        <PaymentModal
          session={session}
          cashier={cashier}
          onSuccess={handleSaleSuccess}
          onClose={() => setShowPayment(false)}
        />
      )}

      {showPinSwitch && (
        <PinSwitchModal
          onSwitch={(result) => setActiveCashier(result.profile)}
          onClose={() => setShowPinSwitch(false)}
        />
      )}

      {showCloseModal && (
        <CashSessionModal
          mode="close"
          session={session}
          totals={sessionTotals}
          onClose={handleCloseSession}
          onCancel={() => setShowCloseModal(false)}
        />
      )}

      {lastSale && (
        <SaleSuccessModal
          sale={lastSale}
          onClose={() => setLastSale(null)}
        />
      )}
    </div>
  )
}
