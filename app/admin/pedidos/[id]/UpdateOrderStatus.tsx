'use client'

import { useState } from 'react'
import { createSupabaseBrowserClient } from '@/app/lib/supabase-browser'
import { useRouter } from 'next/navigation'

const STATUSES = [
  { value: 'pending', label: 'Pendente' },
  { value: 'paid', label: 'Pago' },
  { value: 'shipped', label: 'Enviado' },
  { value: 'cancelled', label: 'Cancelado' },
]

export default function UpdateOrderStatus({
  orderId,
  currentStatus,
}: {
  orderId: string
  currentStatus: string
}) {
  const [status, setStatus] = useState(currentStatus)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()

  async function handleUpdate() {
    if (status === currentStatus) return
    setLoading(true)
    await supabase.from('orders').update({ status }).eq('id', orderId)
    router.refresh()
    setLoading(false)
  }

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        style={{
          border: '1px solid var(--yez-lightgray)', padding: '7px 10px',
          fontSize: 11, fontFamily: "'Josefin Sans', sans-serif",
          background: 'var(--yez-white)', outline: 'none', cursor: 'pointer',
        }}
      >
        {STATUSES.map((s) => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </select>
      <button
        onClick={handleUpdate}
        disabled={loading || status === currentStatus}
        style={{
          background: status !== currentStatus ? 'var(--yez-black)' : 'var(--yez-lightgray)',
          color: '#fff', border: 'none', padding: '7px 14px',
          fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase',
          fontFamily: "'Josefin Sans', sans-serif",
          cursor: status !== currentStatus ? 'pointer' : 'not-allowed',
        }}
      >
        {loading ? '...' : 'Atualizar'}
      </button>
    </div>
  )
}
