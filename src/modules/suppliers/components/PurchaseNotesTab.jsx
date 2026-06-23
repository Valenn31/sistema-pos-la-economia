/**
 * PurchaseNotesTab — Lista de Notas de Pedido.
 * Repositor puede crear/editar borradores.
 * Admin/Superadmin puede aprobar, rechazar o convertir a OC.
 */
import { useState, useEffect } from 'react'
import { Plus, Eye, Pencil, CheckCircle, XCircle, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '@/shared/components/Button'
import { Badge } from '@/shared/components/Badge'
import { Spinner } from '@/shared/components/Spinner'
import { useAuthStore } from '@/shared/store/authStore'
import { getPurchaseNotes, getPurchaseNoteById, updateNoteStatus } from '../services/purchaseService'
import { formatDateTime } from '@/shared/utils/formatters'
import { PurchaseNoteFormModal } from './PurchaseNoteFormModal'
import { PurchaseOrderFormModal } from './PurchaseOrderFormModal'

const STATUS_COLORS = {
  draft:     'gray',
  submitted: 'yellow',
  approved:  'green',
  rejected:  'red',
  converted: 'blue',
}

const STATUS_LABELS = {
  draft:     'Borrador',
  submitted: 'Enviada',
  approved:  'Aprobada',
  rejected:  'Rechazada',
  converted: 'Convertida',
}

const ADMIN_ROLES = ['superadmin', 'admin']

export function PurchaseNotesTab({ suppliers }) {
  const { activeRole } = useAuthStore()
  const isAdmin = ADMIN_ROLES.includes(activeRole)

  const [notes, setNotes]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [formOpen, setFormOpen]     = useState(false)
  const [editNote, setEditNote]     = useState(null)
  const [orderFromNote, setOrderFromNote] = useState(null)

  const load = async () => {
    setLoading(true)
    try { setNotes(await getPurchaseNotes()) }
    catch { toast.error('Error al cargar notas') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const changeStatus = async (note, status) => {
    try {
      await updateNoteStatus(note.id, status)
      toast.success(`Nota marcada como "${STATUS_LABELS[status]}"`)
      load()
    } catch (err) {
      toast.error(err.message ?? 'Error')
    }
  }

  const openConvertToOrder = async (note) => {
    const full = await getPurchaseNoteById(note.id)
    setOrderFromNote(full)
  }

  if (loading) return <div className="flex justify-center py-16"><Spinner /></div>

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => { setEditNote(null); setFormOpen(true) }}>
          <Plus className="w-4 h-4" /> Nueva nota de pedido
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-surface-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-800 text-surface-400 text-left">
              <th className="px-4 py-3 font-medium">#</th>
              {isAdmin && <th className="px-4 py-3 font-medium">Proveedor</th>}
              <th className="px-4 py-3 font-medium">Creada por</th>
              <th className="px-4 py-3 font-medium">Fecha</th>
              <th className="px-4 py-3 font-medium text-center">Estado</th>
              <th className="px-4 py-3 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-800">
            {notes.length === 0 && (
              <tr><td colSpan={isAdmin ? 6 : 5} className="text-center text-surface-600 py-10">Sin notas de pedido</td></tr>
            )}
            {notes.map((n) => (
              <tr key={n.id} className="hover:bg-surface-800/50 transition-colors">
                <td className="px-4 py-3 font-mono text-surface-400 text-xs">#{n.note_number}</td>
                {isAdmin && <td className="px-4 py-3 font-medium text-white">{n.suppliers?.razon_social ?? 'Sin asignar'}</td>}
                <td className="px-4 py-3 text-surface-400">{n.profiles?.full_name ?? '—'}</td>
                <td className="px-4 py-3 text-surface-400 text-xs">{formatDateTime(n.created_at)}</td>
                <td className="px-4 py-3 text-center">
                  <Badge color={STATUS_COLORS[n.status] ?? 'gray'}>{STATUS_LABELS[n.status] ?? n.status}</Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    {/* Repositor: editar borradores */}
                    {n.status === 'draft' && (
                      <>
                        <button
                          title="Editar"
                          onClick={async () => { const full = await getPurchaseNoteById(n.id); setEditNote(full); setFormOpen(true) }}
                          className="p-1.5 text-surface-500 hover:text-primary-400 hover:bg-primary-400/10 rounded-lg transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          title="Enviar para aprobación"
                          onClick={() => changeStatus(n, 'submitted')}
                          className="p-1.5 text-surface-500 hover:text-yellow-400 hover:bg-yellow-400/10 rounded-lg transition-colors"
                        >
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    {/* Admin: aprobar / rechazar / convertir */}
                    {isAdmin && n.status === 'submitted' && (
                      <>
                        <button
                          title="Aprobar"
                          onClick={() => changeStatus(n, 'approved')}
                          className="p-1.5 text-surface-500 hover:text-green-400 hover:bg-green-400/10 rounded-lg transition-colors"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                        <button
                          title="Rechazar"
                          onClick={() => changeStatus(n, 'rejected')}
                          className="p-1.5 text-surface-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    {isAdmin && n.status === 'approved' && (
                      <button
                        title="Convertir a Orden de Compra"
                        onClick={() => openConvertToOrder(n)}
                        className="p-1.5 text-surface-500 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <PurchaseNoteFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={load}
        note={editNote}
        suppliers={suppliers}
      />

      {orderFromNote && (
        <PurchaseOrderFormModal
          open={!!orderFromNote}
          onClose={() => setOrderFromNote(null)}
          onSaved={load}
          fromNote={orderFromNote}
          suppliers={suppliers}
        />
      )}
    </div>
  )
}
