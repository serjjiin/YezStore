// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import SucessoPage from '../sucesso/page'
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

describe('SucessoPage', () => {
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
    stubVerify({ status: 'paid' })

    render(<SucessoPage />)
    expect(screen.getByText('Verificando pagamento...')).toBeInTheDocument()
  })

  // ---------------------------------------------------------------------------
  // Pagamento aprovado
  // ---------------------------------------------------------------------------

  it('exibe "Pedido confirmado!" quando pagamento é aprovado', async () => {
    mockStore()
    mockSearchParams({ payment_id: '123', external_reference: 'order-1' })
    stubVerify({ status: 'paid' })

    render(<SucessoPage />)

    await waitFor(() => {
      expect(screen.getByText('Pedido confirmado!')).toBeInTheDocument()
    })
  })

  it('limpa o carrinho quando pagamento é aprovado', async () => {
    mockStore()
    mockSearchParams({ payment_id: '123', external_reference: 'order-1' })
    stubVerify({ status: 'paid' })

    render(<SucessoPage />)

    await waitFor(() => {
      expect(clearCart).toHaveBeenCalledOnce()
    })
  })

  it('exibe número do pedido quando pagamento é aprovado', async () => {
    mockStore()
    mockSearchParams({ payment_id: '123', external_reference: 'order-1' })
    stubVerify({ status: 'paid' })

    render(<SucessoPage />)

    await waitFor(() => {
      expect(screen.getByText('order-1')).toBeInTheDocument()
    })
  })

  it('exibe link "Continuar comprando" com href="/" quando aprovado', async () => {
    mockStore()
    mockSearchParams({ payment_id: '123', external_reference: 'order-1' })
    stubVerify({ status: 'paid' })

    render(<SucessoPage />)

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Continuar comprando' })).toHaveAttribute('href', '/')
    })
  })

  // ---------------------------------------------------------------------------
  // Pagamento pendente
  // ---------------------------------------------------------------------------

  it('exibe "Aguardando confirmação" quando pagamento está pendente', async () => {
    mockStore()
    mockSearchParams({ payment_id: '123', external_reference: 'order-1' })
    stubVerify({ status: 'pending' })

    render(<SucessoPage />)

    await waitFor(() => {
      expect(screen.getByText('Aguardando confirmação')).toBeInTheDocument()
    })
  })

  it('não limpa carrinho quando pagamento está pendente', async () => {
    mockStore()
    mockSearchParams({ payment_id: '123', external_reference: 'order-1' })
    stubVerify({ status: 'pending' })

    render(<SucessoPage />)

    // Aguarda o fetch resolver e o estado mudar para pending
    await waitFor(() => {
      expect(screen.getByText('Aguardando confirmação')).toBeInTheDocument()
    })
    expect(clearCart).not.toHaveBeenCalled()
  })

  // ---------------------------------------------------------------------------
  // Sem query params — estado de erro
  // ---------------------------------------------------------------------------

  it('exibe "Pedido criado!" quando não há payment_id ou external_reference', async () => {
    mockStore()
    mockSearchParams(null)

    render(<SucessoPage />)

    await waitFor(() => {
      expect(screen.getByText('Pedido criado!')).toBeInTheDocument()
    })
  })

  it('não chama fetch quando não há payment_id ou external_reference', async () => {
    mockStore()
    mockSearchParams(null)

    render(<SucessoPage />)

    await waitFor(() => {
      expect(screen.getByText('Pedido criado!')).toBeInTheDocument()
    })
    expect(fetch).not.toHaveBeenCalled()
  })

  // ---------------------------------------------------------------------------
  // Falha na verificação
  // ---------------------------------------------------------------------------

  it('exibe "Pedido criado!" quando a verificação falha (erro de rede)', async () => {
    mockStore()
    mockSearchParams({ payment_id: '123', external_reference: 'order-1' })
    stubVerifyFail()

    render(<SucessoPage />)

    await waitFor(() => {
      expect(screen.getByText('Pedido criado!')).toBeInTheDocument()
    })
  })

  // ---------------------------------------------------------------------------
  // Chamada à API
  // ---------------------------------------------------------------------------

  it('envia payment_id e order_id para /api/payments/verify', async () => {
    mockStore()
    mockSearchParams({ payment_id: '123', external_reference: 'order-1' })
    stubVerify({ status: 'paid' })

    render(<SucessoPage />)

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/payments/verify',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ payment_id: '123', order_id: 'order-1' }),
        }),
      )
    })
  })
})
