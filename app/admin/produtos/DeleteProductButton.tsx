'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/app/lib/supabase-browser'

export default function ToggleProductButton({ id, isActive }: { id: string; isActive: boolean }) {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()
  const [error, setError] = useState<string | null>(null)

  async function handleToggle() {
    const message = isActive
      ? 'Desativar este produto? Ele ficará oculto na loja mas o histórico será mantido.'
      : 'Reativar este produto? Ele voltará a aparecer na loja.'
    if (!confirm(message)) return
    setError(null)
    const { error } = await supabase
      .from('products')
      .update({ is_active: !isActive })
      .eq('id', id)
    if (error) {
      setError(error.message)
      return
    }
    router.refresh()
  }

  return (
    <div>
      <button
        onClick={handleToggle}
        style={{
          fontSize: 10, letterSpacing: 1, textTransform: 'uppercase',
          color: isActive ? '#CC0000' : '#2E7D32', background: 'none',
          border: `1px solid ${isActive ? 'rgba(204,0,0,.3)' : 'rgba(46,125,50,.3)'}`,
          padding: '5px 10px',
          fontFamily: "'Josefin Sans', sans-serif", cursor: 'pointer'
        }}
      >
        {isActive ? 'Desativar' : 'Reativar'}
      </button>
      {error && (
        <div style={{ fontSize: 10, color: '#CC0000', marginTop: 4, maxWidth: 200 }}>
          {error}
        </div>
      )}
    </div>
  )
}
