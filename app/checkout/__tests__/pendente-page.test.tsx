// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import PendentePage from '../pendente/page'
import { useCartStore } from '@/app/lib/store'
import { useSearchParams } from 'next/navigation'

vi.mock('@/app/lib/store', () => ({ useCartStore: vi.fn() }))

vi.mock('next/link', () => ({
  default: ({ children, href, style, ...props }: {
    children: React.ReactNode
    href: string
    style?: React.CSSProperties
    [k: string]: unknown
  }) => <a href={href} style={style} {...props}>{children}</a>,
}))

vi.mock('next/navigation', () => ({ useSearchParams: vi.fn() }))

const clearCart = vi.fn()

function mockStore() {
  vi.mocked(useCartStore).mockReturnValue({ clearCart } as ReturnType<typeof useCartStore>)
}

function mockSearchParams(params: Record<string, string> | null) {
  if (params === null) {
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams() as ReturnType<typeof useSearchParams>)
    return
  }
  const usp = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) usp.set(k, v)
  vi.mocked(useSearchParams).mockReturnValue(usp as ReturnType<typeof useSearchParams>)
}

function stubVerify(data: object) {
  vi.mocked(fetch).mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(data),
  } as Response)
}

function stubVerifyFail() {
  vi.mocked(fetch).mockRejectedValue(new Error('Network error'))
}

describe('PendentePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  // ---------------------------------------------------------------------------
  // Estado inicial
  // ---------------------------------------------------------------------------

  it('exibe "Verificando pagamento..." inicialmente', () => {
    mockStore()
    mockSearchParams({ payment_id: '123', external_reference: 'order-1' })
    stubVerify({ status: 'pending' })

    render(<PendentePage />)
    expect(screen.getByText('Verificando pagamento...')).toBeInTheDocument()
  })

  // ---------------------------------------------------------------------------
  // Pagamento aprovado (confirmado via API)
  // ---------------------------------------------------------------------------

  it('exibe "Pagamento aprovado!" quando a API retorna paid', async () => {
    mockStore()
    mockSearchParams({ payment_id: '123', external_reference: 'order-1' })
    stubVerify({ status: 'paid' })

    render(<PendentePage />)

    await waitFor(() => {
      expect(screen.getByText('Pagamento aprovado!')).toBeInTheDocument()
    })
  })

  it('limpa o carrinho quando pagamento é aprovado', async () => {
    mockStore()
    mockSearchParams({ payment_id: '123', external_reference: 'order-1' })
    stubVerify({ status: 'paid' })

    render(<PendentePage />)

    await waitFor(() => {
      expect(clearCart).toHaveBeenCalledOnce()
    })
  })

  it('exibe link "Continuar comprando" quando aprovado', async () => {
    mockStore()
    mockSearchParams({ payment_id: '123', external_reference: 'order-1' })
    stubVerify({ status: 'paid' })

    render(<PendentePage />)

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Continuar comprando' })).toHaveAttribute('href', '/')
    })
  })

  // ---------------------------------------------------------------------------
  // Pagamento ainda pendente
  // ---------------------------------------------------------------------------

  it('exibe "Aguardando pagamento" quando pagamento está pendente', async () => {
    mockStore()
    mockSearchParams({ payment_id: '123', external_reference: 'order-1' })
    stubVerify({ status: 'pending' })

    render(<PendentePage />)

    await waitFor(() => {
      expect(screen.getByText('Aguardando pagamento')).toBeInTheDocument()
    })
  })

  it('não limpa carrinho quando pagamento está pendente', async () => {
    mockStore()
    mockSearchParams({ payment_id: '123', external_reference: 'order-1' })
    stubVerify({ status: 'pending' })

    render(<PendentePage />)

    await waitFor(() => {
      expect(screen.getByText('Aguardando pagamento')).toBeInTheDocument()
    })
    expect(clearCart).not.toHaveBeenCalled()
  })

  it('exibe número do pedido quando pendente', async () => {
    mockStore()
    mockSearchParams({ payment_id: '123', external_reference: 'order-1' })
    stubVerify({ status: 'pending' })

    render(<PendentePage />)

    await waitFor(() => {
      expect(screen.getByText('order-1')).toBeInTheDocument()
    })
  })

  it('exibe ID do pagamento quando pendente', async () => {
    mockStore()
    mockSearchParams({ payment_id: '123', external_reference: 'order-1' })
    stubVerify({ status: 'pending' })

    render(<PendentePage />)

    await waitFor(() => {
      expect(screen.getByText('123')).toBeInTheDocument()
    })
  })

  // ---------------------------------------------------------------------------
  // Sem query params
  // ---------------------------------------------------------------------------

  it('exibe "Aguardando pagamento" quando não há payment_id ou external_reference', async () => {
    mockStore()
    mockSearchParams(null)

    render(<PendentePage />)

    await waitFor(() => {
      expect(screen.getByText('Aguardando pagamento')).toBeInTheDocument()
    })
  })

  // ---------------------------------------------------------------------------
  // Falha na verificação — mostra estado pendente
  // ---------------------------------------------------------------------------

  it('exibe "Aguardando pagamento" quando a verificação falha (erro de rede)', async () => {
    mockStore()
    mockSearchParams({ payment_id: '123', external_reference: 'order-1' })
    stubVerifyFail()

    render(<PendentePage />)

    await waitFor(() => {
      expect(screen.getByText('Aguardando pagamento')).toBeInTheDocument()
    })
  })

  // ---------------------------------------------------------------------------
  // Chamada à API
  // ---------------------------------------------------------------------------

  it('envia payment_id e order_id para /api/payments/verify', async () => {
    mockStore()
    mockSearchParams({ payment_id: '456', external_reference: 'order-2' })
    stubVerify({ status: 'paid' })

    render(<PendentePage />)

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/payments/verify',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ payment_id: '456', order_id: 'order-2' }),
        }),
      )
    })
  })
})
