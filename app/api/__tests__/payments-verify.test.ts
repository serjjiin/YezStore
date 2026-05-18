import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../payments/verify/route'
import { createSupabaseServiceClient } from '@/app/lib/supabase-server'

vi.mock('@/app/lib/supabase-server', () => ({
  createSupabaseServiceClient: vi.fn(),
}))

const mockPaymentGet = vi.fn()

vi.mock('mercadopago', () => ({
  MercadoPagoConfig: vi.fn(),
  Payment: vi.fn().mockImplementation(function () {
    return { get: mockPaymentGet }
  }),
}))

type ChainOrderItem = { product_id: string; quantity: number }

function makeSupabaseChain(
  orderItems: ChainOrderItem[] = [],
  updateError: { message: string } | null = null,
) {
  const updateSpy = vi.fn()
  const updateEqSpy = vi.fn().mockResolvedValue(
    updateError ? { error: updateError } : { error: null },
  )
  updateSpy.mockReturnValue({ eq: updateEqSpy })

  const selectSpy = vi.fn()
  const selectEqSpy = vi.fn().mockResolvedValue({ data: orderItems, error: null })
  selectSpy.mockReturnValue({ eq: selectEqSpy })

  const rpcSpy = vi.fn().mockResolvedValue({ data: null, error: null })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client: any = {
    from: vi.fn((table: string) => {
      if (table === 'orders') return { update: updateSpy }
      if (table === 'order_items') return { select: selectSpy }
      return {}
    }),
    rpc: rpcSpy,
  }

  return { client, updateSpy, updateEqSpy, rpcSpy, selectEqSpy }
}

function makeRequest(body: unknown) {
  return new Request('http://localhost', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('POST /api/payments/verify', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.MERCADO_PAGO_ACCESS_TOKEN
    delete process.env.MERCADO_PAGO_SANDBOX
  })

  // ---------------------------------------------------------------------------
  // Validação de entrada
  // ---------------------------------------------------------------------------

  it('retorna 400 para body JSON inválido', async () => {
    const req = new Request('http://localhost', {
      method: 'POST',
      body: 'not-json{',
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('retorna 400 se payment_id estiver ausente', async () => {
    const res = await POST(makeRequest({ order_id: 'order-1' }))
    expect(res.status).toBe(400)
  })

  it('retorna 400 se order_id estiver ausente', async () => {
    const res = await POST(makeRequest({ payment_id: '123' }))
    expect(res.status).toBe(400)
  })

  it('retorna 400 com ambos ausentes', async () => {
    const res = await POST(makeRequest({}))
    expect(res.status).toBe(400)
  })

  // ---------------------------------------------------------------------------
  // Token do Mercado Pago
  // ---------------------------------------------------------------------------

  it('retorna 503 se MERCADO_PAGO_ACCESS_TOKEN não estiver configurado', async () => {
    const res = await POST(makeRequest({ payment_id: '123', order_id: 'order-1' }))
    expect(res.status).toBe(503)
  })

  // ---------------------------------------------------------------------------
  // Erro na API do Mercado Pago
  // ---------------------------------------------------------------------------

  it('retorna 502 se a API do Mercado Pago lançar erro', async () => {
    process.env.MERCADO_PAGO_ACCESS_TOKEN = 'TEST-token'
    mockPaymentGet.mockRejectedValueOnce(new Error('MP API error'))

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const res = await POST(makeRequest({ payment_id: '123', order_id: 'order-1' }))
    expect(res.status).toBe(502)

    errorSpy.mockRestore()
  })

  // ---------------------------------------------------------------------------
  // External reference mismatch
  // ---------------------------------------------------------------------------

  it('retorna 403 se external_reference não pertence ao pedido', async () => {
    process.env.MERCADO_PAGO_ACCESS_TOKEN = 'TEST-token'
    mockPaymentGet.mockResolvedValueOnce({
      status: 'approved',
      external_reference: 'outro-pedido',
      id: 123,
    })

    const res = await POST(makeRequest({ payment_id: '123', order_id: 'order-1' }))
    expect(res.status).toBe(403)
  })

  // ---------------------------------------------------------------------------
  // Atualização de status
  // ---------------------------------------------------------------------------

  describe('atualização de status do pedido', () => {
    beforeEach(() => {
      process.env.MERCADO_PAGO_ACCESS_TOKEN = 'TEST-token'
    })

    it('atualiza para paid quando pagamento for approved', async () => {
      const { client, updateSpy } = makeSupabaseChain()
      vi.mocked(createSupabaseServiceClient).mockReturnValue(client)
      mockPaymentGet.mockResolvedValueOnce({
        status: 'approved',
        external_reference: 'order-1',
        id: 123,
      })

      await POST(makeRequest({ payment_id: '123', order_id: 'order-1' }))

      expect(updateSpy).toHaveBeenCalledWith({
        status: 'paid',
        mp_payment_id: '123',
      })
    })

    it('atualiza para pending quando pagamento for pending', async () => {
      const { client, updateSpy } = makeSupabaseChain()
      vi.mocked(createSupabaseServiceClient).mockReturnValue(client)
      mockPaymentGet.mockResolvedValueOnce({
        status: 'pending',
        external_reference: 'order-1',
        id: 123,
      })

      await POST(makeRequest({ payment_id: '123', order_id: 'order-1' }))

      expect(updateSpy).toHaveBeenCalledWith({
        status: 'pending',
        mp_payment_id: '123',
      })
    })

    it('atualiza para pending quando pagamento for in_process', async () => {
      const { client, updateSpy } = makeSupabaseChain()
      vi.mocked(createSupabaseServiceClient).mockReturnValue(client)
      mockPaymentGet.mockResolvedValueOnce({
        status: 'in_process',
        external_reference: 'order-1',
        id: 123,
      })

      await POST(makeRequest({ payment_id: '123', order_id: 'order-1' }))

      expect(updateSpy).toHaveBeenCalledWith({
        status: 'pending',
        mp_payment_id: '123',
      })
    })

    it('atualiza para cancelled quando pagamento for rejected', async () => {
      const { client, updateSpy } = makeSupabaseChain()
      vi.mocked(createSupabaseServiceClient).mockReturnValue(client)
      mockPaymentGet.mockResolvedValueOnce({
        status: 'rejected',
        external_reference: 'order-1',
        id: 123,
      })

      await POST(makeRequest({ payment_id: '123', order_id: 'order-1' }))

      expect(updateSpy).toHaveBeenCalledWith({
        status: 'cancelled',
        mp_payment_id: '123',
      })
    })

    it('atualiza para cancelled quando pagamento for cancelled', async () => {
      const { client, updateSpy } = makeSupabaseChain()
      vi.mocked(createSupabaseServiceClient).mockReturnValue(client)
      mockPaymentGet.mockResolvedValueOnce({
        status: 'cancelled',
        external_reference: 'order-1',
        id: 123,
      })

      await POST(makeRequest({ payment_id: '123', order_id: 'order-1' }))

      expect(updateSpy).toHaveBeenCalledWith({
        status: 'cancelled',
        mp_payment_id: '123',
      })
    })

    it('não atualiza pedido para status não mapeado', async () => {
      const { client, updateSpy } = makeSupabaseChain()
      vi.mocked(createSupabaseServiceClient).mockReturnValue(client)
      mockPaymentGet.mockResolvedValueOnce({
        status: 'refunded',
        external_reference: 'order-1',
        id: 123,
      })

      const res = await POST(makeRequest({ payment_id: '123', order_id: 'order-1' }))
      expect(res.status).toBe(200)
      expect(updateSpy).not.toHaveBeenCalled()

      const body = await res.json()
      expect(body.status).toBeNull()
      expect(body.mp_status).toBe('refunded')
    })

    it('retorna 500 se update no Supabase falhar', async () => {
      const { client } = makeSupabaseChain([], { message: 'db error' })
      vi.mocked(createSupabaseServiceClient).mockReturnValue(client)
      mockPaymentGet.mockResolvedValueOnce({
        status: 'approved',
        external_reference: 'order-1',
        id: 123,
      })

      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const res = await POST(makeRequest({ payment_id: '123', order_id: 'order-1' }))
      expect(res.status).toBe(500)

      errorSpy.mockRestore()
    })
  })

  // ---------------------------------------------------------------------------
  // Restauração de estoque
  // ---------------------------------------------------------------------------

  describe('restauração de estoque', () => {
    beforeEach(() => {
      process.env.MERCADO_PAGO_ACCESS_TOKEN = 'TEST-token'
    })

    it('chama increment_stock para cada item quando pagamento for rejected', async () => {
      const items: ChainOrderItem[] = [
        { product_id: 'prod-a', quantity: 2 },
        { product_id: 'prod-b', quantity: 1 },
      ]
      const { client, rpcSpy } = makeSupabaseChain(items)
      vi.mocked(createSupabaseServiceClient).mockReturnValue(client)
      mockPaymentGet.mockResolvedValueOnce({
        status: 'rejected',
        external_reference: 'order-1',
        id: 123,
      })

      await POST(makeRequest({ payment_id: '123', order_id: 'order-1' }))

      expect(rpcSpy).toHaveBeenCalledTimes(2)
      expect(rpcSpy).toHaveBeenCalledWith('increment_stock', {
        p_product_id: 'prod-a',
        p_qty: 2,
      })
      expect(rpcSpy).toHaveBeenCalledWith('increment_stock', {
        p_product_id: 'prod-b',
        p_qty: 1,
      })
    })

    it('chama increment_stock quando pagamento for cancelled', async () => {
      const items: ChainOrderItem[] = [{ product_id: 'prod-a', quantity: 3 }]
      const { client, rpcSpy } = makeSupabaseChain(items)
      vi.mocked(createSupabaseServiceClient).mockReturnValue(client)
      mockPaymentGet.mockResolvedValueOnce({
        status: 'cancelled',
        external_reference: 'order-1',
        id: 123,
      })

      await POST(makeRequest({ payment_id: '123', order_id: 'order-1' }))

      expect(rpcSpy).toHaveBeenCalledWith('increment_stock', {
        p_product_id: 'prod-a',
        p_qty: 3,
      })
    })

    it('não chama increment_stock quando pagamento for approved', async () => {
      const { client, rpcSpy } = makeSupabaseChain([
        { product_id: 'prod-a', quantity: 1 },
      ])
      vi.mocked(createSupabaseServiceClient).mockReturnValue(client)
      mockPaymentGet.mockResolvedValueOnce({
        status: 'approved',
        external_reference: 'order-1',
        id: 123,
      })

      await POST(makeRequest({ payment_id: '123', order_id: 'order-1' }))

      expect(rpcSpy).not.toHaveBeenCalled()
    })

    it('não chama increment_stock quando pagamento estiver pending', async () => {
      const { client, rpcSpy } = makeSupabaseChain([
        { product_id: 'prod-a', quantity: 1 },
      ])
      vi.mocked(createSupabaseServiceClient).mockReturnValue(client)
      mockPaymentGet.mockResolvedValueOnce({
        status: 'pending',
        external_reference: 'order-1',
        id: 123,
      })

      await POST(makeRequest({ payment_id: '123', order_id: 'order-1' }))

      expect(rpcSpy).not.toHaveBeenCalled()
    })

    it('não chama increment_stock se não houver itens no pedido', async () => {
      const { client, rpcSpy } = makeSupabaseChain([])
      vi.mocked(createSupabaseServiceClient).mockReturnValue(client)
      mockPaymentGet.mockResolvedValueOnce({
        status: 'cancelled',
        external_reference: 'order-1',
        id: 123,
      })

      await POST(makeRequest({ payment_id: '123', order_id: 'order-1' }))

      expect(rpcSpy).not.toHaveBeenCalled()
    })

    it('loga erro se increment_stock falhar e continua retornando 200', async () => {
      const items: ChainOrderItem[] = [{ product_id: 'prod-x', quantity: 2 }]
      const { client, rpcSpy } = makeSupabaseChain(items)
      rpcSpy.mockResolvedValueOnce({ data: null, error: { message: 'rpc failed' } })
      vi.mocked(createSupabaseServiceClient).mockReturnValue(client)
      mockPaymentGet.mockResolvedValueOnce({
        status: 'cancelled',
        external_reference: 'order-1',
        id: 123,
      })

      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const res = await POST(makeRequest({ payment_id: '123', order_id: 'order-1' }))
      expect(res.status).toBe(200)

      expect(errorSpy).toHaveBeenCalledWith(
        'Falha ao restaurar estoque',
        expect.objectContaining({
          orderId: 'order-1',
          productId: 'prod-x',
          qty: 2,
          error: 'rpc failed',
        }),
      )

      errorSpy.mockRestore()
    })
  })

  // ---------------------------------------------------------------------------
  // Configuração do cliente Mercado Pago
  // ---------------------------------------------------------------------------

  it('configura MercadoPagoConfig apenas com accessToken', async () => {
    process.env.MERCADO_PAGO_ACCESS_TOKEN = 'TEST-token'

    const { MercadoPagoConfig } = await import('mercadopago')
    const { client } = makeSupabaseChain()
    vi.mocked(createSupabaseServiceClient).mockReturnValue(client)
    mockPaymentGet.mockResolvedValueOnce({
      status: 'approved',
      external_reference: 'order-1',
      id: 123,
    })

    await POST(makeRequest({ payment_id: '123', order_id: 'order-1' }))

    expect(MercadoPagoConfig).toHaveBeenCalledWith({
      accessToken: 'TEST-token',
    })
  })

  // ---------------------------------------------------------------------------
  // Resposta de sucesso
  // ---------------------------------------------------------------------------

  it('retorna status, mp_status e payment_id no corpo', async () => {
    process.env.MERCADO_PAGO_ACCESS_TOKEN = 'TEST-token'
    const { client } = makeSupabaseChain()
    vi.mocked(createSupabaseServiceClient).mockReturnValue(client)
    mockPaymentGet.mockResolvedValueOnce({
      status: 'approved',
      external_reference: 'order-1',
      id: 123,
    })

    const res = await POST(makeRequest({ payment_id: '123', order_id: 'order-1' }))
    const body = await res.json()

    expect(body).toEqual({
      status: 'paid',
      mp_status: 'approved',
      payment_id: '123',
    })
  })
})
