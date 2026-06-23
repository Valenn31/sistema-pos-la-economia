/**
 * adminClient.js — Cliente Supabase con service role key.
 * Requerido únicamente para crear usuarios desde el panel Admin.
 * La service key está en VITE_SUPABASE_SERVICE_KEY (.env).
 *
 * ⚠️  Esta key bypasea RLS. Usarla solo en operaciones admin confirmadas.
 */
import { createClient } from '@supabase/supabase-js'

const url     = import.meta.env.VITE_SUPABASE_URL
const svcKey  = import.meta.env.VITE_SUPABASE_SERVICE_KEY

export const adminSupabase = svcKey
  ? createClient(url, svcKey, { auth: { autoRefreshToken: false, persistSession: false } })
  : null

export const hasAdminClient = !!svcKey
