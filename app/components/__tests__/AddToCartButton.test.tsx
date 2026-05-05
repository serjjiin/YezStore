// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AddToCartButton from '../AddToCartButton'
import { useCartStore } from '@/app/lib/store'

vi.mock('@/app/lib/store', () => ({ useCartStore: vi.fn() }))

const product = { id: 'p1', title: 'Sousplat', price: 50, artisan: 'Ana' }

describe('AddToCartButton', () => {
  const addItem = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useCartStore).mockImplementation(
      ((sel?: (s: { addItem: typeof addItem }) => unknown) => sel?.({ addItem }) ?? { addItem }) as unknown as typeof useCartStore
    )
  })

  // ---------------------------------------------------------------------------
  // Estado visual
  // ---------------------------------------------------------------------------

  it('exibe "Adicionar à sacola" quando há estoque disponível', () => {
    render(<AddToCartButton product={product} stock={5} />)
    expect(screen.getByRole('button', { name: 'Adicionar à sacola' })).toBeInTheDocument()
  })

  it('exibe "Adicionar à sacola" quando stock não é informado', () => {
    render(<AddToCartButton product={product} />)
    expect(screen.getByRole('button', { name: 'Adicionar à sacola' })).toBeInTheDocument()
  })

  it('exibe "Esgotado" quando stock é zero', () => {
    render(<AddToCartButton product={product} stock={0} />)
    expect(screen.getByRole('button', { name: 'Esgotado' })).toBeInTheDocument()
  })

  it('exibe "Esgotado" quando stock é negativo', () => {
    render(<AddToCartButton product={product} stock={-1} />)
    expect(screen.getByRole('button', { name: 'Esgotado' })).toBeInTheDocument()
  })

  it('botão fica desabilitado quando produto está esgotado', () => {
    render(<AddToCartButton product={product} stock={0} />)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('botão está habilitado quando há estoque', () => {
    render(<AddToCartButton product={product} stock={3} />)
    expect(screen.getByRole('button')).not.toBeDisabled()
  })

  // ---------------------------------------------------------------------------
  // Interação
  // ---------------------------------------------------------------------------

  it('chama addItem com o produto ao clicar', async () => {
    render(<AddToCartButton product={product} stock={5} />)
    await userEvent.click(screen.getByRole('button'))
    expect(addItem).toHaveBeenCalledOnce()
    expect(addItem).toHaveBeenCalledWith({ ...product, quantity: 1 })
  })

  it('não chama addItem quando o produto está esgotado', async () => {
    render(<AddToCartButton product={product} stock={0} />)
    await userEvent.click(screen.getByRole('button'))
    expect(addItem).not.toHaveBeenCalled()
  })

  // ---------------------------------------------------------------------------
  // Feedback visual de "adicionado"
  // ---------------------------------------------------------------------------

  it('exibe "Adicionado ✓" imediatamente após clicar', async () => {
    render(<AddToCartButton product={product} stock={5} />)
    await userEvent.click(screen.getByRole('button'))
    expect(screen.getByRole('button')).toHaveTextContent('Adicionado ✓')
  })

  it('volta para "Adicionar à sacola" após 1500ms', () => {
    vi.useFakeTimers()
    render(<AddToCartButton product={product} stock={5} />)
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByRole('button')).toHaveTextContent('Adicionado ✓')
    act(() => { vi.advanceTimersByTime(1500) })
    expect(screen.getByRole('button')).toHaveTextContent('Adicionar à sacola')
    vi.useRealTimers()
  })

  it('ainda mostra "Adicionado ✓" antes dos 1500ms expirarem', () => {
    vi.useFakeTimers()
    render(<AddToCartButton product={product} stock={5} />)
    fireEvent.click(screen.getByRole('button'))
    act(() => { vi.advanceTimersByTime(1499) })
    expect(screen.getByRole('button')).toHaveTextContent('Adicionado ✓')
    vi.useRealTimers()
  })
})
