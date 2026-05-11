'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { inputStyle } from '@/app/lib/formStyles'

function PreviewLoginForm() {
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') ?? '/'
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (password === process.env.NEXT_PUBLIC_YEZ_PREVIEW_SECRET) {
      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toUTCString()
      document.cookie = `__yez_preview_token=${password}; expires=${expires}; path=/; SameSite=Lax`
      window.location.href = redirect
    } else {
      setError('Senha incorreta.')
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--yez-cream)', padding: 20
    }}>
      <div style={{ maxWidth: 360, width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontFamily: "'Dancing Script', cursive", fontSize: 36, marginBottom: 4 }}>
            Yez Store
          </div>
          <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--yez-gray)' }}>
            Preview privado
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{
          background: 'var(--yez-white)', padding: '24px 20px',
          border: '1px solid var(--yez-lightgray)',
        }}>
          <div style={{ fontSize: 11, marginBottom: 16, color: 'var(--yez-gray)', lineHeight: 1.6 }}>
            Este preview e protegido. Digite a senha para acessar:
          </div>

          <input
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError('') }}
            style={inputStyle}
            placeholder="Senha de acesso"
            autoFocus
          />

          {error && (
            <div style={{
              background: '#FFE8E8', border: '1px solid #FF4444',
              padding: '8px 12px', fontSize: 12, marginTop: 10, color: '#CC0000'
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            style={{
              width: '100%', marginTop: 14,
              background: 'var(--yez-black)', color: '#fff', border: 'none',
              padding: 12, fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase',
              fontFamily: "'Josefin Sans', sans-serif", cursor: 'pointer',
            }}
          >
            Entrar
          </button>
        </form>
      </div>
    </div>
  )
}

export default function PreviewLoginPage() {
  return (
    <Suspense>
      <PreviewLoginForm />
    </Suspense>
  )
}
