/**
 * ReturnsTab — Pestaña de procesamiento de devoluciones desde Reportes.
 *
 * Flujo completo de devolución:
 *  1. El cajero ingresa el número de venta y busca
 *  2. Se muestran los ítems con cantidades originales y ya devueltas
 *  3. Selecciona los ítems y cantidades a devolver + motivo obligatorio
 *  4. Al confirmar, createReturn restaura stock y ajusta saldo de cuenta corriente
 *
 * @module reports/components/ReturnsTab
 */
import { useState, useMemo } from 'react'
import { Search, RotateCcw, AlertTriangle, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '@/shared/components/Button'
import { Spinner } from '@/shared/components/Spinner'
import { Badge } from '@/shared/components/Badge'
import { getSaleByNumber, getPreviousReturns, createReturn } from '@/modules/pos/services/returnsService'
import { useAuthStore } from '@/shared/store/authStore'
import { formatCurrency, formatDateTime } from '@/shared/utils/formatters'

/** Mapa de métodos de pago a sus etiquetas legibles en español */
const METHOD_LABELS = {
  efectivo: 'Efectivo', debito: 'Débito', credito: 'Crédito',
  qr: 'QR/MP', transferencia: 'Transferencia', cuenta: 'Cta. Cte.',
}

/**
 * Componente que gestiona el flujo completo de devoluciones de ventas.
 * Busca una venta por número, muestra sus ítems, permite seleccionar
 * cantidades a devolver y procesa la devolución.
 *
 * @returns {JSX.Element} Pestaña de devoluciones
 */
export function ReturnsTab() {
  /** Usuario autenticado, obtenido del store global */
  const { user } = useAuthStore()

  /** Estado: número de venta ingresado por el usuario */
  const [saleNumber,  setSaleNumber]  = useState('')
  /** Estado: datos completos de la venta encontrada */
  const [sale,        setSale]        = useState(null)
  /** Estado: lista de devoluciones previas de esta venta */
  const [prevReturns, setPrevReturns] = useState([])
  /** Estado: selecciones del usuario { saleItemId: { checked, qty } } */
  const [selections,  setSelections]  = useState({})
  /** Estado: motivo de la devolución (campo obligatorio) */
  const [reason,      setReason]      = useState('')
  /** Estado: indica si se está buscando la venta */
  const [searching,   setSearching]   = useState(false)
  /** Estado: indica si se está procesando la devolución */
  const [processing,  setProcessing]  = useState(false)
  /** Estado: indica si la devolución se completó exitosamente */
  const [done,        setDone]        = useState(false)
  /** Estado: checkbox para decidir si reponer stock automáticamente */
  const [restoreStock, setRestoreStock] = useState(true)

  /**
   * Mapa memo de cantidades ya devueltas por sale_item_id.
   * Recorre todas las devoluciones previas y suma las cantidades
   * por cada ítem de la venta original.
   */
  const returnedMap = useMemo(() => {
    const map = {}
    for (const ret of prevReturns) {
      for (const ri of (ret.return_items ?? [])) {
        map[ri.sale_item_id] = (map[ri.sale_item_id] ?? 0) + ri.quantity
      }
    }
    return map
  }, [prevReturns])

  /**
   * Calcula el monto total a devolver según la selección actual del usuario.
   * Solo suma los ítems marcados como checked con cantidad > 0.
   */
  const returnTotal = useMemo(() => {
    if (!sale) return 0
    return (sale.sale_items ?? []).reduce((sum, item) => {
      const sel = selections[item.id]
      if (!sel?.checked) return sum
      return sum + item.unit_price * sel.qty
    }, 0)
  }, [selections, sale])

  /**
   * Busca la venta por número ingresado.
   * Resetea estados previos, obtiene la venta y sus devoluciones anteriores,
   * e inicializa las selecciones con las cantidades máximas devolvibles.
   */
  const handleSearch = async () => {
    if (!saleNumber.trim()) return
    setSearching(true)
    setSale(null)
    setPrevReturns([])
    setSelections({})
    setReason('')
    setDone(false)
    try {
      const found = await getSaleByNumber(saleNumber.trim())
      if (!found) { toast.error('Venta no encontrada'); return }
      const prev = await getPreviousReturns(found.id)
      setSale(found)
      setPrevReturns(prev)
      // Inicializar selecciones: cada ítem desmarcado con cantidad máxima devolvible
      const init = {}
      for (const item of (found.sale_items ?? [])) {
        init[item.id] = { checked: false, qty: item.quantity - (prev.reduce((s, r) =>
          s + (r.return_items ?? []).filter(ri => ri.sale_item_id === item.id)
            .reduce((a, b) => a + b.quantity, 0), 0) ?? 0) }
      }
      setSelections(init)
    } catch { toast.error('Error al buscar la venta') }
    finally { setSearching(false) }
  }

  /**
   * Alterna la selección (checked/unchecked) de un ítem de la venta.
   * @param {string} itemId - ID del ítem de la venta
   */
  const toggleItem = (itemId) => {
    setSelections((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], checked: !prev[itemId].checked },
    }))
  }

  /**
   * Actualiza la cantidad a devolver de un ítem, asegurando que esté
   * dentro del rango válido (0.001 a max).
   * @param {string} itemId - ID del ítem de la venta
   * @param {string} value - Valor ingresado en el input
   * @param {number} max - Cantidad máxima devolvible
   */
  const setQty = (itemId, value, max) => {
    const qty = Math.min(Math.max(0.001, parseFloat(value) || 0), max)
    setSelections((prev) => ({ ...prev, [itemId]: { ...prev[itemId], qty } }))
  }

  /**
   * Procesa la devolución. Valida que haya ítems seleccionados y un motivo,
   * luego llama al servicio createReturn que restaura stock y ajusta cuentas.
   */
  const handleProcess = async () => {
    const items = (sale.sale_items ?? [])
      .filter((item) => selections[item.id]?.checked && selections[item.id]?.qty > 0)
      .map((item) => ({
        saleItemId: item.id,
        productId:  item.product_id,
        quantity:   selections[item.id].qty,
        unitPrice:  item.unit_price,
        subtotal:   parseFloat((item.unit_price * selections[item.id].qty).toFixed(2)),
      }))

    if (items.length === 0) { toast.error('Seleccioná al menos un ítem'); return }
    if (!reason.trim())      { toast.error('Ingresá un motivo de devolución'); return }

    setProcessing(true)
    try {
      await createReturn({ saleId: sale.id, userId: user.id, items, reason, sale, restoreStock })
      toast.success('Devolución procesada correctamente')
      setDone(true)
      setSale(null)
      setSaleNumber('')
    } catch (e) {
      toast.error(e.message ?? 'Error al procesar la devolución')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="space-y-4 max-w-3xl">

      {/* Buscador de venta por número */}
      <div className="card flex gap-3 items-end">
        <div className="flex-1">
          <label className="label-base">Número de venta</label>
          <input
            type="number"
            className="input-base"
            placeholder="Ej: 1042"
            value={saleNumber}
            onChange={(e) => setSaleNumber(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>
        <Button onClick={handleSearch} loading={searching}>
          <Search className="w-4 h-4" /> Buscar
        </Button>
      </div>

      {/* Mensaje de confirmación cuando la devolución se procesó exitosamente */}
      {done && (
        <div className="card flex items-center gap-3 border-green-700 bg-green-900/20">
          <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />
          <p className="text-green-300 text-sm">Devolución procesada.</p>
        </div>
      )}

      {/* Indicador de carga mientras se busca la venta */}
      {searching && <div className="flex justify-center py-10"><Spinner /></div>}

      {/* Detalle de la venta encontrada y formulario de devolución */}
      {sale && (
        <>
          {/* Información general de la venta */}
          <div className="card space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-white">
                Venta #{sale.sale_number}
              </h2>
              <Badge color="gray">{sale.receipt_type}</Badge>
            </div>
            <p className="text-xs text-surface-400">{formatDateTime(sale.created_at)}</p>
            {/* Nombre del cliente si existe */}
            {sale.customers && (
              <p className="text-sm text-surface-300">
                Cliente: <span className="text-white">{sale.customers.full_name}</span>
              </p>
            )}
            {/* Desglose de métodos de pago utilizados */}
            <div className="flex gap-3 flex-wrap">
              {(sale.sale_payments ?? []).map((p, i) => (
                <span key={i} className="text-xs text-surface-400">
                  {METHOD_LABELS[p.method] ?? p.method}: <span className="text-white">{formatCurrency(p.amount)}</span>
                </span>
              ))}
            </div>
            <p className="text-sm font-semibold text-white">
              Total venta: {formatCurrency(sale.total)}
            </p>
          </div>

          {/* Advertencia si la venta ya tiene devoluciones previas */}
          {prevReturns.length > 0 && (
            <div className="flex items-start gap-2 bg-yellow-900/20 border border-yellow-700/40 rounded-xl px-4 py-3">
              <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
              <p className="text-yellow-300 text-xs">
                Esta venta ya tuvo {prevReturns.length} devolución{prevReturns.length > 1 ? 'es' : ''} anteriores.
                Las cantidades máximas ya están ajustadas.
              </p>
            </div>
          )}

          {/* Tabla de ítems de la venta con selección para devolver */}
          <div className="overflow-x-auto rounded-xl border border-surface-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-800 text-surface-400 text-left">
                  <th className="px-4 py-3 w-8"></th>
                  <th className="px-4 py-3">Producto</th>
                  <th className="px-4 py-3 text-right">Precio</th>
                  <th className="px-4 py-3 text-right">Cant. orig.</th>
                  <th className="px-4 py-3 text-right">Ya devuelto</th>
                  <th className="px-4 py-3 text-right">A devolver</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-800">
                {(sale.sale_items ?? []).map((item) => {
                  /** Cantidad ya devuelta de este ítem en devoluciones previas */
                  const alreadyReturned = returnedMap[item.id] ?? 0
                  /** Cantidad máxima que aún se puede devolver */
                  const maxReturnable   = item.quantity - alreadyReturned
                  /** Estado de selección actual de este ítem */
                  const sel             = selections[item.id] ?? { checked: false, qty: maxReturnable }
                  /** Flag: ítem completamente devuelto, no seleccionable */
                  const disabled        = maxReturnable <= 0

                  return (
                    <tr
                      key={item.id}
                      className={`transition-colors ${disabled ? 'opacity-40' : 'hover:bg-surface-800/40'}`}
                    >
                      {/* Checkbox de selección */}
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          className="checkbox-base"
                          checked={sel.checked}
                          disabled={disabled}
                          onChange={() => toggleItem(item.id)}
                        />
                      </td>
                      {/* Nombre y SKU del producto */}
                      <td className="px-4 py-3">
                        <p className="text-white font-medium">{item.products?.name ?? '—'}</p>
                        {item.products?.sku && (
                          <p className="text-xs text-surface-500">{item.products.sku}</p>
                        )}
                      </td>
                      {/* Precio unitario */}
                      <td className="px-4 py-3 text-right text-surface-300">
                        {formatCurrency(item.unit_price)}
                      </td>
                      {/* Cantidad original vendida */}
                      <td className="px-4 py-3 text-right text-surface-300">
                        {item.quantity} {item.products?.unit_of_measure ?? ''}
                      </td>
                      {/* Cantidad ya devuelta previamente */}
                      <td className="px-4 py-3 text-right">
                        {alreadyReturned > 0
                          ? <span className="text-yellow-400">{alreadyReturned}</span>
                          : <span className="text-surface-600">—</span>
                        }
                      </td>
                      {/* Input de cantidad a devolver o indicador de devuelto completo */}
                      <td className="px-4 py-3 text-right">
                        {disabled ? (
                          <span className="text-surface-600 text-xs">Devuelto completo</span>
                        ) : (
                          <input
                            type="number"
                            min="0"
                            max={maxReturnable}
                            step="1"
                            value={sel.qty}
                            disabled={!sel.checked}
                            onChange={(e) => setQty(item.id, e.target.value, maxReturnable)}
                            className="input-base w-20 text-right py-1 px-2 text-sm disabled:opacity-40"
                          />
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Sección inferior: motivo, opción de stock, total y botón de procesar */}
          <div className="card space-y-4">
            {/* Campo de motivo de devolución (obligatorio) */}
            <div>
              <label className="label-base">Motivo de devolución <span className="text-red-400">*</span></label>
              <textarea
                className="input-base resize-none"
                rows={2}
                placeholder="Producto defectuoso, error en el cobro, etc."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>

            {/* Checkbox para decidir si se devuelve la mercadería al stock */}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                className="checkbox-base"
                checked={restoreStock}
                onChange={(e) => setRestoreStock(e.target.checked)}
              />
              <span className="text-sm text-surface-300">Devolver productos al stock</span>
              {!restoreStock && (
                <span className="text-xs text-yellow-400">(no se repondrá mercadería)</span>
              )}
            </label>

            {/* Total a devolver y botón de confirmación */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-surface-500">Total a devolver</p>
                <p className="text-xl font-bold text-primary-400">{formatCurrency(returnTotal)}</p>
              </div>
              <Button
                onClick={handleProcess}
                loading={processing}
                disabled={returnTotal <= 0 || !reason.trim()}
              >
                <RotateCcw className="w-4 h-4" />
                Procesar devolución
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
