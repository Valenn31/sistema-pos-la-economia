/**
 * DebtorsTab — Pestaña de reporte de deudores.
 *
 * Muestra un listado de clientes con saldo pendiente (deuda > 0).
 * Incluye KPIs resumen (total deudores, monto total, promedio, superan límite),
 * tabla ordenable por columnas y exportación a Excel y PDF.
 *
 * @module reports/components/DebtorsTab
 */
import { useState, useEffect } from 'react'
import { FileSpreadsheet, FileText, AlertCircle, Users } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button }   from '@/shared/components/Button'
import { Badge }    from '@/shared/components/Badge'
import { Spinner }  from '@/shared/components/Spinner'
import { getCustomers } from '@/modules/customers/services/customerService'
import { exportToExcel, exportToPDF } from '@/shared/utils/exporters'
import { formatCurrency } from '@/shared/utils/formatters'

/**
 * Componente que renderiza la pestaña de deudores dentro de Reportes.
 * Carga todos los clientes, filtra los que tienen saldo > 0,
 * muestra KPIs y una tabla ordenable con acciones de exportación.
 *
 * @returns {JSX.Element} Pestaña de deudores
 */
export function DebtorsTab() {
  /** Estado: lista de clientes con saldo pendiente */
  const [debtors, setDebtors] = useState([])
  /** Estado: indica si se están cargando los datos */
  const [loading, setLoading] = useState(true)
  /** Estado: campo por el cual se ordena la tabla */
  const [sortField, setSortField] = useState('current_balance')
  /** Estado: dirección de ordenamiento (true = ascendente, false = descendente) */
  const [sortAsc,   setSortAsc]   = useState(false)

  /**
   * Hook de efecto: carga todos los clientes al montar el componente
   * y filtra únicamente los que tienen saldo pendiente (current_balance > 0).
   */
  useEffect(() => {
    setLoading(true)
    getCustomers({ activeOnly: false })
      .then((all) => setDebtors(all.filter((c) => (c.current_balance ?? 0) > 0)))
      .catch(() => toast.error('Error al cargar deudores'))
      .finally(() => setLoading(false))
  }, [])

  /**
   * Ordena la lista de deudores según el campo y dirección de ordenamiento actual.
   * Soporta comparación tanto numérica como de strings (case-insensitive).
   */
  const sorted = [...debtors].sort((a, b) => {
    let av = a[sortField] ?? 0
    let bv = b[sortField] ?? 0
    if (typeof av === 'string') av = av.toLowerCase()
    if (typeof bv === 'string') bv = bv.toLowerCase()
    if (av < bv) return sortAsc ? -1 : 1
    if (av > bv) return sortAsc ?  1 : -1
    return 0
  })

  /**
   * Alterna el campo de ordenamiento o invierte la dirección
   * si se hace clic en la misma columna.
   * @param {string} field - Nombre del campo a ordenar
   */
  const toggleSort = (field) => {
    if (sortField === field) setSortAsc(!sortAsc)
    else { setSortField(field); setSortAsc(false) }
  }

  /** KPI: monto total adeudado por todos los deudores */
  const totalOwed  = debtors.reduce((s, c) => s + (c.current_balance ?? 0), 0)
  /** KPI: deuda promedio por deudor */
  const avgOwed    = debtors.length ? totalOwed / debtors.length : 0
  /** KPI: cantidad de clientes que superan su límite de crédito */
  const overLimit  = debtors.filter((c) => c.credit_limit > 0 && c.current_balance > c.credit_limit).length

  /**
   * Exporta el listado de deudores a un archivo Excel.
   * Incluye nombre, teléfono, documento, deuda, límite de crédito, etc.
   */
  const doExcel = () => {
    const rows = sorted.map((c) => ({
      'Cliente':         c.full_name,
      'Teléfono':        c.phone ?? '',
      'Documento':       [c.document_type, c.document_number].filter(Boolean).join(' '),
      'Deuda ($)':       c.current_balance,
      'Límite crédito':  c.credit_limit ?? 0,
      'Supera límite':   (c.credit_limit > 0 && c.current_balance > c.credit_limit) ? 'Sí' : 'No',
      'Activo':          c.is_active ? 'Sí' : 'No',
    }))
    exportToExcel(rows, `deudores_${new Date().toISOString().slice(0,10)}`, 'Deudores')
  }

  /**
   * Exporta el listado de deudores a un archivo PDF.
   * Genera columnas simplificadas con nombre, teléfono, deuda, límite y estado.
   */
  const doPdf = () => {
    const cols = [
      { header: 'Cliente',        dataKey: 'nombre' },
      { header: 'Teléfono',       dataKey: 'telefono' },
      { header: 'Deuda',          dataKey: 'deuda' },
      { header: 'Límite Créd.',   dataKey: 'limite' },
      { header: 'Estado',         dataKey: 'estado' },
    ]
    const rows = sorted.map((c) => ({
      nombre:   c.full_name,
      telefono: c.phone ?? '—',
      deuda:    formatCurrency(c.current_balance),
      limite:   c.credit_limit > 0 ? formatCurrency(c.credit_limit) : '—',
      estado:   c.is_active ? 'Activo' : 'Inactivo',
    }))
    exportToPDF(cols, rows, `Reporte de Deudores — ${new Date().toLocaleDateString('es-AR')}`, `deudores_${new Date().toISOString().slice(0,10)}`)
  }

  /**
   * Componente interno para encabezados de columna ordenables.
   * Muestra una flecha indicando la dirección de orden actual.
   *
   * @param {Object} props
   * @param {string} props.field - Campo del objeto deudor para ordenar
   * @param {React.ReactNode} props.children - Texto del encabezado
   * @param {boolean} [props.right] - Si true, alinea el texto a la derecha
   */
  const SortTh = ({ field, children, right }) => (
    <th
      className={`px-4 py-3 cursor-pointer select-none hover:text-white transition-colors ${right ? 'text-right' : ''}`}
      onClick={() => toggleSort(field)}
    >
      {children}
      {sortField === field && <span className="ml-1 text-primary-400">{sortAsc ? '↑' : '↓'}</span>}
    </th>
  )

  return (
    <div className="space-y-4">
      {/* Tarjetas KPI: resumen de deudores */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* KPI: cantidad de clientes con deuda */}
        <div className="card text-center">
          <p className="text-2xl font-bold text-red-400">{debtors.length}</p>
          <p className="text-xs text-surface-500">clientes con deuda</p>
        </div>
        {/* KPI: monto total adeudado */}
        <div className="card text-center">
          <p className="text-2xl font-bold text-red-400">{formatCurrency(totalOwed)}</p>
          <p className="text-xs text-surface-500">total adeudado</p>
        </div>
        {/* KPI: deuda promedio por deudor */}
        <div className="card text-center">
          <p className="text-2xl font-bold text-yellow-400">{formatCurrency(avgOwed)}</p>
          <p className="text-xs text-surface-500">deuda promedio</p>
        </div>
        {/* KPI: clientes que superan su límite de crédito */}
        <div className="card text-center">
          <p className={`text-2xl font-bold ${overLimit > 0 ? 'text-orange-400' : 'text-surface-500'}`}>{overLimit}</p>
          <p className="text-xs text-surface-500">superan límite</p>
        </div>
      </div>

      {/* Botones de exportación: Excel y PDF */}
      {debtors.length > 0 && (
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" onClick={doExcel}>
            <FileSpreadsheet className="w-4 h-4" /> Excel
          </Button>
          <Button variant="secondary" onClick={doPdf}>
            <FileText className="w-4 h-4" /> PDF
          </Button>
        </div>
      )}

      {/* Tabla de deudores o estados de carga/vacío */}
      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : debtors.length === 0 ? (
        /* Estado vacío: no hay deudores */
        <div className="card text-center py-16 text-surface-500">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No hay clientes con saldo pendiente</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-surface-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-800 text-surface-400 text-left">
                <SortTh field="full_name">Cliente</SortTh>
                <th className="px-4 py-3">Teléfono</th>
                <th className="px-4 py-3">Documento</th>
                <SortTh field="current_balance" right>Deuda</SortTh>
                <SortTh field="credit_limit" right>Límite Créd.</SortTh>
                <th className="px-4 py-3 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-800">
              {sorted.map((c) => {
                /** Flag: indica si el cliente supera su límite de crédito */
                const over = c.credit_limit > 0 && c.current_balance > c.credit_limit
                return (
                  <tr key={c.id} className={`hover:bg-surface-800/40 transition-colors ${!c.is_active ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-white">{c.full_name}</p>
                      {c.email && <p className="text-xs text-surface-500 truncate max-w-[200px]">{c.email}</p>}
                    </td>
                    <td className="px-4 py-3 text-surface-400">{c.phone ?? '—'}</td>
                    <td className="px-4 py-3 text-surface-400 text-xs">
                      {c.document_type && <span className="mr-1 text-surface-500">{c.document_type}</span>}
                      {c.document_number ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Ícono de alerta si supera el límite de crédito */}
                        {over && (
                          <AlertCircle className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" title="Supera el límite de crédito" />
                        )}
                        <span className={`font-bold ${over ? 'text-orange-400' : 'text-red-400'}`}>
                          {formatCurrency(c.current_balance)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-surface-400">
                      {c.credit_limit > 0 ? formatCurrency(c.credit_limit) : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge color={c.is_active ? 'green' : 'gray'}>
                        {c.is_active ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
