/**
 * DashboardPage — Panel principal con KPIs del día.
 */
import { useState, useEffect } from 'react'
import { ShoppingCart, DollarSign, AlertTriangle, Users, RefreshCw, Store, Clock } from 'lucide-react'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar } from 'recharts'
import toast from 'react-hot-toast'
import { Spinner } from '@/shared/components/Spinner'
import { Badge }   from '@/shared/components/Badge'
import { Button }  from '@/shared/components/Button'
import { getDashboardStats, getSettings, getWeeklySales } from '../services/adminService'
import { formatCurrency } from '@/shared/utils/formatters'

function KpiCard({ icon: Icon, label, value, sub, color = 'primary' }) {
  const colors = {
    primary: 'bg-primary-600/10 text-primary-400 border-primary-600/20',
    yellow:  'bg-yellow-600/10 text-yellow-400 border-yellow-600/20',
    red:     'bg-red-600/10 text-red-400 border-red-600/20',
    blue:    'bg-blue-600/10 text-blue-400 border-blue-600/20',
  }
  return (
    <div className={`rounded-2xl border p-5 ${colors[color]}`}>
      <div className="flex items-start justify-between mb-3">
        <Icon className="w-6 h-6" />
        <span className="text-2xl font-bold">{value}</span>
      </div>
      <p className="font-semibold">{label}</p>
      {sub && <p className="text-xs opacity-70 mt-0.5">{sub}</p>}
    </div>
  )
}

export function DashboardPage() {
  const [stats,      setStats]      = useState(null)
  const [settings,   setSettings]   = useState({})
  const [weeklyData, setWeeklyData] = useState([])
  const [loading,    setLoading]    = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const [s, cfg, weekly] = await Promise.all([getDashboardStats(), getSettings(), getWeeklySales()])
      setStats(s)
      setSettings(cfg)
      setWeeklyData(weekly)
    } catch { toast.error('Error al cargar estadísticas') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  if (loading) return <div className="flex items-center justify-center h-full"><Spinner size="lg" /></div>

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Store className="w-5 h-5 text-primary-400" />
              <h1 className="text-xl font-bold text-white">{settings.business_name ?? 'La Economía'}</h1>
            </div>
            <p className="text-surface-500 text-sm">
              {new Date().toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={load}>
            <RefreshCw className="w-4 h-4" /> Actualizar
          </Button>
        </div>

        {/* KPIs del día */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <KpiCard
            icon={ShoppingCart}
            label="Ventas hoy"
            value={stats.ventasHoy}
            sub="transacciones completadas"
            color="primary"
          />
          <KpiCard
            icon={DollarSign}
            label="Recaudado hoy"
            value={formatCurrency(stats.totalHoy)}
            color="primary"
          />
          <KpiCard
            icon={AlertTriangle}
            label="Stock bajo"
            value={stats.lowStockCount}
            sub="productos bajo mínimo"
            color={stats.lowStockCount > 0 ? 'yellow' : 'primary'}
          />
          <KpiCard
            icon={Users}
            label="Clientes c/ deuda"
            value={stats.customersDebt}
            color={stats.customersDebt > 0 ? 'blue' : 'primary'}
          />
          <KpiCard
            icon={Clock}
            label="Por vencer"
            value={stats.expiryCount}
            sub={`próximos ${stats.expiryAlertDays} días`}
            color={stats.expiryCount > 0 ? 'red' : 'primary'}
          />
        </div>

        {/* Cajas activas */}
        {stats.activeSessions.length > 0 && (
          <div className="card">
            <h2 className="text-sm font-semibold text-surface-400 uppercase tracking-wider mb-3">Cajas abiertas</h2>
            <div className="flex flex-wrap gap-2">
              {stats.activeSessions.map((s) => (
                <Badge key={s.id} color="green">
                  {s.cash_registers?.name ?? 'Caja'} — abierta
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Gráficos semanales */}
        {weeklyData.length > 0 && (
          <div className="grid md:grid-cols-2 gap-4">
            <div className="card">
              <h2 className="text-sm font-semibold text-surface-400 uppercase tracking-wider mb-4">
                Recaudado — últimos 7 días
              </h2>
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={weeklyData}>
                  <defs>
                    <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0}   />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="fecha" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false}
                    tickFormatter={(v) => `$${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                  <Tooltip
                    contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 12 }}
                    formatter={(v) => [formatCurrency(v), 'Recaudado']}
                  />
                  <Area type="monotone" dataKey="total" stroke="#22c55e" fill="url(#totalGrad)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="card">
              <h2 className="text-sm font-semibold text-surface-400 uppercase tracking-wider mb-4">
                Ventas — últimos 7 días
              </h2>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="fecha" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 12 }}
                    formatter={(v) => [v, 'Ventas']}
                  />
                  <Bar dataKey="ventas" fill="#22c55e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Tres columnas: stock bajo + vencimientos + deudores */}
        <div className="grid md:grid-cols-3 gap-4">
          {/* Stock bajo */}
          <div className="card">
            <h2 className="text-sm font-semibold text-surface-400 uppercase tracking-wider mb-3">
              Productos bajo mínimo
            </h2>
            {stats.lowStockItems.length === 0 ? (
              <p className="text-surface-600 text-sm">Todo el stock en orden</p>
            ) : (
              <div className="space-y-2">
                {stats.lowStockItems.map((p) => (
                  <div key={p.name} className="flex items-center justify-between py-1.5 border-b border-surface-800 last:border-0">
                    <span className="text-sm text-white">{p.name}</span>
                    <Badge color="yellow">{p.qty} / {p.minStock} mín.</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Vencimientos */}
          <div className="card">
            <h2 className="text-sm font-semibold text-surface-400 uppercase tracking-wider mb-3">
              Productos por vencer
            </h2>
            {stats.expiryItems.length === 0 ? (
              <p className="text-surface-600 text-sm">Sin vencimientos próximos</p>
            ) : (
              <div className="space-y-2">
                {stats.expiryItems.map((p) => (
                  <div key={p.id} className="flex items-center justify-between py-1.5 border-b border-surface-800 last:border-0">
                    <span className="text-sm text-white">{p.name}</span>
                    <Badge color={p.daysLeft <= 0 ? 'red' : p.daysLeft <= 7 ? 'yellow' : 'gray'}>
                      {p.daysLeft <= 0 ? 'Vencido' : `${p.daysLeft}d`}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Deudores */}
          <div className="card">
            <h2 className="text-sm font-semibold text-surface-400 uppercase tracking-wider mb-3">
              Cuentas corrientes con saldo
            </h2>
            {stats.topDebtors.length === 0 ? (
              <p className="text-surface-600 text-sm">Sin deudas pendientes</p>
            ) : (
              <div className="space-y-2">
                {stats.topDebtors.map((c) => (
                  <div key={c.id} className="flex items-center justify-between py-1.5 border-b border-surface-800 last:border-0">
                    <span className="text-sm text-white">{c.full_name}</span>
                    <span className="text-sm font-semibold text-orange-400">{formatCurrency(c.current_balance)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
