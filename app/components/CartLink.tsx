'use client'

import Link from 'next/link'
import { useCartStore } from '@/app/lib/store'

export default function CartLink() {
  const count = useCartStore(s => s.items.reduce((acc, i) => acc + i.quantity, 0))
  return (
    <Link href="/sacola" style={{
      fontSize: 11, letterSpacing: 2, textTransform: 'uppercase',
      color: 'var(--yez-gray)', textDecoration: 'none'
    }}>
      Sacola{count > 0 ? ` (${count})` : ''}
    </Link>
  )
}
