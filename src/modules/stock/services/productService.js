/**
 * productService.js — CRUD de productos y categorías.
 *
 * Funciones exportadas — Categorías:
 *  - getCategories()                     → Lista de todas las categorías
 *  - createCategory({ name, description }) → Crea una categoría
 *  - updateCategory(id, { name, description }) → Actualiza una categoría
 *  - deleteCategory(id)                  → Elimina una categoría
 *
 * Funciones exportadas — Productos:
 *  - getProducts({ search, categoryId, activeOnly }) → Lista de productos con filtros
 *  - getProductById(id)                  → Detalle de un producto por ID
 *  - createProduct(payload)              → Crea un nuevo producto
 *  - updateProduct(id, payload)          → Actualiza un producto existente
 *  - toggleProductActive(id, isActive)   → Activa/desactiva un producto
 */
import { supabase } from '@/supabase/client'

// ── Categorías ────────────────────────────────────────────────────────

/**
 * Obtiene todas las categorías de productos ordenadas alfabéticamente.
 *
 * @returns {Promise<object[]>} Lista de categorías
 * @throws {Error} Si falla la consulta a Supabase
 */
export async function getCategories() {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name')
  if (error) throw error
  return data
}

/**
 * Crea una nueva categoría de productos.
 *
 * @param {object} params - Datos de la categoría
 * @param {string} params.name - Nombre de la categoría
 * @param {string|null} [params.description] - Descripción opcional
 * @returns {Promise<object>} La categoría creada
 * @throws {Error} Si falla la inserción (ej: nombre duplicado)
 */
export async function createCategory({ name, description }) {
  const { data, error } = await supabase
    .from('categories')
    .insert({ name, description: description || null })
    .select()
    .single()
  if (error) throw error
  return data
}

/**
 * Actualiza una categoría existente.
 *
 * @param {number} id - ID de la categoría a actualizar
 * @param {object} params - Nuevos datos
 * @param {string} params.name - Nuevo nombre
 * @param {string|null} [params.description] - Nueva descripción
 * @returns {Promise<object>} La categoría actualizada
 * @throws {Error} Si falla la actualización en Supabase
 */
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

/**
 * Elimina permanentemente una categoría.
 * Nota: solo funciona si no hay productos asociados a la categoría (por FK).
 *
 * @param {number} id - ID de la categoría a eliminar
 * @returns {Promise<void>}
 * @throws {Error} Si falla la eliminación (ej: productos asociados)
 */
export async function deleteCategory(id) {
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id)
  if (error) throw error
}

// ── Productos ─────────────────────────────────────────────────────────

/**
 * Obtiene la lista de productos con filtros opcionales.
 * Incluye categoría y stock total por cada producto.
 * La búsqueda se aplica sobre nombre, SKU y código de barras.
 *
 * @param {object} [opciones] - Filtros opcionales
 * @param {string} [opciones.search=''] - Texto de búsqueda (nombre, SKU o código de barras)
 * @param {number|null} [opciones.categoryId=null] - ID de categoría para filtrar
 * @param {boolean} [opciones.activeOnly=false] - Si es true, solo productos activos
 * @returns {Promise<object[]>} Lista de productos con categoría y stock
 * @throws {Error} Si falla la consulta a Supabase
 */
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

/**
 * Obtiene un producto específico por su ID, incluyendo su categoría.
 *
 * @param {string} id - UUID del producto
 * @returns {Promise<object>} Datos completos del producto con categoría
 * @throws {Error} Si no se encuentra el producto o falla la consulta
 */
export async function getProductById(id) {
  const { data, error } = await supabase
    .from('products')
    .select(`*, categories(id, name)`)
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

/**
 * Crea un nuevo producto en la base de datos.
 *
 * @param {object} payload - Datos del producto
 * @param {string|null} [payload.sku] - Código SKU del producto
 * @param {string|null} [payload.barcode] - Código de barras
 * @param {string} payload.name - Nombre del producto
 * @param {string|null} [payload.description] - Descripción del producto
 * @param {number|null} [payload.category_id] - ID de la categoría
 * @param {string} [payload.unit_of_measure='unidad'] - Unidad de medida (unidad, kg, litro, etc.)
 * @param {number|null} [payload.price_cost] - Precio de costo
 * @param {number} payload.price_sell - Precio de venta
 * @param {number} [payload.iva_rate=21] - Tasa de IVA (porcentaje)
 * @param {boolean} [payload.iva_included=false] - Si el IVA está incluido en el precio de venta
 * @param {number} [payload.min_stock=0] - Stock mínimo para alertas
 * @param {boolean} [payload.has_expiry=false] - Si el producto tiene fecha de vencimiento
 * @param {string|null} [payload.expiry_date] - Fecha de vencimiento (ISO 8601)
 * @param {boolean} [payload.is_active=true] - Si el producto está activo
 * @returns {Promise<object>} El producto creado
 * @throws {Error} Si falla la inserción en Supabase
 */
export async function createProduct(payload) {
  const { data, error } = await supabase
    .from('products')
    .insert(cleanPayload(payload))
    .select()
    .single()
  if (error) throw error
  return data
}

/**
 * Actualiza un producto existente.
 *
 * @param {string} id - UUID del producto a actualizar
 * @param {object} payload - Nuevos datos del producto (misma estructura que createProduct)
 * @returns {Promise<object>} El producto actualizado
 * @throws {Error} Si falla la actualización en Supabase
 */
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

/**
 * Activa o desactiva un producto.
 * Los productos desactivados no aparecen en búsquedas del POS ni en reportes de stock.
 *
 * @param {string} id - UUID del producto
 * @param {boolean} isActive - true para activar, false para desactivar
 * @returns {Promise<void>}
 * @throws {Error} Si falla la actualización en Supabase
 */
export async function toggleProductActive(id, isActive) {
  const { error } = await supabase
    .from('products')
    .update({ is_active: isActive })
    .eq('id', id)
  if (error) throw error
}

/**
 * Limpia y normaliza el payload de un producto antes de enviarlo a Supabase.
 * Convierte valores numéricos con parseFloat, establece defaults para campos opcionales,
 * y asegura tipos booleanos correctos.
 *
 * @param {object} d - Datos crudos del formulario
 * @returns {object} Objeto limpio listo para insertar/actualizar en la tabla `products`
 */
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
