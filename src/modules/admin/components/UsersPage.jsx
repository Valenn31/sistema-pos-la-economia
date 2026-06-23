/**
 * UsersPage — Página de gestión de usuarios y sus roles.
 * Accesible para superadmin desde /admin/users.
 * Permite crear usuarios, editarlos, y activar/desactivar cuentas.
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

/** Mapa de colores de badge por nombre de rol */
const ROLE_COLORS = {
  superadmin: 'purple',
  admin:      'blue',
  cajero:     'green',
  repositor:  'yellow',
}

/**
 * UsersPage — Componente principal de la página de usuarios.
 * Carga usuarios y roles en paralelo, muestra una tabla con acciones
 * de edición y toggle de estado activo/inactivo.
 */
export function UsersPage() {
  // Lista de usuarios cargados desde Supabase
  const [users, setUsers]         = useState([])
  // Lista de roles disponibles para asignar
  const [roles, setRoles]         = useState([])
  // Indicador de carga inicial
  const [loading, setLoading]     = useState(true)
  // Controla la visibilidad del modal de formulario (crear/editar)
  const [formOpen, setFormOpen]   = useState(false)
  // Usuario actualmente en edición (null = modo creación)
  const [editUser, setEditUser]   = useState(null)
  // Usuario seleccionado para activar/desactivar (abre diálogo de confirmación)
  const [toggleTarget, setToggle] = useState(null)

  /**
   * Carga usuarios y roles en paralelo desde el servicio.
   * Se ejecuta al montar el componente y tras cada operación exitosa.
   */
  const load = async () => {
    setLoading(true)
    try {
      const [u, r] = await Promise.all([getUsers(), getRoles()])
      setUsers(u)
      setRoles(r)
    } catch { toast.error('Error al cargar usuarios') }
    finally { setLoading(false) }
  }

  // Cargar datos al montar el componente
  useEffect(() => { load() }, [])

  /** Alterna el estado activo/inactivo del usuario seleccionado */
  const handleToggle = async () => {
    try {
      await toggleUserActive(toggleTarget.id, !toggleTarget.is_active)
      toast.success(toggleTarget.is_active ? 'Usuario desactivado' : 'Usuario activado')
      setToggle(null)
      load()
    } catch { toast.error('Error al cambiar estado') }
  }

  // Mostrar spinner centrado mientras se cargan los datos
  if (loading) return <div className="flex justify-center py-16"><Spinner /></div>

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 space-y-4">
        {/* Encabezado con título y botón para crear nuevo usuario */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Usuarios</h1>
          <Button onClick={() => { setEditUser(null); setFormOpen(true) }}>
            <Plus className="w-4 h-4" /> Nuevo usuario
          </Button>
        </div>

        {/* Tabla de usuarios con columnas: nombre, roles, PIN, estado y acciones */}
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
              {/* Fila de estado vacío cuando no hay usuarios */}
              {users.length === 0 && (
                <tr><td colSpan={5} className="text-center text-surface-600 py-10">Sin usuarios</td></tr>
              )}
              {users.map((u) => (
                <tr key={u.id} className={`hover:bg-surface-800/50 transition-colors ${!u.is_active ? 'opacity-50' : ''}`}>
                  {/* Nombre completo */}
                  <td className="px-4 py-3 font-medium text-white">{u.full_name}</td>
                  {/* Badges de roles asignados */}
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {u.roles.length === 0
                        ? <Badge color="gray">Sin rol</Badge>
                        : u.roles.map((r) => (
                            <Badge key={r.id} color={ROLE_COLORS[r.name] ?? 'gray'}>{r.name}</Badge>
                          ))}
                    </div>
                  </td>
                  {/* Indicador de PIN configurado (oculto con puntos) */}
                  <td className="px-4 py-3 text-center">
                    {u.pin ? (
                      <span className="font-mono text-surface-400 text-xs">••••</span>
                    ) : (
                      <span className="text-surface-600 text-xs">—</span>
                    )}
                  </td>
                  {/* Badge de estado activo/inactivo */}
                  <td className="px-4 py-3 text-center">
                    <Badge color={u.is_active ? 'green' : 'gray'}>{u.is_active ? 'Activo' : 'Inactivo'}</Badge>
                  </td>
                  {/* Botones de acción: editar y activar/desactivar */}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {/* Botón para abrir el modal de edición */}
                      <button
                        title="Editar"
                        onClick={() => { setEditUser(u); setFormOpen(true) }}
                        className="p-1.5 text-surface-500 hover:text-primary-400 hover:bg-primary-400/10 rounded-lg transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      {/* Botón para abrir el diálogo de confirmación de toggle */}
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

      {/* Modal de formulario para crear/editar usuario */}
      <UserFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={load}
        user={editUser}
        allRoles={roles}
      />

      {/* Diálogo de confirmación para activar/desactivar usuario */}
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
