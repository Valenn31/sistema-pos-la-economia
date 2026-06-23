/**
 * ReportsPage — Página principal del módulo de Reportes.
 *
 * Organiza las diferentes pestañas de reportes disponibles:
 * Ventas, Caja, Stock, Devoluciones y Deudores.
 * Cada pestaña renderiza su componente correspondiente.
 *
 * @module reports/components/ReportsPage
 */
import { useState } from 'react'
import { BarChart3, DollarSign, Package, RotateCcw, Users } from 'lucide-react'
import { SalesReportTab } from './SalesReportTab'
import { CashReportTab }  from './CashReportTab'
import { StockAlertTab }  from './StockAlertTab'
import { ReturnsTab }     from './ReturnsTab'
import { DebtorsTab }     from './DebtorsTab'

/**
 * Configuración de las pestañas disponibles en la página de reportes.
 * Cada entrada define un ID único, la etiqueta visible y el ícono de Lucide.
 */
const TABS = [
  { id: 'sales',   label: 'Ventas',       icon: DollarSign },
  { id: 'cash',    label: 'Caja',         icon: BarChart3  },
  { id: 'stock',   label: 'Stock',        icon: Package    },
  { id: 'returns', label: 'Devoluciones', icon: RotateCcw  },
  { id: 'debtors', label: 'Deudores',     icon: Users      },
]

/**
 * Componente contenedor de la página de reportes.
 * Muestra una barra de pestañas (tabs) y renderiza el contenido
 * de la pestaña activa seleccionada por el usuario.
 *
 * @returns {JSX.Element} Página de reportes con navegación por pestañas
 */
export function ReportsPage() {
  /** Estado: ID de la pestaña activa (por defecto: 'sales') */
  const [active, setActive] = useState('sales')

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Encabezado con título y barra de navegación por pestañas */}
      <div className="flex-shrink-0 px-6 pt-6 pb-0">
        <h1 className="text-2xl font-bold text-white mb-4">Reportes</h1>
        <div className="flex gap-1 border-b border-surface-800">
          {/* Renderizar cada botón de pestaña */}
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActive(id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                active === id
                  ? 'border-primary-500 text-primary-400'
                  : 'border-transparent text-surface-500 hover:text-surface-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>
      {/* Contenido de la pestaña activa */}
      <div className="flex-1 overflow-y-auto p-6">
        {active === 'sales'   && <SalesReportTab />}
        {active === 'cash'    && <CashReportTab />}
        {active === 'stock'   && <StockAlertTab />}
        {active === 'returns' && <ReturnsTab />}
        {active === 'debtors' && <DebtorsTab />}
      </div>
    </div>
  )
}
