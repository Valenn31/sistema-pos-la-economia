/**
 * UsersPage — Gestión de usuarios y sus roles.
 */
import { useState, useEffect } from 'react'
import { Plus, Pencil, Power } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '@/shared/components/Button'
import { Badge } from '@/shared/components/Badge'
import { Spinner } from '@/shared/components/Spinner'
import { ConfirmDialog } from '@/shared/components/ConfirmDialog'
import { getUsers, getRoles, toggleUserActive } from '../services/adminService'
import { UserFormModal } from './UserFormModal'

const ROLE_COLORS = {
  superadmin: 'purple',
  admin:      'blue',
  cajero:     'green',
  repositor:  'yellow',
}

export function UsersPage() {
  const [users, setUsers]         = useState([])
  const [roles, setRoles]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [formOpen, setFormOpen]   = useState(false)
  const [editUser, setEditUser]   = useState(null)
  const [toggleTarget, setToggle] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const [u, r] = await Promise.all([getUsers(), getRoles()])
      setUsers(u)
      setRoles(r)
    } catch { toast.error('Error al cargar usuarios') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleToggle = async () => {
    try {
      await toggleUserActive(toggleTarget.id, !toggleTarget.is_active)
      toast.success(toggleTarget.is_active ? 'Usuario desactivado' : 'Usuario activado')
      setToggle(null)
      load()
    } catch { toast.error('Error al cambiar estado') }
  }

  if (loading) return <div className="flex justify-center py-16"><Spinner /></div>

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Usuarios</h1>
          <Button onClick={() => { setEditUser(null); setFormOpen(true) }}>
            <Plus className="w-4 h-4" /> Nuevo usuario
          </Button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-surface-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-800 text-surface-400 text-left">
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">Roles</th>
                <th className="px-4 py-3 font-medium text-center">PIN</th>
                <th className="px-4 py-3 font-medium text-center">Estado</th>
                <th className="px-4 py-3 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-800">
              {users.length === 0 && (
                <tr><td colSpan={5} className="text-center text-surface-600 py-10">Sin usuarios</td></tr>
              )}
              {users.map((u) => (
                <tr key={u.id} className={`hover:bg-surface-800/50 transition-colors ${!u.is_active ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3 font-medium text-white">{u.full_name}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {u.roles.length === 0
                        ? <Badge color="gray">Sin rol</Badge>
                        : u.roles.map((r) => (
                            <Badge key={r.id} color={ROLE_COLORS[r.name] ?? 'gray'}>{r.name}</Badge>
                          ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {u.pin ? (
                      <span className="font-mono text-surface-400 text-xs">••••</span>
                    ) : (
                      <span className="text-surface-600 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge color={u.is_active ? 'green' : 'gray'}>{u.is_active ? 'Activo' : 'Inactivo'}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        title="Editar"
                        onClick={() => { setEditUser(u); setFormOpen(true) }}
                        className="p-1.5 text-surface-500 hover:text-primary-400 hover:bg-primary-400/10 rounded-lg transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        title={u.is_active ? 'Desactivar' : 'Activar'}
                        onClick={() => setToggle(u)}
                        className="p-1.5 text-surface-500 hover:text-orange-400 hover:bg-orange-400/10 rounded-lg transition-colors"
                      >
                        <Power className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <UserFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={load}
        user={editUser}
        allRoles={roles}
      />

      <ConfirmDialog
        open={!!toggleTarget}
        title={toggleTarget?.is_active ? 'Desactivar usuario' : 'Activar usuario'}
        message={`${toggleTarget?.is_active ? 'Desactivar' : 'Activar'} a "${toggleTarget?.full_name}"?`}
        confirmLabel={toggleTarget?.is_active ? 'Desactivar' : 'Activar'}
        variant={toggleTarget?.is_active ? 'danger' : 'primary'}
        onConfirm={handleToggle}
        onCancel={() => setToggle(null)}
      />
    </div>
  )
}
