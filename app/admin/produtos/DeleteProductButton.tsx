'use client'

import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/app/lib/supabase-browser'

export default function DeleteProductButton({ id }: { id: string }) {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()

  async function handleDelete() {
    if (!confirm('Desativar este produto? Ele ficará oculto na loja mas o histórico será mantido.')) return

    await supabase.from('products').update({ is_active: false }).eq('id', id)
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
      Desativar
    </button>
  )
}
