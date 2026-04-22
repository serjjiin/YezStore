'use client'

import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/app/lib/supabase-browser'

export default function DeleteArtisanButton({ id }: { id: string }) {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()

  async function handleDelete() {
    if (!confirm('Remover este artesão? Os produtos vinculados ficarão sem artesã associada.')) return
    await supabase.from('artisans').delete().eq('id', id)
    router.refresh()
  }

  return (
    <button
      onClick={handleDelete}
      style={{
        fontSize: 9, letterSpacing: 1, textTransform: 'uppercase',
        color: '#CC0000', background: 'none',
        border: '1px solid rgba(204,0,0,.3)', padding: '5px 10px',
        fontFamily: "'Josefin Sans', sans-serif", cursor: 'pointer'
      }}
    >
      Remover
    </button>
  )
}
