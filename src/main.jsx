/**
 * main.jsx — Punto de entrada de la aplicación.
 *
 * Monta el componente raíz <App /> dentro del elemento HTML con id "root".
 * Se usa StrictMode de React para activar advertencias adicionales en
 * desarrollo (doble renderizado, detección de efectos inseguros, etc.).
 */
import { StrictMode } from 'react'
import { createRoot }  from 'react-dom/client'
import './index.css'
import App from './App'

/**
 * Crea la raíz de React 18+ usando createRoot (API concurrente)
 * y renderiza la aplicación envuelta en StrictMode.
 *
 * StrictMode NO afecta el build de producción; solo activa
 * verificaciones extras durante el desarrollo.
 */
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
