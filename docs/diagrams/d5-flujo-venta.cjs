const { box, arrow, elbow, plainText, svgWrap, GRAY, BG_GREEN, BG_BLUE, GREEN, DARK } = require('./svg-helpers.cjs');

const W = 1160, H = 520;
let b = '';
const xs = [20, 300, 580, 860];
const wBox = 260;

const row1 = [
  { title: '1. Buscar / escanear', lines: ['ProductSearch', '(debounce + código EAN)'] },
  { title: '2. Agregar al carrito', lines: ['useCartStore.addItem()', 'aplica descuentos automáticos'] },
  { title: '3. Cliente (opcional)', lines: ['CustomerSelector', 'aplica % desc. del cliente'] },
  { title: '4. Cobrar', lines: ['PaymentModal', 'multi-método, calcula vuelto'] },
];
const row2 = [
  { title: '5. Confirmar venta', lines: ['salesService.createSale()'] },
  { title: '6. Persistir venta', lines: ['INSERT sales + sale_items', '+ sale_payments'] },
  { title: '7. Stock y cta. cte.', lines: ["RPC decrement_stock('Estantería')", 'RPC increment_customer_balance*'] },
  { title: '8. Ticket', lines: ['SaleSuccessModal', 'ticketPrinter.printTicket()'] },
];

row1.forEach((s, i) => { b += box(xs[i], 100, wBox, 100, { ...s, fill: BG_BLUE, stroke: '#3B82F6', titleSize: 14.5, lineSize: 12 }); });
for (let i = 0; i < 3; i++) b += arrow(xs[i] + wBox, 150, xs[i + 1], 150, { color: DARK });

b += elbow(xs[3] + wBox / 2, 200, xs[0] + wBox / 2, 290, { color: DARK });

row2.forEach((s, i) => { b += box(xs[i], 290, wBox, 100, { ...s, fill: BG_GREEN, stroke: GREEN, titleSize: 14.5, lineSize: 12 }); });
for (let i = 0; i < 3; i++) b += arrow(xs[i] + wBox, 340, xs[i + 1], 340, { color: DARK });

b += plainText(580, 425, '* increment_customer_balance solo corre si algún sale_payment tiene method = \'cuenta\'', { size: 12, color: GRAY, anchor: 'middle', italic: true });
b += plainText(580, 450, 'El stock baja siempre de "En Estantería" — nunca del Depósito — al confirmar la venta.', { size: 12, color: GRAY, anchor: 'middle', italic: true });

module.exports = svgWrap(W, H, b, 'Flujo de una Venta — Módulo POS');
