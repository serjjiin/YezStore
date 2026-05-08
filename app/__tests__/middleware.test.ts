import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

const { mockMiddleware } = vi.hoisted(() => ({
  mockMiddleware: vi.fn(),
}))

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(),
}))

function makeRequest(pathname: string, options?: {
  cookies?: Record<string, string>
  env?: Partial<typeof process.env>
}) {
  const url = new URL(`http://localhost:3000${pathname}`)
  const headers = new Headers()

  if (options?.cookies) {
    for (const [name, value] of Object.entries(options.cookies)) {
      headers.set('cookie', `${name}=${value}`)
    }
  }

  return new NextRequest(url, { headers })
}

describe('middleware', () => {
  let middleware: typeof import('../../middleware').default

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.resetModules()
    delete process.env.VERCEL_ENV
    delete process.env.NEXT_PUBLIC_YEZ_PREVIEW_SECRET
    middleware = (await import('../../middleware')).default
  })

  afterEach(() => {
    delete process.env.VERCEL_ENV
    delete process.env.NEXT_PUBLIC_YEZ_PREVIEW_SECRET
  })

  // ===========================================================================
  // 1. Webhook passthrough — sempre passa
  // ===========================================================================

  describe('webhook passthrough', () => {
    it('permite POST /api/webhooks/mercadopago sem autenticacao', async () => {
      const req = makeRequest('/api/webhooks/mercadopago')
      const res = await middleware(req)
      expect(res.status).toBe(200)
      expect(res.headers.get('location')).toBeNull()
    })

    it('permite webhook mesmo com VERCEL_ENV=preview configurado', async () => {
      process.env.VERCEL_ENV = 'preview'
      process.env.NEXT_PUBLIC_YEZ_PREVIEW_SECRET = 'senha-secreta'
      middleware = (await import('../../middleware')).default

      const req = makeRequest('/api/webhooks/mercadopago')
      const res = await middleware(req)
      expect(res.status).toBe(200)
      expect(res.headers.get('location')).toBeNull()
    })
  })

  // ===========================================================================
  // 2. Preview protection
  // ===========================================================================

  describe('preview protection', () => {
    it('permite acesso sem protecao quando VERCEL_ENV nao e preview', async () => {
      const req = makeRequest('/')
      const res = await middleware(req)
      expect(res.status).toBe(200)
    })

    it('bloqueia acesso a paginas quando em preview sem cookie valido', async () => {
      process.env.VERCEL_ENV = 'preview'
      process.env.NEXT_PUBLIC_YEZ_PREVIEW_SECRET = 'senha'
      middleware = (await import('../../middleware')).default

      const req = makeRequest('/produto/123')
      const res = await middleware(req)
      expect(res.status).toBe(307)
      expect(res.headers.get('location')).toContain('/preview-login')
    })

    it('retorna 401 para API routes em preview sem cookie valido', async () => {
      process.env.VERCEL_ENV = 'preview'
      process.env.NEXT_PUBLIC_YEZ_PREVIEW_SECRET = 'senha'
      middleware = (await import('../../middleware')).default

      const req = makeRequest('/api/checkout')
      const res = await middleware(req)
      expect(res.status).toBe(401)
    })

    it('permite acesso com cookie de preview valido', async () => {
      process.env.VERCEL_ENV = 'preview'
      process.env.NEXT_PUBLIC_YEZ_PREVIEW_SECRET = 'senha'
      middleware = (await import('../../middleware')).default

      const req = makeRequest('/', {
        cookies: { __yez_preview_token: 'senha' },
      })
      const res = await middleware(req)
      expect(res.status).toBe(200)
    })

    it('nao ativa protecao de preview quando YEZ_PREVIEW_SECRET nao esta configurado', async () => {
      process.env.VERCEL_ENV = 'preview'
      // NEXT_PUBLIC_YEZ_PREVIEW_SECRET ausente → protecao deve ficar inativa
      middleware = (await import('../../middleware')).default

      const req = makeRequest('/')
      const res = await middleware(req)
      expect(res.status).toBe(200)
    })

    it('preserva o path original no parametro redirect do preview-login', async () => {
      process.env.VERCEL_ENV = 'preview'
      process.env.NEXT_PUBLIC_YEZ_PREVIEW_SECRET = 'senha'
      middleware = (await import('../../middleware')).default

      const req = makeRequest('/sacola')
      const res = await middleware(req)
      expect(res.headers.get('location')).toContain('redirect=%2Fsacola')
    })
  })

  // ===========================================================================
  // 3. Admin protection (Supabase auth)
  // ===========================================================================

  describe('admin protection', () => {
    it('redireciona /admin sem sessao para /admin/login', async () => {
      const { createServerClient } = await import('@supabase/ssr')
      vi.mocked(createServerClient).mockReturnValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
      } as never)

      middleware = (await import('../../middleware')).default
      const req = makeRequest('/admin')
      const res = await middleware(req)
      expect(res.status).toBe(307)
      expect(res.headers.get('location')).toContain('/admin/login')
    })

    it('redireciona /admin/produtos sem sessao para /admin/login', async () => {
      const { createServerClient } = await import('@supabase/ssr')
      vi.mocked(createServerClient).mockReturnValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
      } as never)

      middleware = (await import('../../middleware')).default
      const req = makeRequest('/admin/produtos')
      const res = await middleware(req)
      expect(res.status).toBe(307)
      expect(res.headers.get('location')).toContain('/admin/login')
    })

    it('redireciona /admin/login com sessao ativa para /admin', async () => {
      const { createServerClient } = await import('@supabase/ssr')
      vi.mocked(createServerClient).mockReturnValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: '1', email: 'a@b.com' } }, error: null }) },
      } as never)

      middleware = (await import('../../middleware')).default
      const req = makeRequest('/admin/login')
      const res = await middleware(req)
      expect(res.status).toBe(307)
      expect(res.headers.get('location')).toContain('/admin')
      // /admin sem /login — redirect para dashboard
      expect(res.headers.get('location')).not.toContain('/admin/login')
    })

    it('permite /admin/login sem sessao (a pagina de login e publica)', async () => {
      const { createServerClient } = await import('@supabase/ssr')
      vi.mocked(createServerClient).mockReturnValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
      } as never)

      middleware = (await import('../../middleware')).default
      const req = makeRequest('/admin/login')
      const res = await middleware(req)
      expect(res.status).toBe(200)
    })

    it('permite rota admin com sessao ativa', async () => {
      const { createServerClient } = await import('@supabase/ssr')
      vi.mocked(createServerClient).mockReturnValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: '1' } }, error: null }) },
      } as never)

      middleware = (await import('../../middleware')).default
      const req = makeRequest('/admin/produtos')
      const res = await middleware(req)
      expect(res.status).toBe(200)
    })
  })

  // ===========================================================================
  // 4. Interacao entre camadas
  // ===========================================================================

  describe('interacao entre camadas', () => {
    it('admin em preview sem cookie: preview protection tem prioridade', async () => {
      process.env.VERCEL_ENV = 'preview'
      process.env.NEXT_PUBLIC_YEZ_PREVIEW_SECRET = 'senha'
      middleware = (await import('../../middleware')).default

      const req = makeRequest('/admin')
      const res = await middleware(req)
      // Deve redirecionar para preview-login, nao para admin/login
      expect(res.headers.get('location')).toContain('/preview-login')
    })

    it('admin em preview com cookie valido mas sem sessao: redireciona para admin/login', async () => {
      process.env.VERCEL_ENV = 'preview'
      process.env.NEXT_PUBLIC_YEZ_PREVIEW_SECRET = 'senha'
      const { createServerClient } = await import('@supabase/ssr')
      vi.mocked(createServerClient).mockReturnValue({
        auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
      } as never)

      middleware = (await import('../../middleware')).default
      const req = makeRequest('/admin', {
        cookies: { __yez_preview_token: 'senha' },
      })
      const res = await middleware(req)
      expect(res.headers.get('location')).toContain('/admin/login')
    })
  })
})
