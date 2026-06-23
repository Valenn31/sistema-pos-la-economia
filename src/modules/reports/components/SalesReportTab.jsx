/**
 * SalesReportTab — Pestaña de reporte de ventas filtrado por rango de fechas.
 *
 * Muestra un resumen con KPIs (cantidad de ventas, total recaudado,
 * descuentos, desglose por método de pago) y una tabla paginada
 * con todas las ventas del período. Permite exportar a Excel y PDF,
 * y reimprimir tickets individuales.
 *
 * @module reports/components/SalesReportTab
 */
import { useState } from 'react'
import { Search, FileSpreadsheet, FileText, Printer } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button }     from '@/shared/components/Button'
import { Badge }      from '@/shared/components/Badge'
import { Spinner }    from '@/shared/components/Spinner'
import { Pagination } from '@/shared/components/Pagination'
import { getSalesReport, getSalesSummary } from '../services/reportsService'
import { exportToExcel, exportToPDF } from '@/shared/utils/exporters'
import { formatCurrency, formatDateTime } from '@/shared/utils/formatters'
import { printTicket } from '@/modules/pos/utils/ticketPrinter'

/** Mapa de códigos internos de métodos de pago a etiquetas legibles */
const METHOD_LABELS = {
  efectivo: 'Efectivo', debito: 'Débito', credito: 'Crédito',
  qr: 'QR/MP', transferencia: 'Transferencia', cuenta: 'Cta. Cte.',
}

/** Devuelve la fecha de hoy en formato ISO (YYYY-MM-DD) */
const today = () => new Date().toISOString().slice(0, 10)

/** Devuelve el primer día del mes actual en formato ISO (YYYY-MM-DD) */
const firstOfMonth = () => {
  const d = new Date(); d.setDate(1)
  return d.toISOString().slice(0, 10)
}

/**
 * Componente que renderiza el reporte de ventas con filtros, KPIs,
 * tabla paginada y opciones de exportación.
 *
 * @returns {JSX.Element} Pestaña de reporte de ventas
 */
export function SalesReportTab() {
  /** Estado: fecha de inicio del filtro (por defecto: primer día del mes) */
  const [from, setFrom]       = useState(firstOfMonth())
  /** Estado: fecha de fin del filtro (por defecto: hoy) */
  const [to, setTo]           = useState(today())
  /** Estado: lista de ventas obtenidas del servidor */
  const [sales, setSales]     = useState([])
  /** Estado: objeto resumen con KPIs calculados (count, totalRevenue, etc.) */
  const [summary, setSummary] = useState(null)
  /** Estado: indica si se está cargando la búsqueda */
  const [loading,  setLoading]  = useState(false)
  /** Estado: indica si ya se realizó al menos una búsqueda */
  const [searched, setSearched] = useState(false)
  /** Estado: página actual de la paginación */
  const [page,     setPage]     = useState(1)
  /** Estado: cantidad de filas por página */
  const [pageSize, setPageSize] = useState(50)

  /**
   * Busca ventas en el rango de fechas seleccionado.
   * Construye las fechas con hora completa (00:00 a 23:59:59)
   * y calcula el resumen a partir de los datos obtenidos.
   */
  const search = async () => {
    setLoading(true)
    try {
      const [fy, fm, fd] = from.split('-').map(Number)
      const [ty, tm, td] = to.split('-').map(Number)
      const fromDt = new Date(fy, fm - 1, fd, 0, 0, 0, 0)
      const toDt   = new Date(ty, tm - 1, td, 23, 59, 59, 999)
      const data   = await getSalesReport({ from: fromDt.toISOString(), to: toDt.toISOString() })
      setSales(data)
      setSummary(getSalesSummary(data))
      setSearched(true)
      setPage(1)
    } catch { toast.error('Error al cargar ventas') }
    finally { setLoading(false) }
  }

  /**
   * Exporta todas las ventas del período a un archivo Excel.
   * Incluye número de venta, fecha, cajero, cliente, comprobante,
   * subtotal, descuentos, IVA, total y métodos de pago.
   */
  const doExcelExport = () => {
    const rows = sales.map((s) => ({
      'Nro. Venta':   s.sale_number,
      'Fecha':        formatDateTime(s.created_at),
      'Cajero':       s.profiles?.full_name ?? '',
      'Cliente':      s.customers?.full_name ?? 'Anónimo',
      'Comprobante':  s.receipt_type,
      'Subtotal':     s.subtotal,
      'Descuentos':   s.discount_total,
      'IVA':          s.iva_total,
      'Total':        s.total,
      'Métodos de pago': (s.sale_payments ?? []).map((p) => `${METHOD_LABELS[p.method] ?? p.method}: ${formatCurrency(p.amount)}`).join(' | '),
    }))
    exportToExcel(rows, `ventas_${from}_${to}`, 'Ventas')
  }

  /**
   * Exporta todas las ventas del período a un archivo PDF.
   * Genera una tabla simplificada con número, fecha, cajero, cliente, tipo y total.
   */
  const doPdfExport = () => {
    const cols = [
      { header: '#', dataKey: 'num' },
      { header: 'Fecha', dataKey: 'fecha' },
      { header: 'Cajero', dataKey: 'cajero' },
      { header: 'Cliente', dataKey: 'cliente' },
      { header: 'Tipo', dataKey: 'tipo' },
      { header: 'Total', dataKey: 'total' },
    ]
    const rows = sales.map((s) => ({
      num:    s.sale_number,
      fecha:  formatDateTime(s.created_at),
      cajero: s.profiles?.full_name ?? '',
      cliente: s.customers?.full_name ?? 'Anónimo',
      tipo:   s.receipt_type,
      total:  formatCurrency(s.total),
    }))
    exportToPDF(cols, rows, `Reporte de Ventas ${from} al ${to}`, `ventas_${from}_${to}`)
  }

  return (
    <div className="space-y-4">
      {/* Barra de filtros: rango de fechas + botones de acción */}
      <div className="card flex flex-wrap items-end gap-4">
        <div>
          <label className="label-base">Desde</label>
          <input type="date" className="input-base" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="label-base">Hasta</label>
          <input type="date" className="input-base" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <Button onClick={search} loading={loading}>
          <Search className="w-4 h-4" /> Buscar
        </Button>
        {/* Botones de exportación, visibles solo si hay resultados */}
        {searched && sales.length > 0 && (
          <>
            <Button variant="secondary" onClick={doExcelExport}>
              <FileSpreadsheet className="w-4 h-4" /> Excel
            </Button>
            <Button variant="secondary" onClick={doPdfExport}>
              <FileText className="w-4 h-4" /> PDF
            </Button>
          </>
        )}
      </div>

      {/* Tarjetas KPI: resumen de ventas del período */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* KPI: cantidad total de ventas */}
          <div className="card text-center">
            <p className="text-2xl font-bold text-white">{summary.count}</p>
            <p className="text-xs text-surface-500">ventas</p>
          </div>
          {/* KPI: total recaudado */}
          <div className="card text-center">
            <p className="text-2xl font-bold text-primary-400">{formatCurrency(summary.totalRevenue)}</p>
            <p className="text-xs text-surface-500">total recaudado</p>
          </div>
          {/* KPI: total en descuentos aplicados */}
          <div className="card text-center">
            <p className="text-2xl font-bold text-yellow-400">{formatCurrency(summary.totalDiscount)}</p>
            <p className="text-xs text-surface-500">en descuentos</p>
          </div>
          {/* KPI: desglose de montos por método de pago */}
          <div className="card">
            <p className="text-xs text-surface-500 mb-1.5">Por método de pago</p>
            {Object.entries(summary.byMethod ?? {}).map(([method, amount]) => (
              <div key={method} className="flex justify-between text-xs">
                <span className="text-surface-400">{METHOD_LABELS[method] ?? method}</span>
                <span className="text-white font-medium">{formatCurrency(amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabla de ventas paginada */}
      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : searched && (
        <>
        <div className="overflow-x-auto rounded-xl border border-surface-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-800 text-surface-400 text-left">
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Cajero</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-800">
              {/* Mensaje cuando no hay ventas en el período */}
              {sales.length === 0 && (
                <tr><td colSpan={6} className="text-center text-surface-600 py-10">Sin ventas en el período</td></tr>
              )}
              {/* Filas de ventas (paginadas) */}
              {sales.slice((page - 1) * pageSize, page * pageSize).map((s) => (
                <tr key={s.id} className="hover:bg-surface-800/50 transition-colors">
                  <td className="px-4 py-2.5 font-mono text-surface-400 text-xs">#{s.sale_number}</td>
                  <td className="px-4 py-2.5 text-surface-400 text-xs whitespace-nowrap">{formatDateTime(s.created_at)}</td>
                  <td className="px-4 py-2.5 text-surface-300">{s.profiles?.full_name ?? '—'}</td>
                  <td className="px-4 py-2.5 text-surface-300">{s.customers?.full_name ?? 'Anónimo'}</td>
                  <td className="px-4 py-2.5">
                    <Badge color="gray">{s.receipt_type}</Badge>
                  </td>
                  <td className="px-4 py-2.5 text-right font-semibold text-white">{formatCurrency(s.total)}</td>
                  <td className="px-4 py-2.5">
                    {/* Botón para reimprimir el ticket de esta venta */}
                    <button
                      onClick={() => printTicket(s.id).catch(() => toast.error('Error al imprimir'))}
                      className="p-1.5 rounded-lg text-surface-500 hover:text-white hover:bg-surface-700 transition-colors"
                      title="Reimprimir ticket"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Componente de paginación */}
        <Pagination
          page={page}
          totalPages={Math.ceil(sales.length / pageSize)}
          onPageChange={setPage}
          pageSize={pageSize}
          onPageSizeChange={(s) => { setPageSize(s); setPage(1) }}
          totalItems={sales.length}
        />
        </>
      )}
    </div>
  )
}
