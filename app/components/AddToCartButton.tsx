'use client'

import { useCartStore } from '@/app/lib/store'

type Props = {
    product: {
        id: string
        title: string
        price: number
        artisan: string
    }
}

export default function AddToCartButton({ product }: Props) {
    const addItem = useCartStore((state) => state.addItem)

    return (
        <button
            onClick={() => addItem({ ...product, quantity: 1 })}
            style={{
                background: 'var(--yez-black)',
                color: '#fff',
                border: 'none',
                padding: '10px 20px',
                fontSize: 10,
                letterSpacing: 2,
                textTransform: 'uppercase',
                fontFamily: "'Josefin Sans', sans-serif",
                cursor: 'pointer',
                width: '100%',
                marginTop: 8,
            }}
        >
            Adicionar à sacola
        </button>
    )
}