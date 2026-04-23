'use client'

import { useState } from 'react'
import { useCartStore } from '@/app/lib/store'
import { formatCurrency } from '@/app/lib/format'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const inputStyle: React.CSSProperties = {
  width: '100%',
  border: '1px solid var(--yez-lightgray)',
  background: 'var(--yez-white)',
  padding: '12px 14px',
  fontSize: 13,
  fontFamily: "'Josefin Sans', sans-serif",
  outline: 'none',
  color: 'var(--yez-black)',
}

const labelStyle: React.CSSProperties = {
  fontSize: 10,
  letterSpacing: 1.5,
  textTransform: 'uppercase' as const,
  color: 'var(--yez-gray)',
  display: 'block',
  marginBottom: 6,
}

export default function CheckoutPage() {
  const { items, shipping, subtotal, total, clearCart } = useCartStore()
  const router = useRouter()

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    cep: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isTestMode = !process.env.NEXT_PUBLIC_MP_PUBLIC_KEY

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!form.name || !form.email || !form.cep || !form.street || !form.number) {
      setError('Preencha todos os campos obrigatórios.')
      return
    }

    if (items.length === 0) {
      setError('Sua sacola está vazia.')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: {
            name: form.name,
            email: form.email,
            phone: form.phone,
          },
          items: items.map((i) => ({
            id: i.id,
            title: i.title,
            price: i.price,
            quantity: i.quantity,
          })),
          shipping,
          shippingAddress: {
            cep: form.cep,
            street: form.street,
            number: form.number,
            complement: form.complement,
            neighborhood: form.neighborhood,
            city: form.city,
            state: form.state,
          },
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Erro ao processar pedido.')
        return
      }

      clearCart()

      // Em sandbox usa sandbox_init_point, em produção usa init_point
      const redirectUrl = data.sandbox_init_point ?? data.init_point
      window.location.href = redirectUrl
    } catch {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  if (items.length === 0) {
    return (
      <main>
        <nav style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 20px', borderBottom: '1px solid var(--yez-lightgray)',
          background: 'var(--yez-white)', position: 'sticky', top: 0, zIndex: 10
        }}>
          <Link href="/" style={{ fontFamily: "'Dancing Script', cursive", fontSize: 26, color: 'var(--yez-black)', textDecoration: 'none' }}>
            Yez Store
          </Link>
        </nav>
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--yez-gray)', marginBottom: 20 }}>
            Sua sacola está vazia
          </div>
          <Link href="/" style={{
            display: 'inline-block', background: 'var(--yez-black)', color: '#fff',
            padding: '12px 28px', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', textDecoration: 'none'
          }}>
            Ver produtos
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main>
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 20px', borderBottom: '1px solid var(--yez-lightgray)',
        background: 'var(--yez-white)', position: 'sticky', top: 0, zIndex: 10
      }}>
        <Link href="/" style={{ fontFamily: "'Dancing Script', cursive", fontSize: 26, color: 'var(--yez-black)', textDecoration: 'none' }}>
          Yez Store
        </Link>
        <Link href="/sacola" style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--yez-gray)', textDecoration: 'none' }}>
          ← Sacola
        </Link>
      </nav>

      <div style={{ padding: '24px 20px', maxWidth: 520, margin: '0 auto' }}>
        <div style={{ fontFamily: "'Dancing Script', cursive", fontSize: 32, marginBottom: 4 }}>
          Finalizar compra
        </div>
        <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--yez-gray)', marginBottom: 28 }}>
          Preencha seus dados para continuar
        </div>

        {isTestMode && (
          <div style={{
            background: '#FFF3CD', border: '1px solid #FFC107', padding: '10px 14px',
            fontSize: 11, marginBottom: 20, lineHeight: 1.5, color: '#856404'
          }}>
            <strong>Modo sandbox:</strong> Pagamentos não são cobrados de verdade. Configure MERCADO_PAGO_ACCESS_TOKEN para produção.
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Dados pessoais */}
          <div style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 16, paddingBottom: 8, borderBottom: '1px solid var(--yez-lightgray)' }}>
            Dados pessoais
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Nome completo *</label>
            <input name="name" value={form.name} onChange={handleChange} style={inputStyle} placeholder="Maria da Silva" required />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>E-mail *</label>
            <input name="email" type="email" value={form.email} onChange={handleChange} style={inputStyle} placeholder="maria@email.com" required />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>WhatsApp</label>
            <input name="phone" value={form.phone} onChange={handleChange} style={inputStyle} placeholder="(61) 99999-9999" />
          </div>

          {/* Endereço de entrega */}
          <div style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 16, paddingBottom: 8, borderBottom: '1px solid var(--yez-lightgray)' }}>
            Endereço de entrega
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>CEP *</label>
            <input name="cep" value={form.cep} onChange={handleChange} style={inputStyle} placeholder="70000-000" required />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: 10, marginBottom: 14 }}>
            <div>
              <label style={labelStyle}>Rua *</label>
              <input name="street" value={form.street} onChange={handleChange} style={inputStyle} placeholder="Rua das Flores" required />
            </div>
            <div>
              <label style={labelStyle}>Número *</label>
              <input name="number" value={form.number} onChange={handleChange} style={inputStyle} placeholder="123" required />
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Complemento</label>
            <input name="complement" value={form.complement} onChange={handleChange} style={inputStyle} placeholder="Apto 4B" />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Bairro</label>
            <input name="neighborhood" value={form.neighborhood} onChange={handleChange} style={inputStyle} placeholder="Centro" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: 10, marginBottom: 28 }}>
            <div>
              <label style={labelStyle}>Cidade</label>
              <input name="city" value={form.city} onChange={handleChange} style={inputStyle} placeholder="Brasília" />
            </div>
            <div>
              <label style={labelStyle}>UF</label>
              <input name="state" value={form.state} onChange={handleChange} style={inputStyle} placeholder="DF" maxLength={2} />
            </div>
          </div>

          {/* Resumo */}
          <div style={{ borderTop: '1px solid var(--yez-lightgray)', paddingTop: 16, marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--yez-gray)', marginBottom: 6 }}>
              <span>Subtotal ({items.length} {items.length === 1 ? 'item' : 'itens'})</span>
              <span>{formatCurrency(subtotal())}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--yez-gray)', marginBottom: 12 }}>
              <span>Frete {shipping ? `(${shipping.name})` : ''}</span>
              <span>{shipping ? formatCurrency(parseFloat(shipping.price)) : 'Não calculado'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 600, padding: '12px 0', borderTop: '1.5px solid var(--yez-black)' }}>
              <span>Total</span>
              <span>{formatCurrency(total())}</span>
            </div>
          </div>

          {error && (
            <div style={{ background: '#FFE8E8', border: '1px solid #FF4444', padding: '10px 14px', fontSize: 12, marginBottom: 16, color: '#CC0000' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', background: loading ? 'var(--yez-gray)' : 'var(--yez-black)',
              color: '#fff', border: 'none', padding: 16,
              fontSize: 11, letterSpacing: 2.5, textTransform: 'uppercase',
              fontFamily: "'Josefin Sans', sans-serif", cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Processando...' : 'Ir para o pagamento →'}
          </button>

          <div style={{ textAlign: 'center', marginTop: 12, fontSize: 10, color: 'var(--yez-gray)', letterSpacing: .5 }}>
            Você será redirecionado para o Mercado Pago para concluir o pagamento.
          </div>
        </form>
      </div>
    </main>
  )
}
