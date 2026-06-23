/**
 * App.jsx — Componente raíz.
 * Monta el router y el listener de autenticación global.
 * También registra el proveedor de notificaciones (react-hot-toast).
 */
import { RouterProvider } from 'react-router-dom'
import { Toaster }        from 'react-hot-toast'
import { router }         from '@/routes/router'
import { useAuth }        from '@/modules/auth/hooks/useAuth'

function AuthProvider({ children }) {
  // Inicializa la sesión y escucha cambios de auth de Supabase
  useAuth()
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1e293b',
            color:      '#f1f5f9',
            border:     '1px solid #334155',
            borderRadius: '10px',
            fontSize:   '14px',
          },
          success: { iconTheme: { primary: '#22c55e', secondary: '#fff' } },
          error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
        }}
      />
    </AuthProvider>
  )
}
