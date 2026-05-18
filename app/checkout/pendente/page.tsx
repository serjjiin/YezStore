'use client'

import { useEffect, useState } from 'react'
import { useCartStore } from '@/app/lib/store'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import CheckoutNav from '@/app/checkout/CheckoutNav'

function PendenteContent() {
  const { clearCart } = useCartStore()
  const searchParams = useSearchParams()
  const paymentId = searchParams.get('payment_id')
  const externalRef = searchParams.get('external_reference')

  const [status, setStatus] = useState<'verifying' | 'paid' | 'pending' | 'error'>(() => {
    if (!paymentId || !externalRef) return 'pending'
    return 'verifying'
  })

  useEffect(() => {
    if (!paymentId || !externalRef) return

    fetch('/api/payments/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payment_id: paymentId, order_id: externalRef }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.status === 'paid') {
          clearCart()
          setStatus('paid')
        } else {
          setStatus('pending')
        }
      })
      .catch(() => setStatus('pending'))
  }, [paymentId, externalRef, clearCart])

  return (
    <div style={{ textAlign: 'center', padding: '60px 24px', maxWidth: 400, margin: '0 auto' }}>
      {status === 'verifying' && (
        <div style={{ fontSize: 13, color: 'var(--yez-gray)' }}>
          Verificando pagamento...
        </div>
      )}

      {status === 'paid' && (
        <>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'var(--yez-black)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, margin: '0 auto 24px',
          }}>
            ✓
          </div>

          <div style={{ fontFamily: "'Dancing Script', cursive", fontSize: 36, marginBottom: 12 }}>
            Pagamento aprovado!
          </div>

          <div style={{ fontSize: 13, color: 'var(--yez-gray)', lineHeight: 1.7, marginBottom: 24 }}>
            Seu pagamento foi confirmado. Em breve você receberá um e-mail
            e iniciaremos a preparação do seu pedido.
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
            Continuar comprando
          </Link>
        </>
      )}

      {status === 'pending' && (
        <>
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
              background: 'var(--yez-cream)', padding: '12px 16px', marginBottom: 12,
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

          {paymentId && (
            <div style={{
              background: 'var(--yez-cream)', padding: '12px 16px', marginBottom: 28,
              fontSize: 11, letterSpacing: .5, color: 'var(--yez-gray)'
            }}>
              <div style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 }}>
                ID do pagamento
              </div>
              <div style={{ fontWeight: 600, color: 'var(--yez-black)' }}>
                {paymentId}
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
        </>
      )}
    </div>
  )
}

export default function PendentePage() {
  return (
    <main>
      <CheckoutNav />
      <Suspense>
        <PendenteContent />
      </Suspense>
    </main>
  )
}
