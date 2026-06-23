/**
 * ReturnsTab — Procesamiento de devoluciones desde Reportes.
 *
 * Flujo:
 *  1. Cajero ingresa número de venta y busca
 *  2. Se muestran los ítems con cantidades originales y ya devueltas
 *  3. Selecciona items/cantidades a devolver + motivo obligatorio
 *  4. Confirma → createReturn restaura stock y ajusta saldo de cuenta
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

const METHOD_LABELS = {
  efectivo: 'Efectivo', debito: 'Débito', credito: 'Crédito',
  qr: 'QR/MP', transferencia: 'Transferencia', cuenta: 'Cta. Cte.',
}

export function ReturnsTab() {
  const { user } = useAuthStore()

  const [saleNumber,  setSaleNumber]  = useState('')
  const [sale,        setSale]        = useState(null)
  const [prevReturns, setPrevReturns] = useState([])
  const [selections,  setSelections]  = useState({}) // { saleItemId: { checked, qty } }
  const [reason,      setReason]      = useState('')
  const [searching,   setSearching]   = useState(false)
  const [processing,  setProcessing]  = useState(false)
  const [done,        setDone]        = useState(false)

  // Mapa de cantidades ya devueltas por sale_item_id
  const returnedMap = useMemo(() => {
    const map = {}
    for (const ret of prevReturns) {
      for (const ri of (ret.return_items ?? [])) {
        map[ri.sale_item_id] = (map[ri.sale_item_id] ?? 0) + ri.quantity
      }
    }
    return map
  }, [prevReturns])

  // Total a devolver según selección actual
  const returnTotal = useMemo(() => {
    if (!sale) return 0
    return (sale.sale_items ?? []).reduce((sum, item) => {
      const sel = selections[item.id]
      if (!sel?.checked) return sum
      return sum + item.unit_price * sel.qty
    }, 0)
  }, [selections, sale])

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
      // Inicializar selecciones
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

  const toggleItem = (itemId) => {
    setSelections((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], checked: !prev[itemId].checked },
    }))
  }

  const setQty = (itemId, value, max) => {
    const qty = Math.min(Math.max(0.001, parseFloat(value) || 0), max)
    setSelections((prev) => ({ ...prev, [itemId]: { ...prev[itemId], qty } }))
  }

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
      await createReturn({ saleId: sale.id, userId: user.id, items, reason, sale })
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

      {/* Buscador */}
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

      {/* Confirmación */}
      {done && (
        <div className="card flex items-center gap-3 border-green-700 bg-green-900/20">
          <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />
          <p className="text-green-300 text-sm">Devolución procesada. El stock fue restaurado.</p>
        </div>
      )}

      {searching && <div className="flex justify-center py-10"><Spinner /></div>}

      {sale && (
        <>
          {/* Info de la venta */}
          <div className="card space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-white">
                Venta #{sale.sale_number}
              </h2>
              <Badge color="gray">{sale.receipt_type}</Badge>
            </div>
            <p className="text-xs text-surface-400">{formatDateTime(sale.created_at)}</p>
            {sale.customers && (
              <p className="text-sm text-surface-300">
                Cliente: <span className="text-white">{sale.customers.full_name}</span>
              </p>
            )}
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

          {/* Aviso si ya hay devoluciones */}
          {prevReturns.length > 0 && (
            <div className="flex items-start gap-2 bg-yellow-900/20 border border-yellow-700/40 rounded-xl px-4 py-3">
              <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
              <p className="text-yellow-300 text-xs">
                Esta venta ya tuvo {prevReturns.length} devolución{prevReturns.length > 1 ? 'es' : ''} anteriores.
                Las cantidades máximas ya están ajustadas.
              </p>
            </div>
          )}

          {/* Tabla de ítems */}
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
                  const alreadyReturned = returnedMap[item.id] ?? 0
                  const maxReturnable   = item.quantity - alreadyReturned
                  const sel             = selections[item.id] ?? { checked: false, qty: maxReturnable }
                  const disabled        = maxReturnable <= 0

                  return (
                    <tr
                      key={item.id}
                      className={`transition-colors ${disabled ? 'opacity-40' : 'hover:bg-surface-800/40'}`}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          className="checkbox-base"
                          checked={sel.checked}
                          disabled={disabled}
                          onChange={() => toggleItem(item.id)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-white font-medium">{item.products?.name ?? '—'}</p>
                        {item.products?.sku && (
                          <p className="text-xs text-surface-500">{item.products.sku}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-surface-300">
                        {formatCurrency(item.unit_price)}
                      </td>
                      <td className="px-4 py-3 text-right text-surface-300">
                        {item.quantity} {item.products?.unit_of_measure ?? ''}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {alreadyReturned > 0
                          ? <span className="text-yellow-400">{alreadyReturned}</span>
                          : <span className="text-surface-600">—</span>
                        }
                      </td>
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

          {/* Motivo + total + botón */}
          <div className="card space-y-4">
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
