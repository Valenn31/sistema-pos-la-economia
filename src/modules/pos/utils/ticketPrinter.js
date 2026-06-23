/**
 * ticketPrinter.js — Genera e imprime un ticket/comprobante de venta.
 *
 * printTicket(saleId) → Fetches sale + settings, abre ventana de impresión.
 * buildTicketHtml(sale, settings) → Genera HTML del comprobante (exportado para preview).
 *
 * Formato: 80mm (papel térmico estándar). Usa @page CSS para auto-size.
 */
import { getSaleForPrint } from '../services/salesService'
import { getSettings }     from '@/modules/admin/services/adminService'

const METHOD_LABELS = {
  efectivo:      'Efectivo',
  debito:        'Tarjeta Débito',
  credito:       'Tarjeta Crédito',
  qr:            'QR / Mercado Pago',
  transferencia: 'Transferencia',
  cuenta:        'Cuenta Corriente',
}

const RECEIPT_LABELS = {
  ticket:     'TICKET',
  factura_a:  'FACTURA A',
  factura_b:  'FACTURA B',
  factura_c:  'FACTURA C',
}

function fmtCurrency(n) {
  return '$' + Number(n ?? 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtDate(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString('es-AR') + ' ' + d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
}

function pad(str, len, right = false) {
  const s = String(str ?? '')
  if (right) return s.padStart(len, ' ')
  return s.padEnd(len, ' ')
}

function line(left, right, total = 42) {
  const rightStr = String(right ?? '')
  const leftStr  = String(left ?? '').substring(0, total - rightStr.length - 1)
  return leftStr.padEnd(total - rightStr.length, ' ') + rightStr
}

export function buildTicketHtml(sale, settings = {}) {
  const paperWidth = parseInt(settings.paper_width) || 80
  const bodyWidth  = paperWidth === 58 ? '48mm' : '72mm'
  const pageSize   = `${paperWidth}mm auto`
  const charWidth  = paperWidth === 58 ? 32 : 42

  const items = (sale.sale_items ?? [])
  const payments = (sale.sale_payments ?? [])

  const receiptLabel = RECEIPT_LABELS[sale.receipt_type] ?? 'COMPROBANTE'
  const businessName = settings.business_name ?? 'La Economía'
  const cuit         = settings.cuit          ?? ''
  const address      = settings.address       ?? ''
  const fiscalCond   = settings.fiscal_condition ?? ''
  const footer       = settings.receipt_footer   ?? '¡Gracias por su compra!'

  const itemsRows = items.map((item) => {
    const name = item.products?.name ?? '—'
    const qty  = Number(item.quantity)
    const price = Number(item.unit_price)
    const sub   = Number(item.subtotal)
    // Truncate name to 24 chars if qty line is long
    const qtyStr   = `${qty} x ${fmtCurrency(price)}`
    const subStr   = fmtCurrency(sub)
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
  <!-- Encabezado -->
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

  <!-- Ítems -->
  <table>${itemsRows}</table>

  <div class="sep"></div>

  <!-- Totales -->
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

  <!-- Pagos -->
  <div class="small bold" style="margin-bottom:3px">Forma de pago:</div>
  <table class="small">${payRows}</table>

  <div class="sep-solid"></div>

  <!-- Pie -->
  <div class="center" style="margin-top:6px;font-size:9pt">${footer}</div>
  <div class="center small" style="margin-top:4px;color:#000">POS La Economía</div>
</body>
</html>`
}

export async function printTicket(saleId) {
  const [sale, settings] = await Promise.all([
    getSaleForPrint(saleId),
    getSettings().catch(() => ({})),
  ])

  const html = buildTicketHtml(sale, settings)
  const win  = window.open('', '_blank', 'width=400,height=600')
  if (!win) {
    throw new Error('El navegador bloqueó la ventana emergente. Habilitá los pop-ups para este sitio.')
  }
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => {
    win.print()
    win.close()
  }, 400)
}
