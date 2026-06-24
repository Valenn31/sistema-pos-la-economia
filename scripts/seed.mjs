/**
 * seed.mjs — Carga datos de prueba realistas en la base de datos.
 * Ejecutar: node scripts/seed.mjs
 * O doble click en: scripts/cargar-datos.bat
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dirname, '..', '.env')
const env = {}
readFileSync(envPath, 'utf-8').split('\n').forEach(line => {
  const [k, v] = line.split('=')
  if (k && v && !k.startsWith('#')) env[k.trim()] = v.trim()
})

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_SERVICE_KEY)

async function seed() {
  console.log('🌱 Iniciando carga de datos de prueba...\n')

  // Leer usuario existente
  const { data: profiles } = await supabase.from('profiles').select('id, full_name')
  const userId = profiles?.[0]?.id
  if (!userId) { console.error('❌ No hay usuarios. Hacé el setup primero.'); process.exit(1) }
  console.log(`👤 Usuario: ${profiles[0].full_name}`)

  // Limpiar datos anteriores (en orden por dependencias FK)
  console.log('🧹 Limpiando datos anteriores...')
  const tables = [
    'customer_payments', 'return_items', 'returns',
    'sale_items', 'sale_payments', 'sales',
    'stock_movements', 'stock',
    'purchase_order_items', 'purchase_orders',
    'purchase_note_items', 'purchase_notes',
    'product_suppliers', 'discounts',
    'products', 'categories',
    'customers', 'suppliers', 'cash_sessions',
  ]
  for (const t of tables) {
    await supabase.from(t).delete().neq('id', '00000000-0000-0000-0000-000000000000')
  }
  console.log('✅ Base limpia\n')

  // ── Categorías ──────────────────────────────────────────────
  const cats = [
    { name: 'Almacén', description: 'Productos secos y enlatados' },
    { name: 'Bebidas', description: 'Gaseosas, aguas, jugos y cervezas' },
    { name: 'Lácteos', description: 'Leches, yogures, quesos y mantecas' },
    { name: 'Fiambrería', description: 'Fiambres, embutidos y quesos especiales' },
    { name: 'Panadería', description: 'Pan, facturas y productos de horno' },
    { name: 'Limpieza', description: 'Productos de limpieza del hogar' },
    { name: 'Higiene personal', description: 'Jabones, shampoos y cuidado personal' },
    { name: 'Congelados', description: 'Productos congelados y helados' },
    { name: 'Frutas y verduras', description: 'Productos frescos de verdulería' },
    { name: 'Golosinas', description: 'Caramelos, chocolates y snacks' },
  ]
  const { data: catData } = await supabase.from('categories').insert(cats).select()
  const catMap = {}; catData.forEach(c => catMap[c.name] = c.id)
  console.log(`📦 ${catData.length} categorías`)

  // ── Productos ───────────────────────────────────────────────
  const prods = [
    { name: 'Arroz Gallo Oro 1kg', sku: 'ALM-001', barcode: '7790040100015', price_cost: 1200, price_sell: 1890, category_id: catMap['Almacén'], iva_rate: 21, iva_included: true },
    { name: 'Fideos Matarazzo Spaghetti 500g', sku: 'ALM-002', barcode: '7790040200012', price_cost: 800, price_sell: 1350, category_id: catMap['Almacén'], iva_rate: 21, iva_included: true },
    { name: 'Aceite Cocinero Girasol 1.5L', sku: 'ALM-003', barcode: '7790040300019', price_cost: 2500, price_sell: 3690, category_id: catMap['Almacén'], iva_rate: 21, iva_included: true },
    { name: 'Azúcar Ledesma 1kg', sku: 'ALM-004', barcode: '7790040400016', price_cost: 900, price_sell: 1490, category_id: catMap['Almacén'], iva_rate: 21, iva_included: true },
    { name: 'Harina Pureza 000 1kg', sku: 'ALM-005', barcode: '7790040500013', price_cost: 600, price_sell: 990, category_id: catMap['Almacén'], iva_rate: 21, iva_included: true },
    { name: 'Sal Celusal Fina 500g', sku: 'ALM-006', barcode: '7790040600010', price_cost: 300, price_sell: 590, category_id: catMap['Almacén'], iva_rate: 21, iva_included: true },
    { name: 'Atún La Campagnola 170g', sku: 'ALM-007', barcode: '7790040700017', price_cost: 1800, price_sell: 2790, category_id: catMap['Almacén'], iva_rate: 21, iva_included: true },
    { name: 'Yerba Taragüí 1kg', sku: 'ALM-008', barcode: '7790040800014', price_cost: 3500, price_sell: 5290, category_id: catMap['Almacén'], iva_rate: 21, iva_included: true },
    { name: 'Coca-Cola 2.25L', sku: 'BEB-001', barcode: '7790895000508', price_cost: 2000, price_sell: 3190, category_id: catMap['Bebidas'], iva_rate: 21, iva_included: true },
    { name: 'Sprite 2.25L', sku: 'BEB-002', barcode: '7790895000515', price_cost: 1900, price_sell: 2990, category_id: catMap['Bebidas'], iva_rate: 21, iva_included: true },
    { name: 'Agua Villavicencio 2L', sku: 'BEB-003', barcode: '7790895000522', price_cost: 800, price_sell: 1390, category_id: catMap['Bebidas'], iva_rate: 21, iva_included: true },
    { name: 'Cerveza Quilmes 1L', sku: 'BEB-004', barcode: '7790895000539', price_cost: 1500, price_sell: 2490, category_id: catMap['Bebidas'], iva_rate: 21, iva_included: true },
    { name: 'Fernet Branca 750ml', sku: 'BEB-005', barcode: '7790895000546', price_cost: 8000, price_sell: 12900, category_id: catMap['Bebidas'], iva_rate: 21, iva_included: true },
    { name: 'Leche La Serenísima 1L', sku: 'LAC-001', barcode: '7790001000019', price_cost: 900, price_sell: 1490, category_id: catMap['Lácteos'], iva_rate: 10.5, iva_included: true },
    { name: 'Yogur La Serenísima Firme 190g', sku: 'LAC-002', barcode: '7790001000026', price_cost: 500, price_sell: 890, category_id: catMap['Lácteos'], iva_rate: 10.5, iva_included: true },
    { name: 'Queso Cremoso La Paulina 1kg', sku: 'LAC-003', barcode: '7790001000033', price_cost: 5000, price_sell: 7990, category_id: catMap['Lácteos'], iva_rate: 10.5, iva_included: true, unit_of_measure: 'kg' },
    { name: 'Manteca La Serenísima 200g', sku: 'LAC-004', barcode: '7790001000040', price_cost: 1200, price_sell: 1990, category_id: catMap['Lácteos'], iva_rate: 10.5, iva_included: true },
    { name: 'Dulce de Leche La Serenísima 400g', sku: 'LAC-005', barcode: '7790001000057', price_cost: 1800, price_sell: 2890, category_id: catMap['Lácteos'], iva_rate: 21, iva_included: true },
    { name: 'Lavandina Ayudín 2L', sku: 'LIM-001', barcode: '7790200100018', price_cost: 600, price_sell: 990, category_id: catMap['Limpieza'], iva_rate: 21, iva_included: true },
    { name: 'Detergente Magistral 500ml', sku: 'LIM-002', barcode: '7790200200015', price_cost: 1200, price_sell: 1890, category_id: catMap['Limpieza'], iva_rate: 21, iva_included: true },
    { name: 'Jabón en Polvo Skip 800g', sku: 'LIM-003', barcode: '7790200300012', price_cost: 2500, price_sell: 3990, category_id: catMap['Limpieza'], iva_rate: 21, iva_included: true },
    { name: 'Papel Higiénico Elegante x4', sku: 'LIM-004', barcode: '7790200400019', price_cost: 1500, price_sell: 2490, category_id: catMap['Limpieza'], iva_rate: 21, iva_included: true },
    { name: 'Suavizante Vivere 900ml', sku: 'LIM-005', barcode: '7790200500016', price_cost: 1800, price_sell: 2790, category_id: catMap['Limpieza'], iva_rate: 21, iva_included: true },
    { name: 'Jabón Lux x3', sku: 'HIG-001', barcode: '7790300100015', price_cost: 800, price_sell: 1390, category_id: catMap['Higiene personal'], iva_rate: 21, iva_included: true },
    { name: 'Shampoo Sedal 340ml', sku: 'HIG-002', barcode: '7790300200012', price_cost: 2000, price_sell: 3290, category_id: catMap['Higiene personal'], iva_rate: 21, iva_included: true },
    { name: 'Desodorante Rexona 150ml', sku: 'HIG-003', barcode: '7790300300019', price_cost: 2500, price_sell: 3990, category_id: catMap['Higiene personal'], iva_rate: 21, iva_included: true },
    { name: 'Pasta Dental Colgate 120g', sku: 'HIG-004', barcode: '7790300400016', price_cost: 1500, price_sell: 2490, category_id: catMap['Higiene personal'], iva_rate: 21, iva_included: true },
    { name: 'Milanesas de Pollo Granja del Sol x4', sku: 'CON-001', barcode: '7790400100012', price_cost: 3000, price_sell: 4890, category_id: catMap['Congelados'], iva_rate: 21, iva_included: true },
    { name: 'Papas McCain Noisettes 400g', sku: 'CON-002', barcode: '7790400200019', price_cost: 2000, price_sell: 3290, category_id: catMap['Congelados'], iva_rate: 21, iva_included: true },
    { name: 'Helado Frigor 1L', sku: 'CON-003', barcode: '7790400300016', price_cost: 4000, price_sell: 6490, category_id: catMap['Congelados'], iva_rate: 21, iva_included: true },
    { name: 'Chocolatín Bon o Bon x6', sku: 'GOL-001', barcode: '7790500100019', price_cost: 1500, price_sell: 2490, category_id: catMap['Golosinas'], iva_rate: 21, iva_included: true },
    { name: 'Galletitas Oreo 117g', sku: 'GOL-002', barcode: '7790500200016', price_cost: 700, price_sell: 1190, category_id: catMap['Golosinas'], iva_rate: 21, iva_included: true },
    { name: 'Papas Lays Clásicas 150g', sku: 'GOL-003', barcode: '7790500300013', price_cost: 1800, price_sell: 2890, category_id: catMap['Golosinas'], iva_rate: 21, iva_included: true },
    { name: 'Alfajor Havanna x6', sku: 'GOL-004', barcode: '7790500400010', price_cost: 5000, price_sell: 7990, category_id: catMap['Golosinas'], iva_rate: 21, iva_included: true },
    { name: 'Chicles Beldent x10', sku: 'GOL-005', barcode: '7790500500017', price_cost: 500, price_sell: 890, category_id: catMap['Golosinas'], iva_rate: 21, iva_included: true },
    { name: 'Pan Lactal Bimbo 480g', sku: 'PAN-001', barcode: '7790600100016', price_cost: 1200, price_sell: 1990, category_id: catMap['Panadería'], iva_rate: 10.5, iva_included: true },
    { name: 'Galletitas Crackers Traviata 300g', sku: 'PAN-002', barcode: '7790600200013', price_cost: 600, price_sell: 990, category_id: catMap['Panadería'], iva_rate: 21, iva_included: true },
    { name: 'Tapas de Empanada La Salteña x12', sku: 'PAN-003', barcode: '7790600300010', price_cost: 1500, price_sell: 2390, category_id: catMap['Panadería'], iva_rate: 21, iva_included: true },
    { name: 'Papa x kg', sku: 'FRU-001', price_cost: 500, price_sell: 890, category_id: catMap['Frutas y verduras'], iva_rate: 0, iva_included: true, unit_of_measure: 'kg' },
    { name: 'Cebolla x kg', sku: 'FRU-002', price_cost: 600, price_sell: 990, category_id: catMap['Frutas y verduras'], iva_rate: 0, iva_included: true, unit_of_measure: 'kg' },
    { name: 'Tomate x kg', sku: 'FRU-003', price_cost: 1000, price_sell: 1690, category_id: catMap['Frutas y verduras'], iva_rate: 0, iva_included: true, unit_of_measure: 'kg' },
    { name: 'Banana x kg', sku: 'FRU-004', price_cost: 800, price_sell: 1390, category_id: catMap['Frutas y verduras'], iva_rate: 0, iva_included: true, unit_of_measure: 'kg' },
    { name: 'Manzana Roja x kg', sku: 'FRU-005', price_cost: 1200, price_sell: 1990, category_id: catMap['Frutas y verduras'], iva_rate: 0, iva_included: true, unit_of_measure: 'kg' },
    { name: 'Lechuga x unidad', sku: 'FRU-006', price_cost: 400, price_sell: 790, category_id: catMap['Frutas y verduras'], iva_rate: 0, iva_included: true },
  ]
  const { data: prodData, error: prodErr } = await supabase.from('products').insert(
    prods.map(p => {
      const catName = Object.entries(catMap).find(([,v]) => v === p.category_id)?.[0] ?? ''
      return { ...p, is_active: true, min_stock: Math.floor(Math.random() * 5) + 3,
        has_expiry: ['Lácteos','Panadería','Congelados'].includes(catName),
        unit_of_measure: p.unit_of_measure ?? 'unidad' }
    })
  ).select()
  if (prodErr) { console.error('❌ Error productos:', prodErr.message); process.exit(1) }
  console.log(`🛒 ${prodData.length} productos`)

  // ── Stock ───────────────────────────────────────────────────
  const { data: locs } = await supabase.from('locations').select('id, name')
  const estanteria = locs.find(l => l.name === 'En Estantería')
  const deposito = locs.find(l => l.name === 'Depósito')
  await supabase.from('stock').upsert(prodData.flatMap(p => [
    { product_id: p.id, location_id: estanteria.id, quantity: Math.floor(Math.random() * 40) + 10 },
    { product_id: p.id, location_id: deposito.id, quantity: Math.floor(Math.random() * 100) + 20 },
  ]), { onConflict: 'product_id,location_id' })
  console.log(`📊 Stock cargado`)

  // ── Clientes ────────────────────────────────────────────────
  const { data: custData, error: custErr } = await supabase.from('customers').insert([
    { full_name: 'María García', document_type: 'DNI', document_number: '25678432', phone: '3415551001', email: 'maria.garcia@email.com', credit_limit: 50000, discount_percent: 5, current_balance: 0 },
    { full_name: 'Carlos Rodríguez', document_type: 'DNI', document_number: '30456789', phone: '3415552002', credit_limit: 30000, discount_percent: 0, current_balance: 0 },
    { full_name: 'Ana López', document_type: 'DNI', document_number: '28901234', phone: '3415553003', email: 'ana.lopez@email.com', credit_limit: 80000, discount_percent: 10, current_balance: 0 },
    { full_name: 'Jorge Martínez', document_type: 'DNI', document_number: '35678901', phone: '3415554004', credit_limit: 20000, discount_percent: 0, current_balance: 0 },
    { full_name: 'Laura Fernández', document_type: 'DNI', document_number: '27345678', phone: '3415555005', email: 'laura.f@email.com', credit_limit: 100000, discount_percent: 0, current_balance: 0 },
    { full_name: 'Roberto Díaz', document_type: 'DNI', document_number: '32109876', phone: '3415556006', credit_limit: 15000, discount_percent: 0, current_balance: 0 },
    { full_name: 'Lucía Pérez', document_type: 'DNI', document_number: '29876543', phone: '3415557007', credit_limit: 0, discount_percent: 0, current_balance: 0 },
    { full_name: 'Marcelo Sánchez', document_type: 'CUIT', document_number: '20-33456789-0', phone: '3415558008', credit_limit: 200000, discount_percent: 15, current_balance: 0 },
  ]).select()
  if (custErr) { console.error('❌ Error clientes:', custErr.message); process.exit(1) }
  console.log(`👥 ${custData.length} clientes`)

  // ── Proveedores ─────────────────────────────────────────────
  const { data: suppData } = await supabase.from('suppliers').insert([
    { razon_social: 'Distribuidora del Litoral S.A.', cuit: '30-71234567-8', phone: '3415001001', email: 'ventas@dellitoral.com', payment_condition: '30 días', delivery_days: 3 },
    { razon_social: 'Alimentos del Sur SRL', cuit: '30-72345678-9', phone: '3415002002', email: 'pedidos@alimentosdelsur.com', payment_condition: '15 días', delivery_days: 2 },
    { razon_social: 'Coca-Cola FEMSA', cuit: '30-50000001-0', phone: '0800-222-2652', payment_condition: 'Contado', delivery_days: 1 },
    { razon_social: 'Lácteos La Serenísima', cuit: '30-50000002-1', phone: '0800-222-7373', payment_condition: '7 días', delivery_days: 1 },
    { razon_social: 'Limpieza Total SRL', cuit: '30-73456789-0', phone: '3415003003', payment_condition: '30 días', delivery_days: 5 },
    { razon_social: 'Fruver Rosario', cuit: '20-34567890-1', phone: '3415004004', payment_condition: 'Contado', delivery_days: 1 },
  ]).select()
  console.log(`🚚 ${suppData.length} proveedores`)

  // ── Caja + Ventas ───────────────────────────────────────────
  const { data: registers } = await supabase.from('cash_registers').select('id').eq('is_active', true).limit(1)
  if (!registers?.length) { console.log('⚠️ No hay cajas'); return }
  const { data: session } = await supabase.from('cash_sessions').insert({
    register_id: registers[0].id, opened_by: userId, opening_amount: 5000, status: 'open'
  }).select().single()
  console.log(`💰 Caja abierta`)

  const methods = ['efectivo', 'debito', 'credito', 'qr', 'transferencia']
  for (let i = 0; i < 15; i++) {
    const numItems = Math.floor(Math.random() * 5) + 1
    const saleItems = []; const used = new Set()
    for (let j = 0; j < numItems; j++) {
      let p; do { p = prodData[Math.floor(Math.random() * prodData.length)] } while (used.has(p.id))
      used.add(p.id)
      const qty = Math.floor(Math.random() * 3) + 1
      saleItems.push({ product: p, quantity: qty, unitPrice: p.price_sell, subtotal: p.price_sell * qty })
    }
    const total = saleItems.reduce((s, it) => s + it.subtotal, 0)
    const isCuenta = i < 3
    const customer = isCuenta ? custData[i] : (Math.random() > 0.5 ? custData[Math.floor(Math.random() * custData.length)] : null)
    const method = isCuenta ? 'cuenta' : methods[Math.floor(Math.random() * methods.length)]

    const { data: sale } = await supabase.from('sales').insert({
      session_id: session.id, register_id: registers[0].id, cashier_id: userId,
      customer_id: customer?.id ?? null, subtotal: total, discount_total: 0,
      iva_total: Math.round(total * 21 / 121 * 100) / 100, total, receipt_type: 'ticket', status: 'completed',
    }).select().single()
    await supabase.from('sale_items').insert(saleItems.map(it => ({
      sale_id: sale.id, product_id: it.product.id, quantity: it.quantity,
      unit_price: it.unitPrice, iva_rate: it.product.iva_rate, discount_amount: 0, subtotal: it.subtotal,
    })))
    await supabase.from('sale_payments').insert({ sale_id: sale.id, method, amount: total })
    if (isCuenta && customer) {
      const { data: c } = await supabase.from('customers').select('current_balance').eq('id', customer.id).single()
      await supabase.from('customers').update({ current_balance: (Number(c.current_balance) || 0) + total }).eq('id', customer.id)
    }
  }
  console.log(`🧾 15 ventas`)

  // ── Pagos parciales ─────────────────────────────────────────
  for (let i = 0; i < 2; i++) {
    const { data: c } = await supabase.from('customers').select('current_balance').eq('id', custData[i].id).single()
    const bal = Number(c.current_balance) || 0
    if (bal > 0) {
      const pay = Math.round(bal * 0.4 * 100) / 100
      await supabase.from('customer_payments').insert({ customer_id: custData[i].id, amount: pay, method: 'efectivo', user_id: userId })
      await supabase.from('customers').update({ current_balance: Math.round((bal - pay) * 100) / 100 }).eq('id', custData[i].id)
      console.log(`💳 ${custData[i].full_name} pagó $${pay}`)
    }
  }

  // ── Descuentos ──────────────────────────────────────────────
  await supabase.from('discounts').insert([
    { name: 'Promo Yerba', type: 'product', value: 10, product_id: prodData.find(p => p.sku === 'ALM-008')?.id, is_active: true },
    { name: '5% Lácteos', type: 'category', value: 5, category_id: catMap['Lácteos'], is_active: true },
    { name: '3x2 Galletitas Oreo', type: 'quantity_rule', min_quantity: 3, free_quantity: 1, product_id: prodData.find(p => p.sku === 'GOL-002')?.id, is_active: true },
  ])
  console.log(`🏷️ 3 descuentos`)

  // ── Nota de pedido ──────────────────────────────────────────
  const { data: note } = await supabase.from('purchase_notes').insert({
    supplier_id: suppData[0].id, notes: 'Pedido semanal de almacén', created_by: userId, status: 'submitted',
  }).select().single()
  await supabase.from('purchase_note_items').insert([
    { note_id: note.id, product_id: prodData.find(p => p.sku === 'ALM-001').id, quantity_requested: 50, unit_price: 1200 },
    { note_id: note.id, product_id: prodData.find(p => p.sku === 'ALM-003').id, quantity_requested: 20, unit_price: 2500 },
    { note_id: note.id, product_id: prodData.find(p => p.sku === 'ALM-008').id, quantity_requested: 30, unit_price: 3500 },
  ])
  console.log(`📋 1 nota de pedido`)

  console.log('\n🎉 ¡Datos de prueba cargados exitosamente!')
}

seed().catch(e => { console.error('❌ Error:', e.message); process.exit(1) })
