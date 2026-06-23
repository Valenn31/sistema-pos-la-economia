/**
 * SuppliersPage — Página principal del módulo de Proveedores.
 * Tabs: Proveedores | Notas de Pedido | Órdenes de Compra
 */
import { useState, useEffect } from 'react'
import { Truck, FileText, ClipboardList } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/shared/store/authStore'
import { getSuppliers } from '../services/supplierService'
import { SuppliersTab } from './SuppliersTab'
import { PurchaseNotesTab } from './PurchaseNotesTab'
import { PurchaseOrdersTab } from './PurchaseOrdersTab'

const TABS = [
  { id: 'suppliers', label: 'Proveedores',        icon: Truck,         roles: ['superadmin', 'admin'] },
  { id: 'notes',     label: 'Notas de Pedido',    icon: FileText,      roles: ['superadmin', 'admin', 'repositor'] },
  { id: 'orders',    label: 'Órdenes de Compra',  icon: ClipboardList, roles: ['superadmin', 'admin'] },
]

export function SuppliersPage() {
  const { activeRole } = useAuthStore()
  const availableTabs  = TABS.filter((t) => t.roles.includes(activeRole))
  const [activeTab, setActiveTab] = useState(availableTabs[0]?.id ?? 'notes')
  const [suppliers, setSuppliers] = useState([])

  useEffect(() => {
    getSuppliers()
      .then(setSuppliers)
      .catch(() => toast.error('Error al cargar proveedores'))
  }, [])

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-6 pt-6 pb-0">
        <h1 className="text-2xl font-bold text-white mb-4">Proveedores</h1>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-surface-800">
          {availableTabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTab === id
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

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'suppliers' && <SuppliersTab />}
        {activeTab === 'notes'     && <PurchaseNotesTab suppliers={suppliers} />}
        {activeTab === 'orders'    && <PurchaseOrdersTab suppliers={suppliers} />}
      </div>
    </div>
  )
}
