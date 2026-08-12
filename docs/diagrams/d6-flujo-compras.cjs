const { box, groupHeader, arrow, elbow, plainText, svgWrap, GRAY, BG_GREEN, BG_YELLOW, GREEN, DARK } = require('./svg-helpers.cjs');

const W = 1160, H = 560;
let b = '';

b += groupHeader(30, 65, 400, 30, 'REPOSITOR', { fill: '#0EA5E9', size: 13 });
b += box(30, 105, 400, 90, { title: 'Crea Nota de Pedido', lines: ['purchase_notes (status: draft)', 'sin campo "proveedor" visible en su UI'], fill: BG_YELLOW, stroke: '#D97706', titleSize: 15 });

b += elbow(230, 195, 160, 250, { color: DARK });

b += groupHeader(30, 250, 1100, 30, 'ADMINISTRADOR / SUPERADMIN', { fill: DARK, size: 13 });

const xs = [30, 310, 590, 870];
const steps = [
  { title: 'Aprobar y asignar\nproveedor', lines: ['status: submitted → approved', '(los repositores no ven proveedores)'] },
  { title: 'Convertir en Orden\nde Compra', lines: ['purchase_orders (status: pending)', 'o crear una OC directa'] },
  { title: 'Confirmar la OC', lines: ['status: confirmed', 'export PDF (jsPDF) para el proveedor'] },
  { title: 'Recibir mercadería', lines: ['ReceiveOrderModal', 'cantidades + fecha de vencimiento'] },
];
steps.forEach((s, i) => {
  b += box(xs[i], 300, 260, 110, { title: s.title.split('\n')[0] + (s.title.includes('\n') ? ' ' + s.title.split('\n')[1] : ''), lines: s.lines, fill: BG_GREEN, stroke: GREEN, titleSize: 14 });
});
for (let i = 0; i < 3; i++) b += arrow(xs[i] + 260, 355, xs[i + 1], 355, { color: DARK });

b += arrow(1000, 410, 1000, 450);
b += elbow(1000, 450, 580, 460, { color: GREEN, marker: 'arrowGreen' });
b += box(330, 460, 500, 80, {
  title: "RPC increment_stock('Depósito')", titleSize: 15,
  lines: ["por cada ítem recibido + stock_movement tipo 'compra'", 'la OC pasa a status: received'],
  fill: BG_GREEN, stroke: GREEN,
});

module.exports = svgWrap(W, H, b, 'Flujo de Compras — Nota de Pedido → Orden de Compra → Recepción');
