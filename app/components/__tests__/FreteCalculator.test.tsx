// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import FreteCalculator from '../FreteCalculator'
import { useCartStore } from '@/app/lib/store'

vi.mock('@/app/lib/store', () => ({ useCartStore: vi.fn() }))

vi.mock('@/app/lib/format', () => ({
  formatCurrency: (v: number) => `R$ ${v.toFixed(2)}`,
  formatCep: (v: string) => v.replace(/\D/g, '').slice(0, 8),
}))

const setShipping = vi.fn()

type StoreState = {
  items: { quantity: number }[]
  shipping: { id: number } | null
  setShipping: typeof setShipping
}

function mockStore(overrides: Partial<StoreState> = {}) {
  vi.mocked(useCartStore).mockReturnValue({
    items: [{ quantity: 2 }],
    shipping: null,
    setShipping,
    ...overrides,
  } as ReturnType<typeof useCartStore>)
}

const fakeOptions = [
  { id: 1, name: 'PAC', company: { name: 'Correios' }, price: '18.50', delivery_time: 7 },
  { id: 2, name: 'SEDEX', company: { name: 'Correios' }, price: '32.00', delivery_time: 2 },
]

function mockFetch(data: unknown, ok = true) {
  vi.mocked(fetch).mockResolvedValueOnce({
    ok,
    json: () => Promise.resolve(data),
  } as Response)
}

describe('FreteCalculator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStore()
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  // ---------------------------------------------------------------------------
  // Renderização inicial
  // ---------------------------------------------------------------------------

  it('renderiza o input de CEP e o botão Calcular', () => {
    render(<FreteCalculator />)
    expect(screen.getByPlaceholderText('00000-000')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Calcular' })).toBeInTheDocument()
  })

  it('input começa vazio', () => {
    render(<FreteCalculator />)
    expect(screen.getByPlaceholderText('00000-000')).toHaveValue('')
  })

  // ---------------------------------------------------------------------------
  // Validação de CEP
  // ---------------------------------------------------------------------------

  it('exibe erro quando CEP tem menos de 8 dígitos', async () => {
    render(<FreteCalculator />)
    await userEvent.type(screen.getByPlaceholderText('00000-000'), '1234')
    await userEvent.click(screen.getByRole('button', { name: 'Calcular' }))
    expect(screen.getByText('Digite um CEP válido com 8 dígitos.')).toBeInTheDocument()
  })

  it('não chama fetch quando CEP é inválido', async () => {
    render(<FreteCalculator />)
    await userEvent.type(screen.getByPlaceholderText('00000-000'), '1234')
    await userEvent.click(screen.getByRole('button', { name: 'Calcular' }))
    expect(fetch).not.toHaveBeenCalled()
  })

  // ---------------------------------------------------------------------------
  // Estado de carregamento
  // ---------------------------------------------------------------------------

  it('botão mostra "..." e fica desabilitado durante o fetch', async () => {
    let resolveJson!: (v: unknown) => void
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: () => new Promise((res) => { resolveJson = res }),
    } as Response)

    render(<FreteCalculator />)
    await userEvent.type(screen.getByPlaceholderText('00000-000'), '12345678')
    await userEvent.click(screen.getByRole('button', { name: 'Calcular' }))

    expect(screen.getByRole('button', { name: '...' })).toBeDisabled()

    resolveJson(fakeOptions)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Calcular' })).not.toBeDisabled())
  })

  // ---------------------------------------------------------------------------
  // Resposta bem-sucedida
  // ---------------------------------------------------------------------------

  it('exibe opções de frete após resposta bem-sucedida', async () => {
    mockFetch(fakeOptions)
    render(<FreteCalculator />)
    await userEvent.type(screen.getByPlaceholderText('00000-000'), '12345678')
    await userEvent.click(screen.getByRole('button', { name: 'Calcular' }))
    await waitFor(() => expect(screen.getByText('Correios — PAC')).toBeInTheDocument())
    expect(screen.getByText('Correios — SEDEX')).toBeInTheDocument()
  })

  it('exibe preço formatado de cada opção', async () => {
    mockFetch(fakeOptions)
    render(<FreteCalculator />)
    await userEvent.type(screen.getByPlaceholderText('00000-000'), '12345678')
    await userEvent.click(screen.getByRole('button', { name: 'Calcular' }))
    await waitFor(() => expect(screen.getByText('R$ 18.50')).toBeInTheDocument())
    expect(screen.getByText('R$ 32.00')).toBeInTheDocument()
  })

  it('exibe prazo de entrega de cada opção', async () => {
    mockFetch([fakeOptions[0]])
    render(<FreteCalculator />)
    await userEvent.type(screen.getByPlaceholderText('00000-000'), '12345678')
    await userEvent.click(screen.getByRole('button', { name: 'Calcular' }))
    await waitFor(() =>
      expect(screen.getByText('Entrega em até 7 dias úteis')).toBeInTheDocument()
    )
  })

  it('filtra opções com campo error', async () => {
    const withError = [
      ...fakeOptions,
      { id: 3, name: 'Mini', company: { name: 'Correios' }, price: '10.00', delivery_time: 10, error: 'fora da área' },
    ]
    mockFetch(withError)
    render(<FreteCalculator />)
    await userEvent.type(screen.getByPlaceholderText('00000-000'), '12345678')
    await userEvent.click(screen.getByRole('button', { name: 'Calcular' }))
    await waitFor(() => expect(screen.getByText('Correios — PAC')).toBeInTheDocument())
    expect(screen.queryByText('Correios — Mini')).not.toBeInTheDocument()
  })

  it('chama fetch com CEP (somente dígitos) e totalItems', async () => {
    mockFetch(fakeOptions)
    render(<FreteCalculator />)
    await userEvent.type(screen.getByPlaceholderText('00000-000'), '12345678')
    await userEvent.click(screen.getByRole('button', { name: 'Calcular' }))
    await waitFor(() => expect(fetch).toHaveBeenCalledOnce())
    const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(url).toBe('/api/frete')
    const body = JSON.parse((init as RequestInit).body as string)
    expect(body.cep).toBe('12345678')
    expect(body.totalItems).toBe(2)
  })

  // ---------------------------------------------------------------------------
  // Tratamento de erro
  // ---------------------------------------------------------------------------

  it('exibe mensagem de erro da API quando data.error está presente', async () => {
    mockFetch({ error: 'CEP não atendido.' }, false)
    render(<FreteCalculator />)
    await userEvent.type(screen.getByPlaceholderText('00000-000'), '12345678')
    await userEvent.click(screen.getByRole('button', { name: 'Calcular' }))
    await waitFor(() =>
      expect(screen.getByText('CEP não atendido.')).toBeInTheDocument()
    )
  })

  it('exibe "Nenhuma opção disponível" quando todas as opções têm error', async () => {
    const allErrored = [
      { id: 1, name: 'PAC', company: { name: 'Correios' }, price: '', delivery_time: 7, error: 'fora da área' },
    ]
    mockFetch(allErrored)
    render(<FreteCalculator />)
    await userEvent.type(screen.getByPlaceholderText('00000-000'), '12345678')
    await userEvent.click(screen.getByRole('button', { name: 'Calcular' }))
    await waitFor(() =>
      expect(screen.getByText('Nenhuma opção de frete disponível para este CEP.')).toBeInTheDocument()
    )
  })

  it('exibe erro genérico em falha de rede', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))
    render(<FreteCalculator />)
    await userEvent.type(screen.getByPlaceholderText('00000-000'), '12345678')
    await userEvent.click(screen.getByRole('button', { name: 'Calcular' }))
    await waitFor(() =>
      expect(screen.getByText('Não foi possível calcular o frete. Tente novamente.')).toBeInTheDocument()
    )
  })

  // ---------------------------------------------------------------------------
  // Seleção / desseleção de opção
  // ---------------------------------------------------------------------------

  it('clicar em uma opção chama setShipping com essa opção', async () => {
    mockFetch([fakeOptions[0]])
    render(<FreteCalculator />)
    await userEvent.type(screen.getByPlaceholderText('00000-000'), '12345678')
    await userEvent.click(screen.getByRole('button', { name: 'Calcular' }))
    await waitFor(() => screen.getByText('Correios — PAC'))
    await userEvent.click(screen.getByText('Correios — PAC').closest('button')!)
    expect(setShipping).toHaveBeenCalledWith(fakeOptions[0])
  })

  it('clicar na opção já selecionada chama setShipping(null)', async () => {
    mockStore({ shipping: fakeOptions[0] as StoreState['shipping'] })
    mockFetch([fakeOptions[0]])
    render(<FreteCalculator />)
    await userEvent.type(screen.getByPlaceholderText('00000-000'), '12345678')
    await userEvent.click(screen.getByRole('button', { name: 'Calcular' }))
    await waitFor(() => screen.getByText('Correios — PAC'))
    await userEvent.click(screen.getByText('Correios — PAC').closest('button')!)
    expect(setShipping).toHaveBeenCalledWith(null)
  })

  // ---------------------------------------------------------------------------
  // Tecla Enter
  // ---------------------------------------------------------------------------

  it('pressionar Enter no input dispara o cálculo', async () => {
    mockFetch(fakeOptions)
    render(<FreteCalculator />)
    const input = screen.getByPlaceholderText('00000-000')
    await userEvent.type(input, '12345678')
    await userEvent.keyboard('{Enter}')
    await waitFor(() => expect(fetch).toHaveBeenCalledOnce())
  })
})
