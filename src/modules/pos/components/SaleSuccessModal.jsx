/**
 * SaleSuccessModal — Pantalla de confirmación post-venta.
 * Muestra el número de venta, el total y permite imprimir el ticket.
 * Auto-cierre en 4s (se pausa si el usuario clickea Imprimir).
 */
import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, Printer } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatCurrency } from '@/shared/utils/formatters'
import { Button } from '@/shared/components/Button'
import { printTicket } from '../utils/ticketPrinter'

export function SaleSuccessModal({ sale, onClose }) {
  const [printing, setPrinting] = useState(false)
  const timerRef = useRef(null)

  const startAutoClose = () => {
    timerRef.current = setTimeout(onClose, 4000)
  }

  useEffect(() => {
    startAutoClose()
    return () => clearTimeout(timerRef.current)
  }, [onClose])

  const handlePrint = async () => {
    // Cancelar auto-cierre mientras imprime
    clearTimeout(timerRef.current)
    setPrinting(true)
    try {
      await printTicket(sale.id)
    } catch (e) {
      toast.error(e.message ?? 'Error al imprimir')
    } finally {
      setPrinting(false)
      // Reiniciar auto-cierre después de imprimir
      startAutoClose()
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface-900 border border-surface-800 rounded-2xl p-8 text-center max-w-sm w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="inline-flex items-center justify-center w-20 h-20 bg-primary-600/10 rounded-3xl mb-5">
          <CheckCircle2 className="w-12 h-12 text-primary-400" />
        </div>

        <h2 className="text-2xl font-bold text-white mb-1">¡Venta confirmada!</h2>
        <p className="text-surface-400 text-sm mb-6">Venta #{sale.sale_number}</p>

        <div className="bg-surface-800 rounded-xl p-4 mb-6">
          <p className="text-surface-400 text-sm">Total cobrado</p>
          <p className="text-3xl font-bold text-primary-400 mt-1">
            {formatCurrency(sale.total)}
          </p>
        </div>

        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={handlePrint}
            loading={printing}
            className="flex-1"
          >
            <Printer className="w-4 h-4" />
            Imprimir
          </Button>
          <Button onClick={onClose} className="flex-1" size="lg">
            Nueva venta
          </Button>
        </div>

        <p className="text-surface-600 text-xs mt-3">
          Se cierra automáticamente en 4s…
        </p>
      </div>
    </div>
  )
}
