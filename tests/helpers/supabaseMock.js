/**
 * supabaseMock.js — Helpers para simular el cliente de Supabase en los tests.
 *
 * El SDK de supabase-js expone query builders "thenable" (se pueden encadenar
 * .select().eq().single() y luego awaitearlos directamente, sin llamar a un
 * método terminal explícito). chainable() reproduce ese comportamiento: cualquier
 * método que se le llame devuelve la misma cadena, y al hacer `await` sobre ella
 * se resuelve con el resultado configurado — sin necesidad de listar a mano
 * cada método de la query (.select, .eq, .insert, .order, .single, etc.).
 */
import { vi } from 'vitest'

/**
 * Crea un query builder falso que se resuelve con `result` al ser awaiteado,
 * sin importar qué métodos de encadenamiento (.select, .eq, .single, ...) se
 * le hayan llamado antes.
 *
 * @param {{data?: *, error?: *}} result - Resultado que debe devolver la query
 * @returns {object} Proxy thenable encadenable
 */
export function chainable(result) {
  const handler = {
    get(target, prop) {
      if (prop === 'then') {
        return (resolve, reject) => Promise.resolve(result).then(resolve, reject)
      }
      if (prop === Symbol.toStringTag) return 'Promise'
      // Cualquier otro método (select, eq, insert, order, limit, single, maybeSingle, ...)
      // devuelve la misma cadena para permitir encadenar indefinidamente.
      return (..._args) => proxy
    },
  }
  const proxy = new Proxy({}, handler)
  return proxy
}

/**
 * Crea un cliente Supabase falso con `from` y `rpc` como vi.fn(), listos para
 * configurar con mockImplementationOnce / mockReturnValue en cada test.
 *
 * @returns {{from: import('vitest').Mock, rpc: import('vitest').Mock, auth: object}}
 */
export function createSupabaseMock() {
  return {
    from: vi.fn(),
    rpc: vi.fn(),
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
    },
  }
}
