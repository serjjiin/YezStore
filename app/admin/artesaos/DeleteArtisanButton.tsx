'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/app/lib/supabase-browser'

export default function DeleteArtisanButton({ id }: { id: string }) {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    if (!confirm('Remover este artesão? Os produtos vinculados ficarão sem artesã associada.')) return
    setLoading(true)
    setError(null)
    const { error } = await supabase.from('artisans').delete().eq('id', id)
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    router.refresh()
    setLoading(false)
  }

  return (
    <div>
      <button
        onClick={handleDelete}
        disabled={loading}
        style={{
          fontSize: 10, letterSpacing: 1, textTransform: 'uppercase',
          color: '#CC0000', background: 'none',
          border: '1px solid rgba(204,0,0,.3)', padding: '5px 10px',
          fontFamily: "'Josefin Sans', sans-serif",
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.6 : 1,
        }}
      >
        {loading ? '...' : 'Remover'}
      </button>
      {error && (
        <div style={{ fontSize: 10, color: '#CC0000', marginTop: 4, maxWidth: 200 }}>
          {error}
        </div>
      )}
    </div>
  )
}
