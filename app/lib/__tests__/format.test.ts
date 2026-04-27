import { describe, it, expect } from 'vitest'
import { formatCurrency, formatCep, formatPhone } from '../format'

// ---------------------------------------------------------------------------
// formatCurrency
// ---------------------------------------------------------------------------
describe('formatCurrency', () => {
  it('formata valor inteiro em reais', () => {
    expect(formatCurrency(120)).toBe('R$ 120,00')
  })

  it('formata valor com centavos', () => {
    expect(formatCurrency(9.9)).toBe('R$ 9,90')
  })

  it('formata zero', () => {
    expect(formatCurrency(0)).toBe('R$ 0,00')
  })

  it('formata valor alto com separador de milhar', () => {
    expect(formatCurrency(1500)).toBe('R$ 1.500,00')
  })
})

// ---------------------------------------------------------------------------
// formatCep
// ---------------------------------------------------------------------------
describe('formatCep', () => {
  it('formata CEP completo (8 dígitos)', () => {
    expect(formatCep('12345678')).toBe('12345-678')
  })

  it('formata CEP incompleto (menos de 5 dígitos)', () => {
    expect(formatCep('123')).toBe('123')
  })

  it('formata CEP com 6 dígitos', () => {
    expect(formatCep('123456')).toBe('12345-6')
  })

  it('ignora caracteres não numéricos', () => {
    expect(formatCep('12.345-678abc')).toBe('12345-678')
  })

  it('limita a 8 dígitos mesmo que receba mais', () => {
    expect(formatCep('123456789999')).toBe('12345-678')
  })
})

// ---------------------------------------------------------------------------
// formatPhone
// ---------------------------------------------------------------------------
describe('formatPhone', () => {
  it('formata celular com 11 dígitos', () => {
    expect(formatPhone('11987654321')).toBe('(11) 98765-4321')
  })

  it('formata telefone fixo com 10 dígitos', () => {
    expect(formatPhone('1132345678')).toBe('(11) 3234-5678')
  })

  it('ignora caracteres não numéricos', () => {
    expect(formatPhone('(11) 98765-4321')).toBe('(11) 98765-4321')
  })

  it('retorna dígitos sem formatação se tiver menos de 10 dígitos', () => {
    expect(formatPhone('1198765')).toBe('1198765')
  })
})
