import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { POST } from '../frete/route'

function makeRequest(body: object) {
  return new Request('http://localhost', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

function mockMelhorEnvio(data: object, ok = true) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok, json: () => Promise.resolve(data) })
  )
}

const mockFreteResponse = [
  { id: 1, name: 'PAC', price: '24.74', delivery_time: 6, company: { name: 'Correios' } },
  { id: 2, name: 'SEDEX', price: '48.47', delivery_time: 2, company: { name: 'Correios' } },
]

describe('POST /api/frete', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllGlobals()
    process.env.MELHOR_ENVIO_TOKEN = 'TOKEN-TESTE'
  })

  afterEach(() => {
    delete process.env.MELHOR_ENVIO_TOKEN
  })

  // ---------------------------------------------------------------------------
  // Validação de input
  // ---------------------------------------------------------------------------

  describe('validação de input', () => {
    it('retorna 400 se CEP estiver ausente', async () => {
      const res = await POST(makeRequest({ totalItems: 1 }))
      expect(res.status).toBe(400)
      expect((await res.json()).error).toMatch(/CEP/i)
    })

    it('retorna 400 se CEP tiver menos de 8 dígitos', async () => {
      const res = await POST(makeRequest({ cep: '1234567', totalItems: 1 }))
      expect(res.status).toBe(400)
      expect((await res.json()).error).toMatch(/CEP/i)
    })

    it('retorna 400 se CEP tiver mais de 8 dígitos', async () => {
      const res = await POST(makeRequest({ cep: '012345678', totalItems: 1 }))
      expect(res.status).toBe(400)
    })

    it('aceita CEP com máscara (01310-100) e normaliza para 8 dígitos', async () => {
      mockMelhorEnvio(mockFreteResponse)
      const res = await POST(makeRequest({ cep: '01310-100', totalItems: 1 }))
      expect(res.status).toBe(200)
    })

    it('retorna 400 se totalItems for zero', async () => {
      const res = await POST(makeRequest({ cep: '01310100', totalItems: 0 }))
      expect(res.status).toBe(400)
      expect((await res.json()).error).toMatch(/quantidade/i)
    })

    it('retorna 400 se totalItems for negativo', async () => {
      const res = await POST(makeRequest({ cep: '01310100', totalItems: -5 }))
      expect(res.status).toBe(400)
    })

    it('retorna 400 se totalItems não for número', async () => {
      const res = await POST(makeRequest({ cep: '01310100', totalItems: 'dois' }))
      expect(res.status).toBe(400)
    })

    it('retorna 400 se body JSON for inválido', async () => {
      const req = new Request('http://localhost', {
        method: 'POST',
        body: 'not-json{',
        headers: { 'Content-Type': 'application/json' },
      })
      const res = await POST(req)
      expect(res.status).toBe(400)
    })
  })

  // ---------------------------------------------------------------------------
  // Token ausente
  // ---------------------------------------------------------------------------

  it('retorna 500 se MELHOR_ENVIO_TOKEN não estiver configurado', async () => {
    delete process.env.MELHOR_ENVIO_TOKEN
    const res = await POST(makeRequest({ cep: '01310100', totalItems: 1 }))
    expect(res.status).toBe(500)
  })

  // ---------------------------------------------------------------------------
  // Erros externos
  // ---------------------------------------------------------------------------

  describe('erros externos', () => {
    it('retorna 502 se Melhor Envio retornar erro HTTP', async () => {
      mockMelhorEnvio({}, false)
      const res = await POST(makeRequest({ cep: '01310100', totalItems: 1 }))
      expect(res.status).toBe(502)
    })

    it('retorna 502 se Melhor Envio não responder (timeout/rede)', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')))
      const res = await POST(makeRequest({ cep: '01310100', totalItems: 1 }))
      expect(res.status).toBe(502)
    })
  })

  // ---------------------------------------------------------------------------
  // Sucesso
  // ---------------------------------------------------------------------------

  describe('sucesso', () => {
    it('retorna 200 com as opções de frete da transportadora', async () => {
      mockMelhorEnvio(mockFreteResponse)
      const res = await POST(makeRequest({ cep: '01310100', totalItems: 2 }))
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(Array.isArray(json)).toBe(true)
      expect(json[0].name).toBe('PAC')
    })

    it('envia o CEP normalizado (sem máscara) para o Melhor Envio', async () => {
      const fetchSpy = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockFreteResponse),
      })
      vi.stubGlobal('fetch', fetchSpy)

      await POST(makeRequest({ cep: '01310-100', totalItems: 1 }))

      const body = JSON.parse(fetchSpy.mock.calls[0][1].body)
      expect(body.to.postal_code).toBe('01310100')
    })

    it('calcula peso mínimo de 100g mesmo com totalItems=1', async () => {
      const fetchSpy = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockFreteResponse),
      })
      vi.stubGlobal('fetch', fetchSpy)

      await POST(makeRequest({ cep: '01310100', totalItems: 1 }))

      const body = JSON.parse(fetchSpy.mock.calls[0][1].body)
      expect(body.package.weight).toBeGreaterThanOrEqual(0.1)
    })
  })
})
