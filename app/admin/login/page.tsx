'use client'

import { useState } from 'react'
import { createSupabaseBrowserClient } from '@/app/lib/supabase-browser'
import { useRouter } from 'next/navigation'

export default function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('E-mail ou senha incorretos.')
      setLoading(false)
      return
    }

    router.push('/admin')
    router.refresh()
  }

  return (
    <main style={{
      minHeight: '100vh', background: 'var(--yez-black)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24
    }}>
      <div style={{ width: '100%', maxWidth: 360 }}>
        <div style={{
          fontFamily: "'Dancing Script', cursive", fontSize: 42,
          color: '#fff', textAlign: 'center', marginBottom: 6
        }}>
          Yez Store
        </div>
        <div style={{
          fontSize: 10, letterSpacing: 3, textTransform: 'uppercase',
          color: 'rgba(255,255,255,.4)', textAlign: 'center', marginBottom: 40
        }}>
          Painel Administrativo
        </div>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 14 }}>
            <label style={{
              fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase',
              color: 'rgba(255,255,255,.5)', display: 'block', marginBottom: 6
            }}>
              E-mail
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%', background: 'rgba(255,255,255,.08)',
                border: '1px solid rgba(255,255,255,.15)', color: '#fff',
                padding: '13px 14px', fontSize: 13,
                fontFamily: "'Josefin Sans', sans-serif", outline: 'none',
              }}
            />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{
              fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase',
              color: 'rgba(255,255,255,.5)', display: 'block', marginBottom: 6
            }}>
              Senha
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: '100%', background: 'rgba(255,255,255,.08)',
                border: '1px solid rgba(255,255,255,.15)', color: '#fff',
                padding: '13px 14px', fontSize: 13,
                fontFamily: "'Josefin Sans', sans-serif", outline: 'none',
              }}
            />
          </div>

          {error && (
            <div style={{
              background: 'rgba(255,68,68,.15)', border: '1px solid rgba(255,68,68,.4)',
              color: '#FF8080', padding: '10px 14px', fontSize: 12, marginBottom: 16
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', background: '#fff', color: 'var(--yez-black)',
              border: 'none', padding: 16, fontSize: 11, letterSpacing: 2.5,
              textTransform: 'uppercase', fontFamily: "'Josefin Sans', sans-serif",
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </main>
  )
}
