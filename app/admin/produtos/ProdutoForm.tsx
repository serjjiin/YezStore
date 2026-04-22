'use client'

import { useState } from 'react'
import { createSupabaseBrowserClient } from '@/app/lib/supabase-browser'
import { useRouter } from 'next/navigation'

const CATEGORIAS = ['Decoração', 'Semi-joias', 'Infantil', 'Crochê', 'Louças', 'Outros']

type Artisan = { id: string; name: string }

type Props = {
  artisans: Artisan[]
  initialData?: {
    id: string
    title: string
    description: string
    price: number
    stock_quantity: number
    category: string
    artisan_id: string
    image_url: string | null
    is_active: boolean
  }
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

export default function ProdutoForm({ artisans, initialData }: Props) {
  const isEditing = !!initialData
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()

  const [form, setForm] = useState({
    title: initialData?.title ?? '',
    description: initialData?.description ?? '',
    price: initialData?.price?.toString() ?? '',
    stock_quantity: initialData?.stock_quantity?.toString() ?? '',
    category: initialData?.category ?? CATEGORIAS[0],
    artisan_id: initialData?.artisan_id ?? (artisans[0]?.id ?? ''),
    is_active: initialData?.is_active ?? true,
  })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(initialData?.image_url ?? null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value, type } = e.target
    if (type === 'checkbox') {
      setForm((prev) => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }))
    } else {
      setForm((prev) => ({ ...prev, [name]: value }))
    }
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      let imageUrl = initialData?.image_url ?? null

      // Upload de imagem se houver novo arquivo
      if (imageFile) {
        const ext = imageFile.name.split('.').pop()
        const path = `${crypto.randomUUID()}.${ext}`

        const { error: uploadError } = await supabase.storage
          .from('produtos')
          .upload(path, imageFile, { upsert: true })

        if (uploadError) {
          setError('Erro ao fazer upload da imagem. Verifique se o bucket "produtos" existe no Supabase Storage.')
          return
        }

        const { data: urlData } = supabase.storage.from('produtos').getPublicUrl(path)
        imageUrl = urlData.publicUrl
      }

      const payload = {
        title: form.title,
        description: form.description,
        price: parseFloat(form.price),
        stock_quantity: parseInt(form.stock_quantity, 10),
        category: form.category,
        artisan_id: form.artisan_id || null,
        image_url: imageUrl,
        is_active: form.is_active,
      }

      if (isEditing && initialData) {
        const { error } = await supabase.from('products').update(payload).eq('id', initialData.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('products').insert(payload)
        if (error) throw error
      }

      router.push('/admin/produtos')
      router.refresh()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 600 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div>
          <label style={labelStyle}>Título *</label>
          <input name="title" value={form.title} onChange={handleChange} style={inputStyle} required />
        </div>
        <div>
          <label style={labelStyle}>Artesã *</label>
          <select name="artisan_id" value={form.artisan_id} onChange={handleChange} style={{ ...inputStyle, appearance: 'none' as const }}>
            {artisans.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Descrição</label>
        <textarea
          name="description"
          value={form.description}
          onChange={handleChange}
          rows={4}
          style={{ ...inputStyle, resize: 'vertical' as const }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div>
          <label style={labelStyle}>Preço (R$) *</label>
          <input name="price" type="number" step="0.01" min="0" value={form.price} onChange={handleChange} style={inputStyle} required />
        </div>
        <div>
          <label style={labelStyle}>Estoque *</label>
          <input name="stock_quantity" type="number" min="0" value={form.stock_quantity} onChange={handleChange} style={inputStyle} required />
        </div>
        <div>
          <label style={labelStyle}>Categoria</label>
          <select name="category" value={form.category} onChange={handleChange} style={{ ...inputStyle, appearance: 'none' as const }}>
            {CATEGORIAS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Upload de imagem */}
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Foto do produto</label>
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          {imagePreview && (
            <img src={imagePreview} alt="preview" style={{ width: 80, height: 80, objectFit: 'cover', flexShrink: 0 }} />
          )}
          <div>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              style={{ fontSize: 12, color: 'var(--yez-gray)' }}
            />
            <div style={{ fontSize: 10, color: 'var(--yez-gray)', marginTop: 6, letterSpacing: .3 }}>
              JPG, PNG ou WEBP. Requer bucket <code>produtos</code> público no Supabase Storage.
            </div>
          </div>
        </div>
      </div>

      {/* Status */}
      <div style={{ marginBottom: 28, display: 'flex', alignItems: 'center', gap: 10 }}>
        <input
          type="checkbox"
          name="is_active"
          id="is_active"
          checked={form.is_active}
          onChange={handleChange}
          style={{ width: 16, height: 16, cursor: 'pointer' }}
        />
        <label htmlFor="is_active" style={{ fontSize: 12, cursor: 'pointer' }}>
          Produto ativo (visível na loja)
        </label>
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
          {loading ? 'Salvando...' : isEditing ? 'Salvar alterações' : 'Criar produto'}
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
