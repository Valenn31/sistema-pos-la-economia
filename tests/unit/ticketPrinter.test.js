import { describe, it, expect } from 'vitest'
import { buildTicketHtml } from '@/modules/pos/utils/ticketPrinter'

function makeSale(overrides = {}) {
  return {
    sale_number: 42,
    created_at: '2026-08-12T15:30:00Z',
    total: 121,
    subtotal: 100,
    discount_total: 0,
    iva_total: 21,
    receipt_type: 'ticket',
    cashierName: 'Valentino',
    customers: null,
    sale_items: [
      { quantity: 2, unit_price: 50, subtotal: 100, discount_amount: 0, products: { name: 'Coca Cola 2L' } },
    ],
    sale_payments: [{ method: 'efectivo', amount: 121 }],
    ...overrides,
  }
}

describe('buildTicketHtml', () => {
  it('incluye el nombre del negocio por defecto si no hay settings', () => {
    const html = buildTicketHtml(makeSale(), {})
    expect(html).toContain('La Economía')
  })

  it('usa el nombre del negocio configurado en settings en el encabezado', () => {
    // Nota: el pie del ticket siempre dice "POS La Economía" (branding fijo del
    // sistema), independiente del nombre del negocio — por eso no se verifica
    // la ausencia total de "La Economía", solo la presencia del nombre custom.
    const html = buildTicketHtml(makeSale(), { business_name: 'Mi Almacén' })
    expect(html).toContain('Mi Almacén')
  })

  it('muestra el número de venta con formato de comprobante (0001-00000042)', () => {
    const html = buildTicketHtml(makeSale(), {})
    expect(html).toContain('0001-00000042')
  })

  it('traduce el tipo de comprobante a la etiqueta correspondiente', () => {
    expect(buildTicketHtml(makeSale({ receipt_type: 'factura_a' }), {})).toContain('FACTURA A')
    expect(buildTicketHtml(makeSale({ receipt_type: 'ticket' }), {})).toContain('TICKET')
  })

  it('lista los ítems de la venta con nombre y cantidad', () => {
    const html = buildTicketHtml(makeSale(), {})
    expect(html).toContain('Coca Cola 2L')
    expect(html).toContain('2 x')
  })

  it('muestra el descuento del ítem solo si es mayor a 0', () => {
    const conDescuento = buildTicketHtml(makeSale({
      sale_items: [{ quantity: 1, unit_price: 100, subtotal: 90, discount_amount: 10, products: { name: 'Prod' } }],
    }), {})
    expect(conDescuento).toContain('Descuento')

    const sinDescuento = buildTicketHtml(makeSale(), {})
    expect(sinDescuento).not.toContain('Descuento')
  })

  it('muestra el nombre del cliente solo si la venta tiene uno asociado', () => {
    const conCliente = buildTicketHtml(makeSale({ customers: { full_name: 'Juan Pérez' } }), {})
    expect(conCliente).toContain('Juan Pérez')

    const sinCliente = buildTicketHtml(makeSale({ customers: null }), {})
    expect(sinCliente).not.toContain('Cliente:</td>')
  })

  it('lista los métodos de pago con su etiqueta legible', () => {
    const html = buildTicketHtml(makeSale({
      sale_payments: [{ method: 'debito', amount: 60 }, { method: 'efectivo', amount: 61 }],
    }), {})
    expect(html).toContain('Tarjeta Débito')
    expect(html).toContain('Efectivo')
  })

  it('ajusta el ancho del papel según settings.paper_width (58 vs 80mm)', () => {
    const html58 = buildTicketHtml(makeSale(), { paper_width: '58' })
    const html80 = buildTicketHtml(makeSale(), { paper_width: '80' })
    expect(html58).toContain('58mm auto')
    expect(html80).toContain('80mm auto')
  })

  it('trunca nombres de producto largos según el ancho del papel', () => {
    const nombreLargo = 'Producto con un nombre extremadamente largo para el ticket'
    const html58 = buildTicketHtml(makeSale({
      sale_items: [{ quantity: 1, unit_price: 10, subtotal: 10, discount_amount: 0, products: { name: nombreLargo } }],
    }), { paper_width: '58' })
    expect(html58).not.toContain(nombreLargo)
    expect(html58).toContain('…')
  })

  it('usa el pie de ticket por defecto si no se configura uno', () => {
    const html = buildTicketHtml(makeSale(), {})
    expect(html).toContain('¡Gracias por su compra!')
  })
})
