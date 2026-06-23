/**
 * App.jsx — Componente raíz de toda la aplicación.
 *
 * Responsabilidades:
 *  1. Envuelve la app en un AuthProvider que inicializa y escucha
 *     los cambios de sesión de Supabase (login, logout, expiración).
 *  2. Monta el RouterProvider de React Router para habilitar la
 *     navegación basada en el árbol de rutas definido en router.jsx.
 *  3. Configura el sistema de notificaciones toast (react-hot-toast)
 *     con estilos oscuros que coinciden con el tema de la app.
 */
import { RouterProvider } from 'react-router-dom'
import { Toaster }        from 'react-hot-toast'
import { router }         from '@/routes/router'
import { useAuth }        from '@/modules/auth/hooks/useAuth'

/**
 * AuthProvider — Componente envolvente que activa el hook useAuth.
 *
 * Al montarse, useAuth() suscribe la app a los eventos de autenticación
 * de Supabase (onAuthStateChange). Esto garantiza que el store global
 * (authStore) se mantenga sincronizado con la sesión real del usuario.
 *
 * @param {object} props
 * @param {React.ReactNode} props.children - Contenido hijo a renderizar
 * @returns {React.ReactNode} Los hijos sin envoltorio adicional de DOM
 */
function AuthProvider({ children }) {
  // Inicializa la sesión y escucha cambios de auth de Supabase
  useAuth()
  return children
}

/**
 * App — Componente principal exportado como default.
 *
 * Estructura de renderizado:
 *  <AuthProvider>          ← activa el listener de autenticación
 *    <RouterProvider />    ← renderiza la ruta activa según la URL
 *    <Toaster />           ← contenedor flotante para notificaciones toast
 *  </AuthProvider>
 *
 * @returns {JSX.Element} Árbol raíz de la aplicación
 */
export default function App() {
  return (
    <AuthProvider>
      {/* Proveedor del router — renderiza las rutas según la URL actual */}
      <RouterProvider router={router} />

      {/* Sistema de notificaciones toast — posición superior derecha */}
      <Toaster
        position="top-right"
        toastOptions={{
          /* Estilos base del toast — tema oscuro acorde al diseño de la app */
          style: {
            background: '#1e293b',   /* surface-800 */
            color:      '#f1f5f9',   /* surface-100 */
            border:     '1px solid #334155', /* surface-700 */
            borderRadius: '10px',
            fontSize:   '14px',
          },
          /* Ícono verde para notificaciones de éxito */
          success: { iconTheme: { primary: '#22c55e', secondary: '#fff' } },
          /* Ícono rojo para notificaciones de error */
          error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
        }}
      />
    </AuthProvider>
  )
}
