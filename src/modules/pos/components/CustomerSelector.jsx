/**
 * CustomerSelector — Selector de cliente para el carrito.
 * Permite elegir entre venta anónima, un cliente existente,
 * o crear uno nuevo con cuenta corriente desde el POS.
 *
 * @param {object|null} value     - Cliente seleccionado actualmente
 * @param {Function}    onChange  - (customer|null) => void
 */
import { useState, useEffect, useRef } from 'react'
import { User, Search, X, AlertCircle, UserPlus, Pencil } from 'lucide-react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { searchCustomers } from '@/modules/pos/services/salesService'
import { supabase } from '@/supabase/client'
import { useDebounce } from '@/shared/hooks/useDebounce'
import { formatCurrency } from '@/shared/utils/formatters'
import { Button } from '@/shared/components/Button'

export function CustomerSelector({ value, onChange }) {
  const [open,        setOpen]        = useState(false)
  const [creating,    setCreating]    = useState(false)
  const [editing,     setEditing]     = useState(false)
  const [query,       setQuery]       = useState('')
  const [results,     setResults]     = useState([])
  const [loading,     setLoading]     = useState(false)
  const ref       = useRef(null)
  const debounced = useDebounce(query, 300)

  useEffect(() => {
    setLoading(true)
    searchCustomers(debounced)
      .then(setResults)
      .catch(() => setResults([]))
      .finally(() => setLoading(false))
  }, [debounced])

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false)
        setCreating(false)
        setEditing(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const select = (customer) => {
    onChange(customer)
    setOpen(false)
    setEditing(false)
    setCreating(false)
    setQuery('')
  }

  const clear = () => onChange(null)

  const openEdit = () => {
    setEditing(true)
    setCreating(false)
    setOpen(true)
  }

  const creditWarning = value && value.credit_limit > 0 &&
    value.current_balance >= value.credit_limit * 0.9

  return (
    <div ref={ref} className="relative">

      {/* ── Trigger: cliente seleccionado ──────────────────────────── */}
      {value ? (
        <div className={`flex items-center gap-2 rounded-lg px-3 py-2 border ${
          creditWarning ? 'border-yellow-600 bg-yellow-600/10' : 'border-surface-700 bg-surface-800'
        }`}>
          <User className={`w-4 h-4 flex-shrink-0 ${creditWarning ? 'text-yellow-400' : 'text-primary-400'}`} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{value.full_name}</p>
            {value.current_balance > 0 && (
              <p className="text-xs text-surface-400">
                Deuda: {formatCurrency(value.current_balance)}
                {value.credit_limit > 0 && ` / ${formatCurrency(value.credit_limit)}`}
              </p>
            )}
            {value.discount_percent > 0 && (
              <p className="text-xs text-green-400">{value.discount_percent}% descuento</p>
            )}
          </div>
          {creditWarning && <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0" />}
          <button onClick={openEdit} className="text-surface-500 hover:text-primary-400 flex-shrink-0" title="Editar cliente">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={clear} className="text-surface-500 hover:text-surface-300 flex-shrink-0" title="Quitar cliente">
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => { setOpen(true); setCreating(false) }}
          className="w-full flex items-center gap-2 rounded-lg px-3 py-2 border border-dashed border-surface-700 text-surface-500 hover:border-primary-600 hover:text-primary-400 transition-colors text-sm"
        >
          <User className="w-4 h-4" />
          Venta anónima — agregar cliente
        </button>
      )}

      {/* ── Dropdown ───────────────────────────────────────────────── */}
      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-2 bg-surface-900 border border-surface-700 rounded-xl shadow-2xl z-20 overflow-hidden">

          {editing ? (
            <QuickCreateCustomer
              initialData={value}
              onCreated={(updated) => { onChange(updated); setOpen(false); setEditing(false) }}
              onCancel={() => { setEditing(false); setOpen(false) }}
            />
          ) : !creating ? (
            <>
              {/* Buscador */}
              <div className="p-2 border-b border-surface-800">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-500" />
                  <input
                    autoFocus
                    type="text"
                    placeholder="Buscar cliente…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="w-full bg-surface-800 border border-surface-700 rounded-lg pl-8 pr-3 py-1.5 text-sm text-white placeholder-surface-600 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
              </div>

              {/* Lista de resultados */}
              <div className="max-h-44 overflow-y-auto">
                {loading && (
                  <p className="text-center text-surface-500 text-sm py-4">Buscando…</p>
                )}
                {!loading && results.length === 0 && (
                  <p className="text-center text-surface-600 text-sm py-4">Sin resultados</p>
                )}
                {results.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => select(c)}
                    className="w-full text-left px-3 py-2.5 hover:bg-surface-800 transition-colors flex items-center gap-3"
                  >
                    <div className="w-7 h-7 rounded-full bg-primary-600/20 flex items-center justify-center flex-shrink-0">
                      <User className="w-3.5 h-3.5 text-primary-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-medium truncate">{c.full_name}</p>
                      {c.document_number && (
                        <p className="text-xs text-surface-500">{c.document_number}</p>
                      )}
                    </div>
                    {c.discount_percent > 0 && (
                      <span className="badge bg-green-600/15 text-green-400 text-[10px] flex-shrink-0">
                        {c.discount_percent}% off
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Botón crear nuevo */}
              <div className="p-2 border-t border-surface-800">
                <button
                  onClick={() => setCreating(true)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-primary-400 hover:bg-primary-600/10 transition-colors text-sm font-medium"
                >
                  <UserPlus className="w-4 h-4" />
                  Crear nuevo cliente
                </button>
              </div>
            </>
          ) : (
            /* ── Formulario de creación rápida ──────────────────── */
            <QuickCreateCustomer
              onCreated={(customer) => { select(customer) }}
              onCancel={() => setCreating(false)}
            />
          )}
        </div>
      )}
    </div>
  )
}

/* ─── Formulario de creación / edición rápida de cliente ────────── */
function QuickCreateCustomer({ initialData = null, onCreated, onCancel }) {
  const isEditing = !!initialData
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    defaultValues: initialData ? {
      full_name:        initialData.full_name        ?? '',
      document_type:    initialData.document_type    ?? '',
      document_number:  initialData.document_number  ?? '',
      phone:            initialData.phone            ?? '',
      credit_limit:     initialData.credit_limit     ?? 0,
      discount_percent: initialData.discount_percent ?? 0,
    } : {},
  })

  const onSubmit = async (data) => {
    try {
      const payload = {
        full_name:        data.full_name,
        document_type:    data.document_type   || null,
        document_number:  data.document_number || null,
        phone:            data.phone           || null,
        credit_limit:     parseFloat(data.credit_limit)     || 0,
        discount_percent: parseFloat(data.discount_percent) || 0,
      }

      let customer
      if (isEditing) {
        const { data: updated, error } = await supabase
          .from('customers')
          .update(payload)
          .eq('id', initialData.id)
          .select()
          .single()
        if (error) throw error
        customer = updated
        toast.success(`Cliente "${customer.full_name}" actualizado`)
      } else {
        const { data: created, error } = await supabase
          .from('customers')
          .insert(payload)
          .select()
          .single()
        if (error) throw error
        customer = created
        toast.success(`Cliente "${customer.full_name}" creado`)
      }

      onCreated(customer)
    } catch (err) {
      toast.error(err.message ?? (isEditing ? 'Error al editar cliente' : 'Error al crear cliente'))
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="p-3 space-y-3">
      <div className="flex items-center gap-2 mb-1">
        {isEditing
          ? <Pencil className="w-4 h-4 text-primary-400" />
          : <UserPlus className="w-4 h-4 text-primary-400" />}
        <p className="text-sm font-semibold text-white">
          {isEditing ? 'Editar cliente' : 'Nuevo cliente'}
        </p>
        <button type="button" onClick={onCancel} className="ml-auto text-surface-500 hover:text-surface-300">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Nombre */}
      <div>
        <input
          autoFocus
          placeholder="Nombre completo *"
          className="input-base text-sm py-1.5"
          {...register('full_name', { required: true })}
        />
        {errors.full_name && <p className="text-red-400 text-xs mt-0.5">Requerido</p>}
      </div>

      {/* Documento */}
      <div className="flex gap-2">
        <select className="input-base text-sm py-1.5 w-24 flex-shrink-0" {...register('document_type')}>
          <option value="">Tipo</option>
          <option value="DNI">DNI</option>
          <option value="CUIT">CUIT</option>
        </select>
        <input
          placeholder="Número"
          className="input-base text-sm py-1.5"
          {...register('document_number')}
        />
      </div>

      {/* Teléfono */}
      <input
        placeholder="Teléfono"
        className="input-base text-sm py-1.5"
        {...register('phone')}
      />

      {/* Límite de crédito y descuento */}
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-xs text-surface-500 mb-1 block">Límite cta. cte. ($)</label>
          <input
            type="number"
            min="0"
            step="100"
            placeholder="0"
            className="input-base text-sm py-1.5"
            {...register('credit_limit')}
          />
        </div>
        <div className="w-24 flex-shrink-0">
          <label className="text-xs text-surface-500 mb-1 block">Descuento (%)</label>
          <input
            type="number"
            min="0"
            max="100"
            placeholder="0"
            className="input-base text-sm py-1.5"
            {...register('discount_percent')}
          />
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <Button type="button" variant="secondary" size="sm" onClick={onCancel} className="flex-1">
          Cancelar
        </Button>
        <Button type="submit" size="sm" loading={isSubmitting} className="flex-1">
          {isEditing ? 'Guardar' : 'Crear'}
        </Button>
      </div>
    </form>
  )
}
