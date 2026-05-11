import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PATCH } from '../admin/orders/[id]/status/route'
import { createSupabaseServiceClient } from '@/app/lib/supabase-server'

vi.mock('@/app/lib/supabase-server', () => ({
  createSupabaseServiceClient: vi.fn(),
}))

function makeChain({ updateError = null as { message: string } | null } = {}) {
  const eqSpy = vi.fn().mockResolvedValue({ error: updateError })
  const updateSpy = vi.fn(() => ({ eq: eqSpy }))

  const client = {
    from: vi.fn(() => ({ update: updateSpy })),
  }

  return { client, updateSpy, eqSpy }
}

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/admin/orders/order-1/status', {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('PATCH /api/admin/orders/[id]/status', () => {
  // ---------- validação ----------

  it('retorna 400 se body for invalido', async () => {
    const res = await PATCH(
      new Request('http://localhost', { method: 'PATCH', body: 'not json' }),
      { params: Promise.resolve({ id: 'order-1' }) }
    )
    expect(res.status).toBe(400)
  })

  it('retorna 400 se status estiver ausente', async () => {
    const res = await PATCH(makeRequest({}), { params: Promise.resolve({ id: 'order-1' }) })
    expect(res.status).toBe(400)
  })

  it('retorna 400 para status invalido', async () => {
    const res = await PATCH(makeRequest({ status: 'invalid' }), { params: Promise.resolve({ id: 'order-1' }) })
    expect(res.status).toBe(400)
  })

  // ---------- sucesso ----------

  it.each(['pending', 'paid', 'shipped', 'cancelled'])('atualiza para %s', async (status) => {
    const { client, updateSpy } = makeChain()
    vi.mocked(createSupabaseServiceClient).mockReturnValue(client as unknown as ReturnType<typeof createSupabaseServiceClient>)

    const res = await PATCH(makeRequest({ status }), { params: Promise.resolve({ id: 'order-1' }) })
    expect(res.status).toBe(200)

    expect(client.from).toHaveBeenCalledWith('orders')
    expect(updateSpy).toHaveBeenCalledWith({ status })
  })

  // ---------- erro DB ----------

  it('retorna 500 se supabase der erro', async () => {
    const { client } = makeChain({ updateError: { message: 'db error' } })
    vi.mocked(createSupabaseServiceClient).mockReturnValue(client as unknown as ReturnType<typeof createSupabaseServiceClient>)

    const res = await PATCH(makeRequest({ status: 'paid' }), { params: Promise.resolve({ id: 'order-1' }) })
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'db error' })
  })
})
