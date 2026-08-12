import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CustomerFormModal } from '@/modules/customers/components/CustomerFormModal'

describe('CustomerFormModal — alta de cliente', () => {
  it('no permite guardar sin nombre completo (campo obligatorio)', async () => {
    const onSave = vi.fn()
    render(<CustomerFormModal open={true} onClose={() => {}} onSave={onSave} initialData={null} />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Crear' }))

    expect(await screen.findByText('Requerido')).toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
  })

  it('crea un cliente nuevo con los valores por defecto correctos', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    render(<CustomerFormModal open={true} onClose={() => {}} onSave={onSave} initialData={null} />)
    const user = userEvent.setup()
    await user.type(screen.getByPlaceholderText('Juan García'), 'María González')
    await user.click(screen.getByRole('button', { name: 'Crear' }))

    expect(onSave).toHaveBeenCalledTimes(1)
    const payload = onSave.mock.calls[0][0]
    expect(payload.full_name).toBe('María González')
    expect(payload.document_type).toBe('DNI')
    expect(payload.is_active).toBe(true)
  })

  it('no permite guardar un descuento especial fuera de rango (0-100)', async () => {
    // El input tiene max="100" nativo además de la regla de react-hook-form:
    // la validación HTML5 del propio navegador bloquea el submit antes de que
    // se dispare el mensaje custom de RHF, así que lo que se puede verificar
    // acá es el efecto observable — el formulario no llega a guardar.
    const onSave = vi.fn()
    render(<CustomerFormModal open={true} onClose={() => {}} onSave={onSave} initialData={null} />)
    const user = userEvent.setup()
    await user.type(screen.getByPlaceholderText('Juan García'), 'Cliente Test')
    // El form no asocia <label> con el input (sin htmlFor/id) — el campo de
    // descuento es el 2do input numérico del formulario (1ro: límite de crédito).
    const discountInput = screen.getAllByRole('spinbutton')[1]
    fireEvent.change(discountInput, { target: { value: '150' } })
    await user.click(screen.getByRole('button', { name: 'Crear' }))
    await new Promise((r) => setTimeout(r, 50))

    expect(onSave).not.toHaveBeenCalled()
  })

  it('en modo edición, precarga los datos del cliente y el botón dice "Guardar"', async () => {
    render(<CustomerFormModal open={true} onClose={() => {}} onSave={vi.fn()} initialData={{
      full_name: 'Pedro Ramírez', document_type: 'CUIT', document_number: '20-12345678-9', is_active: true,
    }} />)

    expect(await screen.findByDisplayValue('Pedro Ramírez')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeInTheDocument()
  })
})
