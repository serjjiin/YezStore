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
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()

  async function handleUpdate() {
    if (status === currentStatus) return
    setLoading(true)
    setError(null)
    const { error } = await supabase.from('orders').update({ status }).eq('id', orderId)
    if (error) {
      setError(error.message)
      setStatus(currentStatus)
      setLoading(false)
      return
    }
    router.refresh()
    setLoading(false)
  }

  return (
    <div>
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
            fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase',
            fontFamily: "'Josefin Sans', sans-serif",
            cursor: status !== currentStatus ? 'pointer' : 'not-allowed',
          }}
        >
          {loading ? '...' : 'Atualizar'}
        </button>
      </div>
      {error && (
        <div style={{ fontSize: 10, color: '#CC0000', marginTop: 6 }}>
          {error}
        </div>
      )}
    </div>
  )
}
