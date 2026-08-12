const { box, groupHeader, arrow, plainText, svgWrap, DARK, GRAY, BG_GREEN, BG_BLUE, BG_GRAY, GREEN, WHITE } = require('./svg-helpers.cjs');

const W = 1160, H = 780;
let b = '';

b += box(430, 100, 300, 55, { title: 'src/App.jsx', lines: ['Monta <RouterProvider>'], fill: BG_BLUE, stroke: '#3B82F6' });
b += arrow(580, 155, 580, 195);

b += box(280, 195, 600, 100, {
  title: 'src/routes/', titleSize: 16,
  lines: ['router.jsx — definición de rutas', 'ProtectedRoute.jsx — exige sesión activa', 'RoleGuard.jsx + roleRoutes.js — exige rol permitido (ROUTE_ROLES)'],
  fill: BG_BLUE, stroke: '#3B82F6',
});
b += arrow(580, 295, 580, 335);

b += groupHeader(10, 335, 1140, 30, 'src/modules/  —  7 módulos de negocio, cada uno con components/ · hooks/ · services/', { fill: DARK, size: 13 });

const modules = [
  ['auth', 'Login, Setup Wizard,\nroles'],
  ['pos', 'Ventas, carrito,\ncaja'],
  ['stock', 'Productos, stock,\nvencimientos'],
  ['suppliers', 'Proveedores, notas,\nórdenes de compra'],
  ['customers', 'Clientes,\ncuenta corriente'],
  ['reports', 'Reportes\ny KPIs'],
  ['admin', 'Usuarios, descuentos,\nconfiguración'],
];
const chipW = 154, gap = 8, startX = 12, chipY = 380, chipH = 85;
modules.forEach(([name, desc], i) => {
  const x = startX + i * (chipW + gap);
  b += box(x, chipY, chipW, chipH, { title: name + '/', lines: desc.split('\n'), fill: BG_GREEN, stroke: GREEN, titleSize: 14.5, lineSize: 11.5 });
});
b += arrow(580, 465, 580, 505);

b += box(10, 505, 1140, 115, {
  title: 'src/shared/  —  código común entre módulos', titleSize: 16,
  lines: ['components/ → Button, Modal, Table, Badge, Pagination, ConfirmDialog, AppLayout', 'hooks/ → useDebounce      store/ → authStore, uiStore (Zustand)      utils/ → formatters, exporters (Excel/PDF)'],
  fill: BG_GRAY, stroke: GRAY,
});
b += arrow(580, 620, 580, 660);

b += box(340, 660, 480, 75, {
  title: 'src/supabase/', titleSize: 16,
  lines: ['client.js — cliente con anon key (uso general)', 'adminClient.js — cliente con service key (solo gestión de usuarios)'],
  fill: BG_GREEN, stroke: GREEN,
});

module.exports = svgWrap(W, H, b, 'Estructura del Proyecto — Convención de Módulos');
