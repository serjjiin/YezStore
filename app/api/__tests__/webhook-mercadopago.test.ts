import { createHmac } from 'crypto'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { POST } from '../webhooks/mercadopago/route'
import { createSupabaseServiceClient } from '@/app/lib/supabase-server'

vi.mock('@/app/lib/supabase-server', () => ({
  createSupabaseServiceClient: vi.fn(),
}))

type OrderItem = { product_id: string; quantity: number }

// Cria mock do cliente Supabase com suporte a tabelas distintas.
// orderItems: itens a retornar quando order_items.select().eq() for chamado (usado nos testes de restauração de estoque).
function makeSupabaseChain(orderItems: OrderItem[] = []) {
  const rpcSpy = vi.fn().mockResolvedValue({ data: null, error: null })

  const updateSpy = vi.fn()
  const updateEqSpy = vi.fn().mockResolvedValue({})
  updateSpy.mockReturnValue({ eq: updateEqSpy })

  const orderItemsSelectSpy = vi.fn()
  const orderItemsEqSpy = vi.fn().mockResolvedValue({ data: orderItems, error: null })
  orderItemsSelectSpy.mockReturnValue({ eq: orderItemsEqSpy })

  const client = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    from: vi.fn((table: string): any => {
      if (table === 'orders') return { update: updateSpy }
      if (table === 'order_items') return { select: orderItemsSelectSpy }
      return {}
    }),
    rpc: rpcSpy,
  }

  return { client, updateSpy, rpcSpy }
}

// Stub do fetch global para simular resposta da API do Mercado Pago
function mockMpFetch(data: object, ok = true) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok, json: () => Promise.resolve(data) })
  )
}

function makeRequest(body: string | object, extraHeaders: Record<string, string> = {}) {
  const bodyStr = typeof body === 'string' ? body : JSON.stringify(body)
  return new Request('http://localhost', {
    method: 'POST',
    body: bodyStr,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
  })
}

// Computa a assinatura HMAC-SHA256 no mesmo formato que o Mercado Pago usa.
// Útil nos testes para gerar uma assinatura válida e verificar que o servidor a aceita.
function computeMpSignature(dataId: string, requestId: string, ts: string, secret: string) {
  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`
  const hash = createHmac('sha256', secret).update(manifest).digest('hex')
  return { xSignature: `ts=${ts},v1=${hash}`, xRequestId: requestId }
}

describe('POST /api/webhooks/mercadopago', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllGlobals()
    delete process.env.MERCADO_PAGO_ACCESS_TOKEN
  })

  // ---------------------------------------------------------------------------
  // Robustez — sempre retorna 200 para evitar reenvios do MP
  // ---------------------------------------------------------------------------

  it('retorna { ok: true } para body inválido (JSON malformado)', async () => {
    const res = await POST(makeRequest('not-valid-json{'))
    expect(res.status).toBe(200)
    expect((await res.json()).ok).toBe(true)
  })

  it('retorna { ok: true } para type diferente de payment', async () => {
    const res = await POST(makeRequest({ type: 'merchant_order', data: { id: '123' } }))
    expect(res.status).toBe(200)
    expect((await res.json()).ok).toBe(true)
  })

  it('retorna { ok: true } se data.id estiver ausente', async () => {
    const res = await POST(makeRequest({ type: 'payment', data: {} }))
    expect(res.status).toBe(200)
    expect((await res.json()).ok).toBe(true)
  })

  it('retorna { ok: true } se MERCADO_PAGO_ACCESS_TOKEN não estiver configurado', async () => {
    const res = await POST(makeRequest({ type: 'payment', data: { id: '999' } }))
    expect(res.status).toBe(200)
    expect((await res.json()).ok).toBe(true)
  })

  it('retorna { ok: true } se a API do MP retornar erro', async () => {
    process.env.MERCADO_PAGO_ACCESS_TOKEN = 'TEST-token'
    mockMpFetch({}, false)

    const res = await POST(makeRequest({ type: 'payment', data: { id: '999' } }))
    expect(res.status).toBe(200)
    expect((await res.json()).ok).toBe(true)
  })

  // ---------------------------------------------------------------------------
  // Segurança: verificação de assinatura x-signature
  // ---------------------------------------------------------------------------

  describe('verificação de assinatura', () => {
    const WEBHOOK_SECRET = 'segredo-de-teste'

    beforeEach(() => {
      process.env.MERCADO_PAGO_ACCESS_TOKEN = 'TEST-token'
      process.env.MERCADO_PAGO_WEBHOOK_SECRET = WEBHOOK_SECRET
    })

    afterEach(() => {
      delete process.env.MERCADO_PAGO_WEBHOOK_SECRET
    })

    it('retorna 401 se x-signature estiver ausente', async () => {
      const res = await POST(makeRequest({ type: 'payment', data: { id: '42' } }))
      expect(res.status).toBe(401)
    })

    it('retorna 401 se x-signature tiver hash inválido', async () => {
      const res = await POST(
        makeRequest(
          { type: 'payment', data: { id: '42' } },
          { 'x-signature': 'ts=1234,v1=hash_invalido', 'x-request-id': 'req-1' }
        )
      )
      expect(res.status).toBe(401)
    })

    it('retorna 401 se x-signature estiver mal formatado', async () => {
      const res = await POST(
        makeRequest(
          { type: 'payment', data: { id: '42' } },
          { 'x-signature': 'formato-errado' }
        )
      )
      expect(res.status).toBe(401)
    })

    it('processa normalmente com x-signature válido', async () => {
      const { client, updateSpy } = makeSupabaseChain()
      vi.mocked(createSupabaseServiceClient).mockReturnValue(client)
      mockMpFetch({ status: 'approved', external_reference: 'order-uuid', id: 42 })

      const { xSignature, xRequestId } = computeMpSignature('42', 'req-1', '1700000000', WEBHOOK_SECRET)

      await POST(
        makeRequest(
          { type: 'payment', data: { id: '42' } },
          { 'x-signature': xSignature, 'x-request-id': xRequestId }
        )
      )

      expect(updateSpy).toHaveBeenCalledWith({ status: 'paid', mp_payment_id: '42' })
    })

    it('pula verificação se MERCADO_PAGO_WEBHOOK_SECRET não estiver configurado', async () => {
      delete process.env.MERCADO_PAGO_WEBHOOK_SECRET
      const { client } = makeSupabaseChain()
      vi.mocked(createSupabaseServiceClient).mockReturnValue(client)
      mockMpFetch({ status: 'approved', external_reference: 'order-uuid', id: 42 })

      // Sem secret configurado, requisição sem x-signature deve passar
      const res = await POST(makeRequest({ type: 'payment', data: { id: '42' } }))
      expect(res.status).toBe(200)
    })
  })

  // ---------------------------------------------------------------------------
  // Atualização de status do pedido
  // ---------------------------------------------------------------------------

  describe('atualização de status', () => {
    beforeEach(() => {
      process.env.MERCADO_PAGO_ACCESS_TOKEN = 'TEST-token'
    })

    it('atualiza pedido para paid quando pagamento for aprovado', async () => {
      const { client, updateSpy } = makeSupabaseChain()
      vi.mocked(createSupabaseServiceClient).mockReturnValue(client)
      mockMpFetch({ status: 'approved', external_reference: 'order-uuid', id: 42 })

      await POST(makeRequest({ type: 'payment', data: { id: '42' } }))

      expect(updateSpy).toHaveBeenCalledWith({ status: 'paid', mp_payment_id: '42' })
    })

    it('atualiza pedido para cancelled quando pagamento for rejeitado', async () => {
      const { client, updateSpy } = makeSupabaseChain()
      vi.mocked(createSupabaseServiceClient).mockReturnValue(client)
      mockMpFetch({ status: 'rejected', external_reference: 'order-uuid', id: 42 })

      await POST(makeRequest({ type: 'payment', data: { id: '42' } }))

      expect(updateSpy).toHaveBeenCalledWith({ status: 'cancelled', mp_payment_id: '42' })
    })

    it('mantém pedido como pending quando pagamento estiver em processo', async () => {
      const { client, updateSpy } = makeSupabaseChain()
      vi.mocked(createSupabaseServiceClient).mockReturnValue(client)
      mockMpFetch({ status: 'in_process', external_reference: 'order-uuid', id: 42 })

      await POST(makeRequest({ type: 'payment', data: { id: '42' } }))

      expect(updateSpy).toHaveBeenCalledWith({ status: 'pending', mp_payment_id: '42' })
    })

    it('não atualiza o pedido se external_reference estiver ausente', async () => {
      const { client, updateSpy } = makeSupabaseChain()
      vi.mocked(createSupabaseServiceClient).mockReturnValue(client)
      mockMpFetch({ status: 'approved', external_reference: null, id: 42 })

      await POST(makeRequest({ type: 'payment', data: { id: '42' } }))

      expect(updateSpy).not.toHaveBeenCalled()
    })

    it('filtra pagamento cancelado pelo MP', async () => {
      const { client, updateSpy } = makeSupabaseChain()
      vi.mocked(createSupabaseServiceClient).mockReturnValue(client)
      mockMpFetch({ status: 'cancelled', external_reference: 'order-uuid', id: 42 })

      await POST(makeRequest({ type: 'payment', data: { id: '42' } }))

      expect(updateSpy).toHaveBeenCalledWith({ status: 'cancelled', mp_payment_id: '42' })
    })
  })

  // ---------------------------------------------------------------------------
  // Restauração de estoque em pagamento cancelado/rejeitado
  // ---------------------------------------------------------------------------

  describe('restauração de estoque', () => {
    beforeEach(() => {
      process.env.MERCADO_PAGO_ACCESS_TOKEN = 'TEST-token'
    })

    it('chama increment_stock para cada item quando pagamento for rejeitado', async () => {
      const items: OrderItem[] = [
        { product_id: 'prod-a', quantity: 2 },
        { product_id: 'prod-b', quantity: 1 },
      ]
      const { client, rpcSpy } = makeSupabaseChain(items)
      vi.mocked(createSupabaseServiceClient).mockReturnValue(client)
      mockMpFetch({ status: 'rejected', external_reference: 'order-uuid', id: 42 })

      await POST(makeRequest({ type: 'payment', data: { id: '42' } }))

      expect(rpcSpy).toHaveBeenCalledTimes(2)
      expect(rpcSpy).toHaveBeenCalledWith('increment_stock', { p_product_id: 'prod-a', p_qty: 2 })
      expect(rpcSpy).toHaveBeenCalledWith('increment_stock', { p_product_id: 'prod-b', p_qty: 1 })
    })

    it('chama increment_stock quando pagamento for cancelado', async () => {
      const items: OrderItem[] = [{ product_id: 'prod-a', quantity: 3 }]
      const { client, rpcSpy } = makeSupabaseChain(items)
      vi.mocked(createSupabaseServiceClient).mockReturnValue(client)
      mockMpFetch({ status: 'cancelled', external_reference: 'order-uuid', id: 42 })

      await POST(makeRequest({ type: 'payment', data: { id: '42' } }))

      expect(rpcSpy).toHaveBeenCalledWith('increment_stock', { p_product_id: 'prod-a', p_qty: 3 })
    })

    it('não chama increment_stock quando pagamento for aprovado', async () => {
      const { client, rpcSpy } = makeSupabaseChain([{ product_id: 'prod-a', quantity: 1 }])
      vi.mocked(createSupabaseServiceClient).mockReturnValue(client)
      mockMpFetch({ status: 'approved', external_reference: 'order-uuid', id: 42 })

      await POST(makeRequest({ type: 'payment', data: { id: '42' } }))

      expect(rpcSpy).not.toHaveBeenCalled()
    })

    it('não chama increment_stock quando pagamento estiver pendente', async () => {
      const { client, rpcSpy } = makeSupabaseChain([{ product_id: 'prod-a', quantity: 1 }])
      vi.mocked(createSupabaseServiceClient).mockReturnValue(client)
      mockMpFetch({ status: 'pending', external_reference: 'order-uuid', id: 42 })

      await POST(makeRequest({ type: 'payment', data: { id: '42' } }))

      expect(rpcSpy).not.toHaveBeenCalled()
    })

    it('não chama increment_stock se não houver itens no pedido', async () => {
      const { client, rpcSpy } = makeSupabaseChain([]) // sem itens
      vi.mocked(createSupabaseServiceClient).mockReturnValue(client)
      mockMpFetch({ status: 'cancelled', external_reference: 'order-uuid', id: 42 })

      await POST(makeRequest({ type: 'payment', data: { id: '42' } }))

      expect(rpcSpy).not.toHaveBeenCalled()
    })
  })
})
