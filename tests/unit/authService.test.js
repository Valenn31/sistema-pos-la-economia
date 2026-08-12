import { vi, describe, it, expect, beforeEach } from 'vitest'
import { chainable } from '../helpers/supabaseMock'

vi.mock('@/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
    auth: { signInWithPassword: vi.fn(), signUp: vi.fn(), signOut: vi.fn() },
  },
}))

import { supabase } from '@/supabase/client'
import { checkSetupCompleted, signIn, getSessionData } from '@/modules/auth/services/authService'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('checkSetupCompleted', () => {
  it('devuelve false si app_settings no tiene fila (PGRST116) — nunca se hizo el setup', async () => {
    supabase.from.mockReturnValueOnce(chainable({ data: null, error: { code: 'PGRST116' } }))
    await expect(checkSetupCompleted()).resolves.toBe(false)
  })

  it('propaga cualquier otro error en vez de asumir "no configurado"', async () => {
    supabase.from.mockReturnValueOnce(chainable({ data: null, error: { code: 'NETWORK_ERROR', message: 'fetch failed' } }))
    await expect(checkSetupCompleted()).rejects.toBeTruthy()
  })

  it('devuelve true cuando value es la cadena "true"', async () => {
    supabase.from.mockReturnValueOnce(chainable({ data: { value: 'true' }, error: null }))
    await expect(checkSetupCompleted()).resolves.toBe(true)
  })

  it('devuelve false cuando value es "false"', async () => {
    supabase.from.mockReturnValueOnce(chainable({ data: { value: 'false' }, error: null }))
    await expect(checkSetupCompleted()).resolves.toBe(false)
  })
})

describe('getSessionData', () => {
  it('devuelve roles vacíos si el usuario no tiene ninguno asignado', async () => {
    supabase.from
      .mockReturnValueOnce(chainable({ data: { id: 'u1', full_name: 'Juan' }, error: null })) // profiles
      .mockReturnValueOnce(chainable({ data: [], error: null }))                               // user_roles

    const result = await getSessionData('u1')
    expect(result.profile.full_name).toBe('Juan')
    expect(result.roles).toEqual([])
  })

  it('resuelve los nombres de los roles asignados', async () => {
    supabase.from
      .mockReturnValueOnce(chainable({ data: { id: 'u1', full_name: 'Juan' }, error: null }))       // profiles
      .mockReturnValueOnce(chainable({ data: [{ role_id: 1 }, { role_id: 2 }], error: null }))       // user_roles
      .mockReturnValueOnce(chainable({ data: [{ name: 'admin' }, { name: 'cajero' }], error: null })) // roles

    const result = await getSessionData('u1')
    expect(result.roles).toEqual(['admin', 'cajero'])
  })

  it('propaga el error si falla la consulta del perfil', async () => {
    supabase.from.mockReturnValueOnce(chainable({ data: null, error: new Error('boom') }))
    await expect(getSessionData('u1')).rejects.toThrow('boom')
  })
})

describe('signIn', () => {
  it('lanza el error de Supabase si las credenciales son inválidas', async () => {
    supabase.auth.signInWithPassword.mockResolvedValueOnce({ data: null, error: { message: 'Invalid login credentials' } })
    await expect(signIn('mal@mail.com', 'wrong')).rejects.toEqual({ message: 'Invalid login credentials' })
  })

  it('en éxito, retorna user + profile + roles', async () => {
    supabase.auth.signInWithPassword.mockResolvedValueOnce({ data: { user: { id: 'u1', email: 'ok@mail.com' } }, error: null })
    supabase.from
      .mockReturnValueOnce(chainable({ data: { id: 'u1', full_name: 'Juan' }, error: null }))
      .mockReturnValueOnce(chainable({ data: [{ role_id: 1 }], error: null }))
      .mockReturnValueOnce(chainable({ data: [{ name: 'cajero' }], error: null }))

    const result = await signIn('ok@mail.com', '1234')
    expect(result.user.email).toBe('ok@mail.com')
    expect(result.roles).toEqual(['cajero'])
  })
})
