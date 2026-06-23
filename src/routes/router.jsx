/**
 * router.jsx — Definición central de rutas con React Router v7.
 *
 * Flujo de navegación:
 *  /setup        → SetupWizard (solo si setup no completado)
 *  /login        → LoginForm
 *  /role-select  → RoleSelector (si usuario tiene múltiples roles)
 *  /*            → ProtectedRoute → RoleGuard → AppLayout → página
 */
import { createBrowserRouter, Navigate } from 'react-router-dom'

import { LoginForm }    from '@/modules/auth/components/LoginForm'
import { RoleSelector } from '@/modules/auth/components/RoleSelector'
import { SetupWizard }  from '@/modules/auth/components/SetupWizard'
import { ProtectedRoute } from './ProtectedRoute'
import { RoleGuard }      from './RoleGuard'
import { RootRedirect }   from './RootRedirect'
import { AppLayout }      from '@/shared/components/AppLayout'
import { POSPage }        from '@/modules/pos/components/POSPage'
import { StockPage }      from '@/modules/stock/components/StockPage'
import { SuppliersPage }  from '@/modules/suppliers/components/SuppliersPage'
import { DashboardPage }  from '@/modules/admin/components/DashboardPage'
import { UsersPage }      from '@/modules/admin/components/UsersPage'
import { SettingsPage }   from '@/modules/admin/components/SettingsPage'
import { DiscountsPage }  from '@/modules/admin/components/DiscountsPage'
import { CustomersPage }  from '@/modules/customers/components/CustomersPage'
import { ReportsPage }    from '@/modules/reports/components/ReportsPage'

export const router = createBrowserRouter([
  // ── Públicas ────────────────────────────────────────────────
  { path: '/setup',       element: <SetupWizard /> },
  { path: '/login',       element: <LoginForm /> },
  { path: '/role-select', element: <RoleSelector /> },

  // ── Protegidas ──────────────────────────────────────────────
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          // Dashboard (Admin / Superadmin)
          {
            element: <RoleGuard allowed={['superadmin', 'admin']} />,
            children: [
              { path: '/admin/dashboard', element: <DashboardPage /> },
              { path: '/reports',         element: <ReportsPage /> },
              { path: '/admin/users',     element: <UsersPage /> },
              { path: '/admin/discounts', element: <DiscountsPage /> },
              { path: '/customers',       element: <CustomersPage /> },
            ],
          },
          // Configuración (solo Superadmin)
          {
            element: <RoleGuard allowed={['superadmin']} />,
            children: [
              { path: '/admin/settings', element: <SettingsPage /> },
            ],
          },
          // POS (Admin, Cajero, Superadmin)
          {
            element: <RoleGuard allowed={['superadmin', 'admin', 'cajero']} />,
            children: [
              { path: '/pos', element: <POSPage /> },
            ],
          },
          // Stock (todos los roles)
          {
            element: <RoleGuard allowed={['superadmin', 'admin', 'cajero', 'repositor']} />,
            children: [
              { path: '/stock', element: <StockPage /> },
            ],
          },
          // Proveedores (Admin, Superadmin, Repositor)
          {
            element: <RoleGuard allowed={['superadmin', 'admin', 'repositor']} />,
            children: [
              { path: '/suppliers', element: <SuppliersPage /> },
            ],
          },
        ],
      },
    ],
  },

  // Raíz → verifica setup y sesión antes de redirigir
  { path: '/',  element: <RootRedirect /> },
  { path: '*',  element: <Navigate to="/" replace /> },
])
