/**
 * uiStore.js — Store global de interfaz de usuario (Zustand).
 *
 * Maneja estado transversal de la UI que necesita ser compartido
 * entre componentes que no tienen relación jerárquica directa.
 *
 * Actualmente gestiona:
 *  - Estado del sidebar (abierto/cerrado)
 *
 * Se puede extender para manejar otros estados globales de UI como:
 *  - Modales globales
 *  - Tema claro/oscuro
 *  - Preferencias de visualización
 *
 * Estado:
 *  @property {boolean} sidebarOpen - Indica si el sidebar está abierto (true) o cerrado (false)
 *
 * Acciones:
 *  @method toggleSidebar()       - Alterna el estado del sidebar (abierto ↔ cerrado)
 *  @method setSidebarOpen(open)  - Establece directamente el estado del sidebar
 */
import { create } from 'zustand'

/**
 * useUIStore — Hook de Zustand para acceder al store de UI.
 *
 * Uso básico:
 *   const { sidebarOpen, toggleSidebar } = useUIStore()
 *
 * Uso con selector:
 *   const sidebarOpen = useUIStore((s) => s.sidebarOpen)
 */
export const useUIStore = create((set) => ({
  /* ── Estado inicial ──────────────────────────────────────────── */

  /** El sidebar empieza abierto por defecto */
  sidebarOpen: true,

  /* ── Acciones ────────────────────────────────────────────────── */

  /**
   * toggleSidebar — Alterna el estado del sidebar.
   * Si está abierto lo cierra, si está cerrado lo abre.
   */
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  /**
   * setSidebarOpen — Establece el estado del sidebar directamente.
   * Útil cuando se necesita forzar un estado específico (ej: cerrar
   * en mobile al hacer resize o al navegar).
   *
   * @param {boolean} open - true para abrir, false para cerrar
   */
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}))
