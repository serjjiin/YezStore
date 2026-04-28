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
type ProductRow = { id: string; title: string; price: number; is_active: boolean }

interface SmartChainOptions {
  products?: ProductRow[]
  orderResult?: { data: { id: string } | null; error: { message: string } | null }
}

function makeSmartChain({
  products = [{ id: 'prod-1', title: 'Sousplat', price: 50, is_active: true }],
  orderResult = { data: { id: 'order-uuid' }, error: null },
}: SmartChainOptions = {}) {
  const inSpy = vi.fn().mockResolvedValue({ data: products, error: null })
  const orderInsertSpy = vi.fn(() => ({
    select: vi.fn(() => ({
      single: vi.fn().mockResolvedValue(orderResult),
    })),
  }))
  const itemsInsertSpy = vi.fn().mockResolvedValue({ error: null })
  const updateSpy = vi.fn(() => ({ eq: vi.fn().mockResolvedValue({}) }))

  const client = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    from: vi.fn((table: string): any => {
      if (table === 'products') return { select: vi.fn(() => ({ in: inSpy })) }
      if (table === 'orders') return { insert: orderInsertSpy, update: updateSpy }
      return { insert: itemsInsertSpy }
    }),
  }

  return { client, orderInsertSpy, itemsInsertSpy, updateSpy, inSpy }
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
      vi.mocked(createSupabaseServiceClient).mockReturnValue(client as ReturnType<typeof createSupabaseServiceClient>)

      const res = await POST(makeRequest(validBody))
      expect(res.status).toBe(500)
    })
  })

  // ---------------------------------------------------------------------------
  // Sem Mercado Pago configurado
  // ---------------------------------------------------------------------------

  describe('sem Mercado Pago configurado', () => {
    it('retorna 503 quando MERCADO_PAGO_ACCESS_TOKEN está ausente', async () => {
      const { client } = makeSmartChain()
      vi.mocked(createSupabaseServiceClient).mockReturnValue(client as ReturnType<typeof createSupabaseServiceClient>)

      const res = await POST(makeRequest(validBody))
      expect(res.status).toBe(503)
    })
  })

  // ---------------------------------------------------------------------------
  // Sucesso completo
  // ---------------------------------------------------------------------------

  describe('sucesso', () => {
    it('retorna order_id, init_point e sandbox_init_point', async () => {
      process.env.MERCADO_PAGO_ACCESS_TOKEN = 'TEST-token'
      const { client } = makeSmartChain()
      vi.mocked(createSupabaseServiceClient).mockReturnValue(client as ReturnType<typeof createSupabaseServiceClient>)
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
      vi.mocked(createSupabaseServiceClient).mockReturnValue(client as ReturnType<typeof createSupabaseServiceClient>)
      mockPrefCreate.mockResolvedValue({ id: 'pref-id', init_point: '', sandbox_init_point: '' })

      await POST(makeRequest(validBody))

      expect(itemsInsertSpy).toHaveBeenCalledWith([
        { order_id: 'order-uuid', product_id: 'prod-1', quantity: 2, unit_price: 50 },
      ])
    })
  })

  // ---------------------------------------------------------------------------
  // 🔴 RED — Segurança: preço deve vir do banco, não do cliente
  // ---------------------------------------------------------------------------

  describe('segurança — validação de preço', () => {
    it('ignora o preço enviado pelo cliente e usa o preço do banco', async () => {
      process.env.MERCADO_PAGO_ACCESS_TOKEN = 'TEST-token'
      const { client, itemsInsertSpy } = makeSmartChain({
        products: [{ id: 'prod-1', title: 'Sousplat', price: 50, is_active: true }],
      })
      vi.mocked(createSupabaseServiceClient).mockReturnValue(client as ReturnType<typeof createSupabaseServiceClient>)
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
      vi.mocked(createSupabaseServiceClient).mockReturnValue(client as ReturnType<typeof createSupabaseServiceClient>)

      const res = await POST(makeRequest(validBody))
      expect(res.status).toBe(400)
    })

    it('retorna 400 se produto estiver inativo', async () => {
      const { client } = makeSmartChain({
        products: [{ id: 'prod-1', title: 'Sousplat', price: 50, is_active: false }],
      })
      vi.mocked(createSupabaseServiceClient).mockReturnValue(client as ReturnType<typeof createSupabaseServiceClient>)

      const res = await POST(makeRequest(validBody))
      expect(res.status).toBe(400)
    })
  })

  // ---------------------------------------------------------------------------
  // Referência: mock do Preference para verificar integração
  // ---------------------------------------------------------------------------

  it('garante que Preference foi importado pelo mock', () => {
    expect(Preference).toBeDefined()
  })
})
