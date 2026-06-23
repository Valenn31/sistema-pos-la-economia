/**
 * ReceiveOrderModal — Modal para registrar la recepción de mercadería
 * de una Orden de Compra. Incrementa stock en Depósito por cada ítem.
 */
import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Modal } from '@/shared/components/Modal'
import { Button } from '@/shared/components/Button'
import { Spinner } from '@/shared/components/Spinner'
import { useAuthStore } from '@/shared/store/authStore'
import { getPurchaseOrderById, receivePurchaseOrder } from '../services/purchaseService'
import { getLocations } from '@/modules/stock/services/movementService'
import { formatCurrency } from '@/shared/utils/formatters'

export function ReceiveOrderModal({ open, onClose, onSaved, orderId }) {
  const { profile } = useAuthStore()
  const [order, setOrder]         = useState(null)
  const [locations, setLocations] = useState([])
  const [quantities,   setQuantities]   = useState({})
  const [expiryDates,  setExpiryDates]  = useState({})
  const [depositId,    setDepositId]    = useState(null)
  const [loading, setLoading]     = useState(false)
  const [saving, setSaving]       = useState(false)

  useEffect(() => {
    if (!open || !orderId) return
    setLoading(true)
    Promise.all([getPurchaseOrderById(orderId), getLocations()])
      .then(([ord, locs]) => {
        setOrder(ord)
        setLocations(locs)
        // Pre-fill quantities with ordered amounts
        const init = {}
        ord.items.forEach((i) => { init[i.id] = i.quantity_ordered - (i.quantity_received ?? 0) })
        setQuantities(init)
        // Default deposit = first location named "Depósito"
        const dep = locs.find((l) => l.name.toLowerCase().includes('dep')) ?? locs[0]
        if (dep) setDepositId(dep.id)
      })
      .catch(() => toast.error('Error al cargar la orden'))
      .finally(() => setLoading(false))
  }, [open, orderId])

  const handleConfirm = async () => {
    if (!depositId) return toast.error('Seleccioná la ubicación de destino')
    setSaving(true)
    try {
      const receivedItems = (order.items ?? []).map((i) => ({
        itemId:           i.id,
        productId:        i.product_id,
        quantityReceived: parseFloat(quantities[i.id]) || 0,
        expiryDate:       expiryDates[i.id] || null,
      }))
      await receivePurchaseOrder(order.id, receivedItems, profile.id, depositId)
      toast.success('Mercadería recibida — stock actualizado')
      onSaved()
      onClose()
    } catch (err) {
      toast.error(err.message ?? 'Error al registrar recepción')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Recibir mercadería" size="lg">
      {loading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : order && (
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-surface-500">Proveedor</span>
              <p className="text-white font-medium">{order.suppliers?.razon_social}</p>
            </div>
            <div>
              <span className="text-surface-500">OC #</span>
              <p className="text-white font-medium">{order.order_number}</p>
            </div>
          </div>

          {/* Ubicación destino */}
          <div>
            <label className="label-base">Ingresar a ubicación</label>
            <select
              className="input-base"
              value={depositId ?? ''}
              onChange={(e) => setDepositId(parseInt(e.target.value))}
            >
              {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>

          {/* Ítems con cantidades editables */}
          <div className="space-y-2">
            <div className="grid grid-cols-[1fr_80px_80px] gap-3 text-xs text-surface-500 px-1">
              <span>Producto</span><span className="text-center">Pedido</span><span className="text-center">Recibido</span>
            </div>
            {(order.items ?? []).map((item) => (
              <div key={item.id} className="bg-surface-800 rounded-lg px-3 py-3 space-y-2">
                <div className="grid grid-cols-[1fr_80px_80px] gap-3 items-center">
                  <div>
                    <p className="text-sm text-white font-medium">{item.products?.name}</p>
                    <p className="text-xs text-surface-500">{formatCurrency(item.unit_price)} c/u</p>
                  </div>
                  <span className="text-center text-surface-400">{item.quantity_ordered}</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={quantities[item.id] ?? ''}
                    onChange={(e) => setQuantities((prev) => ({ ...prev, [item.id]: e.target.value }))}
                    className="input-base text-center py-1"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-surface-500 whitespace-nowrap">Vencimiento (opc.):</label>
                  <input
                    type="date"
                    value={expiryDates[item.id] ?? ''}
                    onChange={(e) => setExpiryDates((prev) => ({ ...prev, [item.id]: e.target.value }))}
                    className="input-base py-1 text-xs flex-1"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={onClose} className="flex-1">Cancelar</Button>
            <Button onClick={handleConfirm} loading={saving} className="flex-1">Confirmar recepción</Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
