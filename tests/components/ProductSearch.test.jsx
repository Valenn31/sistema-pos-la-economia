import { vi, describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('@/modules/pos/services/salesService', () => ({
  searchProducts: vi.fn(),
  getProductByBarcode: vi.fn(),
}))

import { searchProducts } from '@/modules/pos/services/salesService'
import { ProductSearch } from '@/modules/pos/components/ProductSearch'

const PRODUCT = {
  id: 'p1', name: 'Coca Cola 2L', price_sell: 1200, categories: null,
  stock: [{ quantity: 5, location_id: 2, locations: { name: 'En Estantería' } }],
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('ProductSearch — búsqueda de productos (con debounce)', () => {
  it('busca (con debounce) y muestra los resultados', async () => {
    searchProducts.mockResolvedValue([PRODUCT])
    render(<ProductSearch onAdd={vi.fn()} />)
    const user = userEvent.setup()

    await user.type(screen.getByPlaceholderText(/Buscar por nombre/), 'coca')

    await waitFor(() => expect(searchProducts).toHaveBeenCalledWith('coca'), { timeout: 1000 })
    expect(await screen.findByText('Coca Cola 2L')).toBeInTheDocument()
  })

  it('sin resultados, muestra el mensaje "Sin resultados"', async () => {
    searchProducts.mockResolvedValue([])
    render(<ProductSearch onAdd={vi.fn()} />)
    const user = userEvent.setup()

    await user.type(screen.getByPlaceholderText(/Buscar por nombre/), 'xyz')

    expect(await screen.findByText('Sin resultados para "xyz"')).toBeInTheDocument()
  })

  it('al hacer click en un resultado, lo agrega al carrito vía onAdd', async () => {
    searchProducts.mockResolvedValue([PRODUCT])
    const onAdd = vi.fn()
    render(<ProductSearch onAdd={onAdd} />)
    const user = userEvent.setup()

    await user.type(screen.getByPlaceholderText(/Buscar por nombre/), 'coca')
    const card = await screen.findByText('Coca Cola 2L')
    await user.click(card)

    expect(onAdd).toHaveBeenCalledWith(PRODUCT)
  })

  it('no dispara la búsqueda mientras el campo está vacío', async () => {
    render(<ProductSearch onAdd={vi.fn()} />)
    expect(screen.getByText('Escribí o escaneá para buscar productos')).toBeInTheDocument()
    expect(searchProducts).not.toHaveBeenCalled()
  })
})
