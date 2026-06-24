const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, LevelFormat, HeadingLevel,
  BorderStyle, WidthType, ShadingType, PageNumber, PageBreak, TableOfContents,
  TabStopType, TabStopPosition,
} = require("docx");

const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: border, bottom: border, left: border, right: border };
const noBorder = { style: BorderStyle.NONE, size: 0 };
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };
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
function tip(text) { return callout("✅ Consejo", text, LIGHT_GREEN_BG); }
function warning(text) { return callout("⚠️ Importante", text, LIGHT_YELLOW_BG); }
function info(text) { return callout("ℹ️ Nota", text, LIGHT_BLUE_BG); }

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
    config: [
      { reference: "steps1", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "steps2", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "steps3", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "steps4", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "steps5", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "steps6", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "steps7", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "steps8", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "steps9", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "steps10", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "steps11", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "steps12", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "steps13", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "steps14", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "steps15", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "bullets1", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "bullets2", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "bullets3", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "bullets4", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "bullets5", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
    ]
  },
  sections: [
    // ═══════════════════════════════════════════════════════════
    // PORTADA
    // ═══════════════════════════════════════════════════════════
    {
      properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
      children: [
        new Paragraph({ spacing: { before: 3000 }, alignment: AlignmentType.CENTER, children: [] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: "SISTEMA POS", font: "Arial", size: 56, bold: true, color: GREEN })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 400 }, children: [new TextRun({ text: "LA ECONOMÍA", font: "Arial", size: 56, bold: true, color: DARK })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 }, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: GREEN, space: 1 } }, children: [] }),
        new Paragraph({ spacing: { before: 400 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Manual de Usuario Oficial", font: "Arial", size: 32, color: GRAY })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: "Guía completa para Cajeros, Repositores y Administradores", font: "Arial", size: 24, color: GRAY })] }),
        new Paragraph({ spacing: { before: 2000 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Versión 1.0 — Junio 2026", font: "Arial", size: 22, color: GRAY })] }),
      ]
    },
    // ═══════════════════════════════════════════════════════════
    // INDICE
    // ═══════════════════════════════════════════════════════════
    {
      properties: {
        page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } },
      },
      headers: {
        default: new Header({ children: [new Paragraph({
          children: [new TextRun({ text: "Sistema POS La Economía — Manual de Usuario", font: "Arial", size: 18, color: GRAY, italics: true })],
          tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }]
        })] })
      },
      footers: {
        default: new Footer({ children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "Página ", font: "Arial", size: 18, color: GRAY }), new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 18, color: GRAY })]
        })] })
      },
      children: [
        h1("Índice de Contenidos"),
        new TableOfContents("Tabla de Contenidos", { hyperlink: true, headingStyleRange: "1-3" }),
        new Paragraph({ children: [new PageBreak()] }),

        // ═══════════════════════════════════════════════════════
        // A. INTRODUCCION Y ACCESO
        // ═══════════════════════════════════════════════════════
        h1("Introducción"),
        p("El Sistema POS La Economía es una aplicación web diseñada para gestionar de manera integral las operaciones diarias de un supermercado. Desde el punto de venta hasta el control de inventario, la gestión de clientes y la generación de reportes, todo se encuentra centralizado en una única plataforma."),
        p("El sistema contempla tres perfiles de usuario, cada uno con acceso a los módulos que corresponden a sus funciones:"),

        new Table({
          width: { size: 9360, type: WidthType.DXA }, columnWidths: [2200, 3500, 3660],
          rows: [
            new TableRow({ children: [
              new TableCell({ borders, width: { size: 2200, type: WidthType.DXA }, margins: cellMargins, shading: { fill: GREEN, type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: "Rol", bold: true, font: "Arial", size: 22, color: "FFFFFF" })] })] }),
              new TableCell({ borders, width: { size: 3500, type: WidthType.DXA }, margins: cellMargins, shading: { fill: GREEN, type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: "Responsabilidades", bold: true, font: "Arial", size: 22, color: "FFFFFF" })] })] }),
              new TableCell({ borders, width: { size: 3660, type: WidthType.DXA }, margins: cellMargins, shading: { fill: GREEN, type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: "Módulos", bold: true, font: "Arial", size: 22, color: "FFFFFF" })] })] }),
            ]}),
            new TableRow({ children: [
              new TableCell({ borders, width: { size: 2200, type: WidthType.DXA }, margins: cellMargins, children: [p(bold("Cajero"))] }),
              new TableCell({ borders, width: { size: 3500, type: WidthType.DXA }, margins: cellMargins, children: [p("Atención al público, cobro de ventas, emisión de tickets")] }),
              new TableCell({ borders, width: { size: 3660, type: WidthType.DXA }, margins: cellMargins, children: [p("POS / Ventas, Stock (lectura)")] }),
            ]}),
            new TableRow({ children: [
              new TableCell({ borders, width: { size: 2200, type: WidthType.DXA }, margins: cellMargins, shading: { fill: LIGHT_GRAY_BG, type: ShadingType.CLEAR }, children: [p(bold("Repositor"))] }),
              new TableCell({ borders, width: { size: 3500, type: WidthType.DXA }, margins: cellMargins, shading: { fill: LIGHT_GRAY_BG, type: ShadingType.CLEAR }, children: [p("Gestión de inventario, carga de productos, pedidos")] }),
              new TableCell({ borders, width: { size: 3660, type: WidthType.DXA }, margins: cellMargins, shading: { fill: LIGHT_GRAY_BG, type: ShadingType.CLEAR }, children: [p("Stock, Proveedores (Notas de Pedido)")] }),
            ]}),
            new TableRow({ children: [
              new TableCell({ borders, width: { size: 2200, type: WidthType.DXA }, margins: cellMargins, children: [p(bold("Administrador"))] }),
              new TableCell({ borders, width: { size: 3500, type: WidthType.DXA }, margins: cellMargins, children: [p("Supervisión general, reportes, gestión de personal y proveedores")] }),
              new TableCell({ borders, width: { size: 3660, type: WidthType.DXA }, margins: cellMargins, children: [p("Todos los módulos")] }),
            ]}),
          ]
        }),

        h2("Cómo ingresar al sistema"),
        ...numberedList([
          "Abra el navegador web (Google Chrome recomendado) e ingrese la dirección del sistema proporcionada por su administrador.",
          "En la pantalla de inicio de sesión, ingrese su Email y Contraseña.",
          { text: 'Haga clic en el botón "Iniciar sesión".', bold: false },
          "Si su cuenta tiene más de un rol asignado (por ejemplo, Cajero y Repositor), el sistema le mostrará una pantalla para que seleccione con cuál perfil desea trabajar.",
          "Una vez seleccionado, será redirigido automáticamente al módulo principal de su rol.",
        ], "steps1"),
        tip("Su sesión se mantiene activa mientras no cierre el navegador. Si el sistema le pide volver a ingresar, es porque la sesión expiró por inactividad."),

        new Paragraph({ children: [new PageBreak()] }),

        // ═══════════════════════════════════════════════════════
        // B. PERFIL CAJERO
        // ═══════════════════════════════════════════════════════
        h1("Perfil: Cajero"),
        p("Como cajero, su función principal es registrar las ventas diarias, cobrar a los clientes y emitir tickets. A continuación se detallan todas las operaciones disponibles."),

        h2("Abrir turno de caja"),
        p("Antes de comenzar a vender, es necesario abrir un turno de caja:"),
        ...numberedList([
          'Al ingresar al módulo POS / Ventas, verá la pantalla "No hay caja abierta".',
          'Haga clic en "Abrir caja".',
          "Seleccione la caja registradora (si hay más de una disponible).",
          "Ingrese el monto de efectivo con el que inicia el turno.",
          'Confirme con "Abrir caja". La interfaz del POS se activará.',
        ], "steps2"),

        h2("Registrar una venta"),
        h3("Buscar y agregar productos"),
        ...numberedList([
          'En el panel izquierdo del POS, utilice el campo de búsqueda. Puede buscar por nombre del producto, código SKU o código de barras (EAN).',
          "Si cuenta con un lector de códigos de barras (escáner), simplemente escanee el producto y se agregará automáticamente al carrito.",
          "Para agregar manualmente, haga clic sobre el producto en los resultados de búsqueda. Se añadirá al carrito (panel derecho) con cantidad 1.",
          'En el carrito, puede modificar la cantidad con los botones "+" y "-", o eliminar un ítem con el ícono de tacho.',
        ], "steps3"),
        warning("Si un producto no tiene stock disponible, el sistema le mostrará una alerta al intentar agregarlo. Puede continuar con la venta igualmente, pero el stock quedará en negativo."),

        h3("Seleccionar un cliente (opcional)"),
        p("Si la venta es para un cliente registrado (con cuenta corriente, descuento especial, etc.):"),
        ...numberedList([
          'En la sección inferior del carrito, busque al cliente por nombre o documento en el campo "Cliente".',
          "Seleccionélo de la lista desplegable.",
          "Si el cliente tiene un descuento especial configurado, se aplicará automáticamente al total.",
        ], "steps4"),
        info("Si no selecciona ningún cliente, la venta se registra como anónima. Esto es lo habitual para ventas rápidas al público general."),

        h3("Cobrar la venta"),
        ...numberedList([
          'Cuando el carrito esté listo, presione el botón "Cobrar" (verde, parte inferior del carrito).',
          "Se abrirá el modal de cobro mostrando el total a pagar.",
          "Seleccione el método de pago: Efectivo, Débito, Crédito, QR/MP, Transferencia o Cuenta Corriente.",
          "Ingrese el monto recibido y presione “Agregar”. Puede combinar mútiples métodos de pago.",
          "Si paga en efectivo, el sistema calculará el vuelto automáticamente.",
          'Seleccione el tipo de comprobante (Ticket, Factura A, B o C) y presione "Confirmar venta".',
        ], "steps5"),
        warning("La opción Cuenta Corriente solo aparece si hay un cliente seleccionado. El monto se agrega a la deuda del cliente."),
        tip("Al finalizar la venta, el stock se actualiza automáticamente y el ticket se imprime si tiene la ticketera configurada."),

        h2("Consultar el stock"),
        p("Desde el menú lateral, puede acceder a la sección ", bold("Stock"), " para consultar los niveles de inventario de cada producto. Esta vista es de solo lectura para el cajero: puede ver cantidades en estantería y depósito, pero no puede modificarlas."),

        h2("Mi turno"),
        p('Mientras tenga una caja abierta, aparecerá la opción "Mi turno" en el menú lateral. Allí puede ver todas las ventas realizadas durante su turno con un resumen de montos y métodos de pago.'),

        h2("Cerrar turno de caja"),
        ...numberedList([
          'En la barra superior del POS, haga clic en "Cerrar turno".',
          "El sistema mostrará un resumen: cantidad de ventas, total recaudado, desglose por método de pago y devoluciones (si las hubo).",
          "Cuente el efectivo en la caja e ingrese el monto en el campo correspondiente.",
          'Presione "Cerrar turno" para finalizar.',
        ], "steps6"),
        info("Después de cerrar, puede elegir abrir una nueva caja o volver al Dashboard. No es obligatorio abrir una nueva inmediatamente."),

        new Paragraph({ children: [new PageBreak()] }),

        // ═══════════════════════════════════════════════════════
        // C. PERFIL REPOSITOR
        // ═══════════════════════════════════════════════════════
        h1("Perfil: Repositor"),
        p("El repositor es responsable de mantener el inventario actualizado, dar de alta productos y generar pedidos de mercadería."),

        h2("Consultar inventario y alertas"),
        p("Desde ", bold("Stock"), " en el menú lateral, tiene acceso a las siguientes pestañas:"),
        ...bulletList([
          [bold("Productos"), ": listado completo con búsqueda, filtros por categoría y estado activo/inactivo."],
          [bold("Niveles de Stock"), ": cantidades por ubicación (Estantería y Depósito). Los productos con stock bajo mínimo se resaltan."],
          [bold("Movimientos"), ": historial de entradas, salidas, ajustes y traslados."],
          [bold("Vencimientos"), ": productos con fechas de vencimiento próximas, con filtros por estado (vencido, crítico, por vencer)."],
          [bold("Etiquetas"), ": generador de etiquetas de precios para góndolas (PDF descargable)."],
        ], "bullets1"),

        h2("Dar de alta un producto"),
        ...numberedList([
          'En la pestaña Productos, haga clic en "Nuevo producto".',
          "Complete los campos obligatorios: Nombre y Precio de venta.",
          "Opcionalmente complete: SKU, Código de barras (EAN), Categoría, Precio de costo, Unidad de medida.",
          "Configure el IVA: seleccione la tasa (0%, 10.5% o 21%) y si el precio ya incluye IVA o se suma aparte.",
          "Defina el stock mínimo (cantidad bajo la cual el sistema genera alertas).",
          "Si el producto tiene fecha de vencimiento, active la casilla correspondiente.",
          'Presione "Crear producto".',
        ], "steps7"),
        tip("Para editar un producto existente, haga clic en el ícono del lápiz en la fila correspondiente."),

        h2("Ajustar stock manualmente"),
        p("Si necesita corregir las cantidades de stock (por merma, rotura, conteo físico):"),
        ...numberedList([
          "En la tabla de productos, busque el producto y haga clic en el ícono de ajuste (barras deslizantes).",
          "Seleccione la ubicación (Estantería o Depósito).",
          "Ingrese la cantidad a agregar (número positivo) o restar (número negativo).",
          "Opcionalmente agregue una nota explicativa (ej: “Merma por rotura”).",
          'Confirme con "Guardar ajuste".',
        ], "steps8"),

        h2("Trasladar stock entre ubicaciones"),
        ...numberedList([
          "Haga clic en el ícono de traslado (flechas cruzadas) del producto.",
          "Seleccione la ubicación de origen y de destino.",
          "Ingrese la cantidad a trasladar.",
          'Confirme con "Trasladar".',
        ], "steps9"),

        h2("Generar una Nota de Pedido"),
        p("Las notas de pedido son borradores de faltantes que el repositor envía a la administración para que se gestione la compra:"),
        ...numberedList([
          'Navegue a Proveedores > Notas de Pedido.',
          'Haga clic en "Nueva nota de pedido".',
          "Agregue los productos necesarios con sus cantidades y precios estimados.",
          "Opcionalmente agregue observaciones (ej: “Urgente”, “Para el turno de la tarde”).",
          'Presione "Crear nota".',
        ], "steps10"),
        info("Como repositor, no verá la sección de proveedores ni las órdenes de compra. Solo puede crear notas de pedido y la administración se encarga de asignar el proveedor y emitir la orden."),

        h2("Generar etiquetas de góndola"),
        ...numberedList([
          "En Stock, seleccione la pestaña Etiquetas.",
          "Use los filtros rápidos por categoría para seleccionar grupos de productos, o marque uno por uno.",
          "Elija la cantidad de columnas (3 o 4 por fila).",
          "Verifique la vista previa de las etiquetas.",
          'Presione "Descargar PDF". Se generará un archivo listo para imprimir en hoja A4.',
        ], "steps11"),

        new Paragraph({ children: [new PageBreak()] }),

        // ═══════════════════════════════════════════════════════
        // D. PERFIL ADMINISTRADOR
        // ═══════════════════════════════════════════════════════
        h1("Perfil: Administrador"),
        p("El Administrador tiene acceso completo a todos los módulos del sistema. Además de poder realizar las mismas tareas que el Cajero y el Repositor, cuenta con herramientas de supervisión, reportes y gestión."),
        info("Todo lo explicado en las secciones de Cajero y Repositor también aplica para el Administrador. A continuación se detallan las funciones exclusivas de este perfil."),

        h2("Dashboard principal"),
        p("Al ingresar, el Administrador ve un panel con indicadores clave del día:"),
        ...bulletList([
          [bold("Ventas hoy"), ": cantidad de transacciones completadas."],
          [bold("Recaudado hoy"), ": monto total facturado en el día."],
          [bold("Stock bajo"), ": cantidad de productos que están por debajo del mínimo configurado."],
          [bold("Clientes con deuda"), ": cantidad de clientes con saldo en cuenta corriente."],
          [bold("Por vencer"), ": productos cuya fecha de vencimiento está próxima."],
          [bold("Gráficos semanales"), ": recaudación y cantidad de ventas de los últimos 7 días."],
        ], "bullets2"),
        tip('Presione "Actualizar" para refrescar los datos del dashboard en tiempo real.'),

        h2("Reportes"),
        p("Desde el menú lateral, acceda a ", bold("Reportes"), " para consultar información histórica detallada:"),

        h3("Reporte de Ventas"),
        ...numberedList([
          "Seleccione el rango de fechas (Desde / Hasta).",
          'Presione "Buscar".',
          "Verá un resumen con: cantidad de ventas, total recaudado, descuentos aplicados y desglose por método de pago.",
          "La tabla detalla cada venta con número, fecha, cajero, cliente, tipo de comprobante y total.",
          'Puede exportar a Excel o PDF con los botones correspondientes.',
        ], "steps12"),

        h3("Reporte de Cajas"),
        p("Muestra las sesiones de caja abiertas y cerradas en el período seleccionado, con montos de apertura, cierre y diferencias."),

        h3("Reporte de Stock"),
        p("Listado completo de productos con stock actual por ubicación, precio de costo y venta, exportable a Excel."),

        h3("Deudores"),
        p("Listado de clientes con saldo en cuenta corriente, ordenable por monto. Incluye exportación a Excel y PDF."),

        h3("Devoluciones"),
        p("Desde esta pestaña puede procesar devoluciones de ventas:"),
        ...numberedList([
          "Ingrese el número de la venta original y presione Buscar.",
          "Seleccione los productos a devolver y la cantidad.",
          "Marque o desmarque la casilla “Devolver productos al stock” según corresponda.",
          "Ingrese el motivo de devolución (obligatorio).",
          'Confirme con "Procesar devolución".',
        ], "steps13"),
        warning("Las devoluciones se descuentan del neto del turno de caja. Al cerrar turno, verá una línea específica indicando el monto devuelto."),

        h2("Gestión de Clientes"),
        p("Desde ", bold("Clientes"), " puede administrar la base de clientes y sus cuentas corrientes:"),
        ...bulletList([
          "Crear, editar y activar/desactivar clientes.",
          "Configurar límite de crédito y descuento especial por cliente.",
          [bold("Historial de cuenta corriente"), ": al hacer clic en el ícono del reloj, verá la ficha completa con movimientos de deuda (Debe/Haber/Saldo), posibilidad de registrar pagos y descargar el estado de cuenta en PDF."],
        ], "bullets3"),

        h2("Gestión de Proveedores y Compras"),
        h3("Proveedores"),
        p("Desde la pestaña ", bold("Proveedores"), " puede dar de alta, editar y desactivar proveedores con toda su información fiscal y comercial (razón social, CUIT, condición de pago, días de entrega)."),

        h3("Notas de Pedido"),
        p("Aquí verá las notas generadas por los repositores. Puede:"),
        ...bulletList([
          "Aprobar, rechazar o convertir una nota en Orden de Compra.",
          "Asignar el proveedor correspondiente (los repositores no ven este campo).",
        ], "bullets4"),

        h3("Órdenes de Compra"),
        ...numberedList([
          "Desde la pestaña Órdenes de Compra, cree una nueva o convértala desde una nota aprobada.",
          "Complete los productos, cantidades, precios y proveedor.",
          "Una vez confirmada la OC, puede registrar la recepción de mercadería indicando las cantidades recibidas y, opcionalmente, las fechas de vencimiento de cada lote.",
          "Al registrar la recepción, el stock se actualiza automáticamente.",
        ], "steps14"),

        h2("Gestión de Usuarios"),
        p("Desde ", bold("Usuarios"), " puede crear y administrar las cuentas del personal:"),
        ...numberedList([
          'Haga clic en "Nuevo usuario".',
          "Complete nombre, email y contraseña.",
          "Asigne uno o más roles (Cajero, Repositor, Administrador).",
          'Presione "Crear usuario".',
        ], "steps15"),
        info("Puede desactivar un usuario sin eliminarlo. El usuario desactivado no podrá iniciar sesión pero sus registros históricos se mantienen."),

        h2("Descuentos"),
        p("Desde ", bold("Descuentos"), " puede configurar reglas de descuento que se aplican automáticamente en el POS:"),
        ...bulletList([
          [bold("Por producto"), ": porcentaje de descuento sobre un producto específico."],
          [bold("Por categoría"), ": porcentaje de descuento para todos los productos de una categoría."],
          [bold("Regla de cantidad"), ": promociones tipo 3x2 (comprá 3, llevá 4)."],
          [bold("Porcentaje sobre el total"), ": descuento general sobre el monto total."],
          [bold("Monto fijo"), ": descuento de un monto fijo en pesos."],
        ], "bullets5"),

        new Paragraph({ children: [new PageBreak()] }),

        // ═══════════════════════════════════════════════════════
        // ANEXO
        // ═══════════════════════════════════════════════════════
        h1("Anexo: Referencia Rápida"),

        h2("Atajos y tips generales"),
        new Table({
          width: { size: 9360, type: WidthType.DXA }, columnWidths: [3500, 5860],
          rows: [
            new TableRow({ children: [
              new TableCell({ borders, width: { size: 3500, type: WidthType.DXA }, margins: cellMargins, shading: { fill: GREEN, type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: "Acción", bold: true, font: "Arial", size: 22, color: "FFFFFF" })] })] }),
              new TableCell({ borders, width: { size: 5860, type: WidthType.DXA }, margins: cellMargins, shading: { fill: GREEN, type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: "Cómo hacerlo", bold: true, font: "Arial", size: 22, color: "FFFFFF" })] })] }),
            ]}),
            ...([
              ["Escanear producto", "Coloque el cursor en el campo de búsqueda y escanee con el lector"],
              ["Cambiar tema", "Botón sol/luna en la barra superior (arriba a la derecha)"],
              ["Exportar a Excel", "Botón “Excel” en cualquier reporte con datos"],
              ["Exportar a PDF", "Botón “PDF” en reportes o “Descargar estado de cuenta” en clientes"],
              ["Impresión silenciosa", "Abrir el sistema desde el acceso directo POS La Economía.bat"],
              ["Etiquetas de góndola", "Stock > Etiquetas > Seleccionar productos > Descargar PDF"],
            ]).map((row, i) => new TableRow({ children: [
              new TableCell({ borders, width: { size: 3500, type: WidthType.DXA }, margins: cellMargins, shading: { fill: i % 2 ? LIGHT_GRAY_BG : "FFFFFF", type: ShadingType.CLEAR }, children: [p(bold(row[0]))] }),
              new TableCell({ borders, width: { size: 5860, type: WidthType.DXA }, margins: cellMargins, shading: { fill: i % 2 ? LIGHT_GRAY_BG : "FFFFFF", type: ShadingType.CLEAR }, children: [p(row[1])] }),
            ]}))
          ]
        }),

        new Paragraph({ spacing: { before: 600 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: "— Fin del Manual —", font: "Arial", size: 22, color: GRAY, italics: true })] }),
      ]
    }
  ]
});

const outPath = path.resolve(__dirname, "Manual de Usuario - Sistema POS La Economía.docx");
Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync(outPath, buffer);
  console.log(`✅ Manual generado: ${outPath}`);
});
