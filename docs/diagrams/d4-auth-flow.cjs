const { box, arrow, elbow, plainText, svgWrap, GRAY, BG_GREEN, BG_BLUE, BG_YELLOW, BG_GRAY, GREEN, DARK } = require('./svg-helpers.cjs');

const W = 1160, H = 1000;
let b = '';
const dec = (x, y, w, h, title) => box(x, y, w, h, { title, fill: BG_YELLOW, stroke: '#D97706', dashed: true, titleSize: 14.5 });

b += box(430, 90, 300, 50, { title: 'Carga la aplicación (App.jsx)', fill: BG_BLUE, stroke: '#3B82F6', titleSize: 14 });
b += arrow(580, 140, 580, 172);

b += dec(380, 172, 400, 55, '¿checkSetupCompleted()?');

b += elbow(430, 227, 290, 262, { color: DARK });
b += plainText(400, 245, 'No', { size: 12, color: DARK, weight: 700 });
b += box(140, 262, 300, 60, { title: 'SetupWizard', lines: ['4 pasos: negocio, superadmin, PIN'], fill: BG_GREEN, stroke: GREEN, titleSize: 14 });
b += arrow(290, 322, 290, 342);
b += box(140, 342, 300, 50, { title: 'createFirstSuperadmin()', fill: BG_GREEN, stroke: GREEN, titleSize: 13.5 });
b += arrow(290, 392, 290, 412);
b += box(140, 412, 300, 60, { title: 'RPC complete_initial_setup()', lines: ['rol anon · SECURITY DEFINER'], fill: BG_GREEN, stroke: GREEN, titleSize: 13.5 });
b += elbow(290, 472, 580, 505, { color: DARK });

b += elbow(730, 227, 730, 505, { color: DARK });
b += plainText(745, 245, 'Sí', { size: 12, color: DARK, weight: 700 });

b += box(430, 505, 300, 50, { title: 'LoginForm.signIn(email, password)', fill: BG_BLUE, stroke: '#3B82F6', titleSize: 13 });
b += arrow(580, 555, 580, 590);
b += box(430, 590, 300, 50, { title: 'getSessionData()', lines: ['→ profile + roles[]'], fill: BG_BLUE, stroke: '#3B82F6', titleSize: 14 });
b += arrow(580, 640, 580, 662);

b += dec(430, 662, 300, 55, '¿roles.length > 1?');
b += elbow(480, 717, 290, 742, { color: DARK });
b += plainText(370, 735, 'Sí', { size: 12, color: DARK, weight: 700 });
b += box(140, 742, 300, 55, { title: 'RoleSelector', lines: ['elige el rol activo'], fill: BG_GREEN, stroke: GREEN, titleSize: 14 });

b += elbow(680, 717, 870, 742, { color: DARK });
b += plainText(790, 735, 'No', { size: 12, color: DARK, weight: 700 });
b += box(720, 742, 300, 55, { title: 'activeRole = roles[0]', fill: BG_GREEN, stroke: GREEN, titleSize: 14 });

b += elbow(290, 797, 620, 822, { color: DARK });
b += elbow(870, 797, 620, 822, { color: DARK });

b += dec(390, 822, 460, 55, 'RoleGuard: ¿ROUTE_ROLES[ruta] incluye activeRole?');
b += elbow(440, 877, 290, 902, { color: DARK });
b += plainText(370, 895, 'Sí', { size: 12, color: DARK, weight: 700 });
b += box(140, 902, 300, 50, { title: 'Renderiza la ruta', lines: ['<Outlet /> con el layout del rol'], fill: BG_GREEN, stroke: GREEN, titleSize: 13.5 });

b += elbow(740, 877, 870, 902, { color: DARK });
b += plainText(800, 895, 'No', { size: 12, color: DARK, weight: 700 });
b += box(720, 902, 300, 50, { title: 'Navigate → ROLE_HOME[activeRole]', fill: BG_GRAY, stroke: GRAY, titleSize: 13 });

// Nota lateral: PIN switch
b += box(910, 590, 240, 150, {
  title: 'PinSwitchModal (POS)', titleSize: 14,
  lines: ['Cambia el cajero activo sin', 'cerrar sesión — pide el PIN', 'numérico (4 dígitos) del entrante.', 'verifyPin() valida contra profiles.pin', 'y actualiza el cajero de la venta.'],
  fill: BG_GRAY, stroke: GRAY,
});

module.exports = svgWrap(W, H, b, 'Autenticación y Control de Acceso por Rol');
