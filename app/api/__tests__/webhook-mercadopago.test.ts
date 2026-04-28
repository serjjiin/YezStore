import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../webhooks/mercadopago/route'
import { createSupabaseServiceClient } from '@/app/lib/supabase-server'

vi.mock('@/app/lib/supabase-server', () => ({
  createSupabaseServiceClient: vi.fn(),
}))

// Cria mock do cliente Supabase — expõe updateSpy para que os testes possam
// verificar com quais argumentos .update() foi chamado.
function makeSupabaseChain() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: Record<string, any> = {}
  const updateSpy = vi.fn().mockReturnValue(chain)
  chain.from = vi.fn().mockReturnValue(chain)
  chain.update = updateSpy
  chain.eq = vi.fn().mockReturnValue(chain)
  return { client: chain, updateSpy }
}

// Stub do fetch global para simular resposta da API do Mercado Pago
function mockMpFetch(data: object, ok = true) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok, json: () => Promise.resolve(data) })
  )
}

function makeRequest(body: string | object) {
  const bodyStr = typeof body === 'string' ? body : JSON.stringify(body)
  return new Request('http://localhost', {
    method: 'POST',
    body: bodyStr,
    headers: { 'Content-Type': 'application/json' },
  })
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
})
