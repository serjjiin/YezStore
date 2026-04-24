'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/app/lib/supabase-browser'

export default function DeleteArtisanButton({ id }: { id: string }) {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    if (!confirm('Remover este artesão? Os produtos vinculados ficarão sem artesã associada.')) return
    setError(null)
    const { error } = await supabase.from('artisans').delete().eq('id', id)
    if (error) {
      setError(error.message)
      return
    }
    router.refresh()
  }

  return (
    <div>
      <button
        onClick={handleDelete}
        style={{
          fontSize: 10, letterSpacing: 1, textTransform: 'uppercase',
          color: '#CC0000', background: 'none',
          border: '1px solid rgba(204,0,0,.3)', padding: '5px 10px',
          fontFamily: "'Josefin Sans', sans-serif", cursor: 'pointer'
        }}
      >
        Remover
      </button>
      {error && (
        <div style={{ fontSize: 10, color: '#CC0000', marginTop: 4, maxWidth: 200 }}>
          {error}
        </div>
      )}
    </div>
  )
}
