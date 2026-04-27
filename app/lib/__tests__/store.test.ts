import { describe, it, expect, beforeEach } from 'vitest'
import { useCartStore } from '../store'

// Fábrica de item para não repetir objeto em cada teste
const makeItem = (overrides: Partial<{ id: string; price: number; quantity: number }> = {}) => ({
  id: '1',
  title: 'Sousplat de Crochê',
  price: 50,
  quantity: 1,
  artisan: 'Maria',
  image_url: undefined,
  ...overrides,
})

const makeShipping = () => ({
  id: 1,
  name: 'PAC',
  price: '18.50',
  delivery_time: 7,
  company: { name: 'Correios' },
})

// Reseta o store antes de cada teste para evitar vazamento de estado
beforeEach(() => {
  useCartStore.setState({ items: [], shipping: null })
})

// ---------------------------------------------------------------------------
// addItem
// ---------------------------------------------------------------------------
describe('addItem', () => {
  it('adiciona um item novo ao carrinho', () => {
    useCartStore.getState().addItem(makeItem())
    expect(useCartStore.getState().items).toHaveLength(1)
  })

  it('item novo sempre começa com quantity 1', () => {
    useCartStore.getState().addItem(makeItem({ quantity: 5 }))
    expect(useCartStore.getState().items[0].quantity).toBe(1)
  })

  it('incrementa a quantidade se o item já existe', () => {
    useCartStore.getState().addItem(makeItem())
    useCartStore.getState().addItem(makeItem())
    expect(useCartStore.getState().items[0].quantity).toBe(2)
    expect(useCartStore.getState().items).toHaveLength(1)
  })

  it('adiciona itens diferentes como entradas separadas', () => {
    useCartStore.getState().addItem(makeItem({ id: '1' }))
    useCartStore.getState().addItem(makeItem({ id: '2' }))
    expect(useCartStore.getState().items).toHaveLength(2)
  })
})

// ---------------------------------------------------------------------------
// removeItem
// ---------------------------------------------------------------------------
describe('removeItem', () => {
  it('remove o item do carrinho', () => {
    useCartStore.getState().addItem(makeItem())
    useCartStore.getState().removeItem('1')
    expect(useCartStore.getState().items).toHaveLength(0)
  })

  it('não afeta o estado se o id não existe', () => {
    useCartStore.getState().addItem(makeItem())
    useCartStore.getState().removeItem('id-inexistente')
    expect(useCartStore.getState().items).toHaveLength(1)
  })

  it('remove apenas o item correto quando há múltiplos', () => {
    useCartStore.getState().addItem(makeItem({ id: '1' }))
    useCartStore.getState().addItem(makeItem({ id: '2' }))
    useCartStore.getState().removeItem('1')
    expect(useCartStore.getState().items[0].id).toBe('2')
  })
})

// ---------------------------------------------------------------------------
// updateQuantity
// ---------------------------------------------------------------------------
describe('updateQuantity', () => {
  it('atualiza a quantidade do item', () => {
    useCartStore.getState().addItem(makeItem())
    useCartStore.getState().updateQuantity('1', 4)
    expect(useCartStore.getState().items[0].quantity).toBe(4)
  })

  it('remove o item quando a quantidade é 0', () => {
    useCartStore.getState().addItem(makeItem())
    useCartStore.getState().updateQuantity('1', 0)
    expect(useCartStore.getState().items).toHaveLength(0)
  })

  it('remove o item quando a quantidade é negativa', () => {
    useCartStore.getState().addItem(makeItem())
    useCartStore.getState().updateQuantity('1', -1)
    expect(useCartStore.getState().items).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// clearCart
// ---------------------------------------------------------------------------
describe('clearCart', () => {
  it('remove todos os itens', () => {
    useCartStore.getState().addItem(makeItem({ id: '1' }))
    useCartStore.getState().addItem(makeItem({ id: '2' }))
    useCartStore.getState().clearCart()
    expect(useCartStore.getState().items).toHaveLength(0)
  })

  it('limpa o frete junto', () => {
    useCartStore.getState().setShipping(makeShipping())
    useCartStore.getState().clearCart()
    expect(useCartStore.getState().shipping).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// setShipping
// ---------------------------------------------------------------------------
describe('setShipping', () => {
  it('define a opção de frete', () => {
    useCartStore.getState().setShipping(makeShipping())
    expect(useCartStore.getState().shipping?.name).toBe('PAC')
  })

  it('aceita null para remover o frete', () => {
    useCartStore.getState().setShipping(makeShipping())
    useCartStore.getState().setShipping(null)
    expect(useCartStore.getState().shipping).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// subtotal
// ---------------------------------------------------------------------------
describe('subtotal', () => {
  it('retorna 0 quando o carrinho está vazio', () => {
    expect(useCartStore.getState().subtotal()).toBe(0)
  })

  it('calcula subtotal de um item', () => {
    useCartStore.getState().addItem(makeItem({ price: 50 }))
    useCartStore.getState().updateQuantity('1', 3)
    expect(useCartStore.getState().subtotal()).toBe(150)
  })

  it('soma múltiplos itens', () => {
    useCartStore.getState().addItem(makeItem({ id: '1', price: 50 }))
    useCartStore.getState().addItem(makeItem({ id: '2', price: 30 }))
    expect(useCartStore.getState().subtotal()).toBe(80)
  })
})

// ---------------------------------------------------------------------------
// total
// ---------------------------------------------------------------------------
describe('total', () => {
  it('retorna apenas o subtotal quando não há frete', () => {
    useCartStore.getState().addItem(makeItem({ price: 50 }))
    expect(useCartStore.getState().total()).toBe(50)
  })

  it('soma subtotal + frete', () => {
    useCartStore.getState().addItem(makeItem({ price: 50 }))
    useCartStore.getState().setShipping(makeShipping()) // frete: R$ 18,50
    expect(useCartStore.getState().total()).toBe(68.50)
  })

  it('retorna 0 quando carrinho vazio e sem frete', () => {
    expect(useCartStore.getState().total()).toBe(0)
  })
})
