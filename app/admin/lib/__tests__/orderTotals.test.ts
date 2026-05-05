import { describe, it, expect } from 'vitest'
import { getOrderTotal, getOrderProductsSubtotal } from '../orderTotals'

describe('getOrderTotal', () => {
  it('retorna total_amount já como número (contrato: total_amount inclui frete)', () => {
    const order = { total_amount: 120, shipping_cost: 20 }
    expect(getOrderTotal(order)).toBe(120)
  })

  it('aceita total_amount em string (Postgres numeric pode chegar string via Supabase)', () => {
    const order = { total_amount: '120.00', shipping_cost: '20.00' }
    expect(getOrderTotal(order)).toBe(120)
  })

  it('lida com pedido sem frete', () => {
    const order = { total_amount: 50, shipping_cost: 0 }
    expect(getOrderTotal(order)).toBe(50)
  })
})

describe('getOrderProductsSubtotal', () => {
  it('retorna total_amount menos shipping_cost', () => {
    const order = { total_amount: 120, shipping_cost: 20 }
    expect(getOrderProductsSubtotal(order)).toBe(100)
  })

  it('aceita campos como string', () => {
    const order = { total_amount: '120.00', shipping_cost: '20.00' }
    expect(getOrderProductsSubtotal(order)).toBe(100)
  })

  it('retorna total_amount integral quando não há frete', () => {
    const order = { total_amount: 50, shipping_cost: 0 }
    expect(getOrderProductsSubtotal(order)).toBe(50)
  })
})
