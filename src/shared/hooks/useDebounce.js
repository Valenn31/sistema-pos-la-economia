/**
 * useDebounce — Hook personalizado para aplicar debounce a un valor.
 *
 * Retrasa la actualización de un valor hasta que el usuario deje de
 * modificarlo durante un período de tiempo (delay). Es especialmente
 * útil para campos de búsqueda donde se quiere evitar hacer una
 * petición al servidor en cada keystroke.
 *
 * Ejemplo de uso:
 *   const [search, setSearch] = useState('')
 *   const debouncedSearch = useDebounce(search, 500)
 *   // debouncedSearch se actualiza 500ms después del último cambio de search
 *
 * @param {*} value - El valor a aplicar debounce (cualquier tipo: string, number, etc.)
 * @param {number} [delay=300] - Tiempo de espera en milisegundos antes de actualizar.
 *                                Por defecto 300ms.
 * @returns {*} El valor "debounceado" — se actualiza solo después de que
 *              el valor de entrada deje de cambiar durante `delay` ms.
 */
import { useState, useEffect } from 'react'

/**
 * useDebounce — Implementación del hook.
 *
 * Internamente usa un estado local (`debounced`) que solo se actualiza
 * cuando el timer de setTimeout se completa sin ser cancelado.
 * Cada vez que `value` o `delay` cambian, se reinicia el timer.
 *
 * @param {*} value - Valor de entrada
 * @param {number} [delay=300] - Milisegundos de espera
 * @returns {*} Valor debounceado
 */
export function useDebounce(value, delay = 300) {
  /** Estado local que almacena el valor debounceado */
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    /**
     * Crear un timer que actualiza el valor debounceado después
     * de `delay` milisegundos sin cambios en `value`.
     */
    const timer = setTimeout(() => setDebounced(value), delay)

    /**
     * Cleanup: si `value` o `delay` cambian antes de que el timer
     * se complete, cancelar el timer anterior para reiniciar la espera.
     */
    return () => clearTimeout(timer)
  }, [value, delay])

  return debounced
}
