/**
 * router.jsx — Definición central de rutas con React Router v7.
 *
 * Este archivo configura el árbol completo de rutas de la aplicación
 * usando createBrowserRouter. Todas las rutas se definen aquí para
 * tener una visión centralizada de la navegación.
 *
 * Flujo de navegación:
 *  /              → RootRedirect (decide destino según sesión y setup)
 *  /setup         → SetupWizard (configuración inicial de la tienda)
 *  /login         → LoginForm (inicio de sesión)
 *  /role-select   → RoleSelector (selección de rol si tiene varios)
 *  /*             → ProtectedRoute → RoleGuard → AppLayout → página específica
 *
 * Jerarquía de protección:
 *  1. ProtectedRoute verifica que haya sesión activa y rol seleccionado
 *  2. AppLayout provee el sidebar y topbar compartidos
 *  3. RoleGuard filtra por roles autorizados para cada grupo de rutas
 */
import { createBrowserRouter, Navigate } from 'react-router-dom'

/* ── Componentes de autenticación ──────────────────────────────── */
import { LoginForm }    from '@/modules/auth/components/LoginForm'
import { RoleSelector } from '@/modules/auth/components/RoleSelector'
import { SetupWizard }  from '@/modules/auth/components/SetupWizard'

/* ── Guardias y layout de rutas ────────────────────────────────── */
import { ProtectedRoute } from './ProtectedRoute'
import { RoleGuard }      from './RoleGuard'
import { RootRedirect }   from './RootRedirect'
import { AppLayout }      from '@/shared/components/AppLayout'

/* ── Páginas de cada módulo ────────────────────────────────────── */
import { POSPage }        from '@/modules/pos/components/POSPage'
import { StockPage }      from '@/modules/stock/components/StockPage'
import { SuppliersPage }  from '@/modules/suppliers/components/SuppliersPage'
import { DashboardPage }  from '@/modules/admin/components/DashboardPage'
import { UsersPage }      from '@/modules/admin/components/UsersPage'
import { SettingsPage }   from '@/modules/admin/components/SettingsPage'
import { DiscountsPage }  from '@/modules/admin/components/DiscountsPage'
import { CustomersPage }  from '@/modules/customers/components/CustomersPage'
import { ReportsPage }    from '@/modules/reports/components/ReportsPage'

/**
 * router — Instancia del router creada con createBrowserRouter.
 *
 * La estructura es:
 *  - Rutas públicas (sin autenticación): /setup, /login, /role-select
 *  - Rutas protegidas: envueltas en ProtectedRoute > AppLayout > RoleGuard
 *  - Ruta raíz (/): redirige inteligentemente según el estado de la app
 *  - Ruta catch-all (*): redirige a / para cualquier URL no reconocida
 */
export const router = createBrowserRouter([
  // ── Rutas públicas (accesibles sin autenticación) ───────────
  { path: '/setup',       element: <SetupWizard /> },   /* Wizard de configuración inicial */
  { path: '/login',       element: <LoginForm /> },      /* Formulario de inicio de sesión */
  { path: '/role-select', element: <RoleSelector /> },   /* Selector de rol (multi-rol) */

  // ── Rutas protegidas (requieren sesión + rol activo) ────────
  {
    element: <ProtectedRoute />,  /* Verifica autenticación y rol */
    children: [
      {
        element: <AppLayout />,   /* Layout con sidebar y topbar */
        children: [

          /* ── Dashboard y administración (solo Admin y Superadmin) ── */
          {
            element: <RoleGuard allowed={['superadmin', 'admin']} />,
            children: [
              { path: '/admin/dashboard', element: <DashboardPage /> },    /* Panel principal */
              { path: '/reports',         element: <ReportsPage /> },      /* Reportes de ventas */
              { path: '/admin/users',     element: <UsersPage /> },        /* Gestión de usuarios */
              { path: '/admin/discounts', element: <DiscountsPage /> },    /* Gestión de descuentos */
              { path: '/customers',       element: <CustomersPage /> },    /* Gestión de clientes */
            ],
          },

          /* ── Configuración avanzada (solo Superadmin) ──────────── */
          {
            element: <RoleGuard allowed={['superadmin']} />,
            children: [
              { path: '/admin/settings', element: <SettingsPage /> },      /* Config de la tienda */
            ],
          },

          /* ── Punto de venta (Admin, Cajero, Superadmin) ────────── */
          {
            element: <RoleGuard allowed={['superadmin', 'admin', 'cajero']} />,
            children: [
              { path: '/pos', element: <POSPage /> },                     /* Interfaz de ventas */
            ],
          },

          /* ── Gestión de stock (todos los roles) ────────────────── */
          {
            element: <RoleGuard allowed={['superadmin', 'admin', 'cajero', 'repositor']} />,
            children: [
              { path: '/stock', element: <StockPage /> },                 /* Inventario de productos */
            ],
          },

          /* ── Proveedores (Admin, Superadmin, Repositor) ────────── */
          {
            element: <RoleGuard allowed={['superadmin', 'admin', 'repositor']} />,
            children: [
              { path: '/suppliers', element: <SuppliersPage /> },         /* ABM de proveedores */
            ],
          },
        ],
      },
    ],
  },

  /* ── Ruta raíz: verifica setup y sesión antes de redirigir ─── */
  { path: '/',  element: <RootRedirect /> },

  /* ── Catch-all: cualquier URL no definida redirige a la raíz ─ */
  { path: '*',  element: <Navigate to="/" replace /> },
])
