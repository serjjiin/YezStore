'use client'

import { useEffect, useState } from 'react'
import { useCartStore } from '@/app/lib/store'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import CheckoutNav from '@/app/checkout/CheckoutNav'

function FalhaContent() {
  const { clearCart } = useCartStore()
  const searchParams = useSearchParams()
  const paymentId = searchParams.get('payment_id')
  const externalRef = searchParams.get('external_reference')

  const [status, setStatus] = useState<'verifying' | 'paid' | 'failed'>(() => {
    if (!paymentId || !externalRef) return 'failed'
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
          setStatus('failed')
        }
      })
      .catch(() => setStatus('failed'))
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

      {status === 'failed' && (
        <>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: '#CC0000', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, margin: '0 auto 24px',
          }}>
            ✕
          </div>

          <div style={{ fontFamily: "'Dancing Script', cursive", fontSize: 36, marginBottom: 12 }}>
            Pagamento não aprovado
          </div>

          <div style={{ fontSize: 13, color: 'var(--yez-gray)', lineHeight: 1.7, marginBottom: 24 }}>
            Não foi possível processar o seu pagamento. Seus itens ainda estão na sacola —
            tente novamente com outro cartão ou método de pagamento.
          </div>

          {externalRef && (
            <div style={{
              background: 'var(--yez-cream)', padding: '12px 16px', marginBottom: 16,
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

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
            <Link href="/sacola" style={{
              display: 'inline-block', background: 'var(--yez-black)', color: '#fff',
              padding: '14px 32px', fontSize: 10, letterSpacing: 2.5,
              textTransform: 'uppercase', textDecoration: 'none',
              fontFamily: "'Josefin Sans', sans-serif", width: '100%', textAlign: 'center'
            }}>
              Tentar novamente
            </Link>
            <Link href="/" style={{
              fontSize: 11, color: 'var(--yez-gray)', textDecoration: 'none',
              letterSpacing: 1, textTransform: 'uppercase'
            }}>
              Voltar à loja
            </Link>
          </div>
        </>
      )}
    </div>
  )
}

export default function FalhaPage() {
  return (
    <main>
      <CheckoutNav />
      <Suspense>
        <FalhaContent />
      </Suspense>
    </main>
  )
}
