// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import CartLink from '../CartLink'
import { useCartStore } from '@/app/lib/store'

vi.mock('@/app/lib/store', () => ({ useCartStore: vi.fn() }))

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string; [k: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

type Item = { quantity: number }

function mockCartItems(items: Item[]) {
  vi.mocked(useCartStore).mockImplementation(
    ((sel?: (s: { items: Item[] }) => unknown) => sel?.({ items }) ?? { items }) as unknown as typeof useCartStore
  )
}

describe('CartLink', () => {
  beforeEach(() => vi.clearAllMocks())

  it('exibe "Sacola" quando a sacola está vazia', () => {
    mockCartItems([])
    render(<CartLink />)
    expect(screen.getByText('Sacola')).toBeInTheDocument()
  })

  it('exibe contagem total de itens quando a sacola tem produtos', () => {
    mockCartItems([{ quantity: 2 }, { quantity: 1 }])
    render(<CartLink />)
    expect(screen.getByText('Sacola (3)')).toBeInTheDocument()
  })

  it('soma quantidades de todos os itens (não apenas número de linhas)', () => {
    mockCartItems([{ quantity: 5 }, { quantity: 3 }])
    render(<CartLink />)
    expect(screen.getByText('Sacola (8)')).toBeInTheDocument()
  })

  it('link aponta para /sacola', () => {
    mockCartItems([])
    render(<CartLink />)
    expect(screen.getByRole('link')).toHaveAttribute('href', '/sacola')
  })

  it('não exibe contagem quando sacola tem 0 itens', () => {
    mockCartItems([])
    render(<CartLink />)
    expect(screen.getByRole('link').textContent).toBe('Sacola')
  })
})
