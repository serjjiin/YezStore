import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../admin/products/route'
import { PUT } from '../admin/products/[id]/route'
import { createSupabaseServiceClient } from '@/app/lib/supabase-server'

vi.mock('@/app/lib/supabase-server', () => ({
  createSupabaseServiceClient: vi.fn(),
}))

// ---------- chain helpers ----------

function makeStorageMock({ uploadError = null as { message: string } | null } = {}) {
  const uploadSpy = vi.fn().mockResolvedValue({ error: uploadError })
  const getPublicUrlSpy = vi.fn().mockReturnValue({ data: { publicUrl: 'https://storage/fake-image.jpg' } })

  return { uploadSpy, getPublicUrlSpy }
}

function makeInsertChain({ data = { id: 'prod-1' }, error = null as { message: string } | null } = {}) {
  const single = vi.fn().mockResolvedValue({ data, error })
  const select = vi.fn(() => ({ single }))
  const insertSpy = vi.fn(() => ({ select }))

  const client = { from: vi.fn(() => ({ insert: insertSpy })) }
  return { client, insertSpy }
}

function makeUpdateChain({ error = null as { message: string } | null } = {}) {
  const eqSpy = vi.fn().mockResolvedValue({ error })
  const updateSpy = vi.fn(() => ({ eq: eqSpy }))

  return { updateSpy, eqSpy }
}

function makeSelectSingleChain(data: unknown = { image_url: 'https://old-image.jpg' }) {
  const single = vi.fn().mockResolvedValue({ data, error: null })
  const eq = vi.fn(() => ({ single }))
  const select = vi.fn(() => ({ eq }))
  return { select, eq, single }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildClient(tableOverrides: Record<string, any>, storageMock?: ReturnType<typeof makeStorageMock>) {
  const client: Record<string, unknown> = {
    from: vi.fn((table: string) => tableOverrides[table] ?? {}),
  }
  if (storageMock) {
    client.storage = {
      from: vi.fn(() => ({
        upload: storageMock.uploadSpy,
        getPublicUrl: storageMock.getPublicUrlSpy,
      })),
    }
  }
  return client
}

function makeFormRequest(formData: FormData, url = 'http://localhost/api/admin/products') {
  return new Request(url, { method: 'POST', body: formData })
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ---------- POST /api/admin/products ----------

describe('POST /api/admin/products', () => {
  it('retorna 400 se body nao for FormData', async () => {
    const res = await POST(new Request('http://localhost', { method: 'POST', body: 'not formdata' }))
    expect(res.status).toBe(400)
  })

  it('retorna 400 se title estiver ausente', async () => {
    const fd = new FormData()
    fd.append('price', '10')
    fd.append('stock_quantity', '5')
    const res = await POST(makeFormRequest(fd))
    expect(res.status).toBe(400)
  })

  it('retorna 400 se price estiver ausente', async () => {
    const fd = new FormData()
    fd.append('title', 'Produto')
    fd.append('stock_quantity', '5')
    const res = await POST(makeFormRequest(fd))
    expect(res.status).toBe(400)
  })

  it('retorna 400 se stock_quantity estiver ausente', async () => {
    const fd = new FormData()
    fd.append('title', 'Produto')
    fd.append('price', '10')
    const res = await POST(makeFormRequest(fd))
    expect(res.status).toBe(400)
  })

  it('retorna 400 se price for invalido', async () => {
    const fd = new FormData()
    fd.append('title', 'Produto')
    fd.append('price', 'abc')
    fd.append('stock_quantity', '5')
    const res = await POST(makeFormRequest(fd))
    expect(res.status).toBe(400)
  })

  it('cria produto sem imagem — retorna 201', async () => {
    const { insertSpy } = makeInsertChain()
    const storageMock = makeStorageMock()
    const client = buildClient({ products: { insert: insertSpy } }, storageMock)

    vi.mocked(createSupabaseServiceClient).mockReturnValue(client as unknown as ReturnType<typeof createSupabaseServiceClient>)

    const fd = new FormData()
    fd.append('title', 'Sousplat')
    fd.append('description', 'Linda peça artesanal')
    fd.append('price', '49.90')
    fd.append('stock_quantity', '10')
    fd.append('category', 'Decoração')
    fd.append('artisan_id', 'artisan-1')
    fd.append('is_active', 'true')

    const res = await POST(makeFormRequest(fd))
    expect(res.status).toBe(201)
    expect(await res.json()).toEqual({ id: 'prod-1', image_url: null })

    expect(insertSpy).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Sousplat',
      price: 49.9,
      stock_quantity: 10,
      image_url: null,
      is_active: true,
    }))
  })

  it('cria produto com imagem — faz upload no storage', async () => {
    const { insertSpy } = makeInsertChain()
    const storageMock = makeStorageMock()
    const client = buildClient({ products: { insert: insertSpy } }, storageMock)

    vi.mocked(createSupabaseServiceClient).mockReturnValue(client as unknown as ReturnType<typeof createSupabaseServiceClient>)

    const fd = new FormData()
    fd.append('title', 'Sousplat')
    fd.append('price', '49.90')
    fd.append('stock_quantity', '10')
    fd.append('is_active', 'false')
    const file = new File(['fake'], 'foto.jpg', { type: 'image/jpeg' })
    fd.append('image', file)

    const res = await POST(makeFormRequest(fd))
    expect(res.status).toBe(201)
    expect(await res.json()).toEqual({ id: 'prod-1', image_url: 'https://storage/fake-image.jpg' })

    expect(storageMock.uploadSpy).toHaveBeenCalled()
    expect(storageMock.getPublicUrlSpy).toHaveBeenCalled()
    expect(insertSpy).toHaveBeenCalledWith(expect.objectContaining({
      image_url: 'https://storage/fake-image.jpg',
      is_active: false,
    }))
  })

  it('retorna 500 se upload de imagem falhar', async () => {
    const { insertSpy } = makeInsertChain()
    const storageMock = makeStorageMock({ uploadError: { message: 'bucket not found' } })
    const client = buildClient({ products: { insert: insertSpy } }, storageMock)

    vi.mocked(createSupabaseServiceClient).mockReturnValue(client as unknown as ReturnType<typeof createSupabaseServiceClient>)

    const fd = new FormData()
    fd.append('title', 'Sousplat')
    fd.append('price', '49.90')
    fd.append('stock_quantity', '10')
    fd.append('image', new File(['fake'], 'foto.jpg', { type: 'image/jpeg' }))

    const res = await POST(makeFormRequest(fd))
    expect(res.status).toBe(500)
  })

  it('retorna 500 se insert no DB falhar', async () => {
    const { insertSpy } = makeInsertChain({ error: { message: 'db error' }, data: null as unknown as { id: string } })
    const storageMock = makeStorageMock()
    const client = buildClient({ products: { insert: insertSpy } }, storageMock)

    vi.mocked(createSupabaseServiceClient).mockReturnValue(client as unknown as ReturnType<typeof createSupabaseServiceClient>)

    const fd = new FormData()
    fd.append('title', 'Sousplat')
    fd.append('price', '49.90')
    fd.append('stock_quantity', '10')

    const res = await POST(makeFormRequest(fd))
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'db error' })
  })

  it('is_active default é true quando ausente', async () => {
    const { insertSpy } = makeInsertChain()
    const client = buildClient({ products: { insert: insertSpy } })

    vi.mocked(createSupabaseServiceClient).mockReturnValue(client as unknown as ReturnType<typeof createSupabaseServiceClient>)

    const fd = new FormData()
    fd.append('title', 'Sousplat')
    fd.append('price', '49.90')
    fd.append('stock_quantity', '10')

    await POST(makeFormRequest(fd))
    expect(insertSpy).toHaveBeenCalledWith(expect.objectContaining({ is_active: true }))
  })
})

// ---------- PUT /api/admin/products/[id] ----------

describe('PUT /api/admin/products/[id]', () => {
  it('retorna 400 se body nao for FormData', async () => {
    const res = await PUT(
      new Request('http://localhost', { method: 'PUT', body: 'not formdata' }),
      { params: Promise.resolve({ id: 'prod-1' }) }
    )
    expect(res.status).toBe(400)
  })

  it('atualiza produto preservando imagem existente', async () => {
    const { updateSpy } = makeUpdateChain()
    const { select } = makeSelectSingleChain()
    const client = buildClient({ products: { select, update: updateSpy } })

    vi.mocked(createSupabaseServiceClient).mockReturnValue(client as unknown as ReturnType<typeof createSupabaseServiceClient>)

    const fd = new FormData()
    fd.append('title', 'Sousplat Atualizado')
    fd.append('price', '59.90')
    fd.append('stock_quantity', '8')

    const res = await PUT(makeFormRequest(fd), { params: Promise.resolve({ id: 'prod-1' }) })
    expect(res.status).toBe(200)

    expect(select).toHaveBeenCalled()
    expect(updateSpy).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Sousplat Atualizado',
      image_url: 'https://old-image.jpg',
    }))
  })

  it('atualiza produto com nova imagem', async () => {
    const { updateSpy } = makeUpdateChain()
    const { select } = makeSelectSingleChain()
    const storageMock = makeStorageMock()
    const client = buildClient({ products: { select, update: updateSpy } }, storageMock)

    vi.mocked(createSupabaseServiceClient).mockReturnValue(client as unknown as ReturnType<typeof createSupabaseServiceClient>)

    const fd = new FormData()
    fd.append('title', 'Sousplat')
    fd.append('price', '59.90')
    fd.append('stock_quantity', '8')
    fd.append('image', new File(['fake'], 'nova.jpg', { type: 'image/jpeg' }))

    const res = await PUT(makeFormRequest(fd), { params: Promise.resolve({ id: 'prod-1' }) })
    expect(res.status).toBe(200)
    expect(storageMock.uploadSpy).toHaveBeenCalled()
    expect(updateSpy).toHaveBeenCalledWith(expect.objectContaining({
      image_url: 'https://storage/fake-image.jpg',
    }))
  })

  it('retorna 404 se produto nao encontrado', async () => {
    const { updateSpy } = makeUpdateChain()
    const { single } = makeSelectSingleChain(null)
    single.mockResolvedValue({ data: null, error: { message: 'not found' } })
    const client = buildClient({ products: { select: vi.fn(() => ({ eq: vi.fn(() => ({ single })) })), update: updateSpy } })

    vi.mocked(createSupabaseServiceClient).mockReturnValue(client as unknown as ReturnType<typeof createSupabaseServiceClient>)

    const fd = new FormData()
    fd.append('title', 'Sousplat')
    fd.append('price', '59.90')
    fd.append('stock_quantity', '8')

    const res = await PUT(makeFormRequest(fd), { params: Promise.resolve({ id: 'inexistente' }) })
    expect(res.status).toBe(404)
  })

  it('retorna 500 se update no DB falhar', async () => {
    const { updateSpy } = makeUpdateChain({ error: { message: 'db error' } })
    const { select } = makeSelectSingleChain()
    const client = buildClient({ products: { select, update: updateSpy } })

    vi.mocked(createSupabaseServiceClient).mockReturnValue(client as unknown as ReturnType<typeof createSupabaseServiceClient>)

    const fd = new FormData()
    fd.append('title', 'Sousplat')
    fd.append('price', '59.90')
    fd.append('stock_quantity', '8')

    const res = await PUT(makeFormRequest(fd), { params: Promise.resolve({ id: 'prod-1' }) })
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'db error' })
  })

  it('image_url default e null quando produto nao tem imagem', async () => {
    const { updateSpy } = makeUpdateChain()
    const selectSingle = makeSelectSingleChain({ image_url: null })
    const client = buildClient({ products: { select: selectSingle.select, update: updateSpy } })

    vi.mocked(createSupabaseServiceClient).mockReturnValue(client as unknown as ReturnType<typeof createSupabaseServiceClient>)

    const fd = new FormData()
    fd.append('title', 'Sousplat')
    fd.append('price', '59.90')
    fd.append('stock_quantity', '8')

    await PUT(makeFormRequest(fd), { params: Promise.resolve({ id: 'prod-1' }) })
    expect(updateSpy).toHaveBeenCalledWith(expect.objectContaining({ image_url: null }))
  })
})
