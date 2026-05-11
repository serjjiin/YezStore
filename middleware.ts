import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ============================================================
  // 1. Webhook do Mercado Pago: sempre permitir
  //    MP precisa conseguir chamar independente de ambiente/auth
  // ============================================================
  if (pathname === '/api/webhooks/mercadopago') {
    return NextResponse.next()
  }

  // ============================================================
  // 2. Protecao por senha (todos os ambientes)
  //    Ativa quando NEXT_PUBLIC_YEZ_PREVIEW_SECRET esta configurado
  // ============================================================
  const previewSecret = process.env.NEXT_PUBLIC_YEZ_PREVIEW_SECRET
  if (previewSecret) {
    const previewCookie = request.cookies.get('__yez_preview_token')

    if (previewCookie?.value !== previewSecret) {
      // API routes (exceto webhook, ja tratado): 401
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { error: 'Preview privado. Acesse a pagina inicial para autenticar.' },
          { status: 401 }
        )
      }

      // Paginas: redirect para tela de login do preview
      const url = new URL('/preview-login', request.url)
      url.searchParams.set('redirect', pathname)
      return NextResponse.redirect(url)
    }
  }

  // ============================================================
  // 3. Protecao de rotas admin (Supabase auth)
  // ============================================================
  const isAdminPath = pathname.startsWith('/admin') || pathname.startsWith('/api/admin')
  if (isAdminPath) {
    let supabaseResponse = NextResponse.next({ request })

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            )
            supabaseResponse = NextResponse.next({ request })
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    const isLoginPage = pathname === '/admin/login'

    if (isLoginPage && user) {
      return NextResponse.redirect(new URL('/admin', request.url))
    }

    if (!isLoginPage && !user) {
      if (pathname.startsWith('/api/admin')) {
        return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
      }
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }

    return supabaseResponse
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/admin/:path*',
    '/((?!_next/static|_next/image|favicon.ico|preview-login).*)',
  ],
}
