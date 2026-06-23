/**
 * CustomersPage — ABM de clientes con gestión de cuenta corriente.
 * Visible para admin y superadmin desde /customers.
 *
 * Funcionalidades:
 *  - Búsqueda en tiempo real por nombre, documento o teléfono
 *  - Crear / editar cliente
 *  - Registrar abono de deuda (PayDebtModal)
 *  - Activar / desactivar cliente
 *  - KPIs: total clientes, deudores, monto total adeudado
 */
import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Wallet, ToggleLeft, ToggleRight, Users, AlertCircle, Search, History } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button }                from '@/shared/components/Button'
import { Badge }                 from '@/shared/components/Badge'
import { Spinner }               from '@/shared/components/Spinner'
import { useDebounce }           from '@/shared/hooks/useDebounce'
import { useAuthStore }          from '@/shared/store/authStore'
import { CustomerFormModal }     from './CustomerFormModal'
import { PayDebtModal }          from './PayDebtModal'
import { CustomerHistoryModal }  from './CustomerHistoryModal'
import {
  getCustomers, createCustomer, updateCustomer,
  toggleCustomerActive, registerPayment,
} from '../services/customerService'
import { formatCurrency } from '@/shared/utils/formatters'

export function CustomersPage() {
  const { profile } = useAuthStore()
  const [customers,    setCustomers]    = useState([])
  const [loading,      setLoading]      = useState(true)
  const [search,       setSearch]       = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [formOpen,     setFormOpen]     = useState(false)
  const [editing,      setEditing]      = useState(null)
  const [payTarget,    setPayTarget]    = useState(null)
  const [historyCustomer, setHistoryCustomer] = useState(null)

  const debouncedSearch = useDebounce(search, 300)

  const load = useCallback(async () => {
    try {
      const data = await getCustomers({
        search:     debouncedSearch,
        activeOnly: !showInactive,
      })
      setCustomers(data)
    } catch { toast.error('Error al cargar clientes') }
    finally { setLoading(false) }
  }, [debouncedSearch, showInactive])

  useEffect(() => { load() }, [load])

  // ── KPIs ──────────────────────────────────────────────────────────
  const totalDebt    = customers.reduce((s, c) => s + (c.current_balance ?? 0), 0)
  const debtorCount  = customers.filter((c) => c.current_balance > 0).length

  // ── Handlers ──────────────────────────────────────────────────────
  const handleSave = async (data) => {
    try {
      if (editing) {
        await updateCustomer(editing.id, data)
        toast.success('Cliente actualizado')
      } else {
        await createCustomer(data)
        toast.success('Cliente creado')
      }
      setFormOpen(false)
      setEditing(null)
      load()
    } catch (e) { toast.error(e.message ?? 'Error al guardar') }
  }

  const handleToggle = async (c) => {
    try {
      await toggleCustomerActive(c.id, !c.is_active)
      toast.success(c.is_active ? 'Cliente desactivado' : 'Cliente activado')
      load()
    } catch { toast.error('Error al cambiar estado') }
  }

  const handlePayment = async (data) => {
    try {
      await registerPayment({ customerId: payTarget.id, userId: profile?.id, ...data })
      toast.success(`Pago de ${formatCurrency(data.amount)} registrado`)
      setPayTarget(null)
      load()
    } catch (e) { toast.error(e.message ?? 'Error al registrar pago') }
  }

  const openCreate = () => { setEditing(null); setFormOpen(true) }
  const openEdit   = (c) => { setEditing(c);   setFormOpen(true) }

  return (
    <div className="p-6 space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-primary-400" />
          <h1 className="text-2xl font-bold text-white">Clientes</h1>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4" /> Nuevo cliente
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card text-center">
          <p className="text-2xl font-bold text-white">{customers.length}</p>
          <p className="text-xs text-surface-500">clientes</p>
        </div>
        <div className="card text-center">
          <p className={`text-2xl font-bold ${debtorCount > 0 ? 'text-red-400' : 'text-primary-400'}`}>
            {debtorCount}
          </p>
          <p className="text-xs text-surface-500">con deuda</p>
        </div>
        <div className="card text-center">
          <p className={`text-2xl font-bold ${totalDebt > 0 ? 'text-red-400' : 'text-primary-400'}`}>
            {formatCurrency(totalDebt)}
          </p>
          <p className="text-xs text-surface-500">total adeudado</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
          <input
            type="text"
            className="input-base pl-9"
            placeholder="Buscar por nombre, documento o teléfono…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-surface-400 cursor-pointer select-none">
          <input
            type="checkbox"
            className="checkbox-base"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
          />
          Mostrar inactivos
        </label>
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : customers.length === 0 ? (
        <div className="card text-center py-16 text-surface-500">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>{search ? `Sin resultados para "${search}"` : 'No hay clientes registrados'}</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-surface-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-800 text-surface-400 text-left">
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Documento</th>
                <th className="px-4 py-3">Teléfono</th>
                <th className="px-4 py-3 text-right">Saldo deuda</th>
                <th className="px-4 py-3 text-right">Límite crédito</th>
                <th className="px-4 py-3 text-right">Descuento</th>
                <th className="px-4 py-3 text-center">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-800">
              {customers.map((c) => {
                const hasDebt      = c.current_balance > 0
                const overLimit    = c.credit_limit > 0 && c.current_balance > c.credit_limit
                return (
                  <tr key={c.id} className={`hover:bg-surface-800/40 transition-colors ${!c.is_active ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-white">{c.full_name}</p>
                      {c.email && <p className="text-xs text-surface-500 truncate max-w-[180px]">{c.email}</p>}
                    </td>
                    <td className="px-4 py-3 text-surface-400">
                      {c.document_type && <span className="text-xs text-surface-500 mr-1">{c.document_type}</span>}
                      {c.document_number ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-surface-400">{c.phone ?? '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {overLimit && <AlertCircle className="w-3.5 h-3.5 text-red-400" title="Supera el límite de crédito" />}
                        <span className={`font-semibold ${hasDebt ? (overLimit ? 'text-red-400' : 'text-yellow-400') : 'text-surface-500'}`}>
                          {formatCurrency(c.current_balance)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-surface-400">
                      {c.credit_limit > 0 ? formatCurrency(c.credit_limit) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {c.discount_percent > 0
                        ? <Badge color="green">{c.discount_percent}%</Badge>
                        : <span className="text-surface-600">—</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => handleToggle(c)} className="text-surface-400 hover:text-primary-400 transition-colors">
                        {c.is_active
                          ? <ToggleRight className="w-6 h-6 text-primary-400" />
                          : <ToggleLeft  className="w-6 h-6" />
                        }
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => setHistoryCustomer(c)}
                          className="p-1.5 rounded-lg text-surface-400 hover:text-primary-400 hover:bg-primary-900/20 transition-colors"
                          title="Ver historial"
                        >
                          <History className="w-4 h-4" />
                        </button>
                        {hasDebt && (
                          <button
                            onClick={() => setPayTarget(c)}
                            className="p-1.5 rounded-lg text-surface-400 hover:text-green-400 hover:bg-green-900/20 transition-colors"
                            title="Registrar pago"
                          >
                            <Wallet className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => openEdit(c)}
                          className="p-1.5 rounded-lg text-surface-400 hover:text-white hover:bg-surface-700 transition-colors"
                          title="Editar"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <CustomerFormModal
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null) }}
        onSave={handleSave}
        initialData={editing}
      />

      <PayDebtModal
        open={!!payTarget}
        onClose={() => setPayTarget(null)}
        onSave={handlePayment}
        customer={payTarget}
      />

      <CustomerHistoryModal
        open={!!historyCustomer}
        onClose={() => setHistoryCustomer(null)}
        customer={historyCustomer}
        userId={profile?.id}
        onPaymentDone={load}
      />
    </div>
  )
}
