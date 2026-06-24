/**
 * reset-setup.mjs — Reinicia el sistema completo para mostrar el setup desde cero.
 * Borra TODOS los datos incluyendo usuarios, roles asignados y configuración.
 * Al entrar al sistema va a pedir el wizard de configuración inicial.
 * Ejecutar: node scripts/reset-setup.mjs
 * O doble click en: scripts/reset-setup.bat
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

async function reset() {
  console.log('🔄 Reiniciando sistema completo...\n')
  console.log('⚠️  ESTO BORRA TODO: datos, usuarios y configuración.\n')

  // 1. Borrar datos en orden de dependencias FK
  const dataTables = [
    'customer_payments', 'return_items', 'returns',
    'sale_items', 'sale_payments', 'sales',
    'stock_movements', 'stock',
    'purchase_order_items', 'purchase_orders',
    'purchase_note_items', 'purchase_notes',
    'product_suppliers', 'discounts',
    'products', 'categories',
    'customers', 'suppliers', 'cash_sessions',
  ]
  for (const t of dataTables) {
    await supabase.from(t).delete().neq('id', '00000000-0000-0000-0000-000000000000')
  }
  console.log('  ✅ Datos borrados')

  // 2. Borrar asignaciones de roles y perfiles
  await supabase.from('user_roles').delete().neq('user_id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('profiles').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  console.log('  ✅ Perfiles y roles de usuario borrados')

  // 3. Borrar usuarios de Supabase Auth
  const { data: authUsers } = await supabase.auth.admin.listUsers()
  if (authUsers?.users?.length) {
    for (const u of authUsers.users) {
      await supabase.auth.admin.deleteUser(u.id)
    }
    console.log(`  ✅ ${authUsers.users.length} usuario(s) de Auth eliminados`)
  }

  // 4. Resetear setup_completed a false
  await supabase.from('app_settings').upsert({ key: 'setup_completed', value: 'false' }, { onConflict: 'key' })
  // Limpiar config del negocio
  const configKeys = ['business_name', 'cuit', 'address', 'fiscal_condition', 'receipt_footer', 'paper_width']
  for (const key of configKeys) {
    await supabase.from('app_settings').delete().eq('key', key)
  }
  console.log('  ✅ Configuración reseteada')

  console.log('\n🎉 Sistema reseteado. Al entrar va a mostrar el wizard de configuración inicial.')
}

reset().catch(e => { console.error('❌ Error:', e.message); process.exit(1) })
