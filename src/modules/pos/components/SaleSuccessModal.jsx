/**
 * SaleSuccessModal — Pantalla de confirmación post-venta.
 *
 * Se muestra tras registrar una venta exitosamente. Presenta:
 *  - Ícono de confirmación animado
 *  - Número de venta
 *  - Total cobrado
 *  - Botón para imprimir ticket
 *  - Botón para iniciar nueva venta
 *
 * Comportamiento:
 *  - Se cierra automáticamente después de 4 segundos
 *  - Si el usuario hace clic en "Imprimir", se pausa el auto-cierre
 *    durante la impresión y se reinicia al terminar
 *  - Se puede cerrar haciendo clic en el overlay o en "Nueva venta"
 *
 * @param {Object}   props
 * @param {Object}   props.sale    - Objeto de la venta registrada (con sale_number y total)
 * @param {Function} props.onClose - Callback para cerrar el modal: () => void
 */
import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, Printer } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatCurrency } from '@/shared/utils/formatters'
import { Button } from '@/shared/components/Button'
import { printTicket } from '../utils/ticketPrinter'

/**
 * Componente modal de éxito post-venta.
 * Muestra la confirmación y permite imprimir el ticket.
 */
export function SaleSuccessModal({ sale, onClose }) {
  // Estado: indica si se está imprimiendo el ticket actualmente
  const [printing, setPrinting] = useState(false)
  // Ref al timer de auto-cierre para poder cancelarlo
  const timerRef = useRef(null)

  /**
   * Inicia el temporizador de auto-cierre del modal (4 segundos).
   * Se puede cancelar durante la impresión y reiniciar después.
   */
  const startAutoClose = () => {
    timerRef.current = setTimeout(onClose, 4000)
  }

  /**
   * Efecto: inicia el auto-cierre al montar el componente.
   * Limpia el timer al desmontar para evitar fugas de memoria.
   */
  useEffect(() => {
    startAutoClose()
    return () => clearTimeout(timerRef.current)
  }, [onClose])

  /**
   * Maneja la impresión del ticket de venta.
   * Cancela el auto-cierre mientras dura la impresión y lo reinicia al terminar.
   */
  const handlePrint = async () => {
    // Cancelar auto-cierre mientras se imprime
    clearTimeout(timerRef.current)
    setPrinting(true)
    try {
      await printTicket(sale.id)
    } catch (e) {
      toast.error(e.message ?? 'Error al imprimir')
    } finally {
      setPrinting(false)
      // Reiniciar auto-cierre después de que termine la impresión
      startAutoClose()
    }
  }

  return (
    /* Overlay: cierra el modal al hacer clic fuera del contenido */
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Contenido del modal: detiene la propagación para no cerrar al hacer clic dentro */}
      <div
        className="bg-surface-900 border border-surface-800 rounded-2xl p-8 text-center max-w-sm w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ícono de confirmación (check verde) */}
        <div className="inline-flex items-center justify-center w-20 h-20 bg-primary-600/10 rounded-3xl mb-5">
          <CheckCircle2 className="w-12 h-12 text-primary-400" />
        </div>

        {/* Título y número de venta */}
        <h2 className="text-2xl font-bold text-white mb-1">¡Venta confirmada!</h2>
        <p className="text-surface-400 text-sm mb-6">Venta #{sale.sale_number}</p>

        {/* Total cobrado destacado */}
        <div className="bg-surface-800 rounded-xl p-4 mb-6">
          <p className="text-surface-400 text-sm">Total cobrado</p>
          <p className="text-3xl font-bold text-primary-400 mt-1">
            {formatCurrency(sale.total)}
          </p>
        </div>

        {/* Botones de acción: imprimir ticket y nueva venta */}
        <div className="flex gap-3">
          {/* Botón imprimir: pausa el auto-cierre durante la impresión */}
          <Button
            variant="secondary"
            onClick={handlePrint}
            loading={printing}
            className="flex-1"
          >
            <Printer className="w-4 h-4" />
            Imprimir
          </Button>
          {/* Botón nueva venta: cierra el modal inmediatamente */}
          <Button onClick={onClose} className="flex-1" size="lg">
            Nueva venta
          </Button>
        </div>

        {/* Indicador de auto-cierre */}
        <p className="text-surface-600 text-xs mt-3">
          Se cierra automáticamente en 4s…
        </p>
      </div>
    </div>
  )
}
