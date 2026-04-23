'use client'

import { useState } from 'react'
import { useCartStore, type ShippingOption } from '@/app/lib/store'
import { formatCurrency } from '@/app/lib/format'

function formatCep(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 8)
  if (digits.length > 5) return `${digits.slice(0, 5)}-${digits.slice(5)}`
  return digits
}

export default function FreteCalculator() {
  const [cep, setCep] = useState('')
  const [options, setOptions] = useState<ShippingOption[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { items, shipping, setShipping } = useCartStore()

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0)

  async function calcular() {
    const digits = cep.replace(/\D/g, '')
    if (digits.length !== 8) {
      setError('Digite um CEP válido com 8 dígitos.')
      return
    }
    setLoading(true)
    setError('')
    setOptions([])
    setShipping(null)

    try {
      const res = await fetch('/api/frete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cep: digits, totalItems }),
      })
      const data = await res.json()

      if (!res.ok || data.error) {
        setError(data.error ?? 'Erro ao calcular frete.')
        return
      }

      const valid: ShippingOption[] = (data as (ShippingOption & { error?: string })[])
        .filter((o) => !o.error && o.price)
      setOptions(valid)

      if (valid.length === 0) {
        setError('Nenhuma opção de frete disponível para este CEP.')
      }
    } catch {
      setError('Não foi possível calcular o frete. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ marginTop: 24 }}>
      <div style={{
        fontSize: 11, letterSpacing: 2, textTransform: 'uppercase',
        color: 'var(--yez-gray)', marginBottom: 10
      }}>
        Calcular frete
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <input
          type="text"
          inputMode="numeric"
          placeholder="00000-000"
          value={cep}
          onChange={(e) => setCep(formatCep(e.target.value))}
          onKeyDown={(e) => e.key === 'Enter' && calcular()}
          style={{
            flex: 1, padding: '10px 12px', fontSize: 13,
            border: '1px solid var(--yez-lightgray)',
            outline: 'none', fontFamily: 'inherit',
          }}
        />
        <button
          onClick={calcular}
          disabled={loading}
          style={{
            background: 'var(--yez-black)', color: '#fff',
            border: 'none', padding: '10px 16px',
            fontSize: 10, letterSpacing: 2, textTransform: 'uppercase',
            cursor: loading ? 'wait' : 'pointer',
            fontFamily: "'Josefin Sans', sans-serif",
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? '...' : 'Calcular'}
        </button>
      </div>

      {error && (
        <div style={{ marginTop: 8, fontSize: 11, color: '#c0392b' }}>
          {error}
        </div>
      )}

      {options.length > 0 && (
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {options.map((option) => {
            const selected = shipping?.id === option.id
            return (
              <button
                key={option.id}
                onClick={() => setShipping(selected ? null : option)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 12px', width: '100%', textAlign: 'left',
                  border: '1px solid',
                  borderColor: selected ? 'var(--yez-black)' : 'var(--yez-lightgray)',
                  background: selected ? 'var(--yez-black)' : 'transparent',
                  cursor: 'pointer',
                }}
              >
                <div>
                  <div style={{
                    fontSize: 11, fontWeight: 600, letterSpacing: .5,
                    color: selected ? '#fff' : 'var(--yez-black)',
                  }}>
                    {option.company.name} — {option.name}
                  </div>
                  <div style={{
                    fontSize: 10, marginTop: 2,
                    color: selected ? 'rgba(255,255,255,.7)' : 'var(--yez-gray)',
                  }}>
                    Entrega em até {option.delivery_time} dias úteis
                  </div>
                </div>
                <div style={{
                  fontSize: 14, fontWeight: 600,
                  color: selected ? '#fff' : 'var(--yez-black)',
                  flexShrink: 0, marginLeft: 12,
                }}>
                  {formatCurrency(parseFloat(option.price))}
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
