import Link from 'next/link'

export default function FalhaPage() {
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

      <div style={{ textAlign: 'center', padding: '60px 24px', maxWidth: 400, margin: '0 auto' }}>
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

        <div style={{ fontSize: 13, color: 'var(--yez-gray)', lineHeight: 1.7, marginBottom: 32 }}>
          Não foi possível processar o seu pagamento. Seus itens ainda estão na sacola —
          tente novamente com outro cartão ou método de pagamento.
        </div>

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
      </div>
    </main>
  )
}
