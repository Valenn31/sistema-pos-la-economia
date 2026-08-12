// Regenerar: desde la raíz del repo, `npm install --no-save docx` y despues
// `node docs/generate-technical-manual.cjs`. Para regenerar también los diagramas
// (docs/diagrams/*.png) ver el comentario en docs/diagrams/build-diagrams.cjs.
const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, LevelFormat, HeadingLevel,
  BorderStyle, WidthType, ShadingType, PageNumber, PageBreak, TableOfContents,
  TabStopType, TabStopPosition, ImageRun,
} = require("docx");

const DIAGRAMS_DIR = path.join(__dirname, "diagrams");
const manifest = JSON.parse(fs.readFileSync(path.join(DIAGRAMS_DIR, "manifest.json"), "utf-8"));

const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: border, bottom: border, left: border, right: border };
const cellMargins = { top: 80, bottom: 80, left: 120, right: 120 };

const GREEN = "16A34A";
const DARK = "0F172A";
const GRAY = "64748B";
const LIGHT_GREEN_BG = "F0FDF4";
const LIGHT_YELLOW_BG = "FFFBEB";
const LIGHT_BLUE_BG = "EFF6FF";
const LIGHT_GRAY_BG = "F8FAFC";

function h1(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 }, children: [new TextRun({ text, bold: true, font: "Arial", size: 32, color: DARK })] });
}
function h2(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 150 }, children: [new TextRun({ text, bold: true, font: "Arial", size: 28, color: GREEN })] });
}
function h3(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_3, spacing: { before: 200, after: 100 }, children: [new TextRun({ text, bold: true, font: "Arial", size: 24, color: DARK })] });
}
function p(...runs) {
  return new Paragraph({ spacing: { after: 120 }, children: runs.map(r => typeof r === "string" ? new TextRun({ text: r, font: "Arial", size: 22 }) : new TextRun({ ...r, font: "Arial", size: r.size || 22 })) });
}
function code(text) { return { text, font: "Consolas", size: 20, color: "B91C1C" }; }
function bold(text) { return { text, bold: true }; }
function italic(text) { return { text, italics: true, color: GRAY }; }

function callout(title, text, bgColor) {
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [9360],
    rows: [new TableRow({ children: [new TableCell({
      borders, width: { size: 9360, type: WidthType.DXA }, margins: { top: 120, bottom: 120, left: 200, right: 200 },
      shading: { fill: bgColor, type: ShadingType.CLEAR },
      children: [
        new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: title, bold: true, font: "Arial", size: 22, color: DARK })] }),
        new Paragraph({ children: [new TextRun({ text, font: "Arial", size: 20, color: GRAY })] }),
      ]
    })] })]
  });
}
function tip(text) { return callout("✅ Buenas prácticas", text, LIGHT_GREEN_BG); }
function warning(text) { return callout("⚠️ Importante", text, LIGHT_YELLOW_BG); }
function info(text) { return callout("ℹ️ Nota técnica", text, LIGHT_BLUE_BG); }

function numberedList(items, ref) {
  return items.map(item => new Paragraph({
    numbering: { reference: ref, level: 0 }, spacing: { after: 80 },
    children: [typeof item === "string" ? new TextRun({ text: item, font: "Arial", size: 22 }) : new TextRun({ ...item, font: "Arial", size: item.size || 22 })]
  }));
}
function bulletList(items, ref) {
  return items.map(item => new Paragraph({
    numbering: { reference: ref, level: 0 }, spacing: { after: 80 },
    children: Array.isArray(item) ? item.map(r => typeof r === "string" ? new TextRun({ text: r, font: "Arial", size: 22 }) : new TextRun({ ...r, font: "Arial", size: 22 })) : [new TextRun({ text: item, font: "Arial", size: 22 })]
  }));
}

// ── Tablas de 2 o 3 columnas con encabezado verde ──
function dataTable(headerRow, rows, widths) {
  const total = widths.reduce((a, b) => a + b, 0);
  return new Table({
    width: { size: total, type: WidthType.DXA }, columnWidths: widths,
    rows: [
      new TableRow({ tableHeader: true, children: headerRow.map((h, i) => new TableCell({
        borders, width: { size: widths[i], type: WidthType.DXA }, margins: cellMargins,
        shading: { fill: GREEN, type: ShadingType.CLEAR },
        children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, font: "Arial", size: 20, color: "FFFFFF" })] })],
      })) }),
      ...rows.map((row, ri) => new TableRow({ children: row.map((cell, ci) => new TableCell({
        borders, width: { size: widths[ci], type: WidthType.DXA }, margins: cellMargins,
        shading: { fill: ri % 2 ? LIGHT_GRAY_BG : "FFFFFF", type: ShadingType.CLEAR },
        children: Array.isArray(cell) ? cell.map(c => p(c)) : [p(cell)],
      })) })),
    ]
  });
}

// ── Imagen de diagrama centrada + pie de figura ──
let figureCounter = 0;
function diagramImage(name, caption) {
  figureCounter++;
  const meta = manifest[name];
  const data = fs.readFileSync(path.join(DIAGRAMS_DIR, meta.file));
  const maxWidthPx = 624; // 6.5in @ 96dpi = ancho útil de página
  const width = maxWidthPx;
  const height = Math.round(maxWidthPx * (meta.height / meta.width));
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER, spacing: { before: 200, after: 80 },
      children: [new ImageRun({ type: "png", data, transformation: { width, height } })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER, spacing: { after: 240 },
      children: [new TextRun({ text: `Figura ${figureCounter}. ${caption}`, italics: true, font: "Arial", size: 19, color: GRAY })],
    }),
  ];
}

const doc = new Document({
  styles: {
    default: { document: { run: { font: "Arial", size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 32, bold: true, font: "Arial" }, paragraph: { spacing: { before: 400, after: 200 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 28, bold: true, font: "Arial" }, paragraph: { spacing: { before: 300, after: 150 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 24, bold: true, font: "Arial" }, paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 2 } },
    ]
  },
  numbering: {
    config: Array.from({ length: 30 }, (_, i) => ({
      reference: "steps" + (i + 1),
      levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }],
    })).concat(Array.from({ length: 20 }, (_, i) => ({
      reference: "bullets" + (i + 1),
      levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }],
    })))
  },
  sections: [
    // ═══════════════════════════════════════════════════════════
    // PORTADA
    // ═══════════════════════════════════════════════════════════
    {
      properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
      children: [
        new Paragraph({ spacing: { before: 2600 }, alignment: AlignmentType.CENTER, children: [] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: "SISTEMA POS", font: "Arial", size: 56, bold: true, color: GREEN })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 400 }, children: [new TextRun({ text: "LA ECONOMÍA", font: "Arial", size: 56, bold: true, color: DARK })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 }, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: GREEN, space: 1 } }, children: [] }),
        new Paragraph({ spacing: { before: 400 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Manual Técnico", font: "Arial", size: 32, color: GRAY })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: "Arquitectura, base de datos y lógica de negocio para desarrollo y mantenimiento", font: "Arial", size: 24, color: GRAY })] }),
        new Paragraph({ spacing: { before: 1600 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Versión 1.0 — Agosto 2026", font: "Arial", size: 22, color: GRAY })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Complementa al Manual de Usuario — dirigido a quien mantenga o extienda el código", font: "Arial", size: 19, color: GRAY, italics: true })] }),
      ]
    },
    // ═══════════════════════════════════════════════════════════
    // CONTENIDO
    // ═══════════════════════════════════════════════════════════
    {
      properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
      headers: { default: new Header({ children: [new Paragraph({
        children: [new TextRun({ text: "Sistema POS La Economía — Manual Técnico", font: "Arial", size: 18, color: GRAY, italics: true })],
        tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }]
      })] }) },
      footers: { default: new Footer({ children: [new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "Página ", font: "Arial", size: 18, color: GRAY }), new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 18, color: GRAY })]
      })] }) },
      children: [
        h1("Índice de Contenidos"),
        new TableOfContents("Tabla de Contenidos", { hyperlink: true, headingStyleRange: "1-3" }),
        new Paragraph({ children: [new PageBreak()] }),

        // ═══════════════════════════════════════════════════
        // 1. INTRODUCCIÓN
        // ═══════════════════════════════════════════════════
        h1("1. Introducción"),
        p("Este documento describe la arquitectura técnica, el modelo de datos y la lógica de negocio del Sistema POS La Economía, para quien deba mantener, auditar o extender el código. Complementa al ", bold("Manual de Usuario"), ", que cubre el uso operativo de la aplicación desde la perspectiva de Cajero, Repositor y Administrador."),
        p("Alcance de este manual:"),
        ...bulletList([
          "Arquitectura general y stack tecnológico",
          "Estructura de carpetas y convenciones de módulo",
          "Modelo de datos completo (tablas, relaciones, funciones SQL)",
          "Autenticación, roles y seguridad (incluyendo el estado real de las políticas RLS)",
          "Lógica de negocio clave: ventas, descuentos, IVA, stock, compras, cuenta corriente",
          "Integraciones (impresión, exportación), scripts de mantenimiento y despliegue",
        ], "bullets1"),
        info("Este manual refleja el estado del código y de la base de datos al 12/08/2026. El proyecto es de desarrollo activo — antes de asumir que algo sigue vigente, verificá contra el código fuente y el dashboard de Supabase."),

        new Paragraph({ children: [new PageBreak()] }),

        // ═══════════════════════════════════════════════════
        // 2. ARQUITECTURA GENERAL
        // ═══════════════════════════════════════════════════
        h1("2. Arquitectura General"),
        p("El sistema es una SPA (Single Page Application) que habla directamente con Supabase — no existe un servidor backend propio ni una capa de API intermedia. Toda la lógica de negocio vive en el cliente (React) y en funciones de PostgreSQL con ", bold("SECURITY DEFINER"), " para las operaciones que requieren atomicidad o permisos elevados."),

        dataTable(["Capa", "Tecnología"], [
          ["Frontend", "React 18 + Vite"],
          ["Estilos", "Tailwind CSS v3 (paleta personalizada, modo claro/oscuro por CSS variables)"],
          ["Estado global", "Zustand (authStore, useCartStore, uiStore)"],
          ["Ruteo", "React Router 7 (rutas anidadas + guards)"],
          ["Backend", "Supabase (PostgreSQL + Auth + RLS + Storage)"],
          ["Hosting", "Vercel (build estático + rewrite SPA)"],
          ["Exportación", "xlsx-js-style (Excel) · jsPDF + jspdf-autotable (PDF)"],
          ["Gráficos", "Recharts (dashboard)"],
        ], [2500, 6860]),

        ...diagramImage("d1-arquitectura", "Arquitectura general — capas del sistema."),

        h2("2.1 Puntos clave"),
        ...bulletList([
          [bold("Sin servidor propio: "), "el cliente Supabase-js (", code("src/supabase/client.js"), ") habla directo con la API REST/RPC de Supabase desde el navegador. La anon key es pública por diseño; la seguridad depende de RLS (ver Sección 5.4)."],
          [bold("Cliente admin separado: "), code("src/supabase/adminClient.js"), " usa la ", bold("service key"), " (bypassa RLS por completo) y solo se usa para crear usuarios desde el panel Admin. Requiere la variable ", code("VITE_SUPABASE_SERVICE_KEY"), " — si no está configurada, esa función queda deshabilitada con un aviso en la UI."],
          [bold("Impresión y exportación son 100% client-side: "), "no dependen de Supabase ni de un servidor. El ticket se genera como HTML y se imprime con ", code("window.print()"), "; los Excel/PDF se arman en memoria en el navegador."],
        ], "bullets2"),

        new Paragraph({ children: [new PageBreak()] }),

        // ═══════════════════════════════════════════════════
        // 3. ESTRUCTURA DEL PROYECTO
        // ═══════════════════════════════════════════════════
        h1("3. Estructura del Proyecto"),
        p("El código sigue una convención de ", bold("modularidad por dominio"), ": cada módulo de negocio vive en ", code("src/modules/<nombre>/"), " con tres subcarpetas fijas — ", code("components/"), ", ", code("hooks/"), " y ", code("services/"), ". El código compartido entre módulos vive en ", code("src/shared/"), "."),

        ...diagramImage("d2-estructura", "Estructura de carpetas y convención de módulos."),

        dataTable(["Módulo", "Responsabilidad"], [
          ["auth", "Login, Setup Wizard, selección de rol, PIN de cajero"],
          ["pos", "Ventas, carrito, caja, pagos, devoluciones, impresión de tickets"],
          ["stock", "Productos, categorías, niveles de stock, movimientos, vencimientos, etiquetas de góndola"],
          ["suppliers", "Proveedores, notas de pedido, órdenes de compra, recepción de mercadería"],
          ["customers", "Clientes, cuenta corriente, historial de compras, estado de cuenta"],
          ["reports", "Reportes de ventas, caja, stock, deudores y devoluciones"],
          ["admin", "Dashboard, usuarios, descuentos, configuración del negocio"],
        ], [2200, 7160]),

        h2("3.1 Código compartido (src/shared/)"),
        ...bulletList([
          [bold("components/"), " — Button, Modal, Table, Badge, Pagination, ConfirmDialog, Spinner, AppLayout (sidebar + topbar con toggle de tema)"],
          [bold("hooks/"), " — useDebounce (usado en buscadores de producto/cliente)"],
          [bold("store/"), " — authStore (sesión y rol activo) y uiStore (Zustand)"],
          [bold("utils/"), " — formatters.js (moneda, fechas, round2) y exporters.js (Excel/PDF)"],
        ], "bullets3"),

        h2("3.2 Rutas (src/routes/)"),
        ...bulletList([
          [bold("router.jsx"), " — definición del árbol de rutas con React Router 7"],
          [bold("ProtectedRoute.jsx"), " — exige sesión activa; redirige a /login si no la hay"],
          [bold("RoleGuard.jsx + roleRoutes.js"), " — exige que el rol activo esté en ", code("ROUTE_ROLES"), " para la ruta; ver Sección 5.2"],
          [bold("RootRedirect.jsx"), " — resuelve a dónde enviar al usuario según su rol al entrar a \"/\""],
        ], "bullets4"),

        new Paragraph({ children: [new PageBreak()] }),

        // ═══════════════════════════════════════════════════
        // 4. MODELO DE DATOS
        // ═══════════════════════════════════════════════════
        h1("4. Modelo de Datos"),
        p("La base de datos vive en Supabase (PostgreSQL). El esquema base está versionado en ", code("supabase/schema.sql"), ", con extensiones incrementales en ", code("supabase/sprint2_functions.sql"), ", ", code("supabase/sprint3_functions.sql"), " y ", code("supabase/fix_rls_setup.sql"), "."),

        ...diagramImage("d3-modelo-datos", "Modelo de datos agrupado por dominio funcional."),

        h2("4.1 Identidad y roles"),
        dataTable(["Tabla", "Campos clave", "Notas"], [
          ["profiles", "id (= auth.users.id), full_name, pin, is_active", "pin es el código de 4 dígitos para el cambio rápido de cajero"],
          ["roles", "id, name", "'superadmin' · 'admin' · 'cajero' · 'repositor'"],
          ["user_roles", "user_id, role_id", "Un usuario puede tener varios roles (unique por par)"],
        ], [1800, 3300, 4260]),

        h2("4.2 Catálogo y stock"),
        dataTable(["Tabla", "Campos clave", "Notas"], [
          ["categories", "id, name, description", ""],
          ["products", "sku, barcode, price_cost, price_sell, iva_rate, iva_included, min_stock, has_expiry", "iva_included define si price_sell ya trae el IVA adentro"],
          ["locations", "id, name", "Fijas: 'Depósito' y 'En Estantería'"],
          ["stock", "product_id, location_id, quantity", "Unique por (product_id, location_id)"],
          ["stock_movements", "movement_type, from/to_location_id, reference_type/id, expiry_date", "Tipos: venta · compra · ajuste · traslado · devolución · vencimiento"],
        ], [1800, 3300, 4260]),

        h2("4.3 Ventas y caja"),
        dataTable(["Tabla", "Campos clave", "Notas"], [
          ["cash_registers / cash_sessions", "opening_amount, closing_amount, status", "status: 'open' · 'closed'. Cerrar caja no obliga a abrir una nueva"],
          ["sales", "sale_number (autoincremental), subtotal, discount_total, iva_total, total, receipt_type, status", "receipt_type: ticket · factura_a/b/c"],
          ["sale_items", "quantity, unit_price, iva_rate, discount_amount, subtotal", ""],
          ["sale_payments", "method, amount, reference", "method: efectivo · debito · credito · qr · transferencia · cuenta"],
          ["returns / return_items", "reason, quantity, subtotal", "Restauración de stock es opcional (checkbox) desde Sprint 5+"],
        ], [1800, 3300, 4260]),

        h2("4.4 Clientes"),
        dataTable(["Tabla", "Campos clave", "Notas"], [
          ["customers", "credit_limit, current_balance, discount_percent", "current_balance positivo = el cliente debe"],
          ["customer_payments", "customer_id, amount, method, notes", "Ver nota de esquema no versionado más abajo"],
        ], [1800, 3300, 4260]),
        warning("La tabla customer_payments existe y está en uso en producción (customerService.js: registerPayment, getAccountStatement) pero NO está definida en supabase/schema.sql — se creó directamente desde el dashboard de Supabase en algún momento posterior al Sprint 7. Si vas a recrear la base desde cero con los .sql versionados, esta tabla va a faltar. Se recomienda agregar su definición a un nuevo archivo de migración versionado."),

        h2("4.5 Proveedores y compras"),
        dataTable(["Tabla", "Campos clave", "Notas"], [
          ["suppliers", "razon_social, cuit, payment_condition, delivery_days", ""],
          ["product_suppliers", "supplier_sku, purchase_price, is_preferred", "Relación producto ↔ proveedor"],
          ["purchase_notes / _items", "note_number, status, quantity_requested", "status: draft · submitted · approved · rejected · converted"],
          ["purchase_orders / _items", "order_number, status, quantity_received", "status: pending · confirmed · received · cancelled"],
        ], [1800, 3300, 4260]),

        h2("4.6 Configuración"),
        dataTable(["Tabla", "Campos clave", "Notas"], [
          ["app_settings", "key, value, description", "Key/value libre — ver Sección 11.3 para las keys usadas"],
          ["discounts", "type, value, min_quantity, free_quantity, product_id, category_id", "type: percentage_total · fixed_total · product · category · quantity_rule"],
        ], [1800, 3300, 4260]),

        h2("4.7 Cuentas corrientes por período"),
        p("El estado de cuenta de un cliente (", code("customerService.getAccountStatement"), ") combina ventas pagadas con method='cuenta' (débitos) y filas de ", code("customer_payments"), " (créditos), las ordena cronológicamente y calcula un saldo acumulado. Por defecto (", code("showAll: false"), ") solo devuelve los movimientos ", bold("posteriores al último saldo en $0"), ", es decir, el período de deuda activo — no todo el historial. Esto evita que un cliente que ya saldó su deuda vieja siga viendo ese historial mezclado con la deuda nueva."),

        new Paragraph({ children: [new PageBreak()] }),

        // ═══════════════════════════════════════════════════
        // 5. AUTENTICACIÓN, ROLES Y SEGURIDAD
        // ═══════════════════════════════════════════════════
        h1("5. Autenticación, Roles y Seguridad"),

        ...diagramImage("d4-auth-flow", "Flujo de autenticación y control de acceso por rol."),

        h2("5.1 Setup inicial"),
        p("Si la base de datos no tiene ningún usuario, la app muestra el ", bold("SetupWizard"), " (4 pasos: datos del negocio, cuenta del superadmin, PIN, confirmación). Como todavía no existe sesión, la creación se resuelve con:"),
        ...numberedList([
          "supabase.auth.signUp() — crea el usuario en Supabase Auth sin requerir sesión previa.",
          "RPC complete_initial_setup() — con SECURITY DEFINER, bypasea RLS para insertar el perfil, asignar el rol superadmin y guardar la configuración del negocio en app_settings, todo en una transacción.",
        ], "steps1"),
        p("Esta función RPC valida internamente que ", code("setup_completed"), " no esté ya en 'true' antes de proceder, para que no se pueda re-ejecutar el setup una vez configurado el sistema."),
        info("authService.checkSetupCompleted() distingue un error \"fila no encontrada\" (PGRST116 → nunca se hizo el setup) de cualquier otro error (caída de red, RLS, etc. → se propaga la excepción). Antes de este fix, un error de red se interpretaba como \"no configurado\" y mandaba a un usuario ya configurado al wizard."),

        h2("5.2 Roles y rutas protegidas"),
        p("El mapeo de roles a rutas está centralizado en ", code("src/routes/roleRoutes.js"), ":"),
        dataTable(["Ruta", "Roles permitidos"], [
          ["/admin/dashboard", "superadmin, admin"],
          ["/pos", "superadmin, admin, cajero"],
          ["/stock", "superadmin, admin, cajero (lectura), repositor"],
          ["/suppliers", "superadmin, admin, repositor (solo notas)"],
          ["/customers, /reports, /admin/users, /admin/discounts", "superadmin, admin"],
          ["/admin/settings", "superadmin exclusivamente"],
        ], [3500, 5860]),
        p("RoleGuard compara el rol activo contra esta tabla; si no coincide, redirige a ", code("ROLE_HOME[activeRole]"), " (dashboard para admin/superadmin, /pos para cajero, /stock para repositor) en vez de mostrar un error."),

        h2("5.3 Cambio rápido de cajero (PIN)"),
        p("Desde el POS, un cajero puede ceder el turno a otro sin cerrar sesión: PinSwitchModal pide el PIN numérico (4 dígitos) del usuario entrante, ", code("verifyPin()"), " lo valida contra ", code("profiles.pin"), " y actualiza el cajero asociado a la sesión de caja activa."),

        h2("5.4 Estado real de Row Level Security"),
        warning("Las políticas RLS actuales (schema.sql + sprint2/3_functions.sql) son permisivas: cualquier usuario autenticado puede leer y escribir en prácticamente todas las tablas (\"USING (auth.role() = 'authenticated')\"). La base de datos NO distingue entre un cajero y un administrador — el control de acceso por rol ocurre enteramente en el cliente (RoleGuard + la UI que cada módulo expone). Esto significa que un usuario autenticado que llame a la API de Supabase directamente (sin pasar por la UI) podría, en teoría, escribir en tablas a las que su rol no debería tener acceso. Si se necesita seguridad a nivel de fila, hay que escribir políticas RLS granulares por rol — hoy no existen."),
        p("Las únicas excepciones son las funciones con ", bold("SECURITY DEFINER"), " (Sección 6), que corren con privilegios elevados de forma controlada, y la política especial que permite a ", code("anon"), " leer ", code("app_settings"), " (necesaria para que el chequeo de setup funcione sin sesión)."),

        new Paragraph({ children: [new PageBreak()] }),

        // ═══════════════════════════════════════════════════
        // 6. FUNCIONES DE BASE DE DATOS (RPC)
        // ═══════════════════════════════════════════════════
        h1("6. Funciones de Base de Datos (RPC)"),
        p("Todas las operaciones que necesitan atomicidad (leer-modificar-escribir sin condiciones de carrera) o permisos elevados están implementadas como funciones PostgreSQL con ", bold("SECURITY DEFINER"), ", invocadas desde el cliente vía ", code("supabase.rpc(...)"), "."),

        dataTable(["Función", "Archivo SQL", "Uso"], [
          ["decrement_stock(product_id, location_id, quantity)", "sprint2_functions.sql", "Baja stock al confirmar una venta (salesService.createSale)"],
          ["increment_stock(product_id, location_id, quantity)", "sprint3_functions.sql", "Sube stock en recepción de OC, ajustes y devoluciones"],
          ["transfer_stock(product_id, from, to, quantity)", "sprint3_functions.sql", "Traslado atómico entre ubicaciones; valida stock disponible en origen y lanza excepción si no alcanza"],
          ["increment_customer_balance(customer_id, amount)", "sprint2_functions.sql", "Suma o resta (monto negativo) el saldo de cuenta corriente; usada en ventas, devoluciones y pagos"],
          ["complete_initial_setup(...)", "fix_rls_setup.sql", "Crea el primer superadmin durante el Setup Wizard, invocable por el rol anon"],
        ], [3400, 2200, 3760]),

        info("Todas usan INSERT ... ON CONFLICT DO NOTHING antes de UPDATE para garantizar que exista la fila de stock antes de modificarla, evitando fallos si un producto nunca tuvo movimientos en esa ubicación."),

        new Paragraph({ children: [new PageBreak()] }),

        // ═══════════════════════════════════════════════════
        // 7. MÓDULOS DE LA APLICACIÓN
        // ═══════════════════════════════════════════════════
        h1("7. Módulos de la Aplicación"),

        h2("7.1 auth"),
        p(bold("Componentes: "), "LoginForm, SetupWizard, RoleSelector.  ", bold("Hooks: "), "useAuth, useSession.  ", bold("Services: "), "authService.js (signIn, signOut, getSessionData, checkSetupCompleted, createFirstSuperadmin)."),

        h2("7.2 pos"),
        p(bold("Componentes: "), "POSPage, ProductSearch, Cart, CartItem, CustomerSelector, PaymentModal, PinSwitchModal, CashSessionModal, SaleSuccessModal, ShiftSalesPage (\"Mi turno\").  ", bold("Hooks: "), "useCartStore (carrito, IVA, descuentos — Sección 8.1), useCashSession.  ", bold("Services: "), "salesService.js, cashSessionService.js, returnsService.js.  ", bold("Utils: "), "ticketPrinter.js (Sección 9.1)."),

        h2("7.3 stock"),
        p(bold("Componentes: "), "StockPage (tabs: Productos, Categorías, Niveles, Movimientos, Vencimientos, Etiquetas), ProductFormModal, TransferModal, AdjustmentModal.  ", bold("Services: "), "productService.js (CRUD productos/categorías), movementService.js (niveles, traslados, ajustes, recepción, alertas de vencimiento)."),

        h2("7.4 suppliers"),
        p(bold("Componentes: "), "SuppliersPage (tabs: Proveedores, Notas de Pedido, Órdenes de Compra), PurchaseNoteFormModal, PurchaseOrderFormModal, ReceiveOrderModal.  ", bold("Services: "), "supplierService.js, purchaseService.js (notas, OC, recepción — Sección 8.6)."),

        h2("7.5 customers"),
        p(bold("Componentes: "), "CustomersPage, CustomerFormModal, PayDebtModal, CustomerHistoryModal.  ", bold("Services: "), "customerService.js (Sección 4.7 y 8.4)."),

        h2("7.6 reports"),
        p(bold("Componentes: "), "ReportsPage (tabs: Ventas, Caja, Stock, Deudores, Devoluciones).  ", bold("Services: "), "reportsService.js (getSalesReport, getSalesSummary, getCashReport, getStockReport)."),

        h2("7.7 admin"),
        p(bold("Componentes: "), "DashboardPage (KPIs + gráficos semanales), UsersPage, UserFormModal, DiscountsPage, DiscountFormModal, SettingsPage.  ", bold("Services: "), "adminService.js (usa adminClient.js con service key para crear usuarios), discountService.js."),

        new Paragraph({ children: [new PageBreak()] }),

        // ═══════════════════════════════════════════════════
        // 8. LÓGICA DE NEGOCIO CLAVE
        // ═══════════════════════════════════════════════════
        h1("8. Lógica de Negocio Clave"),

        h2("8.1 Carrito, descuentos e IVA"),
        p("Toda la lógica del carrito vive en ", code("useCartStore.js"), " (Zustand), sin persistencia — se resetea con ", code("clearCart()"), " tras cada venta. Los descuentos automáticos se recalculan en cada ", code("addItem"), " / ", code("updateQuantity"), ":"),
        dataTable(["Tipo de descuento", "Cómo se calcula"], [
          ["product", "% sobre el total de ese ítem si discounts.product_id coincide"],
          ["category", "% sobre el total de ese ítem si el producto pertenece a esa categoría"],
          ["quantity_rule", "Grupos completos de min_quantity → free_quantity unidades gratis (ej: 3x2). Nunca regala más de lo comprado"],
          ["percentage_total / fixed_total", "No se auto-aplican — se gestionan como globalDiscount, manual desde la UI del carrito"],
        ], [2600, 6760]),
        p("Orden de aplicación de los totales:"),
        ...numberedList([
          "Subtotal de cada ítem = (cantidad × precio unitario) − descuento automático del ítem.",
          "Se aplica el % de descuento del cliente (customers.discount_percent) sobre la suma de subtotales.",
          "Se aplica el descuento global manual (0-100%) sobre el resultado anterior.",
          "Se calcula el IVA: si iva_included, se extrae del precio (IVA = bruto × tasa / (100 + tasa)); si no, se suma aparte (IVA = bruto × tasa / 100).",
        ], "steps2"),
        info("El total final nunca se ve afectado por errores de redondeo visual: getDiscountTotal() se deriva como (bruto original − total final + IVA extra), no se sostiene como un contador independiente que pueda desincronizarse."),

        h2("8.2 Flujo de una venta"),
        ...diagramImage("d5-flujo-venta", "Flujo de una venta, del carrito al ticket."),
        p("El stock baja siempre de \"En Estantería\" — nunca del Depósito — sin importar cuánto stock quede (puede ir negativo; el sistema alerta pero no bloquea la venta). Si algún ", code("sale_payment"), " tiene ", code("method: 'cuenta'"), ", se ejecuta además ", code("increment_customer_balance"), " por ese monto."),

        h2("8.3 Devoluciones"),
        p("returnsService.createReturn() inserta en ", code("returns"), " + ", code("return_items"), ". La restauración de stock es ", bold("opcional"), " (checkbox en la UI, no automática desde Sprint 5) y, si corresponde, genera un stock_movement tipo 'devolucion'. Si la venta original tenía pago en cuenta corriente, se descuenta el monto de ", code("current_balance"), ". Las devoluciones se reflejan como una línea aparte al cerrar el turno de caja."),

        h2("8.4 Cuenta corriente de clientes"),
        p(code("registerPayment()"), " intenta primero el RPC ", code("increment_customer_balance"), " con un monto negativo; si falla, calcula el nuevo saldo manualmente como fallback (nunca por debajo de 0) y lo actualiza con un UPDATE directo. Luego siempre inserta la fila en ", code("customer_payments"), ", que es la que alimenta el estado de cuenta (Sección 4.7)."),

        h2("8.5 Stock: traslados, ajustes y vencimientos"),
        ...bulletList([
          [bold("Traslados: "), code("transfer_stock()"), " valida que haya cantidad suficiente en origen y lanza una excepción SQL si no la hay — la UI la captura y la muestra como error."],
          [bold("Ajustes manuales: "), "AdjustmentModal permite sumar o restar stock con una nota obligatoria; usa increment_stock con cantidades negativas para restar."],
          [bold("Vencimientos: "), "movementService.getExpiryAlerts() filtra stock_movements tipo 'compra' con expiry_date y clasifica cada lote en 'expired' · 'critical' · 'warning' · 'ok' según los días restantes."],
        ], "bullets5"),

        h2("8.6 Compras: nota de pedido → orden de compra → recepción"),
        ...diagramImage("d6-flujo-compras", "Flujo de compras — de la nota de pedido a la recepción de mercadería."),
        p("El repositor no ve el campo proveedor al crear una nota (", code("supplier_id"), " es opcional en ", code("purchase_notes"), "); es el Admin quien lo asigna al aprobar. La Orden de Compra puede nacer de una nota aprobada o crearse directamente. Al confirmar la recepción (ReceiveOrderModal), se puede indicar fecha de vencimiento por producto, que queda registrada en el stock_movement tipo 'compra' consumido por las alertas de vencimiento."),

        h2("8.7 Caja y turnos"),
        p("Una cash_session queda 'open' desde que se abre hasta que se cierra; el cierre no obliga a abrir una nueva sesión de inmediato (pantalla \"No hay caja abierta\" con opción de abrir o volver al dashboard). Mientras la sesión está abierta, \"Mi turno\" (ShiftSalesPage) muestra todas las ventas del cajero activo con resumen por método de pago, incluyendo el neto de las devoluciones procesadas en el turno."),

        new Paragraph({ children: [new PageBreak()] }),

        // ═══════════════════════════════════════════════════
        // 9. INTEGRACIONES Y UTILIDADES COMPARTIDAS
        // ═══════════════════════════════════════════════════
        h1("9. Integraciones y Utilidades Compartidas"),

        h2("9.1 Impresión de tickets"),
        p(code("ticketPrinter.js"), " genera el HTML del comprobante (", code("buildTicketHtml"), ") con CSS ", code("@page"), " ajustado a papel térmico de 58mm o 80mm (configurable en Ajustes), lo abre en una ventana emergente y llama a ", code("window.print()"), " tras un timeout de 400ms para dar tiempo al renderizado. No usa ninguna librería de impresión — es HTML + CSS puro."),
        tip("Para impresión silenciosa (sin el diálogo de impresión de Chrome), el acceso directo POS La Economia.bat abre Chrome con la flag --kiosk-printing. Requiere configurar la ticketera como impresora predeterminada de Windows."),

        h2("9.2 Exportación a Excel y PDF"),
        p(code("shared/utils/exporters.js"), " expone dos funciones puramente client-side, sin llamadas a Supabase:"),
        ...bulletList([
          [bold("exportToExcel(rows, filename, sheetName)"), " — arma la hoja con xlsx-js-style: fila de título + fecha generados, headers en verde con texto blanco, ancho de columna automático según el contenido más largo."],
          [bold("exportToPDF"), " — usa jsPDF + jspdf-autotable para tablas paginadas, usado en reportes y en órdenes de compra / etiquetas de góndola / estados de cuenta."],
        ], "bullets6"),

        h2("9.3 Dashboard y gráficos"),
        p("adminService.getWeeklySales() agrupa ventas y monto recaudado de los últimos 7 días. DashboardPage los renderiza con Recharts: un AreaChart para lo recaudado y un BarChart para la cantidad de ventas, ambos con la paleta verde del sistema."),

        new Paragraph({ children: [new PageBreak()] }),

        // ═══════════════════════════════════════════════════
        // 10. SCRIPTS DE MANTENIMIENTO
        // ═══════════════════════════════════════════════════
        h1("10. Scripts de Mantenimiento"),
        p("La carpeta ", code("scripts/"), " contiene utilidades de Node ejecutadas fuera de la app, pensadas para correrse por línea de comandos o con doble click en su .bat equivalente. Todas requieren ", code("VITE_SUPABASE_SERVICE_KEY"), " en ", code(".env"), " porque escriben en la base saltando RLS."),
        dataTable(["Script", ".bat", "Qué hace"], [
          ["seed.mjs", "cargar-datos.bat", "Carga datos de prueba realistas (requiere al menos un usuario ya creado por el Setup Wizard)"],
          ["vaciar-db.mjs", "vaciar-datos.bat", "Borra datos transaccionales de prueba"],
          ["reset-setup.mjs", "reset-setup.bat", "Revierte el flag setup_completed para volver a pasar por el Setup Wizard"],
        ], [2200, 2200, 4960]),
        warning("Estos scripts son destructivos por diseño (vaciar-db.mjs borra datos) y usan la service key, que bypasea toda protección de RLS. No ejecutarlos nunca contra una base de datos de producción con datos reales sin backup previo."),

        new Paragraph({ children: [new PageBreak()] }),

        // ═══════════════════════════════════════════════════
        // 11. CONFIGURACIÓN Y DESPLIEGUE
        // ═══════════════════════════════════════════════════
        h1("11. Configuración y Despliegue"),

        h2("11.1 Variables de entorno"),
        dataTable(["Variable", "Uso"], [
          ["VITE_SUPABASE_URL", "URL del proyecto Supabase"],
          ["VITE_SUPABASE_ANON_KEY", "Clave pública, sujeta a RLS — usada por el cliente general"],
          ["VITE_SUPABASE_SERVICE_KEY", "Opcional. Bypasea RLS — solo para adminClient.js (crear usuarios) y los scripts de scripts/"],
        ], [3000, 6360]),
        warning("Durante la preparación de este manual se detectó que el proyecto Supabase referenciado en el .env local del repositorio (dominio bajo *.supabase.co) no resuelve por DNS — ya no existe o fue reemplazado. El deploy productivo en Vercel (laeconomiapos.vercel.app) funciona correctamente porque usa sus propias variables de entorno, configuradas directamente en el dashboard de Vercel, apuntando a un proyecto Supabase distinto y activo. Quien clone el repo para desarrollar en local necesita pedir las credenciales vigentes — el .env versionado (si lo hubiera) o el .env.example no alcanzan por sí solos."),

        h2("11.2 Despliegue (Vercel)"),
        p("El proyecto se despliega como sitio estático: Vercel ejecuta ", code("npm run build"), " (Vite) y sirve el contenido de ", code("dist/"), ". Como es una SPA con rutas del lado del cliente, ", code("vercel.json"), " define un rewrite que redirige cualquier ruta a ", code("index.html"), " para que React Router la resuelva:"),
        p(code('{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }')),

        h2("11.3 Claves usadas en app_settings"),
        dataTable(["Key", "Descripción"], [
          ["business_name, cuit, fiscal_condition, address, phone", "Datos del negocio, cargados en el Setup Wizard y editables en Ajustes"],
          ["iva_included_default", "Si los precios nuevos incluyen IVA por defecto"],
          ["receipt_footer", "Texto libre al pie del ticket"],
          ["paper_width", "'58' o '80' — ancho de papel térmico para ticketPrinter.js"],
          ["setup_completed", "'true' una vez creado el primer superadmin — gatea el Setup Wizard"],
        ], [3300, 6060]),

        new Paragraph({ children: [new PageBreak()] }),

        // ═══════════════════════════════════════════════════
        // 12. CONVENCIONES DE CÓDIGO
        // ═══════════════════════════════════════════════════
        h1("12. Convenciones de Código"),
        ...bulletList([
          [bold("Modularidad absoluta: "), "cada módulo nuevo va en src/modules/<nombre>/ con components/, hooks/ y services/. Código compartido entre módulos va a src/shared/, nunca duplicado."],
          [bold("Documentación de código: "), "todo componente, hook y service lleva un bloque de comentario al inicio con propósito, parámetros y retorno (ver cualquier archivo de services/ como referencia de estilo — están consistentemente documentados así en todo el proyecto)."],
          [bold("Comentarios inline: "), "explican el POR QUÉ (una decisión no obvia, un workaround), no el QUÉ — el código ya dice qué hace."],
          [bold("Capa de servicios: "), "los componentes no llaman a supabase directamente — pasan siempre por un *Service.js, que es el único lugar que conoce la forma de las tablas."],
        ], "bullets7"),

        new Paragraph({ children: [new PageBreak()] }),

        // ═══════════════════════════════════════════════════
        // ANEXO
        // ═══════════════════════════════════════════════════
        h1("Anexo: Glosario de Estados"),
        dataTable(["Campo", "Valores posibles"], [
          ["sales.status", "completed · cancelled"],
          ["sales.receipt_type", "ticket · factura_a · factura_b · factura_c"],
          ["sale_payments.method", "efectivo · debito · credito · qr · transferencia · cuenta"],
          ["cash_sessions.status", "open · closed"],
          ["stock_movements.movement_type", "venta · compra · ajuste · traslado · devolucion · vencimiento"],
          ["purchase_notes.status", "draft · submitted · approved · rejected · converted"],
          ["purchase_orders.status", "pending · confirmed · received · cancelled"],
          ["discounts.type", "percentage_total · fixed_total · product · category · quantity_rule · customer_discount"],
          ["roles.name", "superadmin · admin · cajero · repositor"],
        ], [3300, 6060]),

        new Paragraph({ spacing: { before: 600 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: "— Fin del Manual Técnico —", font: "Arial", size: 22, color: GRAY, italics: true })] }),
      ]
    }
  ]
});

const outPath = path.resolve(__dirname, "Manual Técnico - Sistema POS La Economía.docx");
Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync(outPath, buffer);
  console.log(`✅ Manual técnico generado: ${outPath}`);
});
