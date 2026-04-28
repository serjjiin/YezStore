import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/app/lib/supabase-server'
import LogoutButton from './components/LogoutButton'

const navLinks = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/produtos', label: 'Produtos' },
  { href: '/admin/pedidos', label: 'Pedidos' },
  { href: '/admin/artesaos', label: 'Artesãos' },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Middleware já redireciona /admin/* sem sessão — esta verificação é defesa em profundidade
  if (!user) {
    redirect('/admin/login')
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--yez-cream)' }}>
      {/* Sidebar */}
      <aside style={{
        width: 220, background: 'var(--yez-black)', color: '#fff',
        display: 'flex', flexDirection: 'column',
        position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 20,
        padding: '0 0 20px'
      }}>
        <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid rgba(255,255,255,.1)' }}>
          <div style={{ fontFamily: "'Dancing Script', cursive", fontSize: 26 }}>
            Yez Store
          </div>
          <div style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(255,255,255,.4)', marginTop: 2 }}>
            Admin
          </div>
        </div>

        <nav style={{ flex: 1, padding: '16px 0' }}>
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              style={{
                display: 'block', padding: '10px 20px',
                fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase',
                color: 'rgba(255,255,255,.7)', textDecoration: 'none',
              }}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,.1)' }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,.4)', marginBottom: 10, letterSpacing: .5 }}>
            {user.email}
          </div>
          <LogoutButton />
          <Link
            href="/"
            target="_blank"
            style={{
              display: 'block', marginTop: 8,
              fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase',
              color: 'rgba(255,255,255,.4)', textDecoration: 'none'
            }}
          >
            Ver loja →
          </Link>
        </div>
      </aside>

      {/* Conteúdo */}
      <main style={{ marginLeft: 220, flex: 1, padding: '32px 28px', minHeight: '100vh' }}>
        {children}
      </main>
    </div>
  )
}
