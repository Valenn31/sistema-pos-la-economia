-- =====================================================================
-- SCHEMA — Sistema POS La Economía
-- Ejecutar en el SQL Editor de Supabase Dashboard
-- Orden: respetar las dependencias entre tablas (FK)
-- =====================================================================

-- ── 1. EXTENSIONES ──────────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ── 2. PERFILES Y ROLES ─────────────────────────────────────────────

create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null,
  pin         varchar(4),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

create table if not exists roles (
  id    serial primary key,
  name  text unique not null  -- 'superadmin' | 'admin' | 'cajero' | 'repositor'
);

insert into roles (name) values
  ('superadmin'),
  ('admin'),
  ('cajero'),
  ('repositor')
on conflict (name) do nothing;

create table if not exists user_roles (
  id       serial primary key,
  user_id  uuid not null references profiles(id) on delete cascade,
  role_id  int  not null references roles(id)    on delete cascade,
  unique(user_id, role_id)
);

-- ── 3. CONFIGURACIÓN DE LA APP ──────────────────────────────────────

create table if not exists app_settings (
  key         text primary key,
  value       text,
  description text
);

-- ── 4. CATEGORÍAS DE PRODUCTOS ──────────────────────────────────────

create table if not exists categories (
  id          serial primary key,
  name        text not null,
  description text,
  created_at  timestamptz not null default now()
);

-- ── 5. PRODUCTOS ────────────────────────────────────────────────────

create table if not exists products (
  id              uuid primary key default gen_random_uuid(),
  sku             text unique,
  barcode         text,
  name            text not null,
  description     text,
  category_id     int  references categories(id) on delete set null,
  unit_of_measure text not null default 'unidad',
  price_cost      numeric(12,2),
  price_sell      numeric(12,2) not null,
  iva_rate        numeric(5,2)  not null default 21,
  iva_included    boolean       not null default true,
  min_stock       numeric(12,3) not null default 0,
  has_expiry      boolean       not null default false,
  is_active       boolean       not null default true,
  created_at      timestamptz   not null default now()
);

-- ── 6. UBICACIONES / DEPÓSITOS ──────────────────────────────────────

create table if not exists locations (
  id          serial primary key,
  name        text not null,
  description text,
  is_active   boolean not null default true
);

insert into locations (name, description) values
  ('Depósito',      'Almacén principal'),
  ('En Estantería', 'Sala de ventas')
on conflict do nothing;

-- ── 7. STOCK POR UBICACIÓN ──────────────────────────────────────────

create table if not exists stock (
  id          serial primary key,
  product_id  uuid not null references products(id)  on delete cascade,
  location_id int  not null references locations(id) on delete cascade,
  quantity    numeric(12,3) not null default 0,
  updated_at  timestamptz   not null default now(),
  unique(product_id, location_id)
);

create table if not exists stock_movements (
  id               uuid primary key default gen_random_uuid(),
  product_id       uuid not null references products(id),
  from_location_id int  references locations(id),
  to_location_id   int  references locations(id),
  quantity         numeric(12,3) not null,
  movement_type    text not null,
  -- 'venta' | 'compra' | 'ajuste' | 'traslado' | 'devolucion' | 'vencimiento'
  reference_id     uuid,
  reference_type   text,
  -- 'sale' | 'purchase_order' | 'return' | 'manual'
  user_id          uuid references profiles(id),
  expiry_date      date,
  notes            text,
  created_at       timestamptz not null default now()
);

-- ── 8. CLIENTES ─────────────────────────────────────────────────────

create table if not exists customers (
  id               uuid primary key default gen_random_uuid(),
  full_name        text not null,
  document_type    text,
  document_number  text,
  phone            text,
  email            text,
  address          text,
  credit_limit     numeric(12,2) not null default 0,
  current_balance  numeric(12,2) not null default 0,
  discount_percent numeric(5,2)  not null default 0,
  is_active        boolean       not null default true,
  created_at       timestamptz   not null default now()
);

-- Pagos / abonos de cuenta corriente (créditos). Junto con las ventas
-- pagadas con method='cuenta' (débitos) arma el estado de cuenta del
-- cliente — ver customerService.getAccountStatement().
create table if not exists customer_payments (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  amount      numeric(12,2) not null,
  method      text not null default 'efectivo',
  notes       text,
  user_id     uuid references profiles(id),
  created_at  timestamptz not null default now()
);

-- ── 9. DESCUENTOS CONFIGURABLES ─────────────────────────────────────

create table if not exists discounts (
  id            serial primary key,
  name          text not null,
  type          text not null,
  -- 'percentage_total' | 'fixed_total' | 'product' | 'category' | 'quantity_rule' | 'customer_discount'
  value         numeric(12,2),
  min_quantity  numeric(12,3),
  free_quantity numeric(12,3),
  product_id    uuid references products(id)    on delete cascade,
  category_id   int  references categories(id)  on delete cascade,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

-- ── 10. CAJAS Y TURNOS ──────────────────────────────────────────────

create table if not exists cash_registers (
  id        serial primary key,
  name      text not null,
  is_active boolean not null default true
);

insert into cash_registers (name) values ('Caja 1')
on conflict do nothing;

create table if not exists cash_sessions (
  id             uuid primary key default gen_random_uuid(),
  register_id    int  not null references cash_registers(id),
  opened_by      uuid not null references profiles(id),
  opening_amount numeric(12,2) not null,
  closing_amount numeric(12,2),
  opened_at      timestamptz   not null default now(),
  closed_at      timestamptz,
  status         text not null default 'open'
  -- 'open' | 'closed'
);

-- ── 11. VENTAS ──────────────────────────────────────────────────────

create table if not exists sales (
  id             uuid primary key default gen_random_uuid(),
  sale_number    bigint generated always as identity unique,
  register_id    int  references cash_registers(id),
  session_id     uuid references cash_sessions(id),
  cashier_id     uuid not null references profiles(id),
  customer_id    uuid references customers(id),
  subtotal       numeric(12,2) not null,
  discount_total numeric(12,2) not null default 0,
  iva_total      numeric(12,2) not null default 0,
  total          numeric(12,2) not null,
  receipt_type   text not null default 'ticket',
  -- 'ticket' | 'factura_a' | 'factura_b' | 'factura_c'
  notes          text,
  status         text not null default 'completed',
  -- 'completed' | 'cancelled'
  created_at     timestamptz not null default now()
);

create table if not exists sale_items (
  id              uuid primary key default gen_random_uuid(),
  sale_id         uuid not null references sales(id) on delete cascade,
  product_id      uuid not null references products(id),
  quantity        numeric(12,3) not null,
  unit_price      numeric(12,2) not null,
  iva_rate        numeric(5,2)  not null default 0,
  discount_amount numeric(12,2) not null default 0,
  subtotal        numeric(12,2) not null
);

create table if not exists sale_payments (
  id        uuid primary key default gen_random_uuid(),
  sale_id   uuid not null references sales(id) on delete cascade,
  method    text not null,
  -- 'efectivo' | 'debito' | 'credito' | 'qr' | 'transferencia' | 'cuenta'
  amount    numeric(12,2) not null,
  reference text
);

-- ── 12. DEVOLUCIONES ────────────────────────────────────────────────

create table if not exists returns (
  id         uuid primary key default gen_random_uuid(),
  sale_id    uuid not null references sales(id),
  user_id    uuid not null references profiles(id),
  total      numeric(12,2) not null,
  reason     text,
  created_at timestamptz not null default now()
);

create table if not exists return_items (
  id           uuid primary key default gen_random_uuid(),
  return_id    uuid not null references returns(id) on delete cascade,
  sale_item_id uuid references sale_items(id),
  product_id   uuid not null references products(id),
  quantity     numeric(12,3) not null,
  unit_price   numeric(12,2) not null,
  subtotal     numeric(12,2) not null
);

-- ── 13. PROVEEDORES ─────────────────────────────────────────────────

create table if not exists suppliers (
  id                uuid primary key default gen_random_uuid(),
  razon_social      text not null,
  cuit              text,
  phone             text,
  email             text,
  payment_condition text,
  delivery_days     int,
  is_active         boolean not null default true,
  created_at        timestamptz not null default now()
);

create table if not exists product_suppliers (
  id             serial primary key,
  product_id     uuid not null references products(id)   on delete cascade,
  supplier_id    uuid not null references suppliers(id)  on delete cascade,
  supplier_sku   text,
  purchase_price numeric(12,2),
  is_preferred   boolean not null default false,
  unique(product_id, supplier_id)
);

-- ── 14. NOTAS DE PEDIDO ─────────────────────────────────────────────

create table if not exists purchase_notes (
  id          uuid primary key default gen_random_uuid(),
  note_number bigint generated always as identity unique,
  supplier_id uuid not null references suppliers(id),
  created_by  uuid not null references profiles(id),
  status      text not null default 'draft',
  -- 'draft' | 'submitted' | 'approved' | 'rejected' | 'converted'
  notes       text,
  created_at  timestamptz not null default now()
);

create table if not exists purchase_note_items (
  id                 serial primary key,
  note_id            uuid          not null references purchase_notes(id) on delete cascade,
  product_id         uuid          not null references products(id),
  quantity_requested numeric(12,3) not null,
  unit_price         numeric(12,2)
);

-- ── 15. ÓRDENES DE COMPRA ───────────────────────────────────────────

create table if not exists purchase_orders (
  id            uuid primary key default gen_random_uuid(),
  order_number  bigint generated always as identity unique,
  supplier_id   uuid not null references suppliers(id),
  note_id       uuid references purchase_notes(id),
  created_by    uuid not null references profiles(id),
  status        text not null default 'pending',
  -- 'pending' | 'confirmed' | 'received' | 'cancelled'
  total_amount  numeric(12,2),
  expected_date date,
  notes         text,
  created_at    timestamptz not null default now()
);

create table if not exists purchase_order_items (
  id                serial primary key,
  order_id          uuid          not null references purchase_orders(id) on delete cascade,
  product_id        uuid          not null references products(id),
  quantity_ordered  numeric(12,3) not null,
  quantity_received numeric(12,3) not null default 0,
  unit_price        numeric(12,2) not null,
  subtotal          numeric(12,2) not null
);

-- ── 16. FUNCIÓN: actualizar updated_at automáticamente ──────────────

create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger stock_updated_at
  before update on stock
  for each row execute function update_updated_at();

-- ── 17. ROW LEVEL SECURITY ──────────────────────────────────────────
-- Habilitamos RLS en todas las tablas.
-- La política base: solo usuarios autenticados pueden leer/escribir.
-- Políticas granulares por rol se agregarán con Edge Functions o checks en el cliente.

alter table profiles         enable row level security;
alter table user_roles       enable row level security;
alter table app_settings     enable row level security;
alter table categories       enable row level security;
alter table products         enable row level security;
alter table locations        enable row level security;
alter table stock            enable row level security;
alter table stock_movements  enable row level security;
alter table customers        enable row level security;
alter table customer_payments enable row level security;
alter table discounts        enable row level security;
alter table cash_registers   enable row level security;
alter table cash_sessions    enable row level security;
alter table sales            enable row level security;
alter table sale_items       enable row level security;
alter table sale_payments    enable row level security;
alter table returns          enable row level security;
alter table return_items     enable row level security;
alter table suppliers        enable row level security;
alter table product_suppliers enable row level security;
alter table purchase_notes   enable row level security;
alter table purchase_note_items enable row level security;
alter table purchase_orders  enable row level security;
alter table purchase_order_items enable row level security;

-- Política genérica: solo usuarios autenticados (refinamos por tabla en Sprint 2+)
create policy "Autenticados pueden leer" on profiles         for select using (auth.role() = 'authenticated');
create policy "Autenticados pueden leer" on categories       for select using (auth.role() = 'authenticated');
create policy "Autenticados pueden leer" on products         for select using (auth.role() = 'authenticated');
create policy "Autenticados pueden leer" on locations        for select using (auth.role() = 'authenticated');
create policy "Autenticados pueden leer" on stock            for select using (auth.role() = 'authenticated');
create policy "Autenticados pueden leer" on stock_movements  for select using (auth.role() = 'authenticated');
create policy "Autenticados pueden leer" on customers        for select using (auth.role() = 'authenticated');
create policy "Autenticados pueden leer" on customer_payments for select using (auth.role() = 'authenticated');
create policy "Autenticados pueden leer" on discounts        for select using (auth.role() = 'authenticated');
create policy "Autenticados pueden leer" on cash_registers   for select using (auth.role() = 'authenticated');
create policy "Autenticados pueden leer" on cash_sessions    for select using (auth.role() = 'authenticated');
create policy "Autenticados pueden leer" on sales            for select using (auth.role() = 'authenticated');
create policy "Autenticados pueden leer" on sale_items       for select using (auth.role() = 'authenticated');
create policy "Autenticados pueden leer" on sale_payments    for select using (auth.role() = 'authenticated');
create policy "Autenticados pueden leer" on returns          for select using (auth.role() = 'authenticated');
create policy "Autenticados pueden leer" on return_items     for select using (auth.role() = 'authenticated');
create policy "Autenticados pueden leer" on suppliers        for select using (auth.role() = 'authenticated');
create policy "Autenticados pueden leer" on product_suppliers for select using (auth.role() = 'authenticated');
create policy "Autenticados pueden leer" on purchase_notes   for select using (auth.role() = 'authenticated');
create policy "Autenticados pueden leer" on purchase_note_items for select using (auth.role() = 'authenticated');
create policy "Autenticados pueden leer" on purchase_orders  for select using (auth.role() = 'authenticated');
create policy "Autenticados pueden leer" on purchase_order_items for select using (auth.role() = 'authenticated');
create policy "Autenticados pueden leer" on app_settings     for select using (auth.role() = 'authenticated');
create policy "Autenticados pueden leer" on user_roles       for select using (auth.role() = 'authenticated');

-- Escritura: autenticados pueden escribir en todas (el control granular lo hace la app)
create policy "Autenticados pueden escribir" on profiles         for all using (auth.role() = 'authenticated');
create policy "Autenticados pueden escribir" on user_roles       for all using (auth.role() = 'authenticated');
create policy "Autenticados pueden escribir" on app_settings     for all using (auth.role() = 'authenticated');
create policy "Autenticados pueden escribir" on categories       for all using (auth.role() = 'authenticated');
create policy "Autenticados pueden escribir" on products         for all using (auth.role() = 'authenticated');
create policy "Autenticados pueden escribir" on stock            for all using (auth.role() = 'authenticated');
create policy "Autenticados pueden escribir" on stock_movements  for all using (auth.role() = 'authenticated');
create policy "Autenticados pueden escribir" on customers        for all using (auth.role() = 'authenticated');
create policy "Autenticados pueden escribir" on customer_payments for all using (auth.role() = 'authenticated');
create policy "Autenticados pueden escribir" on discounts        for all using (auth.role() = 'authenticated');
create policy "Autenticados pueden escribir" on cash_registers   for all using (auth.role() = 'authenticated');
create policy "Autenticados pueden escribir" on cash_sessions    for all using (auth.role() = 'authenticated');
create policy "Autenticados pueden escribir" on sales            for all using (auth.role() = 'authenticated');
create policy "Autenticados pueden escribir" on sale_items       for all using (auth.role() = 'authenticated');
create policy "Autenticados pueden escribir" on sale_payments    for all using (auth.role() = 'authenticated');
create policy "Autenticados pueden escribir" on returns          for all using (auth.role() = 'authenticated');
create policy "Autenticados pueden escribir" on return_items     for all using (auth.role() = 'authenticated');
create policy "Autenticados pueden escribir" on suppliers        for all using (auth.role() = 'authenticated');
create policy "Autenticados pueden escribir" on product_suppliers for all using (auth.role() = 'authenticated');
create policy "Autenticados pueden escribir" on purchase_notes   for all using (auth.role() = 'authenticated');
create policy "Autenticados pueden escribir" on purchase_note_items for all using (auth.role() = 'authenticated');
create policy "Autenticados pueden escribir" on purchase_orders  for all using (auth.role() = 'authenticated');
create policy "Autenticados pueden escribir" on purchase_order_items for all using (auth.role() = 'authenticated');
create policy "Autenticados pueden escribir" on locations        for all using (auth.role() = 'authenticated');
