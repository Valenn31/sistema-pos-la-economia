/**
 * POSPage — Página principal del módulo de ventas (punto de venta).
 *
 * Flujo de la página:
 *  1. Al montar, carga las cajas registradoras y busca si hay una sesión abierta.
 *  2. Si no hay sesión abierta → muestra CashSessionModal (mode='open') para abrir turno.
 *  3. Si hay sesión activa → muestra el POS completo con ProductSearch (izquierda) + Cart (derecha).
 *  4. Acciones disponibles para el cajero:
 *     - Buscar y agregar productos al carrito
 *     - Cobrar venta (abre PaymentModal)
 *     - Cerrar turno de caja (abre CashSessionModal mode='close')
 *
 * También carga las reglas de descuento activas al montar para aplicarlas automáticamente.
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, ShoppingCart, DollarSign } from 'lucide-react'
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
import { SaleSuccessModal } from './SaleSuccessModal'
import { Spinner }          from '@/shared/components/Spinner'
import { Button }           from '@/shared/components/Button'
import { formatCurrency, formatDateTime } from '@/shared/utils/formatters'
import { ROLE_LABELS }      from '@/routes/roleRoutes'

/**
 * Componente página del punto de venta.
 * Orquesta todo el flujo de ventas: sesión de caja, búsqueda,
 * carrito, cobro y confirmación.
 */
export function POSPage() {
  // Perfil del usuario autenticado (cajero)
  const { profile } = useAuthStore()
  const navigate = useNavigate()
  // Hook de sesión de caja: estado de la sesión, cajas disponibles y operaciones
  const { session, registers, loading, openSession, closeSession, refresh } = useCashSession()
  // Controla si se muestra el modal de apertura (false tras cerrar turno)
  const [wantOpen, setWantOpen] = useState(false)

  // Estado: controla la visibilidad del modal de cierre de turno
  const [showCloseModal,  setShowCloseModal]   = useState(false)
  // Estado: controla la visibilidad del modal de pago/cobro
  const [showPayment,     setShowPayment]      = useState(false)
  // Estado: última venta registrada (se muestra en SaleSuccessModal)
  const [lastSale,        setLastSale]         = useState(null)
  // Estado: totales del turno para el modal de cierre
  const [sessionTotals,   setSessionTotals]    = useState(null)

  // Acciones del store del carrito usadas directamente en este componente
  const addItem      = useCartStore((s) => s.addItem)
  const setDiscounts = useCartStore((s) => s.setDiscounts)

  /**
   * Efecto: carga las reglas de descuento activas desde la base de datos al montar.
   * Las inyecta en el store del carrito para que se apliquen automáticamente a los ítems.
   */
  useEffect(() => {
    getActiveDiscounts().then(setDiscounts).catch(() => {})
  }, [setDiscounts])

  // Referencia al cajero actual (perfil logueado)
  const cashier = profile

  // ── Handlers (manejadores de eventos) ─────────────────────────────

  /**
   * Abre una sesión/turno de caja con la caja y monto indicados.
   * @param {number|string} registerId - ID de la caja seleccionada
   * @param {number} amount - Monto inicial de efectivo en caja
   */
  const handleOpenSession = async (registerId, amount) => {
    try {
      await openSession(registerId, amount)
      toast.success('Caja abierta')
    } catch (err) {
      toast.error(err.message ?? 'Error al abrir caja')
    }
  }

  /**
   * Solicita el cierre del turno: primero obtiene los totales del turno
   * desde el backend y luego abre el modal de cierre.
   */
  const handleRequestClose = async () => {
    try {
      const totals = await getSessionTotals(session.id)
      setSessionTotals(totals)
      setShowCloseModal(true)
    } catch {
      toast.error('Error al obtener totales del turno')
    }
  }

  /**
   * Cierra el turno de caja con el monto de efectivo contado.
   * @param {number} closingAmount - Efectivo contado al cerrar la caja
   */
  const handleCloseSession = async (closingAmount) => {
    try {
      await closeSession(closingAmount)
      setShowCloseModal(false)
      toast.success('Turno cerrado correctamente')
    } catch (err) {
      toast.error(err.message ?? 'Error al cerrar caja')
    }
  }

  /**
   * Callback ejecutado tras una venta exitosa.
   * Guarda la venta para mostrar el modal de confirmación y cierra el modal de pago.
   * @param {Object} sale - Objeto de la venta registrada (con sale_number, total, etc.)
   */
  const handleSaleSuccess = (sale) => {
    setLastSale(sale)
    setShowPayment(false)
    toast.success(`Venta #${sale.sale_number} registrada`)
  }

  // ── Pantalla de carga mientras se obtiene el estado de la sesión ───

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  // ── Sin sesión activa ──────────────────────────────────────────────

  if (!session) {
    if (wantOpen) {
      return (
        <CashSessionModal
          mode="open"
          registers={registers}
          onOpen={handleOpenSession}
          onCancel={() => setWantOpen(false)}
        />
      )
    }
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-5">
          <div className="w-16 h-16 bg-surface-800 rounded-2xl flex items-center justify-center mx-auto">
            <ShoppingCart className="w-8 h-8 text-surface-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white mb-1">No hay caja abierta</h2>
            <p className="text-surface-500 text-sm">Abrí un turno para empezar a vender o volvé al dashboard.</p>
          </div>
          <div className="flex gap-3 justify-center">
            <Button variant="secondary" onClick={() => navigate('/admin/dashboard')}>
              Ir al Dashboard
            </Button>
            <Button onClick={() => setWantOpen(true)}>
              <DollarSign className="w-4 h-4" /> Abrir caja
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // ── POS activo: interfaz completa de ventas ───────────────────────

  return (
    <div className="h-full flex flex-col overflow-hidden">

      {/* ── Barra superior del POS ── */}
      <header className="flex-shrink-0 flex items-center gap-3 px-4 py-2.5 bg-surface-900 border-b border-surface-800">
        {/* Ícono y nombre de la caja registradora */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-primary-600 rounded-lg flex items-center justify-center">
            <ShoppingCart className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-white text-sm hidden sm:block">
            {session.cash_registers?.name ?? 'POS'}
          </span>
        </div>

        {/* Información del turno: fecha/hora de apertura y nombre del cajero */}
        <div className="flex-1 flex items-center gap-2">
          <span className="text-surface-500 text-xs hidden md:block">
            {formatDateTime(session.opened_at)}
          </span>
          <span className="badge bg-surface-800 text-surface-300 text-xs">
            {cashier?.full_name ?? 'Cajero'}
          </span>
        </div>

        {/* Botón para cerrar turno */}
        <div className="flex items-center gap-2">
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

      {/* ── Layout principal: búsqueda de productos + carrito ── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Panel izquierdo: búsqueda y selección de productos */}
        <div className="flex-1 overflow-hidden">
          <ProductSearch onAdd={addItem} />
        </div>

        {/* Panel derecho: carrito con ítems, totales y botón cobrar */}
        <div className="w-80 xl:w-96 flex-shrink-0 overflow-hidden">
          <Cart onCheckout={() => setShowPayment(true)} />
        </div>
      </div>

      {/* ── Modales superpuestos ── */}

      {/* Modal de cobro/pago */}
      {showPayment && (
        <PaymentModal
          session={session}
          cashier={cashier}
          onSuccess={handleSaleSuccess}
          onClose={() => setShowPayment(false)}
        />
      )}

      {/* Modal de cierre de turno */}
      {showCloseModal && (
        <CashSessionModal
          mode="close"
          session={session}
          totals={sessionTotals}
          onClose={handleCloseSession}
          onCancel={() => setShowCloseModal(false)}
        />
      )}

      {/* Modal de confirmación de venta exitosa */}
      {lastSale && (
        <SaleSuccessModal
          sale={lastSale}
          onClose={() => setLastSale(null)}
        />
      )}
    </div>
  )
}
