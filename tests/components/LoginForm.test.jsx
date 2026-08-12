import { vi, describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const { mockNavigate } = vi.hoisted(() => ({ mockNavigate: vi.fn() }))

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, useNavigate: () => mockNavigate }
})
vi.mock('react-hot-toast', () => ({ default: { error: vi.fn(), success: vi.fn() } }))
vi.mock('@/modules/auth/services/authService', () => ({
  signIn: vi.fn(),
  checkSetupCompleted: vi.fn(),
}))

import toast from 'react-hot-toast'
import { signIn, checkSetupCompleted } from '@/modules/auth/services/authService'
import { useAuthStore } from '@/shared/store/authStore'
import { LoginForm } from '@/modules/auth/components/LoginForm'

beforeEach(() => {
  vi.clearAllMocks()
  useAuthStore.setState({ user: null, profile: null, roles: [], activeRole: null, loading: true })
  checkSetupCompleted.mockResolvedValue(true) // setup ya completo, por defecto
})

async function renderLogin() {
  render(<LoginForm />)
  await waitFor(() => expect(screen.getByPlaceholderText('usuario@laeconomia.com')).toBeInTheDocument())
}

describe('LoginForm — login', () => {
  it('muestra errores de validación si se envía vacío, sin llamar a signIn', async () => {
    await renderLogin()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Ingresar' }))

    expect(await screen.findByText('El email es obligatorio')).toBeInTheDocument()
    expect(await screen.findByText('La contraseña es obligatoria')).toBeInTheDocument()
    expect(signIn).not.toHaveBeenCalled()
  })

  it('si el setup inicial nunca se completó, redirige al wizard en vez de mostrar el form', async () => {
    checkSetupCompleted.mockResolvedValue(false)
    render(<LoginForm />)
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/setup', { replace: true }))
  })

  it('con un solo rol, guarda la sesión y navega directo al home de ese rol', async () => {
    signIn.mockResolvedValue({ user: { id: 'u1' }, profile: { full_name: 'Juan' }, roles: ['cajero'] })
    await renderLogin()
    const user = userEvent.setup()
    await user.type(screen.getByPlaceholderText('usuario@laeconomia.com'), 'cajero@mail.com')
    await user.type(screen.getByPlaceholderText('••••••••'), '1234')
    await user.click(screen.getByRole('button', { name: 'Ingresar' }))

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/pos'))
    expect(useAuthStore.getState().activeRole).toBe('cajero')
    expect(useAuthStore.getState().user).toEqual({ id: 'u1' })
  })

  it('con varios roles, no fija un rol activo y va a la pantalla de selección', async () => {
    signIn.mockResolvedValue({ user: { id: 'u1' }, profile: { full_name: 'Juan' }, roles: ['admin', 'cajero'] })
    await renderLogin()
    const user = userEvent.setup()
    await user.type(screen.getByPlaceholderText('usuario@laeconomia.com'), 'admin@mail.com')
    await user.type(screen.getByPlaceholderText('••••••••'), '1234')
    await user.click(screen.getByRole('button', { name: 'Ingresar' }))

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/role-select'))
    expect(useAuthStore.getState().activeRole).toBeNull()
  })

  it('si las credenciales son inválidas, muestra un toast de error y no navega', async () => {
    signIn.mockRejectedValue(new Error('Credenciales inválidas'))
    await renderLogin()
    const user = userEvent.setup()
    await user.type(screen.getByPlaceholderText('usuario@laeconomia.com'), 'mal@mail.com')
    await user.type(screen.getByPlaceholderText('••••••••'), 'wrong')
    await user.click(screen.getByRole('button', { name: 'Ingresar' }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Credenciales inválidas'))
    expect(mockNavigate).not.toHaveBeenCalled()
  })
})
