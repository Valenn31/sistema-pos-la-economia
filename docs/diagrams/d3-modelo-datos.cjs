const { box, arrow, elbow, plainText, svgWrap, GRAY, BG_GREEN, BG_BLUE, BG_YELLOW, BG_GRAY, GREEN, DARK } = require('./svg-helpers.cjs');

const W = 1160, H = 620;
let b = '';

// Fila 1
b += box(20, 100, 360, 170, { title: 'Identidad y Roles', titleSize: 15.5, lines: ['• profiles  · roles  · user_roles', 'Un usuario puede tener varios roles', 'PIN de 4 dígitos → cambio rápido de cajero'], fill: BG_BLUE, stroke: '#3B82F6' });
b += box(400, 100, 360, 170, { title: 'Catálogo y Stock', titleSize: 15.5, lines: ['• categories  · products', '• locations  · stock', '• stock_movements (venta/compra/ajuste/', '  traslado/devolución/vencimiento)'], fill: BG_GREEN, stroke: GREEN });
b += box(780, 100, 360, 170, { title: 'Proveedores y Compras', titleSize: 15.5, lines: ['• suppliers  · product_suppliers', '• purchase_notes / purchase_note_items', '• purchase_orders / purchase_order_items'], fill: BG_YELLOW, stroke: '#D97706' });

// Fila 2
b += box(20, 340, 360, 190, { title: 'Clientes', titleSize: 15.5, lines: ['• customers', '• customer_payments', '(cuenta corriente: límite de crédito,', 'saldo, descuento especial por cliente)'], fill: BG_BLUE, stroke: '#3B82F6' });
b += box(400, 340, 360, 190, { title: 'Ventas y Caja', titleSize: 15.5, lines: ['• cash_registers  · cash_sessions', '• sales  · sale_items  · sale_payments', '• returns  · return_items'], fill: BG_GREEN, stroke: GREEN });
b += box(780, 340, 360, 190, { title: 'Configuración', titleSize: 15.5, lines: ['• app_settings (datos del negocio,', '  ticket, IVA por defecto)', '• discounts (reglas de descuento)'], fill: BG_GRAY, stroke: GRAY });

// Relaciones clave — las etiquetas llevan fondo blanco para no mezclarse con el texto de las cajas
function labelBox(x, y, text, color) {
  const w = text.length * 6.4 + 10;
  return `<rect x="${x - w / 2}" y="${y - 12}" width="${w}" height="17" fill="white"/>` +
    `<text x="${x}" y="${y}" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="11" fill="${color}">${text}</text>`;
}

// Identidad → Ventas y Caja (por debajo de la fila 1, para no cruzar texto)
b += `<path d="M200,270 L200,332 L580,332 L580,340" fill="none" stroke="${DARK}" stroke-width="1.8" marker-end="url(#arrow)"/>`;
b += labelBox(390, 332, 'cashier_id / opened_by', DARK);

b += arrow(380, 185, 400, 185, { color: DARK });
b += labelBox(390, 168, 'stock_movements.user_id', DARK);

b += arrow(580, 270, 580, 340, { color: GREEN, marker: 'arrowGreen' });
b += labelBox(660, 305, 'sale_items.product_id', GREEN);

b += arrow(380, 430, 400, 430, { color: DARK, label: "customer_id (cuenta)", labelSize: 10.5 });

// Compras → Catálogo y Stock (entra por el borde inferior, no por el interior de la caja)
b += `<path d="M960,270 L960,318 L700,318 L700,272" fill="none" stroke="#D97706" stroke-width="1.8" marker-end="url(#arrow)"/>`;
b += labelBox(830, 318, 'increment_stock() al recibir OC', '#D97706');

b += arrow(780, 430, 760, 430, { color: GRAY, label: 'IVA / descuentos', labelSize: 10.5 });

b += plainText(580, 565, '* Agrupado por dominio funcional — el detalle campo a campo está en la Sección 4', { size: 12, color: GRAY, anchor: 'middle', italic: true });

module.exports = svgWrap(W, H, b, 'Modelo de Datos — Agrupado por Dominio');
