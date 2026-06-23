/**
 * SuppliersTab — Lista y ABM de proveedores.
 */
import { useState, useEffect } from 'react'
import { Plus, Pencil, Power } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '@/shared/components/Button'
import { Badge } from '@/shared/components/Badge'
import { Spinner } from '@/shared/components/Spinner'
import { ConfirmDialog } from '@/shared/components/ConfirmDialog'
import { getSuppliers, toggleSupplierActive } from '../services/supplierService'
import { SupplierFormModal } from './SupplierFormModal'

export function SuppliersTab() {
  const [suppliers, setSuppliers]   = useState([])
  const [loading, setLoading]       = useState(true)
  const [formOpen, setFormOpen]     = useState(false)
  const [editSup, setEditSup]       = useState(null)
  const [toggleTarget, setToggle]   = useState(null)

  const load = async () => {
    setLoading(true)
    try { setSuppliers(await getSuppliers()) }
    catch { toast.error('Error al cargar proveedores') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleToggle = async () => {
    try {
      await toggleSupplierActive(toggleTarget.id, !toggleTarget.is_active)
      toast.success(toggleTarget.is_active ? 'Proveedor desactivado' : 'Proveedor activado')
      setToggle(null)
      load()
    } catch { toast.error('Error al cambiar estado') }
  }

  if (loading) return <div className="flex justify-center py-16"><Spinner /></div>

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => { setEditSup(null); setFormOpen(true) }}>
          <Plus className="w-4 h-4" /> Nuevo proveedor
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-surface-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-800 text-surface-400 text-left">
              <th className="px-4 py-3 font-medium">Razón social</th>
              <th className="px-4 py-3 font-medium">CUIT</th>
              <th className="px-4 py-3 font-medium">Teléfono</th>
              <th className="px-4 py-3 font-medium">Pago</th>
              <th className="px-4 py-3 font-medium text-center">Entrega</th>
              <th className="px-4 py-3 font-medium text-center">Estado</th>
              <th className="px-4 py-3 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-800">
            {suppliers.length === 0 && (
              <tr><td colSpan={7} className="text-center text-surface-600 py-10">Sin proveedores</td></tr>
            )}
            {suppliers.map((s) => (
              <tr key={s.id} className={`hover:bg-surface-800/50 transition-colors ${!s.is_active ? 'opacity-50' : ''}`}>
                <td className="px-4 py-3 font-medium text-white">{s.razon_social}</td>
                <td className="px-4 py-3 text-surface-400 font-mono text-xs">{s.cuit || '—'}</td>
                <td className="px-4 py-3 text-surface-400">{s.phone || '—'}</td>
                <td className="px-4 py-3 text-surface-400">{s.payment_condition || '—'}</td>
                <td className="px-4 py-3 text-center text-surface-400">
                  {s.delivery_days ? `${s.delivery_days}d` : '—'}
                </td>
                <td className="px-4 py-3 text-center">
                  <Badge color={s.is_active ? 'green' : 'gray'}>{s.is_active ? 'Activo' : 'Inactivo'}</Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => { setEditSup(s); setFormOpen(true) }} className="p-1.5 text-surface-500 hover:text-primary-400 hover:bg-primary-400/10 rounded-lg transition-colors">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => setToggle(s)} className="p-1.5 text-surface-500 hover:text-orange-400 hover:bg-orange-400/10 rounded-lg transition-colors">
                      <Power className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SupplierFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={load}
        supplier={editSup}
      />

      <ConfirmDialog
        open={!!toggleTarget}
        title={toggleTarget?.is_active ? 'Desactivar proveedor' : 'Activar proveedor'}
        message={`¿${toggleTarget?.is_active ? 'Desactivar' : 'Activar'} a "${toggleTarget?.razon_social}"?`}
        confirmLabel={toggleTarget?.is_active ? 'Desactivar' : 'Activar'}
        variant={toggleTarget?.is_active ? 'danger' : 'primary'}
        onConfirm={handleToggle}
        onCancel={() => setToggle(null)}
      />
    </div>
  )
}
