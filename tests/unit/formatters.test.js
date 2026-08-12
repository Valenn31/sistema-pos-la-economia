import { describe, it, expect } from 'vitest'
import { formatCurrency, formatDate, formatDateTime, round2 } from '@/shared/utils/formatters'

describe('formatCurrency', () => {
  it('formatea un monto positivo con símbolo $ y 2 decimales', () => {
    expect(formatCurrency(1234.5)).toContain('1.234,50')
    expect(formatCurrency(1234.5)).toContain('$')
  })

  it('trata null/undefined como 0', () => {
    expect(formatCurrency(null)).toContain('0,00')
    expect(formatCurrency(undefined)).toContain('0,00')
  })

  it('formatea 0 correctamente', () => {
    expect(formatCurrency(0)).toContain('0,00')
  })
})

describe('formatDate / formatDateTime', () => {
  it('formatea una fecha ISO como día/mes/año (dd/mm/aa[aa])', () => {
    // El formato "short" de Intl para es-AR puede dar año de 2 o 4 dígitos
    // según la versión de ICU del motor — ambas son válidas, no es un bug.
    const result = formatDate('2026-08-12T10:00:00Z')
    expect(result).toMatch(/^\d{1,2}\/\d{1,2}\/\d{2,4}$/)
  })

  it('formatDateTime incluye fecha y hora', () => {
    const result = formatDateTime('2026-08-12T10:00:00Z')
    expect(result).toMatch(/^\d{1,2}\/\d{1,2}\/\d{2,4}/)
    expect(result).toMatch(/\d{1,2}:\d{2}/)
  })
})

describe('round2', () => {
  it('redondea a 2 decimales', () => {
    expect(round2(1.005)).toBeCloseTo(1.01, 2)
    expect(round2(10.126)).toBe(10.13)
  })

  it('evita errores clásicos de punto flotante (0.1 + 0.2)', () => {
    expect(round2(0.1 + 0.2)).toBe(0.3)
  })

  it('no altera números ya redondeados', () => {
    expect(round2(100)).toBe(100)
    expect(round2(99.99)).toBe(99.99)
  })
})
