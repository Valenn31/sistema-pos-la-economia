# CLAUDE.md — Sistema POS La Economía

> Guía perpetua de desarrollo. Leer antes de tocar cualquier archivo.

---

## 1. STACK TECNOLÓGICO

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 + Vite |
| Estilos | Tailwind CSS v3 |
| Estado global | Zustand |
| Backend / DB | Supabase (PostgreSQL + Auth + RLS + Storage) |
| Deploy | Vercel |
| Exportación PDF | react-pdf / jsPDF |
| Exportación Excel | xlsx (SheetJS) |

---

## 2. REGLAS DE CÓDIGO Y ARQUITECTURA

### 2.1 Modularidad Absoluta
El proyecto se divide en módulos independientes. Cada módulo tiene su propia carpeta bajo `src/modules/<nombre>/` con:
```
src/modules/<modulo>/
  ├── components/   # Componentes React del módulo
  ├── hooks/        # Custom hooks del módulo
  ├── services/     # Llamadas a Supabase (API layer)
  └── utils/        # Helpers y utilidades del módulo
```

Módulos: `auth` · `pos` · `stock` · `suppliers` · `reports` · `admin`

Código compartido entre módulos: `src/shared/`
```
src/shared/
  ├── components/   # UI reutilizable (Button, Modal, Table, etc.)
  ├── hooks/        # Hooks globales
  ├── store/        # Zustand stores globales
  └── utils/        # Helpers globales (formatters, validators)
```

### 2.2 Documentación de Código
- Todo componente, custom hook y service lleva un bloque de comentario al inicio con: propósito, parámetros y retorno.
- Los bloques lógicos importantes dentro del código llevan comentarios inline que explican el POR QUÉ, no el QUÉ.

### 2.3 Preguntar Antes de Asumir
Ante cualquier ambigüedad de lógica, diseño o DB: detener el desarrollo y preguntar. No asumir.

---

## 3. METODOLOGÍA (SPRINTS)

No avanzar a un Sprint sin aprobación explícita del Sprint anterior.

| Sprint | Contenido | Estado |
|--------|-----------|--------|
| 1 | Estructura, Auth, CLAUDE.md, Setup inicial | ✅ Completo |
| 2 | Módulo POS (Ventas, Carrito, Caja) | ✅ Completo |
| 3 | Módulo Stock y Proveedores | ✅ Completo |
| 4 | Módulo Admin y Reportes | ✅ Completo |

---

## 4. ROLES Y PERMISOS

| Rol | POS | Stock | Proveedores | Reportes | Admin | Setup |
|-----|-----|-------|-------------|----------|-------|-------|
| **Superadmin** | ✅ Total | ✅ Total | ✅ Total | ✅ Total | ✅ Total | ✅ Total |
| **Admin** | ✅ Total | ✅ Total | ✅ Total (incl. OC) | ✅ Total | ✅ Total | ❌ |
| **Cajero** | ✅ Total | 👁️ Solo lectura | ❌ | ❌ | ❌ | ❌ |
| **Repositor** | ❌ | ✅ ABM + Notas de Pedido | ⚠️ Solo Notas (sin OC final) | ❌ | ❌ | ❌ |

### Reglas especiales de roles:
- Un usuario **puede tener múltiples roles** (ej: Admin + Cajero).
- Al iniciar sesión con múltiples roles, el sistema muestra una **pantalla de selección de rol** antes de entrar.
- **Cambio rápido de cajero en POS:** sin logout completo. La pantalla del POS tiene un botón "Cambiar cajero" que solicita el PIN numérico (4 dígitos) del usuario entrante. El sistema valida el PIN y cambia el cajero activo en la sesión de caja.
- El **primer Superadmin** se crea desde el **Panel de Setup Inicial** (primera vez que se accede al sistema sin usuarios registrados).
- El **Admin puede crear/editar/desactivar usuarios** y asignarles/quitarles roles desde la UI.

---

## 5. ESQUEMA DE BASE DE DATOS (Supabase / PostgreSQL)

### 5.1 Auth y Usuarios

```sql
-- Extiende auth.users de Supabase
profiles (
  id            uuid PRIMARY KEY REFERENCES auth.users(id),
  full_name     text NOT NULL,
  pin           varchar(4),           -- PIN numérico para cambio rápido en POS
  is_active     boolean DEFAULT true,
  created_at    timestamptz DEFAULT now()
)

roles (
  id    serial PRIMARY KEY,
  name  text UNIQUE NOT NULL   -- 'superadmin' | 'admin' | 'cajero' | 'repositor'
)

user_roles (
  id        serial PRIMARY KEY,
  user_id   uuid REFERENCES profiles(id) ON DELETE CASCADE,
  role_id   int  REFERENCES roles(id)   ON DELETE CASCADE,
  UNIQUE(user_id, role_id)
)
```

### 5.2 Catálogo de Productos

```sql
categories (
  id          serial PRIMARY KEY,
  name        text NOT NULL,
  description text,
  created_at  timestamptz DEFAULT now()
)

products (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku             text UNIQUE,               -- Código interno
  barcode         text,                      -- EAN-13 / UPC
  name            text NOT NULL,
  description     text,
  category_id     int REFERENCES categories(id),
  unit_of_measure text NOT NULL,             -- 'unidad' | 'kg' | 'litro' | 'docena' | etc.
  price_cost      numeric(12,2),             -- Precio de costo
  price_sell      numeric(12,2) NOT NULL,    -- Precio de venta
  iva_rate        numeric(5,2) DEFAULT 21,   -- 0 | 10.5 | 21
  iva_included    boolean DEFAULT true,      -- Si el precio_sell ya incluye IVA
  min_stock       numeric(12,3) DEFAULT 0,
  has_expiry      boolean DEFAULT false,
  is_active       boolean DEFAULT true,
  created_at      timestamptz DEFAULT now()
)
```

### 5.3 Stock por Ubicación

```sql
locations (
  id          serial PRIMARY KEY,
  name        text NOT NULL,    -- 'Depósito' | 'En Estantería'
  description text,
  is_active   boolean DEFAULT true
)

stock (
  id          serial PRIMARY KEY,
  product_id  uuid REFERENCES products(id) ON DELETE CASCADE,
  location_id int  REFERENCES locations(id),
  quantity    numeric(12,3) DEFAULT 0,
  updated_at  timestamptz DEFAULT now(),
  UNIQUE(product_id, location_id)
)

stock_movements (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id       uuid REFERENCES products(id),
  from_location_id int  REFERENCES locations(id),  -- NULL si es ingreso externo
  to_location_id   int  REFERENCES locations(id),  -- NULL si es egreso (venta)
  quantity         numeric(12,3) NOT NULL,
  movement_type    text NOT NULL,   -- 'venta' | 'compra' | 'ajuste' | 'traslado' | 'devolucion' | 'vencimiento'
  reference_id     uuid,            -- ID de la venta / OC / etc.
  reference_type   text,            -- 'sale' | 'purchase_order' | 'manual'
  user_id          uuid REFERENCES profiles(id),
  expiry_date      date,            -- Solo si has_expiry = true
  notes            text,
  created_at       timestamptz DEFAULT now()
)
```

### 5.4 Clientes

```sql
customers (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name        text NOT NULL,
  document_type    text,              -- 'DNI' | 'CUIT'
  document_number  text,
  phone            text,
  email            text,
  address          text,
  credit_limit     numeric(12,2) DEFAULT 0,   -- Límite de deuda permitido
  current_balance  numeric(12,2) DEFAULT 0,   -- Deuda actual (positivo = debe)
  discount_percent numeric(5,2)  DEFAULT 0,   -- Descuento especial del cliente
  is_active        boolean DEFAULT true,
  created_at       timestamptz DEFAULT now()
)
```

### 5.5 Descuentos Configurables

```sql
-- Tipos: 'percentage_total' | 'fixed_total' | 'product' | 'category' | 'quantity_rule' | 'customer_discount'
discounts (
  id             serial PRIMARY KEY,
  name           text NOT NULL,
  type           text NOT NULL,
  value          numeric(12,2),        -- Porcentaje o monto fijo
  min_quantity   numeric(12,3),        -- Para reglas de cantidad (ej: 3 en 3x2)
  free_quantity  numeric(12,3),        -- Productos gratis (ej: 1 en 3x2)
  product_id     uuid REFERENCES products(id),
  category_id    int  REFERENCES categories(id),
  is_active      boolean DEFAULT true,
  created_at     timestamptz DEFAULT now()
)
```

### 5.6 Cajas y Turnos

```sql
cash_registers (
  id        serial PRIMARY KEY,
  name      text NOT NULL,       -- 'Caja 1', 'Caja 2', etc.
  is_active boolean DEFAULT true
)

cash_sessions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  register_id    int  REFERENCES cash_registers(id),
  opened_by      uuid REFERENCES profiles(id),
  opening_amount numeric(12,2) NOT NULL,
  closing_amount numeric(12,2),
  opened_at      timestamptz DEFAULT now(),
  closed_at      timestamptz,
  status         text DEFAULT 'open'  -- 'open' | 'closed'
)
```

### 5.7 Ventas

```sql
sales (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_number    serial UNIQUE,
  register_id    int  REFERENCES cash_registers(id),
  session_id     uuid REFERENCES cash_sessions(id),
  cashier_id     uuid REFERENCES profiles(id),
  customer_id    uuid REFERENCES customers(id),   -- NULL si venta anónima
  subtotal       numeric(12,2) NOT NULL,
  discount_total numeric(12,2) DEFAULT 0,
  iva_total      numeric(12,2) DEFAULT 0,
  total          numeric(12,2) NOT NULL,
  receipt_type   text DEFAULT 'ticket',  -- 'ticket' | 'factura_a' | 'factura_b' | 'factura_c'
  notes          text,
  status         text DEFAULT 'completed',  -- 'completed' | 'cancelled'
  created_at     timestamptz DEFAULT now()
)

sale_items (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id          uuid REFERENCES sales(id) ON DELETE CASCADE,
  product_id       uuid REFERENCES products(id),
  quantity         numeric(12,3) NOT NULL,
  unit_price       numeric(12,2) NOT NULL,
  iva_rate         numeric(5,2)  DEFAULT 0,
  discount_amount  numeric(12,2) DEFAULT 0,
  subtotal         numeric(12,2) NOT NULL
)

sale_payments (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id        uuid REFERENCES sales(id) ON DELETE CASCADE,
  method         text NOT NULL,  -- 'efectivo' | 'debito' | 'credito' | 'qr' | 'transferencia' | 'cuenta'
  amount         numeric(12,2) NOT NULL,
  reference      text           -- Nro de operación, últimos 4 del PosNet, etc.
)
```

### 5.8 Devoluciones

```sql
returns (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id     uuid REFERENCES sales(id),
  user_id     uuid REFERENCES profiles(id),
  total       numeric(12,2) NOT NULL,
  reason      text,
  created_at  timestamptz DEFAULT now()
)

return_items (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id    uuid REFERENCES returns(id) ON DELETE CASCADE,
  sale_item_id uuid REFERENCES sale_items(id),
  product_id   uuid REFERENCES products(id),
  quantity     numeric(12,3) NOT NULL,
  unit_price   numeric(12,2) NOT NULL,
  subtotal     numeric(12,2) NOT NULL
)
```

### 5.9 Proveedores y Compras

```sql
suppliers (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  razon_social      text NOT NULL,
  cuit              text,
  phone             text,
  email             text,
  payment_condition text,   -- 'contado' | '30 días' | etc.
  delivery_days     int,
  is_active         boolean DEFAULT true,
  created_at        timestamptz DEFAULT now()
)

product_suppliers (
  id             serial PRIMARY KEY,
  product_id     uuid REFERENCES products(id) ON DELETE CASCADE,
  supplier_id    uuid REFERENCES suppliers(id) ON DELETE CASCADE,
  supplier_sku   text,
  purchase_price numeric(12,2),
  is_preferred   boolean DEFAULT false,
  UNIQUE(product_id, supplier_id)
)

-- Nota de Pedido (creada por Repositor, borrador)
purchase_notes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_number serial UNIQUE,
  supplier_id uuid REFERENCES suppliers(id),
  created_by  uuid REFERENCES profiles(id),
  status      text DEFAULT 'draft',  -- 'draft' | 'submitted' | 'approved' | 'rejected' | 'converted'
  notes       text,
  created_at  timestamptz DEFAULT now()
)

purchase_note_items (
  id                 serial PRIMARY KEY,
  note_id            uuid REFERENCES purchase_notes(id) ON DELETE CASCADE,
  product_id         uuid REFERENCES products(id),
  quantity_requested numeric(12,3) NOT NULL,
  unit_price         numeric(12,2)
)

-- Orden de Compra (emitida por Admin/Superadmin, documento formal)
purchase_orders (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number   serial UNIQUE,
  supplier_id    uuid REFERENCES suppliers(id),
  note_id        uuid REFERENCES purchase_notes(id),  -- NULL si se crea directo
  created_by     uuid REFERENCES profiles(id),
  status         text DEFAULT 'pending',  -- 'pending' | 'confirmed' | 'received' | 'cancelled'
  total_amount   numeric(12,2),
  expected_date  date,
  notes          text,
  created_at     timestamptz DEFAULT now()
)

purchase_order_items (
  id                serial PRIMARY KEY,
  order_id          uuid REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id        uuid REFERENCES products(id),
  quantity_ordered  numeric(12,3) NOT NULL,
  quantity_received numeric(12,3) DEFAULT 0,
  unit_price        numeric(12,2) NOT NULL,
  subtotal          numeric(12,2) NOT NULL
)
```

### 5.10 Configuración de la App

```sql
app_settings (
  key         text PRIMARY KEY,
  value       text,
  description text
)
-- Keys usadas: 'business_name', 'cuit', 'address', 'fiscal_condition',
--              'iva_included_default', 'receipt_footer', 'setup_completed'
```

---

## 6. LÓGICA DE NEGOCIO CLAVE

### Venta (POS)
1. Stock baja de **"En Estantería"** al confirmar venta.
2. Se registra un `stock_movement` tipo `'venta'` con `from_location_id = En Estantería`.
3. Si el cliente tiene cuenta, el total se suma a `customers.current_balance`.
4. Una venta puede tener **múltiples métodos de pago** en `sale_payments`.
5. Las cuotas de tarjeta son manejadas por el PosNet externo; el sistema solo registra el monto y el método.

### Devolución
1. Crea un registro en `returns` + `return_items`.
2. Restaura stock en **"En Estantería"** (`stock_movement` tipo `'devolucion'`).
3. Si el pago original fue en efectivo → se registra el egreso de caja.
4. Si el cliente tenía cuenta → se descuenta de `current_balance`.

### Traslado de Stock (Depósito → Estantería)
1. El repositor registra un traslado: `stock_movement` tipo `'traslado'` con `from = Depósito`, `to = Estantería`.
2. El stock de ambas ubicaciones se actualiza en la tabla `stock`.

### Nota de Pedido vs Orden de Compra
- El **Repositor** crea una `purchase_note` (borrador). No puede emitirla formalmente.
- El **Admin/Superadmin** puede aprobar la nota y convertirla en `purchase_order` (o crear una OC directamente).
- La OC se exporta a PDF para enviar/imprimir al proveedor.

### Comprobantes Fiscales (Opción B)
- El sistema genera e imprime comprobantes en formato de Factura A/B/C con todos los datos legales.
- La gestión del CAE ante AFIP es responsabilidad del contador/sistema externo.
- Los datos del emisor (CUIT, razón social, condición fiscal, punto de venta) se configuran en `app_settings`.

---

## 7. CONVENCIONES DE ARCHIVOS

```
src/
├── modules/
│   ├── auth/
│   │   ├── components/   LoginForm, RoleSelector, SetupWizard, etc.
│   │   ├── hooks/        useAuth, useSession
│   │   └── services/     authService.js
│   ├── pos/
│   │   ├── components/   POSLayout, ProductSearch, Cart, PaymentModal, etc.
│   │   ├── hooks/        useCart, useCashSession, usePinSwitch
│   │   └── services/     salesService.js
│   ├── stock/
│   │   ├── components/   ProductTable, ProductForm, StockMovements, etc.
│   │   ├── hooks/        useProducts, useStock
│   │   └── services/     stockService.js, productService.js
│   ├── suppliers/
│   │   ├── components/   SupplierTable, PurchaseNoteForm, PurchaseOrderForm
│   │   ├── hooks/        useSuppliers, usePurchaseNotes
│   │   └── services/     supplierService.js, purchaseService.js
│   ├── reports/
│   │   ├── components/   SalesReport, StockReport, CashReport, etc.
│   │   ├── hooks/        useReports
│   │   └── services/     reportsService.js
│   └── admin/
│       ├── components/   UserManagement, DiscountConfig, CashRegisterConfig
│       ├── hooks/        useUsers, useDiscounts
│       └── services/     adminService.js
├── shared/
│   ├── components/       Button, Modal, Table, Badge, Spinner, etc.
│   ├── hooks/            useDebounce, usePagination, useExport
│   ├── store/            authStore.js, uiStore.js
│   └── utils/            formatters.js, validators.js, exporters.js
├── routes/
│   ├── ProtectedRoute.jsx
│   ├── RoleGuard.jsx
│   └── router.jsx
├── supabase/
│   └── client.js
└── App.jsx
```

---

## 8. VARIABLES DE ENTORNO

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

---

## 9. HISTORIAL DE SPRINTS

### Sprint 1 ✅ COMPLETO (pendiente ejecución del schema en Supabase)
- [x] CLAUDE.md creado
- [x] Proyecto Vite + React 18 inicializado (manual, carpeta no vacía)
- [x] Tailwind CSS v3 configurado (paleta `primary` verde + `surface` slate)
- [x] Zustand instalado — stores: `authStore`, `uiStore`
- [x] Supabase client configurado (`src/supabase/client.js`)
- [x] Schema SQL completo generado (`supabase/schema.sql`) — **PENDIENTE ejecutar en Supabase Dashboard**
- [x] Panel de Setup Inicial (SetupWizard 4 pasos)
- [x] Login con email/password + react-hook-form + validaciones
- [x] Selección de rol al ingresar (si tiene múltiples roles)
- [x] Rutas protegidas por rol (ProtectedRoute + RoleGuard)
- [x] Layout base con sidebar responsivo (colapsable, mobile-first)
- [x] Páginas placeholder para todos los módulos
- [x] `vercel.json` configurado para SPA routing
- [x] Build de producción exitoso (`npm run build`)
- [ ] **PASO MANUAL REQUERIDO:** Crear proyecto Supabase + `.env` + ejecutar schema SQL

### Sprint 1 ✅ COMPLETO
- Auth, Setup Wizard, Login, RoleSelector, rutas protegidas, layout

### Sprint 2 ✅ COMPLETO
- POSPage, ProductSearch (debounced + barcode), Cart, CartItem
- CustomerSelector con creación y edición rápida desde el POS
- PaymentModal (multi-método), PinSwitchModal, CashSessionModal, SaleSuccessModal
- salesService (createSale, searchProducts, searchCustomers)
- cashSessionService (open/close/totals)
- useCartStore (Zustand, IVA logic)
- useCashSession hook
- sprint2_functions.sql: RLS + decrement_stock + increment_customer_balance

### Sprint 3 ✅ COMPLETO
- **SQL:** supabase/sprint3_functions.sql → increment_stock + transfer_stock (EJECUTAR MANUALMENTE)
- **Shared:** Modal, Badge, ConfirmDialog; index.css añade .field-error .checkbox-base
- **Stock module** (src/modules/stock/):
  - services/productService.js — CRUD productos + categorías
  - services/movementService.js — stock levels, getProductStock, transfer, adjust, receive, history
  - components/StockPage.jsx — tabs: Productos | Categorías | Niveles stock | Movimientos
  - components/ProductsTab.jsx — tabla ABM con búsqueda/filtro + acciones
  - components/ProductFormModal.jsx — crear/editar producto (todos los campos)
  - components/CategoriesTab.jsx — ABM categorías
  - components/StockLevelsTab.jsx — niveles por ubicación + alertas stock bajo
  - components/MovementsTab.jsx — historial de movimientos
  - components/TransferModal.jsx — traslado Depósito→Estantería
  - components/AdjustmentModal.jsx — ajuste manual con motivo obligatorio
- **Suppliers module** (src/modules/suppliers/):
  - services/supplierService.js — CRUD proveedores
  - services/purchaseService.js — notas de pedido + órdenes de compra + recepción
  - components/SuppliersPage.jsx — tabs: Proveedores | Notas | OC
  - components/SuppliersTab.jsx + SupplierFormModal.jsx
  - components/PurchaseNotesTab.jsx — flujo draft→submitted→approved→converted
  - components/PurchaseNoteFormModal.jsx — líneas con useFieldArray
  - components/PurchaseOrdersTab.jsx — crear/confirmar/recibir OC
  - components/PurchaseOrderFormModal.jsx — directo o desde nota
  - components/ReceiveOrderModal.jsx — cantidades recibidas → increment_stock

### Sprint 4 ✅ COMPLETO
- **Shared:** src/shared/utils/exporters.js → exportToExcel (xlsx) + exportToPDF (jspdf-autotable)
- **Supabase admin client:** src/supabase/adminClient.js → usa VITE_SUPABASE_SERVICE_KEY (opcional)
- **Admin module** (src/modules/admin/):
  - services/adminService.js — getUsers, getRoles, createUser (vía adminClient), updateUser,
    toggleUserActive, getSettings, saveSettings, getDashboardStats
  - components/DashboardPage.jsx — KPIs del día: ventas/recaudado/stock bajo/deudores + cajas abiertas
  - components/UsersPage.jsx — tabla de usuarios con roles, ABM completo
  - components/UserFormModal.jsx — crear/editar usuario + asignación de roles; aviso si falta service key
  - components/SettingsPage.jsx — nombre, CUIT, dirección, condición fiscal, pie de ticket
- **Reports module** (src/modules/reports/):
  - services/reportsService.js — getSalesReport, getSalesSummary, getCashReport, getStockReport
  - components/ReportsPage.jsx — tabs: Ventas | Caja | Stock
  - components/SalesReportTab.jsx — filtro por rango de fechas, resumen por método de pago, export Excel+PDF
  - components/CashReportTab.jsx — historial de sesiones de caja, export Excel
  - components/StockAlertTab.jsx — productos bajo mínimo/sin stock, filtro, export Excel
- **Router:** todas las rutas placeholder reemplazadas por páginas reales
- **Nota:** Crear usuarios requiere VITE_SUPABASE_SERVICE_KEY en .env (Supabase Dashboard → Project Settings → API)

### Sprint 5 ✅ COMPLETO
- **Devoluciones module:**
  - src/modules/pos/services/returnsService.js — getSaleByNumber, getPreviousReturns, createReturn
  - createReturn: inserta returns + return_items, restaura stock vía increment_stock + stock_movements tipo 'devolucion', ajusta current_balance si hubo pago en cuenta
  - src/modules/reports/components/ReturnsTab.jsx — buscar venta por número, seleccionar ítems/cantidades, motivo obligatorio, muestra cantidades ya devueltas
  - ReportsPage.jsx — tab "Devoluciones" agregado (4 tabs en total)

### Sprint 6 ✅ COMPLETO
- **Descuentos module:**
  - src/modules/admin/services/discountService.js — CRUD + getActiveDiscounts()
  - src/modules/admin/components/DiscountsPage.jsx — tabla ABM con toggle activo/inactivo
  - src/modules/admin/components/DiscountFormModal.jsx — form dinámico por tipo
  - Tipos: product (% sobre producto), category (% sobre categoría), quantity_rule (3x2 etc.), percentage_total, fixed_total
- **Integración POS:**
  - useCartStore.js — discounts[] state + setDiscounts(); addItem/updateQuantity aplican automáticamente product/category/quantity_rule
  - POSPage.jsx — carga getActiveDiscounts() al montar y llama setDiscounts()
- **Navegación:** AppLayout agrega "Descuentos" (admin+superadmin); router agrega /admin/discounts

### Sprint 7 ✅ COMPLETO
- **Módulo Clientes** (src/modules/customers/):
  - services/customerService.js — getCustomers, createCustomer, updateCustomer, toggleCustomerActive, registerPayment (reduce balance vía increment_customer_balance negativo), getCustomerSales
  - components/CustomersPage.jsx — tabla con KPIs (total clientes / deudores / monto adeudado), búsqueda debounced, toggle activo, editar, registrar pago de deuda (ícono Wallet visible solo si hay saldo)
  - components/CustomerFormModal.jsx — form completo: nombre, documento, contacto, dirección, límite de crédito, descuento especial
  - components/PayDebtModal.jsx — registrar abono: monto (validado contra saldo actual), método de pago, muestra saldo restante en tiempo real
- **Navegación:** AppLayout agrega "Clientes" (admin+superadmin) entre Proveedores y Reportes; router agrega /customers dentro del RoleGuard admin

### Sprint 8 ✅ COMPLETO
- **Impresión de tickets/comprobantes:**
  - src/modules/pos/services/salesService.js — getSaleForPrint(id): venta completa con items, pagos, cliente y cajero (cashier query separada para evitar FK ambigua)
  - src/modules/pos/utils/ticketPrinter.js — buildTicketHtml(sale, settings): genera HTML para papel térmico 80mm; printTicket(saleId): fetches sale + app_settings en paralelo, abre ventana emergente y ejecuta window.print()
  - Formato: encabezado con razón social/CUIT/dirección/condición fiscal (desde app_settings), líneas de ítems con descuento individual, totales, desglose de métodos de pago, pie de comprobante
  - SaleSuccessModal.jsx — agrega botón "Imprimir" (pausa auto-cierre mientras imprime, lo reinicia al terminar)
  - SalesReportTab.jsx — columna de ícono impresora en cada fila para reimprimir cualquier venta pasada

### Sprint 9 ✅ COMPLETO
- **Historial de compras del cliente:**
  - src/modules/customers/components/CustomerHistoryModal.jsx — modal que carga getCustomerSales(id, 30), muestra KPIs (cantidad + total comprado) y tabla de ventas con fecha, nro, tipo, métodos de pago, total
  - CustomersPage.jsx — botón "Ver historial" (ícono History) en cada fila; abre CustomerHistoryModal
- **Reporte Deudores:**
  - src/modules/reports/components/DebtorsTab.jsx — filtra getCustomers a current_balance > 0, 4 KPIs (deudores / total / promedio / superan límite), tabla sortable por nombre o monto, export Excel + PDF
  - ReportsPage.jsx — 5° tab "Deudores" con ícono Users
- **OC en PDF:**
  - PurchaseOrdersTab.jsx — printOrderPdf(id): carga getPurchaseOrderById, genera PDF con jsPDF-autotable (producto, SKU, cant., precio, subtotal), título incluye nro. de OC y proveedor; botón FileText en cada fila

### Sprint 10 ✅ COMPLETO — Vencimientos de productos
- **movementService.js** — `receiveGoods()` acepta `expiryDate` opcional; nuevo `getExpiryAlerts()`: filtra `stock_movements` tipo 'compra' con `expiry_date`, retorna estado 'expired'|'critical'|'warning'|'ok'
- **purchaseService.js** — `receivePurchaseOrder` pasa `expiryDate` por ítem a `receiveGoods`
- **ReceiveOrderModal.jsx** — estado `expiryDates`, campo de fecha por producto en la grilla de recepción
- **ExpiryTab.jsx** (nuevo) — chips de filtro por estado, tabla con días restantes y badge de estado
- **StockPage.jsx** — tab "Vencimientos" (admin/repositor), ícono Calendar

### Sprint 11 ✅ COMPLETO — Paginación
- **Pagination.jsx** (nuevo, shared) — componente reutilizable con selector de tamaño de página y elipsis
- **ProductsTab.jsx** — paginación cliente (20/pág por defecto), resetea al cambiar filtros
- **MovementsTab.jsx** — filtro por tipo + paginación (50/pág, carga hasta 500 registros)
- **SalesReportTab.jsx** — paginación en resultados de búsqueda (50/pág), resetea al buscar

### Sprint 12 ✅ COMPLETO — Dashboard con gráficos
- **recharts** instalado (^3.8.1)
- **adminService.js** — `getWeeklySales()`: últimas 7 fechas → ventas + recaudado agrupado por día
- **DashboardPage.jsx** — dos gráficos responsivos: AreaChart (recaudado 7 días) + BarChart (cantidad de ventas 7 días); paleta verde `#22c55e`; tooltip formateado

### Nota: Sprint PIN switch (cambio rápido cajero)
- Ya estaba 100% implementado desde Sprint 2: `PinSwitchModal.jsx`, `verifyPin()` en `authService.js`, botón "Cambiar cajero" en `POSPage.jsx`.

## ESTADO ACTUAL: Sprints 10-12 completos ✅
