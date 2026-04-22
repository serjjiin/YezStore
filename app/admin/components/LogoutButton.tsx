'use client'

import { createSupabaseBrowserClient } from '@/app/lib/supabase-browser'
import { useRouter } from 'next/navigation'

export default function LogoutButton() {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/admin/login')
    router.refresh()
  }

  return (
    <button
      onClick={handleLogout}
      style={{
        background: 'none', border: '1px solid rgba(255,255,255,.2)',
        color: 'rgba(255,255,255,.6)', padding: '7px 14px',
        fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase',
        fontFamily: "'Josefin Sans', sans-serif", cursor: 'pointer', width: '100%',
      }}
    >
      Sair
    </button>
  )
}
