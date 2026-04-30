// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Sacola from '../page'
import { useCartStore, type CartItem, type ShippingOption } from '@/app/lib/store'

vi.mock('@/app/lib/store', () => ({ useCartStore: vi.fn() }))

vi.mock('@/app/components/FreteCalculator', () => ({
  default: () => <div data-testid="frete-calculator" />,
}))

vi.mock('next/link', () => ({
  default: ({ children, href, onClick, style, ...props }: {
    children: React.ReactNode
    href: string
    onClick?: React.MouseEventHandler
    style?: React.CSSProperties
    [k: string]: unknown
  }) => <a href={href} onClick={onClick} style={style} {...props}>{children}</a>,
}))

vi.mock('@/app/lib/format', () => ({
  formatCurrency: (v: number) => `R$ ${v.toFixed(2)}`,
}))

const removeItem = vi.fn()
const updateQuantity = vi.fn()

const item1: CartItem = { id: 'p1', title: 'Sousplat', price: 50, artisan: 'Ana', quantity: 2 }
const item2: CartItem = { id: 'p2', title: 'Cesto', price: 120, artisan: 'Maria', quantity: 1 }

const shipping: ShippingOption = {
  id: 1, name: 'PAC', price: '18.50', delivery_time: 7, company: { name: 'Correios' },
}

function mockStore(items: CartItem[], selectedShipping: ShippingOption | null = null) {
  const subtotalVal = items.reduce((s, i) => s + i.price * i.quantity, 0)
  const totalVal = subtotalVal + parseFloat(selectedShipping?.price ?? '0')
  vi.mocked(useCartStore).mockReturnValue({
    items,
    removeItem,
    updateQuantity,
    shipping: selectedShipping,
    subtotal: () => subtotalVal,
    total: () => totalVal,
  } as ReturnType<typeof useCartStore>)
}

describe('Sacola', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ---------------------------------------------------------------------------
  // Estado vazio
  // ---------------------------------------------------------------------------

  it('exibe "Sua sacola está vazia" quando não há itens', () => {
    mockStore([])
    render(<Sacola />)
    expect(screen.getByText('Sua sacola está vazia')).toBeInTheDocument()
  })

  it('exibe link "Ver produtos" apontando para "/" quando vazia', () => {
    mockStore([])
    render(<Sacola />)
    const link = screen.getByRole('link', { name: 'Ver produtos' })
    expect(link).toHaveAttribute('href', '/')
  })

  it('exibe "0 itens" quando sacola está vazia', () => {
    mockStore([])
    render(<Sacola />)
    expect(screen.getByText('0 itens')).toBeInTheDocument()
  })

  it('não exibe FreteCalculator quando sacola está vazia', () => {
    mockStore([])
    render(<Sacola />)
    expect(screen.queryByTestId('frete-calculator')).not.toBeInTheDocument()
  })

  // ---------------------------------------------------------------------------
  // Lista de itens
  // ---------------------------------------------------------------------------

  it('exibe o título de cada item', () => {
    mockStore([item1, item2])
    render(<Sacola />)
    expect(screen.getByText('Sousplat')).toBeInTheDocument()
    expect(screen.getByText('Cesto')).toBeInTheDocument()
  })

  it('exibe o artesão de cada item', () => {
    mockStore([item1, item2])
    render(<Sacola />)
    expect(screen.getByText('Ana')).toBeInTheDocument()
    expect(screen.getByText('Maria')).toBeInTheDocument()
  })

  it('exibe o preço total do item (preço × quantidade)', () => {
    // item1: 50×2=100, item2: 120×1=120 → subtotal=220 (sem colisão)
    mockStore([item1, item2])
    render(<Sacola />)
    expect(screen.getByText('R$ 100.00')).toBeInTheDocument()
    expect(screen.getByText('R$ 120.00')).toBeInTheDocument()
  })

  it('exibe a quantidade de cada item', () => {
    mockStore([item1])
    render(<Sacola />)
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('exibe "1 item" (singular) quando há um único item', () => {
    mockStore([{ ...item1, quantity: 1 }])
    render(<Sacola />)
    expect(screen.getByText('1 item')).toBeInTheDocument()
  })

  it('exibe "N itens" (plural) quando há múltiplos itens', () => {
    mockStore([item1, item2])
    render(<Sacola />)
    expect(screen.getByText('2 itens')).toBeInTheDocument()
  })

  it('renderiza o FreteCalculator quando há itens', () => {
    mockStore([item1])
    render(<Sacola />)
    expect(screen.getByTestId('frete-calculator')).toBeInTheDocument()
  })

  // ---------------------------------------------------------------------------
  // Controles de quantidade
  // ---------------------------------------------------------------------------

  it('botão "Aumentar" chama updateQuantity(id, qty + 1)', async () => {
    mockStore([item1])
    render(<Sacola />)
    await userEvent.click(screen.getByRole('button', { name: 'Aumentar quantidade' }))
    expect(updateQuantity).toHaveBeenCalledWith('p1', 3)
  })

  it('botão "Diminuir" chama updateQuantity(id, qty - 1)', async () => {
    mockStore([item1])
    render(<Sacola />)
    await userEvent.click(screen.getByRole('button', { name: 'Diminuir quantidade' }))
    expect(updateQuantity).toHaveBeenCalledWith('p1', 1)
  })

  it('botão remover chama removeItem(id)', async () => {
    mockStore([item1])
    render(<Sacola />)
    await userEvent.click(screen.getByRole('button', { name: `Remover ${item1.title} da sacola` }))
    expect(removeItem).toHaveBeenCalledWith('p1')
  })

  // ---------------------------------------------------------------------------
  // Resumo de valores
  // ---------------------------------------------------------------------------

  it('exibe o subtotal corretamente', () => {
    mockStore([item1, item2]) // subtotal = 220; total = 220 sem frete (mesmo valor)
    render(<Sacola />)
    const subtotalRow = screen.getByText('Subtotal').closest('div')!
    expect(within(subtotalRow).getByText('R$ 220.00')).toBeInTheDocument()
  })

  it('exibe "Calcule acima" quando não há frete selecionado', () => {
    mockStore([item1])
    render(<Sacola />)
    expect(screen.getByText('Calcule acima')).toBeInTheDocument()
  })

  it('exibe o valor do frete quando uma opção está selecionada', () => {
    mockStore([item1], shipping) // frete = 18.50
    render(<Sacola />)
    expect(screen.getByText('R$ 18.50')).toBeInTheDocument()
  })

  it('exibe o total com frete incluído', () => {
    mockStore([item1], shipping) // total = 100 + 18.50 = 118.50
    render(<Sacola />)
    expect(screen.getByText('R$ 118.50')).toBeInTheDocument()
  })

  // ---------------------------------------------------------------------------
  // Link de checkout
  // ---------------------------------------------------------------------------

  it('exibe "Calcule o frete para continuar" quando sem frete', () => {
    mockStore([item1])
    render(<Sacola />)
    expect(screen.getByText('Calcule o frete para continuar')).toBeInTheDocument()
  })

  it('exibe "Finalizar compra →" quando frete está selecionado', () => {
    mockStore([item1], shipping)
    render(<Sacola />)
    expect(screen.getByText('Finalizar compra →')).toBeInTheDocument()
  })

  it('link de checkout aponta para /checkout', () => {
    mockStore([item1], shipping)
    render(<Sacola />)
    const link = screen.getByRole('link', { name: 'Finalizar compra →' })
    expect(link).toHaveAttribute('href', '/checkout')
  })

  it('impede navegação para checkout quando não há frete (preventDefault)', async () => {
    mockStore([item1])
    render(<Sacola />)
    const link = screen.getByText('Calcule o frete para continuar').closest('a')!
    const mockEvent = new MouseEvent('click', { bubbles: true, cancelable: true })
    link.dispatchEvent(mockEvent)
    expect(mockEvent.defaultPrevented).toBe(true)
  })
})
