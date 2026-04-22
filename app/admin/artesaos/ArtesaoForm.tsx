'use client'

import { useState } from 'react'
import { createSupabaseBrowserClient } from '@/app/lib/supabase-browser'
import { useRouter } from 'next/navigation'

type InitialData = {
  id: string
  name: string
  contact_email: string | null
  phone: string | null
  pix_key: string | null
  split_percentage: number | null
}

const inputStyle: React.CSSProperties = {
  width: '100%', border: '1px solid var(--yez-lightgray)',
  background: 'var(--yez-white)', padding: '11px 14px',
  fontSize: 13, fontFamily: "'Josefin Sans', sans-serif",
  outline: 'none', color: 'var(--yez-black)',
}

const labelStyle: React.CSSProperties = {
  fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase' as const,
  color: 'var(--yez-gray)', display: 'block', marginBottom: 6,
}

export default function ArtesaoForm({ initialData }: { initialData?: InitialData }) {
  const isEditing = !!initialData
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()

  const [form, setForm] = useState({
    name: initialData?.name ?? '',
    contact_email: initialData?.contact_email ?? '',
    phone: initialData?.phone ?? '',
    pix_key: initialData?.pix_key ?? '',
    split_percentage: initialData?.split_percentage?.toString() ?? '80',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const payload = {
      name: form.name,
      contact_email: form.contact_email || null,
      phone: form.phone || null,
      pix_key: form.pix_key || null,
      split_percentage: parseInt(form.split_percentage, 10),
    }

    try {
      if (isEditing && initialData) {
        const { error } = await supabase.from('artisans').update(payload).eq('id', initialData.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('artisans').insert(payload)
        if (error) throw error
      }

      router.push('/admin/artesaos')
      router.refresh()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 500 }}>
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Nome / Marca *</label>
        <input name="name" value={form.name} onChange={handleChange} style={inputStyle} required placeholder="Ex: Arte da Ana" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div>
          <label style={labelStyle}>E-mail de contato</label>
          <input name="contact_email" type="email" value={form.contact_email} onChange={handleChange} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>WhatsApp</label>
          <input name="phone" value={form.phone} onChange={handleChange} style={inputStyle} placeholder="(61) 99999-9999" />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 28 }}>
        <div>
          <label style={labelStyle}>Chave Pix (para repasse)</label>
          <input name="pix_key" value={form.pix_key} onChange={handleChange} style={inputStyle} placeholder="CPF, e-mail ou telefone" />
        </div>
        <div>
          <label style={labelStyle}>Split % *</label>
          <input
            name="split_percentage"
            type="number"
            min="1"
            max="99"
            value={form.split_percentage}
            onChange={handleChange}
            style={inputStyle}
            required
          />
          <div style={{ fontSize: 10, color: 'var(--yez-gray)', marginTop: 4 }}>
            % que vai para a artesã
          </div>
        </div>
      </div>

      {error && (
        <div style={{
          background: '#FFE8E8', border: '1px solid #FF4444',
          padding: '10px 14px', fontSize: 12, marginBottom: 16, color: '#CC0000'
        }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 12 }}>
        <button
          type="submit"
          disabled={loading}
          style={{
            background: loading ? 'var(--yez-gray)' : 'var(--yez-black)',
            color: '#fff', border: 'none', padding: '13px 24px',
            fontSize: 10, letterSpacing: 2, textTransform: 'uppercase',
            fontFamily: "'Josefin Sans', sans-serif",
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Salvando...' : isEditing ? 'Salvar alterações' : 'Cadastrar artesã'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          style={{
            background: 'none', color: 'var(--yez-gray)',
            border: '1px solid var(--yez-lightgray)', padding: '13px 24px',
            fontSize: 10, letterSpacing: 2, textTransform: 'uppercase',
            fontFamily: "'Josefin Sans', sans-serif", cursor: 'pointer'
          }}
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}
