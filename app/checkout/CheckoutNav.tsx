import Link from 'next/link'

export default function CheckoutNav() {
  return (
    <nav style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '12px 20px', borderBottom: '1px solid var(--yez-lightgray)',
      background: 'var(--yez-white)'
    }}>
      <Link href="/" style={{ fontFamily: "'Dancing Script', cursive", fontSize: 26, color: 'var(--yez-black)', textDecoration: 'none' }}>
        Yez Store
      </Link>
    </nav>
  )
}
