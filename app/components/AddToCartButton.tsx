'use client'

import { useState } from 'react'
import { useCartStore } from '@/app/lib/store'

type Props = {
  product: {
    id: string
    title: string
    price: number
    artisan: string
    image_url?: string
  }
  stock?: number
}

export default function AddToCartButton({ product, stock }: Props) {
  const addItem = useCartStore((state) => state.addItem)
  const [added, setAdded] = useState(false)

  const esgotado = stock !== undefined && stock <= 0

  function handleAdd() {
    if (esgotado) return
    addItem({ ...product, quantity: 1 })
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }

  if (esgotado) {
    return (
      <button
        disabled
        style={{
          background: 'var(--yez-lightgray)',
          color: 'var(--yez-gray)',
          border: 'none',
          padding: '12px 20px',
          fontSize: 10,
          letterSpacing: 2,
          textTransform: 'uppercase',
          fontFamily: "'Josefin Sans', sans-serif",
          cursor: 'not-allowed',
          width: '100%',
          marginTop: 8,
        }}
      >
        Esgotado
      </button>
    )
  }

  return (
    <button
      onClick={handleAdd}
      style={{
        background: added ? 'var(--yez-success)' : 'var(--yez-black)',
        color: '#fff',
        border: 'none',
        padding: '12px 20px',
        fontSize: 10,
        letterSpacing: 2,
        textTransform: 'uppercase',
        fontFamily: "'Josefin Sans', sans-serif",
        cursor: 'pointer',
        width: '100%',
        marginTop: 8,
        transition: 'background 0.2s ease',
      }}
    >
      {added ? 'Adicionado ✓' : 'Adicionar à sacola'}
    </button>
  )
}
