const { box, groupHeader, arrow, elbow, plainText, svgWrap, GREEN, DARK, GRAY, BG_GREEN, BG_BLUE, BG_GRAY, WHITE, GREEN_DARK } = require('./svg-helpers.cjs');

const W = 1160, H = 760;
let b = '';

// ── Navegador (cliente) ──
b += groupHeader(60, 70, 1040, 34, 'NAVEGADOR DEL CLIENTE', { fill: DARK });
b += box(90, 120, 300, 80, { title: 'React 18 + Vite', lines: ['Componentes por módulo', '(UI, formularios, tablas)'], fill: BG_GREEN, stroke: GREEN });
b += box(430, 120, 300, 80, { title: 'Zustand', lines: ['Estado global', '(authStore, useCartStore, uiStore)'], fill: BG_GREEN, stroke: GREEN });
b += box(770, 120, 300, 80, { title: 'React Router 7', lines: ['ProtectedRoute + RoleGuard', '(control de acceso por rol)'], fill: BG_GREEN, stroke: GREEN });

// ── Flechas hacia abajo ──
b += arrow(280, 240, 280, 300, { label: 'assets estáticos' });
b += arrow(920, 240, 920, 300, { label: 'llamadas API (fetch/HTTPS)' });

// ── Vercel ──
b += box(130, 300, 300, 110, { title: 'Vercel', lines: ['Hosting estático del build de Vite', 'Rewrite SPA → index.html', '(vercel.json)'], fill: BG_BLUE, stroke: '#3B82F6', titleSize: 16 });

// ── Supabase JS Client ──
b += box(770, 300, 300, 80, { title: 'Supabase JS Client', lines: ['src/supabase/client.js', 'adminClient.js (service key, solo Admin)'], fill: BG_GREEN, stroke: GREEN });
b += arrow(920, 380, 920, 430);

// ── Supabase Cloud ──
b += groupHeader(560, 430, 540, 34, 'SUPABASE CLOUD (Backend as a Service)', { fill: GREEN_DARK });
b += box(580, 480, 165, 90, { title: 'Auth', lines: ['GoTrue', 'JWT + sesión', 'signUp / signIn'], fill: WHITE });
b += box(765, 480, 165, 90, { title: 'PostgreSQL', lines: ['Tablas + RLS', 'Funciones RPC', '(SECURITY DEFINER)'], fill: WHITE });
b += box(950, 480, 130, 90, { title: 'Storage', lines: ['(reservado,', 'sin uso activo)'], fill: BG_GRAY });

// ── Integraciones 100% client-side (ruteadas por los márgenes para no cruzar cajas) ──
b += `<path d="M90,204 L90,612 L280,612 L280,617" fill="none" stroke="${GRAY}" stroke-width="1.8" marker-end="url(#arrow)"/>`;
b += box(130, 620, 300, 100, { title: 'Impresión de tickets', lines: ['window.print() en ventana emergente', 'ticketPrinter.js — HTML térmico 58/80mm', 'Chrome --kiosk-printing (impresión silenciosa)'], fill: BG_GRAY, stroke: GRAY });

b += `<path d="M1070,160 L1130,160 L1130,612 L620,612 L620,617" fill="none" stroke="${GRAY}" stroke-width="1.8" marker-end="url(#arrow)"/>`;
b += box(470, 620, 300, 100, { title: 'Exportación de archivos', lines: ['100% en el navegador, sin servidor', 'xlsx-js-style → Excel', 'jsPDF + autotable → PDF'], fill: BG_GRAY, stroke: GRAY });

// nota de despliegue
b += plainText(920, 592, 'El cliente habla directo con Supabase — no hay servidor propio ni API intermedia', { size: 12.5, color: GRAY, anchor: 'middle', italic: true });

module.exports = svgWrap(W, H, b, 'Arquitectura General — Sistema POS La Economía');
