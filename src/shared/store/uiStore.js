/**
 * Store global de UI (Zustand).
 * Maneja estado transversal de interfaz: sidebar, modales globales, etc.
 */
import { create } from 'zustand'

export const useUIStore = create((set) => ({
  sidebarOpen: true,

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}))
