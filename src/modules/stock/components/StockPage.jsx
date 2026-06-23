/**
 * StockPage — Página principal del módulo de Stock.
 * Tabs: Productos | Categorías | Niveles de Stock | Movimientos
 */
import { useState, useEffect } from 'react'
import { Package, Tag, BarChart3, History, Calendar } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/shared/store/authStore'
import { getCategories } from '../services/productService'
import { getStockLevels, getLocations } from '../services/movementService'
import { ProductsTab }   from './ProductsTab'
import { CategoriesTab } from './CategoriesTab'
import { StockLevelsTab } from './StockLevelsTab'
import { MovementsTab }  from './MovementsTab'
import { ExpiryTab }     from './ExpiryTab'

const TABS = [
  { id: 'products',   label: 'Productos',     icon: Package,   roles: ['superadmin', 'admin', 'cajero', 'repositor'] },
  { id: 'categories', label: 'Categorías',    icon: Tag,       roles: ['superadmin', 'admin', 'repositor'] },
  { id: 'levels',     label: 'Niveles stock', icon: BarChart3, roles: ['superadmin', 'admin', 'cajero', 'repositor'] },
  { id: 'movements',  label: 'Movimientos',   icon: History,   roles: ['superadmin', 'admin', 'repositor'] },
  { id: 'expiry',     label: 'Vencimientos',  icon: Calendar,  roles: ['superadmin', 'admin', 'repositor'] },
]

export function StockPage() {
  const { activeRole } = useAuthStore()
  const availableTabs  = TABS.filter((t) => t.roles.includes(activeRole))
  const [activeTab, setActiveTab] = useState(availableTabs[0]?.id ?? 'products')

  const [categories,   setCategories]   = useState([])
  const [stockLevels,  setStockLevels]  = useState([])
  const [locations,    setLocations]    = useState([])

  const loadCategories = async () => {
    try { setCategories(await getCategories()) } catch { toast.error('Error cargando categorías') }
  }

  const loadStockLevels = async () => {
    try {
      const [levels, locs] = await Promise.all([getStockLevels(), getLocations()])
      setStockLevels(levels)
      setLocations(locs)
    } catch { toast.error('Error cargando stock') }
  }

  useEffect(() => {
    loadCategories()
    loadStockLevels()
  }, [])

  const handleRefresh = () => {
    loadCategories()
    loadStockLevels()
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-6 pt-6 pb-0">
        <h1 className="text-2xl font-bold text-white mb-4">Stock</h1>

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
        {activeTab === 'products' && (
          <ProductsTab
            categories={categories}
            onRefreshNeeded={handleRefresh}
          />
        )}
        {activeTab === 'categories' && (
          <CategoriesTab
            categories={categories}
            onRefresh={loadCategories}
          />
        )}
        {activeTab === 'levels' && (
          <StockLevelsTab
            stockLevels={stockLevels}
            locations={locations}
            onRefresh={loadStockLevels}
          />
        )}
        {activeTab === 'movements' && (
          <MovementsTab />
        )}
        {activeTab === 'expiry' && (
          <ExpiryTab />
        )}
      </div>
    </div>
  )
}
