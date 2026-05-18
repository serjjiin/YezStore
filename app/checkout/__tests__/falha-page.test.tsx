// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import FalhaPage from '../falha/page'
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

describe('FalhaPage', () => {
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
    stubVerify({ status: 'failed' })

    render(<FalhaPage />)
    expect(screen.getByText('Verificando pagamento...')).toBeInTheDocument()
  })

  // ---------------------------------------------------------------------------
  // Pagamento aprovado (surpresa — a API confirmou)
  // ---------------------------------------------------------------------------

  it('exibe "Pagamento aprovado!" quando a API retorna paid', async () => {
    mockStore()
    mockSearchParams({ payment_id: '123', external_reference: 'order-1' })
    stubVerify({ status: 'paid' })

    render(<FalhaPage />)

    await waitFor(() => {
      expect(screen.getByText('Pagamento aprovado!')).toBeInTheDocument()
    })
  })

  it('limpa o carrinho quando pagamento é aprovado', async () => {
    mockStore()
    mockSearchParams({ payment_id: '123', external_reference: 'order-1' })
    stubVerify({ status: 'paid' })

    render(<FalhaPage />)

    await waitFor(() => {
      expect(clearCart).toHaveBeenCalledOnce()
    })
  })

  it('exibe número do pedido quando aprovado', async () => {
    mockStore()
    mockSearchParams({ payment_id: '123', external_reference: 'order-1' })
    stubVerify({ status: 'paid' })

    render(<FalhaPage />)

    await waitFor(() => {
      expect(screen.getByText('order-1')).toBeInTheDocument()
    })
  })

  it('exibe link "Continuar comprando" quando aprovado', async () => {
    mockStore()
    mockSearchParams({ payment_id: '123', external_reference: 'order-1' })
    stubVerify({ status: 'paid' })

    render(<FalhaPage />)

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Continuar comprando' })).toHaveAttribute('href', '/')
    })
  })

  // ---------------------------------------------------------------------------
  // Pagamento falhou
  // ---------------------------------------------------------------------------

  it('exibe "Pagamento não aprovado" quando a API retorna status diferente de paid', async () => {
    mockStore()
    mockSearchParams({ payment_id: '123', external_reference: 'order-1' })
    stubVerify({ status: 'rejected' })

    render(<FalhaPage />)

    await waitFor(() => {
      expect(screen.getByText('Pagamento não aprovado')).toBeInTheDocument()
    })
  })

  it('não limpa carrinho quando pagamento falhou', async () => {
    mockStore()
    mockSearchParams({ payment_id: '123', external_reference: 'order-1' })
    stubVerify({ status: 'rejected' })

    render(<FalhaPage />)

    await waitFor(() => {
      expect(screen.getByText('Pagamento não aprovado')).toBeInTheDocument()
    })
    expect(clearCart).not.toHaveBeenCalled()
  })

  it('exibe link "Tentar novamente" apontando para /sacola', async () => {
    mockStore()
    mockSearchParams({ payment_id: '123', external_reference: 'order-1' })
    stubVerify({ status: 'rejected' })

    render(<FalhaPage />)

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Tentar novamente' })).toHaveAttribute('href', '/sacola')
    })
  })

  it('exibe link "Voltar à loja" quando pagamento falha', async () => {
    mockStore()
    mockSearchParams({ payment_id: '123', external_reference: 'order-1' })
    stubVerify({ status: 'rejected' })

    render(<FalhaPage />)

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Voltar à loja' })).toHaveAttribute('href', '/')
    })
  })

  it('exibe ID do pagamento quando falha', async () => {
    mockStore()
    mockSearchParams({ payment_id: 'mp-456', external_reference: 'order-1' })
    stubVerify({ status: 'rejected' })

    render(<FalhaPage />)

    await waitFor(() => {
      expect(screen.getByText('mp-456')).toBeInTheDocument()
    })
  })

  // ---------------------------------------------------------------------------
  // Sem query params
  // ---------------------------------------------------------------------------

  it('exibe "Pagamento não aprovado" quando não há payment_id ou external_reference', async () => {
    mockStore()
    mockSearchParams(null)

    render(<FalhaPage />)

    await waitFor(() => {
      expect(screen.getByText('Pagamento não aprovado')).toBeInTheDocument()
    })
  })

  // ---------------------------------------------------------------------------
  // Falha de rede
  // ---------------------------------------------------------------------------

  it('exibe "Pagamento não aprovado" quando a verificação falha (erro de rede)', async () => {
    mockStore()
    mockSearchParams({ payment_id: '123', external_reference: 'order-1' })
    stubVerifyFail()

    render(<FalhaPage />)

    await waitFor(() => {
      expect(screen.getByText('Pagamento não aprovado')).toBeInTheDocument()
    })
  })

  // ---------------------------------------------------------------------------
  // Chamada à API
  // ---------------------------------------------------------------------------

  it('envia payment_id e order_id para /api/payments/verify', async () => {
    mockStore()
    mockSearchParams({ payment_id: '789', external_reference: 'order-3' })
    stubVerify({ status: 'paid' })

    render(<FalhaPage />)

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/payments/verify',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ payment_id: '789', order_id: 'order-3' }),
        }),
      )
    })
  })
})
