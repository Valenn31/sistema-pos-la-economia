/**
 * DebtorsTab — Listado de clientes con saldo pendiente.
 * KPIs: total deudores, monto total, promedio por deudor.
 * Exporta a Excel y PDF.
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

export function DebtorsTab() {
  const [debtors, setDebtors] = useState([])
  const [loading, setLoading] = useState(true)
  const [sortField, setSortField] = useState('current_balance')
  const [sortAsc,   setSortAsc]   = useState(false)

  useEffect(() => {
    setLoading(true)
    getCustomers({ activeOnly: false })
      .then((all) => setDebtors(all.filter((c) => (c.current_balance ?? 0) > 0)))
      .catch(() => toast.error('Error al cargar deudores'))
      .finally(() => setLoading(false))
  }, [])

  const sorted = [...debtors].sort((a, b) => {
    let av = a[sortField] ?? 0
    let bv = b[sortField] ?? 0
    if (typeof av === 'string') av = av.toLowerCase()
    if (typeof bv === 'string') bv = bv.toLowerCase()
    if (av < bv) return sortAsc ? -1 : 1
    if (av > bv) return sortAsc ?  1 : -1
    return 0
  })

  const toggleSort = (field) => {
    if (sortField === field) setSortAsc(!sortAsc)
    else { setSortField(field); setSortAsc(false) }
  }

  const totalOwed  = debtors.reduce((s, c) => s + (c.current_balance ?? 0), 0)
  const avgOwed    = debtors.length ? totalOwed / debtors.length : 0
  const overLimit  = debtors.filter((c) => c.credit_limit > 0 && c.current_balance > c.credit_limit).length

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
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card text-center">
          <p className="text-2xl font-bold text-red-400">{debtors.length}</p>
          <p className="text-xs text-surface-500">clientes con deuda</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-red-400">{formatCurrency(totalOwed)}</p>
          <p className="text-xs text-surface-500">total adeudado</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-yellow-400">{formatCurrency(avgOwed)}</p>
          <p className="text-xs text-surface-500">deuda promedio</p>
        </div>
        <div className="card text-center">
          <p className={`text-2xl font-bold ${overLimit > 0 ? 'text-orange-400' : 'text-surface-500'}`}>{overLimit}</p>
          <p className="text-xs text-surface-500">superan límite</p>
        </div>
      </div>

      {/* Acciones */}
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

      {/* Tabla */}
      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : debtors.length === 0 ? (
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
