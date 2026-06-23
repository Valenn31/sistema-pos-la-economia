/**
 * CustomersPage — ABM (Alta/Baja/Modificación) de clientes con gestión de cuenta corriente.
 * Visible para admin y superadmin desde /customers.
 *
 * Funcionalidades:
 *  - Búsqueda en tiempo real por nombre, documento o teléfono (con debounce)
 *  - Crear / editar cliente (CustomerFormModal)
 *  - Registrar abono de deuda (PayDebtModal)
 *  - Ver historial de cuenta corriente y compras (CustomerHistoryModal)
 *  - Activar / desactivar cliente
 *  - KPIs: total clientes, cantidad de deudores, monto total adeudado
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

/**
 * CustomersPage — Componente principal de la página de gestión de clientes.
 * Maneja la carga de datos, filtros, y coordina los modales de CRUD y pagos.
 */
export function CustomersPage() {
  // Perfil del usuario logueado (para registrar quién hace los pagos)
  const { profile } = useAuthStore()
  // Lista de clientes cargados desde la base de datos
  const [customers,    setCustomers]    = useState([])
  // Indicador de carga inicial
  const [loading,      setLoading]      = useState(true)
  // Texto de búsqueda ingresado por el usuario
  const [search,       setSearch]       = useState('')
  // Checkbox para incluir clientes inactivos en los resultados
  const [showInactive, setShowInactive] = useState(false)
  // Controla la visibilidad del modal de formulario (crear/editar)
  const [formOpen,     setFormOpen]     = useState(false)
  // Cliente actualmente en edición (null = modo creación)
  const [editing,      setEditing]      = useState(null)
  // Cliente seleccionado para registrar un pago de deuda
  const [payTarget,    setPayTarget]    = useState(null)
  // Cliente seleccionado para ver su historial de cuenta corriente
  const [historyCustomer, setHistoryCustomer] = useState(null)

  // Aplicar debounce de 300ms al texto de búsqueda para evitar consultas excesivas
  const debouncedSearch = useDebounce(search, 300)

  /**
   * Carga la lista de clientes filtrada por búsqueda y estado activo.
   * Se ejecuta automáticamente cuando cambia la búsqueda (con debounce) o el filtro de inactivos.
   */
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

  // Recargar clientes cuando cambian los filtros
  useEffect(() => { load() }, [load])

  // ── Cálculos de KPIs derivados de la lista de clientes ───────────
  /** Monto total adeudado por todos los clientes */
  const totalDebt    = customers.reduce((s, c) => s + (c.current_balance ?? 0), 0)
  /** Cantidad de clientes con deuda mayor a 0 */
  const debtorCount  = customers.filter((c) => c.current_balance > 0).length

  // ── Handlers de acciones ──────────────────────────────────────────

  /** Guarda un cliente (creación o actualización) y recarga la lista */
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

  /** Alterna el estado activo/inactivo de un cliente */
  const handleToggle = async (c) => {
    try {
      await toggleCustomerActive(c.id, !c.is_active)
      toast.success(c.is_active ? 'Cliente desactivado' : 'Cliente activado')
      load()
    } catch { toast.error('Error al cambiar estado') }
  }

  /** Registra un pago de deuda para el cliente seleccionado */
  const handlePayment = async (data) => {
    try {
      await registerPayment({ customerId: payTarget.id, userId: profile?.id, ...data })
      toast.success(`Pago de ${formatCurrency(data.amount)} registrado`)
      setPayTarget(null)
      load()
    } catch (e) { toast.error(e.message ?? 'Error al registrar pago') }
  }

  /** Abre el modal de formulario en modo creación */
  const openCreate = () => { setEditing(null); setFormOpen(true) }
  /** Abre el modal de formulario en modo edición con los datos del cliente */
  const openEdit   = (c) => { setEditing(c);   setFormOpen(true) }

  return (
    <div className="p-6 space-y-4">

      {/* Encabezado con título e ícono + botón de nuevo cliente */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-primary-400" />
          <h1 className="text-2xl font-bold text-white">Clientes</h1>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4" /> Nuevo cliente
        </Button>
      </div>

      {/* Tarjetas de KPIs: total clientes, con deuda, monto total adeudado */}
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

      {/* Barra de filtros: búsqueda por texto + checkbox de inactivos */}
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

      {/* Contenido principal: spinner, estado vacío o tabla de clientes */}
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
                // Verificar si el cliente superó su límite de crédito
                const overLimit    = c.credit_limit > 0 && c.current_balance > c.credit_limit
                return (
                  <tr key={c.id} className={`hover:bg-surface-800/40 transition-colors ${!c.is_active ? 'opacity-50' : ''}`}>
                    {/* Nombre y email del cliente */}
                    <td className="px-4 py-3">
                      <p className="font-medium text-white">{c.full_name}</p>
                      {c.email && <p className="text-xs text-surface-500 truncate max-w-[180px]">{c.email}</p>}
                    </td>
                    {/* Tipo y número de documento */}
                    <td className="px-4 py-3 text-surface-400">
                      {c.document_type && <span className="text-xs text-surface-500 mr-1">{c.document_type}</span>}
                      {c.document_number ?? '—'}
                    </td>
                    {/* Teléfono */}
                    <td className="px-4 py-3 text-surface-400">{c.phone ?? '—'}</td>
                    {/* Saldo de deuda con indicador de límite excedido */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {overLimit && <AlertCircle className="w-3.5 h-3.5 text-red-400" title="Supera el límite de crédito" />}
                        <span className={`font-semibold ${hasDebt ? (overLimit ? 'text-red-400' : 'text-yellow-400') : 'text-surface-500'}`}>
                          {formatCurrency(c.current_balance)}
                        </span>
                      </div>
                    </td>
                    {/* Límite de crédito asignado */}
                    <td className="px-4 py-3 text-right text-surface-400">
                      {c.credit_limit > 0 ? formatCurrency(c.credit_limit) : '—'}
                    </td>
                    {/* Descuento especial asignado */}
                    <td className="px-4 py-3 text-right">
                      {c.discount_percent > 0
                        ? <Badge color="green">{c.discount_percent}%</Badge>
                        : <span className="text-surface-600">—</span>
                      }
                    </td>
                    {/* Toggle de estado activo/inactivo */}
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => handleToggle(c)} className="text-surface-400 hover:text-primary-400 transition-colors">
                        {c.is_active
                          ? <ToggleRight className="w-6 h-6 text-primary-400" />
                          : <ToggleLeft  className="w-6 h-6" />
                        }
                      </button>
                    </td>
                    {/* Botones de acción: historial, pagar deuda, editar */}
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        {/* Botón: Ver historial de cuenta corriente y compras */}
                        <button
                          onClick={() => setHistoryCustomer(c)}
                          className="p-1.5 rounded-lg text-surface-400 hover:text-primary-400 hover:bg-primary-900/20 transition-colors"
                          title="Ver historial"
                        >
                          <History className="w-4 h-4" />
                        </button>
                        {/* Botón: Registrar pago de deuda (solo si tiene deuda) */}
                        {hasDebt && (
                          <button
                            onClick={() => setPayTarget(c)}
                            className="p-1.5 rounded-lg text-surface-400 hover:text-green-400 hover:bg-green-900/20 transition-colors"
                            title="Registrar pago"
                          >
                            <Wallet className="w-4 h-4" />
                          </button>
                        )}
                        {/* Botón: Editar datos del cliente */}
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

      {/* Modal de formulario para crear/editar cliente */}
      <CustomerFormModal
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null) }}
        onSave={handleSave}
        initialData={editing}
      />

      {/* Modal para registrar pago de deuda */}
      <PayDebtModal
        open={!!payTarget}
        onClose={() => setPayTarget(null)}
        onSave={handlePayment}
        customer={payTarget}
      />

      {/* Modal de historial de cuenta corriente y compras del cliente */}
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
