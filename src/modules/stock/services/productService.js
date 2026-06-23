/**
 * productService.js — CRUD de productos y categorías.
 */
import { supabase } from '@/supabase/client'

// ── Categorías ────────────────────────────────────────────────────────

export async function getCategories() {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name')
  if (error) throw error
  return data
}

export async function createCategory({ name, description }) {
  const { data, error } = await supabase
    .from('categories')
    .insert({ name, description: description || null })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateCategory(id, { name, description }) {
  const { data, error } = await supabase
    .from('categories')
    .update({ name, description: description || null })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteCategory(id) {
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id)
  if (error) throw error
}

// ── Productos ─────────────────────────────────────────────────────────

export async function getProducts({ search = '', categoryId = null, activeOnly = false } = {}) {
  let query = supabase
    .from('products')
    .select(`
      *,
      categories(id, name),
      stock(quantity)
    `)
    .order('name')

  if (search) {
    query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%,barcode.ilike.%${search}%`)
  }
  if (categoryId) {
    query = query.eq('category_id', categoryId)
  }
  if (activeOnly) {
    query = query.eq('is_active', true)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function getProductById(id) {
  const { data, error } = await supabase
    .from('products')
    .select(`*, categories(id, name)`)
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function createProduct(payload) {
  const { data, error } = await supabase
    .from('products')
    .insert(cleanPayload(payload))
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateProduct(id, payload) {
  const { data, error } = await supabase
    .from('products')
    .update(cleanPayload(payload))
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function toggleProductActive(id, isActive) {
  const { error } = await supabase
    .from('products')
    .update({ is_active: isActive })
    .eq('id', id)
  if (error) throw error
}

function cleanPayload(d) {
  return {
    sku:             d.sku             || null,
    barcode:         d.barcode         || null,
    name:            d.name,
    description:     d.description     || null,
    category_id:     d.category_id     || null,
    unit_of_measure: d.unit_of_measure || 'unidad',
    price_cost:      parseFloat(d.price_cost)  || null,
    price_sell:      parseFloat(d.price_sell),
    iva_rate:        parseFloat(d.iva_rate)     ?? 21,
    iva_included:    Boolean(d.iva_included),
    min_stock:       parseFloat(d.min_stock)    || 0,
    has_expiry:      Boolean(d.has_expiry),
    expiry_date:     d.expiry_date || null,
    is_active:       d.is_active !== false,
  }
}
