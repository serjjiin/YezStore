'use client'

import { useEffect } from 'react'
import { useCartStore } from '@/app/lib/store'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function PendenteContent() {
  const { clearCart } = useCartStore()
  const searchParams = useSearchParams()
  const externalRef = searchParams.get('external_reference')

  useEffect(() => {
    clearCart()
  }, [clearCart])

  return (
    <div style={{ textAlign: 'center', padding: '60px 24px', maxWidth: 400, margin: '0 auto' }}>
      <div style={{
        width: 64, height: 64, borderRadius: '50%',
        background: '#F4A100', color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 28, margin: '0 auto 24px',
      }}>
        ⏳
      </div>

      <div style={{ fontFamily: "'Dancing Script', cursive", fontSize: 36, marginBottom: 12 }}>
        Aguardando pagamento
      </div>

      <div style={{ fontSize: 13, color: 'var(--yez-gray)', lineHeight: 1.7, marginBottom: 24 }}>
        Seu pedido foi criado! Se você escolheu Pix, efetue o pagamento para confirmar.
        Assim que for confirmado, você receberá um e-mail e iniciaremos a preparação.
      </div>

      {externalRef && (
        <div style={{
          background: 'var(--yez-cream)', padding: '12px 16px', marginBottom: 28,
          fontSize: 11, letterSpacing: .5, color: 'var(--yez-gray)'
        }}>
          <div style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 }}>
            Número do pedido
          </div>
          <div style={{ fontWeight: 600, color: 'var(--yez-black)', wordBreak: 'break-all' }}>
            {externalRef}
          </div>
        </div>
      )}

      <Link href="/" style={{
        display: 'inline-block', background: 'var(--yez-black)', color: '#fff',
        padding: '14px 32px', fontSize: 10, letterSpacing: 2.5,
        textTransform: 'uppercase', textDecoration: 'none',
        fontFamily: "'Josefin Sans', sans-serif"
      }}>
        Voltar à loja
      </Link>
    </div>
  )
}

export default function PendentePage() {
  return (
    <main>
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '12px 20px', borderBottom: '1px solid var(--yez-lightgray)',
        background: 'var(--yez-white)'
      }}>
        <Link href="/" style={{ fontFamily: "'Dancing Script', cursive", fontSize: 26, color: 'var(--yez-black)', textDecoration: 'none' }}>
          Yez Store
        </Link>
      </nav>
      <Suspense>
        <PendenteContent />
      </Suspense>
    </main>
  )
}
