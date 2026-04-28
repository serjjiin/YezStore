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

// Cria um mock do cliente Supabase com cadeia de chamadas encadeáveis.
// single() é o único método que retorna uma Promise — os demais retornam o
// próprio chain para que .insert().select().single() e .update().eq() funcionem.
// Quando o código faz `await supabase.from('order_items').insert(...)` sem chamar
// .single(), o `await` recebe o chain (não-thenable) e desestrutura error: undefined.
function makeSupabaseChain(
  orderResult: { data: { id: string } | null; error: { message: string } | null } = {
    data: { id: 'order-uuid' },
    error: null,
  }
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: Record<string, any> = {}
  for (const method of ['from', 'insert', 'select', 'update', 'eq']) {
    chain[method] = vi.fn().mockReturnValue(chain)
  }
  chain.single = vi.fn().mockResolvedValue(orderResult)
  return chain
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
      const chain = makeSupabaseChain({ data: null, error: { message: 'DB error' } })
      vi.mocked(createSupabaseServiceClient).mockReturnValue(chain)

      const res = await POST(makeRequest(validBody))
      expect(res.status).toBe(500)
    })
  })

  // ---------------------------------------------------------------------------
  // Sem Mercado Pago configurado
  // ---------------------------------------------------------------------------

  describe('sem Mercado Pago configurado', () => {
    it('retorna 503 quando MERCADO_PAGO_ACCESS_TOKEN está ausente', async () => {
      const chain = makeSupabaseChain()
      vi.mocked(createSupabaseServiceClient).mockReturnValue(chain)

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
      const chain = makeSupabaseChain()
      vi.mocked(createSupabaseServiceClient).mockReturnValue(chain)
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
      const chain = makeSupabaseChain()
      vi.mocked(createSupabaseServiceClient).mockReturnValue(chain)
      mockPrefCreate.mockResolvedValue({ id: 'pref-id', init_point: '', sandbox_init_point: '' })

      await POST(makeRequest(validBody))

      expect(chain.insert).toHaveBeenCalledWith([
        { order_id: 'order-uuid', product_id: 'prod-1', quantity: 2, unit_price: 50 },
      ])
    })
  })

  // ---------------------------------------------------------------------------
  // Referência: mock do Preference para verificar integração
  // ---------------------------------------------------------------------------

  it('garante que Preference foi importado pelo mock', () => {
    expect(Preference).toBeDefined()
  })
})
