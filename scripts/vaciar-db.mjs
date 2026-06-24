/**
 * vaciar-db.mjs — Vacía TODOS los datos de la base de datos.
 * Mantiene las ubicaciones (Depósito, En Estantería), los roles y los usuarios.
 * Ejecutar: node scripts/vaciar-db.mjs
 * O doble click en: scripts/vaciar-datos.bat
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

async function vaciar() {
  console.log('🗑️  Vaciando base de datos...\n')

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
    const { error } = await supabase.from(t).delete().neq('id', '00000000-0000-0000-0000-000000000000')
    if (error) console.error(`  ⚠️  ${t}: ${error.message}`)
    else console.log(`  ✅ ${t} vaciada`)
  }

  console.log('\n🧹 Base de datos vaciada.')
  console.log('   Se mantuvieron: usuarios, roles, ubicaciones y configuración.')
}

vaciar().catch(e => { console.error('❌ Error:', e.message); process.exit(1) })
