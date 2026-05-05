import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../checkout/route'
import { createSupabaseServiceClient } from '@/app/lib/supabase-server'
import { Preference } from 'mercadopago'

const { mockPrefCreate } = vi.hoisted(() => ({
  mockPrefCreate: vi.fn(),
}))

vi.mock('@/app/lib/supabase-server', () => ({
  createSupabaseServiceClient: vi.fn(),
}))

vi.mock('mercadopago', () => ({
  MercadoPagoConfig: vi.fn(),
  // arrow function não pode ser usada como construtor (new Preference(...))
  Preference: vi.fn().mockImplementation(function () {
    return { create: mockPrefCreate }
  }),
}))

// Mock com consciência de tabela — necessário para testes de segurança onde o
// servidor precisa buscar preços do banco em vez de confiar no cliente.
type ProductRow = { id: string; title: string; price: number; is_active: boolean; stock_quantity: number }

interface SmartChainOptions {
  products?: ProductRow[]
  orderResult?: { data: { id: string } | null; error: { message: string } | null }
  stockDecrementResult?: { id: string }[]
  itemsInsertError?: { message: string } | null
}

function makeSmartChain({
  products = [{ id: 'prod-1', title: 'Sousplat', price: 50, is_active: true, stock_quantity: 5 }],
  orderResult = { data: { id: 'order-uuid' }, error: null },
  stockDecrementResult = [{ id: 'prod-1' }],
  itemsInsertError = null,
}: SmartChainOptions = {}) {
  const inSpy = vi.fn().mockResolvedValue({ data: products, error: null })
  const orderInsertSpy = vi.fn(() => ({
    select: vi.fn(() => ({
      single: vi.fn().mockResolvedValue(orderResult),
    })),
  }))
  const itemsInsertSpy = vi.fn().mockResolvedValue({ error: itemsInsertError })
  const updateSpy = vi.fn(() => ({ eq: vi.fn().mockResolvedValue({}) }))
  const productsUpdateSpy = vi.fn(() => ({
    eq: vi.fn(() => ({
      gte: vi.fn(() => ({
        select: vi.fn().mockResolvedValue({ data: stockDecrementResult, error: null }),
      })),
    })),
  }))

  const client = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    from: vi.fn((table: string): any => {
      if (table === 'products') return { select: vi.fn(() => ({ in: inSpy })), update: productsUpdateSpy }
      if (table === 'orders') return { insert: orderInsertSpy, update: updateSpy }
      return { insert: itemsInsertSpy }
    }),
  }

  return { client, orderInsertSpy, itemsInsertSpy, updateSpy, inSpy, productsUpdateSpy }
}

function makeRequest(body: object) {
  return new Request('http://localhost', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

const validBody = {
  customer: { name: 'Ana', email: 'ana@test.com', phone: '11999999999' },
  items: [{ id: 'prod-1', title: 'Sousplat', price: 50, quantity: 2 }],
  shipping: { id: 1, name: 'PAC', price: '18.50', delivery_time: 7, company: { name: 'Correios' } },
  shippingAddress: { cep: '73086130', rua: 'Rua Teste', numero: '1' },
}

describe('POST /api/checkout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.MERCADO_PAGO_ACCESS_TOKEN
  })

  // ---------------------------------------------------------------------------
  // Validação de entrada
  // ---------------------------------------------------------------------------

  describe('validação de entrada', () => {
    it('retorna 400 se customer.name estiver ausente', async () => {
      const res = await POST(makeRequest({ ...validBody, customer: { email: 'a@b.com' } }))
      expect(res.status).toBe(400)
      const json = await res.json()
      expect(json.error).toBeDefined()
    })

    it('retorna 400 se customer.email estiver ausente', async () => {
      const res = await POST(makeRequest({ ...validBody, customer: { name: 'Ana' } }))
      expect(res.status).toBe(400)
    })

    it('retorna 400 se items estiver vazio', async () => {
      const res = await POST(makeRequest({ ...validBody, items: [] }))
      expect(res.status).toBe(400)
    })
  })

  // ---------------------------------------------------------------------------
  // Erro no banco de dados
  // ---------------------------------------------------------------------------

  describe('erro no banco', () => {
    it('retorna 500 se o Supabase falhar ao criar o pedido', async () => {
      const { client } = makeSmartChain({ orderResult: { data: null, error: { message: 'DB error' } } })
      vi.mocked(createSupabaseServiceClient).mockReturnValue(client as unknown as ReturnType<typeof createSupabaseServiceClient>)

      const res = await POST(makeRequest(validBody))
      expect(res.status).toBe(500)
    })

    it('retorna 500 se a inserção de order_items falhar — não continua para o MP', async () => {
      process.env.MERCADO_PAGO_ACCESS_TOKEN = 'TEST-token'
      const { client } = makeSmartChain({ itemsInsertError: { message: 'Items DB error' } })
      vi.mocked(createSupabaseServiceClient).mockReturnValue(client as unknown as ReturnType<typeof createSupabaseServiceClient>)

      const res = await POST(makeRequest(validBody))
      expect(res.status).toBe(500)
      // MP não deve ser chamado se itens falharam
      expect(mockPrefCreate).not.toHaveBeenCalled()
    })
  })

  // ---------------------------------------------------------------------------
  // Sem Mercado Pago configurado
  // ---------------------------------------------------------------------------

  describe('sem Mercado Pago configurado', () => {
    it('retorna 503 quando MERCADO_PAGO_ACCESS_TOKEN está ausente', async () => {
      const { client } = makeSmartChain()
      vi.mocked(createSupabaseServiceClient).mockReturnValue(client as unknown as ReturnType<typeof createSupabaseServiceClient>)

      const res = await POST(makeRequest(validBody))
      expect(res.status).toBe(503)
    })

    it('retorna mensagem genérica sem expor nome da variável de ambiente', async () => {
      const { client } = makeSmartChain()
      vi.mocked(createSupabaseServiceClient).mockReturnValue(client as unknown as ReturnType<typeof createSupabaseServiceClient>)
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const res = await POST(makeRequest(validBody))
      const body = await res.json()

      expect(body.error).not.toContain('MERCADO_PAGO_ACCESS_TOKEN')
      expect(body.error).toContain('Pagamento temporariamente indisponível')
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('MERCADO_PAGO_ACCESS_TOKEN'))
      consoleSpy.mockRestore()
    })
  })

  // ---------------------------------------------------------------------------
  // Sucesso completo
  // ---------------------------------------------------------------------------

  describe('sucesso', () => {
    it('retorna order_id, init_point e sandbox_init_point', async () => {
      process.env.MERCADO_PAGO_ACCESS_TOKEN = 'TEST-token'
      const { client } = makeSmartChain()
      vi.mocked(createSupabaseServiceClient).mockReturnValue(client as unknown as ReturnType<typeof createSupabaseServiceClient>)
      mockPrefCreate.mockResolvedValue({
        id: 'pref-id',
        init_point: 'https://mp.com/pay',
        sandbox_init_point: 'https://sandbox.mp.com/pay',
      })

      const res = await POST(makeRequest(validBody))
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json.order_id).toBe('order-uuid')
      expect(json.init_point).toBe('https://mp.com/pay')
      expect(json.sandbox_init_point).toBe('https://sandbox.mp.com/pay')
    })

    it('cria os itens do pedido no banco com os dados corretos', async () => {
      process.env.MERCADO_PAGO_ACCESS_TOKEN = 'TEST-token'
      const { client, itemsInsertSpy } = makeSmartChain()
      vi.mocked(createSupabaseServiceClient).mockReturnValue(client as unknown as ReturnType<typeof createSupabaseServiceClient>)
      mockPrefCreate.mockResolvedValue({ id: 'pref-id', init_point: '', sandbox_init_point: '' })

      await POST(makeRequest(validBody))

      expect(itemsInsertSpy).toHaveBeenCalledWith([
        { order_id: 'order-uuid', product_id: 'prod-1', quantity: 2, unit_price: 50 },
      ])
    })
  })

  // ---------------------------------------------------------------------------
  // Segurança: preço deve vir do banco, não do cliente
  // ---------------------------------------------------------------------------

  describe('segurança — validação de preço', () => {
    it('ignora o preço enviado pelo cliente e usa o preço do banco', async () => {
      process.env.MERCADO_PAGO_ACCESS_TOKEN = 'TEST-token'
      const { client, itemsInsertSpy } = makeSmartChain({
        products: [{ id: 'prod-1', title: 'Sousplat', price: 50, is_active: true, stock_quantity: 5 }],
      })
      vi.mocked(createSupabaseServiceClient).mockReturnValue(client as unknown as ReturnType<typeof createSupabaseServiceClient>)
      mockPrefCreate.mockResolvedValue({ id: 'pref-id', init_point: '', sandbox_init_point: '' })

      // Cliente envia preço manipulado: R$ 0,01 em vez de R$ 50,00
      const bodyComPrecoManipulado = {
        ...validBody,
        items: [{ id: 'prod-1', title: 'Sousplat', price: 0.01, quantity: 1 }],
      }

      await POST(makeRequest(bodyComPrecoManipulado))

      // Deve usar o preço do banco (50), não o do cliente (0.01)
      expect(itemsInsertSpy).toHaveBeenCalledWith([
        expect.objectContaining({ product_id: 'prod-1', unit_price: 50 }),
      ])
    })

    it('retorna 400 se algum produto não existir no banco', async () => {
      const { client } = makeSmartChain({ products: [] })
      vi.mocked(createSupabaseServiceClient).mockReturnValue(client as unknown as ReturnType<typeof createSupabaseServiceClient>)

      const res = await POST(makeRequest(validBody))
      expect(res.status).toBe(400)
    })

    it('retorna 400 se produto estiver inativo', async () => {
      const { client } = makeSmartChain({
        products: [{ id: 'prod-1', title: 'Sousplat', price: 50, is_active: false, stock_quantity: 5 }],
      })
      vi.mocked(createSupabaseServiceClient).mockReturnValue(client as unknown as ReturnType<typeof createSupabaseServiceClient>)

      const res = await POST(makeRequest(validBody))
      expect(res.status).toBe(400)
    })
  })

  // ---------------------------------------------------------------------------
  // Validação de estoque
  // ---------------------------------------------------------------------------

  describe('validação de estoque', () => {
    it('retorna 409 se estoque insuficiente (quantidade solicitada maior que disponível)', async () => {
      // stock_quantity=1, validBody pede quantity=2 → deve rejeitar
      const { client } = makeSmartChain({
        products: [{ id: 'prod-1', title: 'Sousplat', price: 50, is_active: true, stock_quantity: 1 }],
      })
      vi.mocked(createSupabaseServiceClient).mockReturnValue(client as unknown as ReturnType<typeof createSupabaseServiceClient>)

      const res = await POST(makeRequest(validBody))
      expect(res.status).toBe(409)
      const json = await res.json()
      expect(json.error).toMatch(/estoque/i)
    })

    it('retorna 409 se estoque zerado', async () => {
      const { client } = makeSmartChain({
        products: [{ id: 'prod-1', title: 'Sousplat', price: 50, is_active: true, stock_quantity: 0 }],
      })
      vi.mocked(createSupabaseServiceClient).mockReturnValue(client as unknown as ReturnType<typeof createSupabaseServiceClient>)

      const res = await POST(makeRequest(validBody))
      expect(res.status).toBe(409)
    })

    it('decrementa o estoque atomicamente após criar o pedido', async () => {
      process.env.MERCADO_PAGO_ACCESS_TOKEN = 'TEST-token'
      const { client, productsUpdateSpy } = makeSmartChain({
        products: [{ id: 'prod-1', title: 'Sousplat', price: 50, is_active: true, stock_quantity: 5 }],
      })
      vi.mocked(createSupabaseServiceClient).mockReturnValue(client as unknown as ReturnType<typeof createSupabaseServiceClient>)
      mockPrefCreate.mockResolvedValue({ id: 'pref-id', init_point: '', sandbox_init_point: '' })

      await POST(makeRequest(validBody)) // quantity=2

      // Deve chamar update em products com novo estoque (5 - 2 = 3)
      expect(productsUpdateSpy).toHaveBeenCalledWith({ stock_quantity: 3 })
    })

    it('retorna 409 em corrida: outro cliente comprou o último item antes (update atômico retorna 0 linhas)', async () => {
      process.env.MERCADO_PAGO_ACCESS_TOKEN = 'TEST-token'
      // stock_quantity=1 e qty=1 passa a verificação inicial, mas o update atômico falha
      const { client } = makeSmartChain({
        products: [{ id: 'prod-1', title: 'Sousplat', price: 50, is_active: true, stock_quantity: 1 }],
        stockDecrementResult: [], // simula corrida: 0 linhas atualizadas
      })
      vi.mocked(createSupabaseServiceClient).mockReturnValue(client as unknown as ReturnType<typeof createSupabaseServiceClient>)
      mockPrefCreate.mockResolvedValue({ id: 'pref-id', init_point: '', sandbox_init_point: '' })

      const bodyCorrida = {
        ...validBody,
        items: [{ id: 'prod-1', title: 'Sousplat', price: 50, quantity: 1 }],
      }
      const res = await POST(makeRequest(bodyCorrida))
      expect(res.status).toBe(409)
    })
  })

  // ---------------------------------------------------------------------------
  // Referência: mock do Preference para verificar integração
  // ---------------------------------------------------------------------------

  it('garante que Preference foi importado pelo mock', () => {
    expect(Preference).toBeDefined()
  })

  // ---------------------------------------------------------------------------
  // Preferência Mercado Pago — body enviado ao MP
  // ---------------------------------------------------------------------------

  describe('preferência Mercado Pago — body enviado', () => {
    it('cria preferência com items, payer, back_urls, external_reference e statement_descriptor corretos', async () => {
      process.env.MERCADO_PAGO_ACCESS_TOKEN = 'TEST-token'
      const { client } = makeSmartChain()
      vi.mocked(createSupabaseServiceClient).mockReturnValue(client as unknown as ReturnType<typeof createSupabaseServiceClient>)
      mockPrefCreate.mockResolvedValue({ id: 'pref-id', init_point: 'https://mp.com/pay', sandbox_init_point: '' })

      await POST(makeRequest(validBody))

      const prefArg = mockPrefCreate.mock.calls[0][0]
      expect(prefArg.body.items[0]).toMatchObject({
        title: 'Sousplat',
        quantity: 2,
        unit_price: 50,
        currency_id: 'BRL',
      })
      expect(prefArg.body.payer).toEqual({ name: 'Ana', email: 'ana@test.com' })
      expect(prefArg.body.back_urls).toMatchObject({
        success: expect.stringContaining('/checkout/sucesso'),
        failure: expect.stringContaining('/checkout/falha'),
        pending: expect.stringContaining('/checkout/pendente'),
      })
      expect(prefArg.body.external_reference).toBe('order-uuid')
      expect(prefArg.body.statement_descriptor).toBe('Yez Store')
    })

    it('adiciona frete como item separado quando shippingCost > 0', async () => {
      process.env.MERCADO_PAGO_ACCESS_TOKEN = 'TEST-token'
      const { client } = makeSmartChain()
      vi.mocked(createSupabaseServiceClient).mockReturnValue(client as unknown as ReturnType<typeof createSupabaseServiceClient>)
      mockPrefCreate.mockResolvedValue({ id: 'pref-id', init_point: '', sandbox_init_point: '' })

      await POST(makeRequest(validBody)) // shipping.price = '18.50'

      const prefArg = mockPrefCreate.mock.calls[0][0]
      const freteItem = prefArg.body.items.find((i: { title: string }) => i.title.includes('Frete'))
      expect(freteItem).toMatchObject({ unit_price: 18.5, quantity: 1, currency_id: 'BRL' })
    })

    it('não adiciona item de frete quando shipping é nulo', async () => {
      process.env.MERCADO_PAGO_ACCESS_TOKEN = 'TEST-token'
      const { client } = makeSmartChain()
      vi.mocked(createSupabaseServiceClient).mockReturnValue(client as unknown as ReturnType<typeof createSupabaseServiceClient>)
      mockPrefCreate.mockResolvedValue({ id: 'pref-id', init_point: '', sandbox_init_point: '' })

      const bodyWithoutShipping = { ...validBody, shipping: null }
      await POST(makeRequest(bodyWithoutShipping))

      const prefArg = mockPrefCreate.mock.calls[0][0]
      const freteItem = prefArg.body.items.find((i: { title: string }) => i.title.includes('Frete'))
      expect(freteItem).toBeUndefined()
      expect(prefArg.body.items).toHaveLength(1)
    })

    it('salva mp_preference_id no pedido após criar preferência', async () => {
      process.env.MERCADO_PAGO_ACCESS_TOKEN = 'TEST-token'
      const { client, updateSpy } = makeSmartChain()
      vi.mocked(createSupabaseServiceClient).mockReturnValue(client as unknown as ReturnType<typeof createSupabaseServiceClient>)
      mockPrefCreate.mockResolvedValue({ id: 'pref-xyz', init_point: '', sandbox_init_point: '' })

      await POST(makeRequest(validBody))

      expect(updateSpy).toHaveBeenCalledWith({ mp_preference_id: 'pref-xyz' })
    })
  })

  // ---------------------------------------------------------------------------
  // Comportamento localhost vs produção
  // ---------------------------------------------------------------------------

  describe('comportamento localhost vs produção', () => {
    it('em localhost (URL padrão): não envia auto_return nem notification_url ao MP', async () => {
      // NEXT_PUBLIC_BASE_URL não definido → baseUrl = 'http://localhost:3000' → isLocalhost = true
      process.env.MERCADO_PAGO_ACCESS_TOKEN = 'TEST-token'
      const { client } = makeSmartChain()
      vi.mocked(createSupabaseServiceClient).mockReturnValue(client as unknown as ReturnType<typeof createSupabaseServiceClient>)
      mockPrefCreate.mockResolvedValue({ id: 'pref-id', init_point: '', sandbox_init_point: '' })

      await POST(makeRequest(validBody))

      const prefArg = mockPrefCreate.mock.calls[0][0]
      expect(prefArg.body.auto_return).toBeUndefined()
      expect(prefArg.body.notification_url).toBeUndefined()
    })

    it('em produção: envia auto_return=approved e notification_url com domínio correto', async () => {
      process.env.NEXT_PUBLIC_BASE_URL = 'https://yezstore.com'
      process.env.MERCADO_PAGO_ACCESS_TOKEN = 'TEST-token'
      vi.resetModules()

      const { POST: POSTfresh } = await import('../checkout/route')
      const { createSupabaseServiceClient: freshCSC } = await import('@/app/lib/supabase-server')
      const { client } = makeSmartChain()
      vi.mocked(freshCSC).mockReturnValue(client as unknown as ReturnType<typeof createSupabaseServiceClient>)
      mockPrefCreate.mockResolvedValue({ id: 'pref-id', init_point: '', sandbox_init_point: '' })

      await POSTfresh(makeRequest(validBody))

      const prefArg = mockPrefCreate.mock.calls[0][0]
      expect(prefArg.body.auto_return).toBe('approved')
      expect(prefArg.body.notification_url).toBe('https://yezstore.com/api/webhooks/mercadopago')

      delete process.env.NEXT_PUBLIC_BASE_URL
      vi.resetModules()
    })
  })
})
