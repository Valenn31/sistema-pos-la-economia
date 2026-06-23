/**
 * ticketPrinter.js — Genera e imprime un ticket/comprobante de venta.
 *
 * Funciones exportadas:
 *  - printTicket(saleId)              → Obtiene la venta + config e imprime en ventana emergente
 *  - buildTicketHtml(sale, settings)  → Genera el HTML del comprobante (exportado para preview)
 *
 * Formato: 80mm o 58mm (papel térmico estándar). Usa @page CSS para auto-size.
 */
import { getSaleForPrint } from '../services/salesService'
import { getSettings }     from '@/modules/admin/services/adminService'

/**
 * Mapa de métodos de pago internos a etiquetas legibles para el ticket.
 * @type {Record<string, string>}
 */
const METHOD_LABELS = {
  efectivo:      'Efectivo',
  debito:        'Tarjeta Débito',
  credito:       'Tarjeta Crédito',
  qr:            'QR / Mercado Pago',
  transferencia: 'Transferencia',
  cuenta:        'Cuenta Corriente',
}

/**
 * Mapa de tipos de comprobante internos a etiquetas para el encabezado del ticket.
 * @type {Record<string, string>}
 */
const RECEIPT_LABELS = {
  ticket:     'TICKET',
  factura_a:  'FACTURA A',
  factura_b:  'FACTURA B',
  factura_c:  'FACTURA C',
}

/**
 * Formatea un número como moneda argentina con símbolo $ y 2 decimales.
 *
 * @param {number|null} n - Monto a formatear
 * @returns {string} Monto formateado (ej: "$1.234,56")
 */
function fmtCurrency(n) {
  return '$' + Number(n ?? 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/**
 * Formatea una fecha ISO a formato legible argentino (fecha + hora).
 *
 * @param {string} iso - Fecha en formato ISO 8601
 * @returns {string} Fecha formateada (ej: "22/06/2026 14:35")
 */
function fmtDate(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString('es-AR') + ' ' + d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
}

/**
 * Rellena un string con espacios hasta alcanzar la longitud deseada.
 *
 * @param {*} str - Valor a convertir a string y rellenar
 * @param {number} len - Longitud deseada
 * @param {boolean} [right=false] - Si es true, alinea a la derecha (padStart)
 * @returns {string} String rellenado con espacios
 */
function pad(str, len, right = false) {
  const s = String(str ?? '')
  if (right) return s.padStart(len, ' ')
  return s.padEnd(len, ' ')
}

/**
 * Genera una línea de texto con contenido alineado a izquierda y derecha.
 * Útil para líneas tipo "Subtotal:          $1.234,56" en tickets de texto plano.
 *
 * @param {*} left - Texto alineado a la izquierda
 * @param {*} right - Texto alineado a la derecha
 * @param {number} [total=42] - Ancho total de la línea en caracteres
 * @returns {string} Línea formateada con ambos textos alineados
 */
function line(left, right, total = 42) {
  const rightStr = String(right ?? '')
  const leftStr  = String(left ?? '').substring(0, total - rightStr.length - 1)
  return leftStr.padEnd(total - rightStr.length, ' ') + rightStr
}

/**
 * Genera el HTML completo del ticket/comprobante de venta.
 * El HTML está optimizado para impresión en papel térmico (80mm o 58mm).
 * Incluye:
 *  - Encabezado con datos del negocio (nombre, CUIT, dirección, condición fiscal)
 *  - Tipo y número de comprobante
 *  - Fecha, cajero y cliente (si aplica)
 *  - Lista de ítems con cantidad, precio unitario, subtotal y descuentos
 *  - Totales (subtotal, descuentos, IVA, total final)
 *  - Métodos de pago utilizados
 *  - Pie de página personalizable
 *
 * @param {object} sale - Datos de la venta (obtenidos de getSaleForPrint)
 * @param {number} sale.sale_number - Número de la venta
 * @param {string} sale.created_at - Fecha de creación en ISO 8601
 * @param {number} sale.total - Total de la venta
 * @param {number} [sale.subtotal] - Subtotal antes de descuentos
 * @param {number} [sale.discount_total] - Total de descuentos
 * @param {number} [sale.iva_total] - Total de IVA
 * @param {string} sale.receipt_type - Tipo de comprobante
 * @param {string} [sale.cashierName] - Nombre del cajero
 * @param {object} [sale.customers] - Datos del cliente
 * @param {object[]} [sale.sale_items] - Ítems de la venta
 * @param {object[]} [sale.sale_payments] - Pagos de la venta
 * @param {object} [settings={}] - Configuración de la app (de getSettings)
 * @param {string} [settings.paper_width] - Ancho del papel: '58' o '80' (default: 80)
 * @param {string} [settings.business_name] - Nombre del negocio
 * @param {string} [settings.cuit] - CUIT del negocio
 * @param {string} [settings.address] - Dirección del negocio
 * @param {string} [settings.fiscal_condition] - Condición fiscal
 * @param {string} [settings.receipt_footer] - Texto del pie del ticket
 * @returns {string} HTML completo del ticket listo para renderizar/imprimir
 */
export function buildTicketHtml(sale, settings = {}) {
  /** Ancho del papel en mm (58 o 80) — determina tamaño de fuente y columnas */
  const paperWidth = parseInt(settings.paper_width) || 80
  const bodyWidth  = paperWidth === 58 ? '48mm' : '72mm'
  const pageSize   = `${paperWidth}mm auto`
  const charWidth  = paperWidth === 58 ? 32 : 42

  const items = (sale.sale_items ?? [])
  const payments = (sale.sale_payments ?? [])

  /** Etiquetas extraídas de la config o valores por defecto */
  const receiptLabel = RECEIPT_LABELS[sale.receipt_type] ?? 'COMPROBANTE'
  const businessName = settings.business_name ?? 'La Economía'
  const cuit         = settings.cuit          ?? ''
  const address      = settings.address       ?? ''
  const fiscalCond   = settings.fiscal_condition ?? ''
  const footer       = settings.receipt_footer   ?? '¡Gracias por su compra!'

  /** Genera las filas HTML para cada ítem de la venta */
  const itemsRows = items.map((item) => {
    const name = item.products?.name ?? '—'
    const qty  = Number(item.quantity)
    const price = Number(item.unit_price)
    const sub   = Number(item.subtotal)
    const qtyStr   = `${qty} x ${fmtCurrency(price)}`
    const subStr   = fmtCurrency(sub)
    /** Trunca el nombre del producto si excede el ancho máximo */
    const maxName = paperWidth === 58 ? 18 : 24
    const nameShort = name.length > maxName ? name.substring(0, maxName - 1) + '…' : name
    return `
      <tr>
        <td colspan="2" style="padding-top:4px">${nameShort}</td>
      </tr>
      <tr>
        <td style="padding-left:8px;color:#000">${qtyStr}</td>
        <td style="text-align:right;font-weight:900">${subStr}</td>
      </tr>
      ${item.discount_amount > 0 ? `<tr><td colspan="2" style="padding-left:8px;color:#000;font-size:9pt">Descuento: -${fmtCurrency(item.discount_amount)}</td></tr>` : ''}
    `
  }).join('')

  /** Genera las filas HTML para cada método de pago */
  const payRows = payments.map((p) => `
    <tr>
      <td>${METHOD_LABELS[p.method] ?? p.method}</td>
      <td style="text-align:right">${fmtCurrency(p.amount)}</td>
    </tr>
  `).join('')

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Ticket #${sale.sale_number}</title>
  <style>
    @page { size: ${pageSize}; margin: 4mm 4mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: ${paperWidth === 58 ? '9pt' : '10.5pt'};
      font-weight: 600;
      width: ${bodyWidth};
      color: #000;
      background: #fff;
      -webkit-print-color-adjust: exact;
    }
    .center  { text-align: center; }
    .bold    { font-weight: 900; }
    .large   { font-size: 14pt; font-weight: 900; }
    .small   { font-size: 9pt; }
    .sep     { border-top: 2px dashed #000; margin: 5px 0; }
    .sep-solid { border-top: 2px solid #000; margin: 5px 0; }
    table    { width: 100%; border-collapse: collapse; }
    td       { padding: 1px 0; vertical-align: top; }
    .total-row td { font-size: 13pt; font-weight: 900; padding-top: 4px; }
    @media screen {
      body { padding: 16px; background: #f5f5f5; max-width: 380px; margin: 0 auto; }
    }
  </style>
</head>
<body>
  <!-- Encabezado del negocio -->
  <div class="center bold large" style="margin-bottom:2px">${businessName}</div>
  ${address ? `<div class="center small">${address}</div>` : ''}
  ${cuit ? `<div class="center small">CUIT: ${cuit}</div>` : ''}
  ${fiscalCond ? `<div class="center small">${fiscalCond}</div>` : ''}

  <div class="sep-solid"></div>

  <div class="center bold" style="font-size:11pt">${receiptLabel}</div>
  <div class="center bold" style="font-size:11pt">Nro: 0001-${String(sale.sale_number).padStart(8, '0')}</div>

  <div class="sep"></div>

  <table>
    <tr><td>Fecha:</td><td style="text-align:right">${fmtDate(sale.created_at)}</td></tr>
    <tr><td>Cajero:</td><td style="text-align:right">${sale.cashierName ?? '—'}</td></tr>
    ${sale.customers?.full_name ? `<tr><td>Cliente:</td><td style="text-align:right">${sale.customers.full_name}</td></tr>` : ''}
  </table>

  <div class="sep"></div>

  <!-- Lista de ítems vendidos -->
  <table>${itemsRows}</table>

  <div class="sep"></div>

  <!-- Sección de totales -->
  <table>
    ${Number(sale.discount_total) > 0 ? `
    <tr>
      <td>Subtotal:</td>
      <td style="text-align:right">${fmtCurrency((sale.subtotal ?? sale.total))}</td>
    </tr>
    <tr>
      <td>Descuentos:</td>
      <td style="text-align:right">- ${fmtCurrency(sale.discount_total)}</td>
    </tr>` : ''}
    ${Number(sale.iva_total) > 0 ? `
    <tr>
      <td class="small">IVA incluido:</td>
      <td style="text-align:right" class="small">${fmtCurrency(sale.iva_total)}</td>
    </tr>` : ''}
    <tr class="total-row">
      <td>TOTAL:</td>
      <td style="text-align:right">${fmtCurrency(sale.total)}</td>
    </tr>
  </table>

  <div class="sep-solid"></div>

  <!-- Métodos de pago utilizados -->
  <div class="small bold" style="margin-bottom:3px">Forma de pago:</div>
  <table class="small">${payRows}</table>

  <div class="sep-solid"></div>

  <!-- Pie de página -->
  <div class="center" style="margin-top:6px;font-size:9pt">${footer}</div>
  <div class="center small" style="margin-top:4px;color:#000">POS La Economía</div>
</body>
</html>`
}

/**
 * Obtiene los datos de una venta y la configuración del negocio,
 * genera el HTML del ticket y lo imprime en una ventana emergente del navegador.
 *
 * Flujo:
 *  1. Consulta en paralelo la venta (getSaleForPrint) y la config (getSettings)
 *  2. Genera el HTML del ticket con buildTicketHtml
 *  3. Abre una ventana emergente, escribe el HTML, y lanza la impresión tras 400ms
 *  4. Cierra la ventana emergente después de imprimir
 *
 * @param {string} saleId - UUID de la venta a imprimir
 * @returns {Promise<void>}
 * @throws {Error} Si el navegador bloquea la ventana emergente (pop-ups deshabilitados)
 */
export async function printTicket(saleId) {
  /** Obtiene datos de la venta y configuración en paralelo */
  const [sale, settings] = await Promise.all([
    getSaleForPrint(saleId),
    getSettings().catch(() => ({})),
  ])

  const html = buildTicketHtml(sale, settings)

  /** Abre ventana emergente para la impresión */
  const win  = window.open('', '_blank', 'width=400,height=600')
  if (!win) {
    throw new Error('El navegador bloqueó la ventana emergente. Habilitá los pop-ups para este sitio.')
  }

  win.document.write(html)
  win.document.close()
  win.focus()

  /** Espera 400ms para que el HTML se renderice antes de imprimir */
  setTimeout(() => {
    win.print()
    win.close()
  }, 400)
}
