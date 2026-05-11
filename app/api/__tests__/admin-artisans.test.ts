import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../admin/artisans/route'
import { PUT, DELETE } from '../admin/artisans/[id]/route'
import { createSupabaseServiceClient } from '@/app/lib/supabase-server'

vi.mock('@/app/lib/supabase-server', () => ({
  createSupabaseServiceClient: vi.fn(),
}))

// ---------- chain helpers ----------

function makeInsertChain({ data = { id: 'artisan-1' }, error = null as { message: string } | null } = {}) {
  const single = vi.fn().mockResolvedValue({ data, error })
  const select = vi.fn(() => ({ single }))
  const insertSpy = vi.fn(() => ({ select }))

  const client = { from: vi.fn(() => ({ insert: insertSpy })) }
  return { client, insertSpy }
}

function makeUpdateChain({ error = null as { message: string } | null } = {}) {
  const eqSpy = vi.fn().mockResolvedValue({ error })
  const updateSpy = vi.fn(() => ({ eq: eqSpy }))

  const client = { from: vi.fn(() => ({ update: updateSpy })) }
  return { client, updateSpy }
}

function makeDeleteChain({ error = null as { message: string; code?: string } | null } = {}) {
  const eqSpy = vi.fn().mockResolvedValue({ error })
  const deleteSpy = vi.fn(() => ({ eq: eqSpy }))

  const client = { from: vi.fn(() => ({ delete: deleteSpy })) }
  return { client, deleteSpy }
}

function makeJsonRequest(body: unknown) {
  return new Request('http://localhost/api/admin/artisans', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ---------- POST /api/admin/artisans ----------

describe('POST /api/admin/artisans', () => {
  it('retorna 400 se body for invalido', async () => {
    const res = await POST(new Request('http://localhost', { method: 'POST', body: 'not json' }))
    expect(res.status).toBe(400)
  })

  it('retorna 400 se name estiver ausente', async () => {
    const res = await POST(makeJsonRequest({ split_percentage: 80 }))
    expect(res.status).toBe(400)
  })

  it('retorna 400 se name for vazio', async () => {
    const res = await POST(makeJsonRequest({ name: '  ', split_percentage: 80 }))
    expect(res.status).toBe(400)
  })

  it('retorna 400 se split_percentage < 1', async () => {
    const res = await POST(makeJsonRequest({ name: 'Ana', split_percentage: 0 }))
    expect(res.status).toBe(400)
  })

  it('retorna 400 se split_percentage > 99', async () => {
    const res = await POST(makeJsonRequest({ name: 'Ana', split_percentage: 100 }))
    expect(res.status).toBe(400)
  })

  it('retorna 400 se split_percentage nao for numero', async () => {
    const res = await POST(makeJsonRequest({ name: 'Ana', split_percentage: 'abc' }))
    expect(res.status).toBe(400)
  })

  it('cria artesa com sucesso — retorna 201', async () => {
    const { client, insertSpy } = makeInsertChain()
    vi.mocked(createSupabaseServiceClient).mockReturnValue(client as unknown as ReturnType<typeof createSupabaseServiceClient>)

    const res = await POST(makeJsonRequest({
      name: 'Ana',
      contact_email: 'ana@test.com',
      phone: '11999999999',
      pix_key: 'ana@test.com',
      split_percentage: 80,
    }))
    expect(res.status).toBe(201)
    expect(await res.json()).toEqual({ id: 'artisan-1' })

    expect(client.from).toHaveBeenCalledWith('artisans')
    expect(insertSpy).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Ana',
      split_percentage: 80,
    }))
  })

  it('converte campos vazios para null', async () => {
    const { client, insertSpy } = makeInsertChain()
    vi.mocked(createSupabaseServiceClient).mockReturnValue(client as unknown as ReturnType<typeof createSupabaseServiceClient>)

    await POST(makeJsonRequest({ name: 'Ana', split_percentage: 80 }))
    expect(insertSpy).toHaveBeenCalledWith(expect.objectContaining({
      contact_email: null,
      phone: null,
      pix_key: null,
    }))
  })

  it('retorna 500 se supabase der erro', async () => {
    const { client } = makeInsertChain({ error: { message: 'db error' }, data: null as unknown as { id: string } })
    vi.mocked(createSupabaseServiceClient).mockReturnValue(client as unknown as ReturnType<typeof createSupabaseServiceClient>)

    const res = await POST(makeJsonRequest({ name: 'Ana', split_percentage: 80 }))
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'db error' })
  })
})

// ---------- PUT /api/admin/artisans/[id] ----------

describe('PUT /api/admin/artisans/[id]', () => {
  it('retorna 400 se body for invalido', async () => {
    const res = await PUT(
      new Request('http://localhost', { method: 'PUT', body: 'not json' }),
      { params: Promise.resolve({ id: 'artisan-1' }) }
    )
    expect(res.status).toBe(400)
  })

  it('retorna 400 se name estiver ausente', async () => {
    const res = await PUT(makeJsonRequest({ split_percentage: 80 }), { params: Promise.resolve({ id: 'artisan-1' }) })
    expect(res.status).toBe(400)
  })

  it('atualiza artesa com sucesso', async () => {
    const { client, updateSpy } = makeUpdateChain()
    vi.mocked(createSupabaseServiceClient).mockReturnValue(client as unknown as ReturnType<typeof createSupabaseServiceClient>)

    const res = await PUT(makeJsonRequest({ name: 'Ana Updated', split_percentage: 70 }), { params: Promise.resolve({ id: 'artisan-1' }) })
    expect(res.status).toBe(200)

    expect(client.from).toHaveBeenCalledWith('artisans')
    expect(updateSpy).toHaveBeenCalledWith(expect.objectContaining({ name: 'Ana Updated', split_percentage: 70 }))
  })

  it('retorna 500 se supabase der erro', async () => {
    const { client } = makeUpdateChain({ error: { message: 'db error' } })
    vi.mocked(createSupabaseServiceClient).mockReturnValue(client as unknown as ReturnType<typeof createSupabaseServiceClient>)

    const res = await PUT(makeJsonRequest({ name: 'Ana', split_percentage: 80 }), { params: Promise.resolve({ id: 'artisan-1' }) })
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'db error' })
  })
})

// ---------- DELETE /api/admin/artisans/[id] ----------

describe('DELETE /api/admin/artisans/[id]', () => {
  it('remove artesa com sucesso', async () => {
    const { client, deleteSpy } = makeDeleteChain()
    vi.mocked(createSupabaseServiceClient).mockReturnValue(client as unknown as ReturnType<typeof createSupabaseServiceClient>)

    const res = await DELETE(new Request('http://localhost', { method: 'DELETE' }), { params: Promise.resolve({ id: 'artisan-1' }) })
    expect(res.status).toBe(200)

    expect(client.from).toHaveBeenCalledWith('artisans')
    expect(deleteSpy).toHaveBeenCalled()
  })

  it('retorna mensagem amigavel para FK violation', async () => {
    const { client } = makeDeleteChain({ error: { message: 'violates fk', code: '23503' } })
    vi.mocked(createSupabaseServiceClient).mockReturnValue(client as unknown as ReturnType<typeof createSupabaseServiceClient>)

    const res = await DELETE(new Request('http://localhost', { method: 'DELETE' }), { params: Promise.resolve({ id: 'artisan-1' }) })
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'Não é possível remover artesã com produtos vinculados.' })
  })

  it('retorna 500 para outro erro de DB', async () => {
    const { client } = makeDeleteChain({ error: { message: 'unexpected error' } })
    vi.mocked(createSupabaseServiceClient).mockReturnValue(client as unknown as ReturnType<typeof createSupabaseServiceClient>)

    const res = await DELETE(new Request('http://localhost', { method: 'DELETE' }), { params: Promise.resolve({ id: 'artisan-1' }) })
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'unexpected error' })
  })
})
