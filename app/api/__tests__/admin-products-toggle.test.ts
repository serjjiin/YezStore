import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PATCH } from '../admin/products/[id]/toggle/route'
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
  return new Request('http://localhost/api/admin/products/prod-1/toggle', {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ---------- validação ----------

describe('PATCH /api/admin/products/[id]/toggle', () => {
  it('retorna 400 se is_active nao for booleano', async () => {
    const res = await PATCH(makeRequest({ is_active: 'true' }), { params: Promise.resolve({ id: 'prod-1' }) })
    expect(res.status).toBe(400)
    expect(await res.json()).toHaveProperty('error')
  })

  it('retorna 400 se body for invalido', async () => {
    const res = await PATCH(
      new Request('http://localhost', { method: 'PATCH', body: 'not json' }),
      { params: Promise.resolve({ id: 'prod-1' }) }
    )
    expect(res.status).toBe(400)
  })

  it('retorna 400 se is_active estiver ausente', async () => {
    const res = await PATCH(makeRequest({}), { params: Promise.resolve({ id: 'prod-1' }) })
    expect(res.status).toBe(400)
  })

  // ---------- sucesso ----------

  it('ativa produto com is_active: true', async () => {
    const { client, updateSpy } = makeChain()
    vi.mocked(createSupabaseServiceClient).mockReturnValue(client as unknown as ReturnType<typeof createSupabaseServiceClient>)

    const res = await PATCH(makeRequest({ is_active: true }), { params: Promise.resolve({ id: 'prod-1' }) })
    expect(res.status).toBe(200)

    expect(client.from).toHaveBeenCalledWith('products')
    expect(updateSpy).toHaveBeenCalledWith({ is_active: true })
  })

  it('desativa produto com is_active: false', async () => {
    const { client, updateSpy } = makeChain()
    vi.mocked(createSupabaseServiceClient).mockReturnValue(client as unknown as ReturnType<typeof createSupabaseServiceClient>)

    const res = await PATCH(makeRequest({ is_active: false }), { params: Promise.resolve({ id: 'prod-1' }) })
    expect(res.status).toBe(200)

    expect(updateSpy).toHaveBeenCalledWith({ is_active: false })
  })

  // ---------- erro DB ----------

  it('retorna 500 se supabase der erro', async () => {
    const { client } = makeChain({ updateError: { message: 'db error' } })
    vi.mocked(createSupabaseServiceClient).mockReturnValue(client as unknown as ReturnType<typeof createSupabaseServiceClient>)

    const res = await PATCH(makeRequest({ is_active: false }), { params: Promise.resolve({ id: 'prod-1' }) })
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'db error' })
  })
})
