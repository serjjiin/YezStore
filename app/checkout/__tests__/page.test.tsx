// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CheckoutPage from '../page'
import { useCartStore, type CartItem, type ShippingOption } from '@/app/lib/store'

vi.mock('@/app/lib/store', () => ({ useCartStore: vi.fn() }))

vi.mock('next/link', () => ({
  default: ({ children, href, style, ...props }: {
    children: React.ReactNode
    href: string
    style?: React.CSSProperties
    [k: string]: unknown
  }) => <a href={href} style={style} {...props}>{children}</a>,
}))

vi.mock('@/app/lib/format', () => ({
  formatCurrency: (v: number) => `R$ ${v.toFixed(2)}`,
  formatCep: (v: string) => v.replace(/\D/g, '').slice(0, 8),
}))

const clearCart = vi.fn()

const item: CartItem = { id: 'p1', title: 'Sousplat', price: 50, artisan: 'Ana', quantity: 2 }

const shipping: ShippingOption = {
  id: 1, name: 'PAC', price: '18.50', delivery_time: 7, company: { name: 'Correios' },
}

function mockStore(items: CartItem[] = [item], selectedShipping: ShippingOption | null = null) {
  const subtotalVal = items.reduce((s, i) => s + i.price * i.quantity, 0)
  const totalVal = subtotalVal + parseFloat(selectedShipping?.price ?? '0')
  vi.mocked(useCartStore).mockReturnValue({
    items,
    shipping: selectedShipping,
    subtotal: () => subtotalVal,
    total: () => totalVal,
    clearCart,
  } as ReturnType<typeof useCartStore>)
}

function stubFetch({
  viacepData = { logradouro: 'Rua A', bairro: 'Centro', localidade: 'Brasília', uf: 'DF' },
  checkoutData = { init_point: 'https://mp.com/pay' },
  checkoutOk = true,
}: {
  viacepData?: object
  checkoutData?: object
  checkoutOk?: boolean
} = {}) {
  vi.mocked(fetch).mockImplementation(((url: RequestInfo) => {
    if (typeof url === 'string' && url.includes('viacep')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(viacepData) } as Response)
    }
    return Promise.resolve({
      ok: checkoutOk,
      json: () => Promise.resolve(checkoutData),
    } as Response)
  }) as typeof fetch)
}

// Preenche os campos obrigatórios depois que o ViaCEP preenche rua e número
async function fillForm(skipCep = false) {
  await userEvent.type(screen.getByPlaceholderText('Maria da Silva'), 'Maria Silva')
  await userEvent.type(screen.getByPlaceholderText('maria@email.com'), 'maria@email.com')
  if (!skipCep) {
    await userEvent.type(screen.getByPlaceholderText('70000-000'), '12345678')
    await waitFor(() =>
      expect((screen.getByPlaceholderText('Rua das Flores') as HTMLInputElement).value).toBe('Rua A')
    )
  }
  await userEvent.type(screen.getByPlaceholderText('123'), '100')
}

describe('CheckoutPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', vi.fn())
    vi.stubGlobal('location', { href: '' })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  // ---------------------------------------------------------------------------
  // Estado com sacola vazia
  // ---------------------------------------------------------------------------

  it('exibe "Sua sacola está vazia" quando não há itens', () => {
    mockStore([])
    render(<CheckoutPage />)
    expect(screen.getByText('Sua sacola está vazia')).toBeInTheDocument()
  })

  it('exibe link "Ver produtos" apontando para "/" quando sacola vazia', () => {
    mockStore([])
    render(<CheckoutPage />)
    expect(screen.getByRole('link', { name: 'Ver produtos' })).toHaveAttribute('href', '/')
  })

  it('não exibe o formulário quando sacola está vazia', () => {
    mockStore([])
    render(<CheckoutPage />)
    expect(screen.queryByPlaceholderText('Maria da Silva')).not.toBeInTheDocument()
  })

  // ---------------------------------------------------------------------------
  // Renderização do formulário
  // ---------------------------------------------------------------------------

  it('renderiza os campos do formulário quando há itens', () => {
    mockStore()
    render(<CheckoutPage />)
    expect(screen.getByPlaceholderText('Maria da Silva')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('maria@email.com')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('70000-000')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Rua das Flores')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('123')).toBeInTheDocument()
  })

  it('exibe botão "Ir para o pagamento →"', () => {
    mockStore()
    render(<CheckoutPage />)
    expect(screen.getByRole('button', { name: 'Ir para o pagamento →' })).toBeInTheDocument()
  })

  // ---------------------------------------------------------------------------
  // Validação do formulário
  // ---------------------------------------------------------------------------

  it('exibe erro ao submeter com campos obrigatórios vazios', () => {
    mockStore()
    render(<CheckoutPage />)
    // fireEvent.submit ignora a validação nativa do HTML5 do jsdom
    fireEvent.submit(screen.getByRole('button', { name: 'Ir para o pagamento →' }).closest('form')!)
    expect(screen.getByText('Preencha todos os campos obrigatórios.')).toBeInTheDocument()
  })

  it('não chama fetch quando campos obrigatórios estão vazios', () => {
    mockStore()
    render(<CheckoutPage />)
    fireEvent.submit(screen.getByRole('button', { name: 'Ir para o pagamento →' }).closest('form')!)
    expect(fetch).not.toHaveBeenCalled()
  })

  // ---------------------------------------------------------------------------
  // ViaCEP — preenchimento automático de endereço
  // ---------------------------------------------------------------------------

  it('preenche rua, bairro, cidade e estado ao digitar CEP com 8 dígitos', async () => {
    stubFetch()
    mockStore()
    render(<CheckoutPage />)
    await userEvent.type(screen.getByPlaceholderText('70000-000'), '12345678')
    await waitFor(() => {
      expect((screen.getByPlaceholderText('Rua das Flores') as HTMLInputElement).value).toBe('Rua A')
      expect((screen.getByPlaceholderText('Centro') as HTMLInputElement).value).toBe('Centro')
      expect((screen.getByPlaceholderText('Brasília') as HTMLInputElement).value).toBe('Brasília')
      expect((screen.getByPlaceholderText('DF') as HTMLInputElement).value).toBe('DF')
    })
  })

  it('exibe "Buscando endereço..." durante a consulta ao ViaCEP', async () => {
    let resolveViacep!: (v: unknown) => void
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: () => new Promise((res) => { resolveViacep = res }),
    } as Response)

    mockStore()
    render(<CheckoutPage />)
    await userEvent.type(screen.getByPlaceholderText('70000-000'), '12345678')
    expect(screen.getByText('Buscando endereço...')).toBeInTheDocument()

    resolveViacep({ logradouro: 'Rua A', bairro: 'Centro', localidade: 'Brasília', uf: 'DF' })
    await waitFor(() => expect(screen.queryByText('Buscando endereço...')).not.toBeInTheDocument())
  })

  it('exibe erro quando CEP não é encontrado no ViaCEP', async () => {
    stubFetch({ viacepData: { erro: true } })
    mockStore()
    render(<CheckoutPage />)
    await userEvent.type(screen.getByPlaceholderText('70000-000'), '12345678')
    await waitFor(() =>
      expect(screen.getByText('CEP não encontrado. Verifique e preencha o endereço manualmente.')).toBeInTheDocument()
    )
  })

  // ---------------------------------------------------------------------------
  // Submissão bem-sucedida
  // ---------------------------------------------------------------------------

  it('redireciona para init_point após submissão bem-sucedida', async () => {
    stubFetch({ checkoutData: { init_point: 'https://mp.com/pay' } })
    mockStore()
    render(<CheckoutPage />)
    await fillForm()
    await userEvent.click(screen.getByRole('button', { name: 'Ir para o pagamento →' }))
    await waitFor(() => expect(window.location.href).toBe('https://mp.com/pay'))
  })

  it('usa sandbox_init_point quando presente na resposta', async () => {
    stubFetch({ checkoutData: { sandbox_init_point: 'https://sandbox.mp.com/pay' } })
    mockStore()
    render(<CheckoutPage />)
    await fillForm()
    await userEvent.click(screen.getByRole('button', { name: 'Ir para o pagamento →' }))
    await waitFor(() => expect(window.location.href).toBe('https://sandbox.mp.com/pay'))
  })

  it('limpa o carrinho após submissão bem-sucedida', async () => {
    stubFetch()
    mockStore()
    render(<CheckoutPage />)
    await fillForm()
    await userEvent.click(screen.getByRole('button', { name: 'Ir para o pagamento →' }))
    await waitFor(() => expect(clearCart).toHaveBeenCalledOnce())
  })

  it('exibe "Processando..." e desabilita botão durante o envio', async () => {
    let resolveCheckout!: (v: unknown) => void
    stubFetch({ viacepData: { logradouro: 'Rua A', bairro: 'Centro', localidade: 'Brasília', uf: 'DF' } })
    vi.mocked(fetch).mockImplementationOnce(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({ logradouro: 'Rua A', bairro: 'Centro', localidade: 'Brasília', uf: 'DF' }) } as Response)
    ).mockImplementationOnce(() =>
      new Promise((res) => {
        resolveCheckout = () => res({ ok: true, json: () => Promise.resolve({ init_point: 'https://mp.com/pay' }) } as Response)
      })
    )
    mockStore()
    render(<CheckoutPage />)
    await fillForm()
    await userEvent.click(screen.getByRole('button', { name: 'Ir para o pagamento →' }))
    expect(screen.getByRole('button', { name: 'Processando...' })).toBeDisabled()
    resolveCheckout()
    await waitFor(() => expect(window.location.href).toBe('https://mp.com/pay'))
  })

  it('envia os dados corretos para /api/checkout', async () => {
    stubFetch()
    mockStore()
    render(<CheckoutPage />)
    await fillForm()
    await userEvent.click(screen.getByRole('button', { name: 'Ir para o pagamento →' }))
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2)) // viacep + checkout

    const checkoutCall = (fetch as ReturnType<typeof vi.fn>).mock.calls.find(
      ([url]: [string]) => url === '/api/checkout'
    )
    expect(checkoutCall).toBeDefined()
    const body = JSON.parse((checkoutCall![1] as RequestInit).body as string)
    expect(body.customer.name).toBe('Maria Silva')
    expect(body.customer.email).toBe('maria@email.com')
    expect(body.items[0].id).toBe('p1')
  })

  // ---------------------------------------------------------------------------
  // Erros de submissão
  // ---------------------------------------------------------------------------

  it('exibe mensagem de erro da API em caso de falha', async () => {
    stubFetch({ checkoutData: { error: 'Estoque insuficiente.' }, checkoutOk: false })
    mockStore()
    render(<CheckoutPage />)
    await fillForm()
    await userEvent.click(screen.getByRole('button', { name: 'Ir para o pagamento →' }))
    await waitFor(() =>
      expect(screen.getByText('Estoque insuficiente.')).toBeInTheDocument()
    )
  })

  it('exibe "Erro de conexão" em caso de falha de rede', async () => {
    // ViaCEP retorna endereço, checkout lança erro
    vi.mocked(fetch)
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ logradouro: 'Rua A', bairro: 'Centro', localidade: 'Brasília', uf: 'DF' }) } as Response)
      .mockRejectedValueOnce(new Error('Network error'))
    mockStore()
    render(<CheckoutPage />)
    await fillForm()
    await userEvent.click(screen.getByRole('button', { name: 'Ir para o pagamento →' }))
    await waitFor(() =>
      expect(screen.getByText('Erro de conexão. Tente novamente.')).toBeInTheDocument()
    )
  })

  // ---------------------------------------------------------------------------
  // Resumo de valores
  // ---------------------------------------------------------------------------

  it('exibe subtotal formatado', () => {
    mockStore([item], null) // subtotal = total = 100 (sem frete) → usa within para escopar
    render(<CheckoutPage />)
    const subtotalRow = screen.getByText(/Subtotal/).closest('div')!
    expect(within(subtotalRow).getByText('R$ 100.00')).toBeInTheDocument()
  })

  it('exibe "Não calculado" quando não há frete', () => {
    mockStore([item], null)
    render(<CheckoutPage />)
    expect(screen.getByText('Não calculado')).toBeInTheDocument()
  })

  it('exibe o valor e nome do frete quando selecionado', () => {
    mockStore([item], shipping)
    render(<CheckoutPage />)
    expect(screen.getByText('R$ 18.50')).toBeInTheDocument()
    expect(screen.getByText(/Frete.*PAC/)).toBeInTheDocument()
  })
})
