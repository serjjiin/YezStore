import Link from 'next/link'

const CATEGORIES = [
  { label: 'Todos', slug: '' },
  { label: 'Decoração', slug: 'decoracao' },
  { label: 'Semi-joias', slug: 'semi-joias' },
  { label: 'Infantil', slug: 'infantil' },
  { label: 'Crochê', slug: 'croche' },
  { label: 'Louças', slug: 'loucas' },
]

type Props = {
  activeCategory: string
}

export default function CategoryFilter({ activeCategory }: Props) {
  return (
    <div style={{
      display: 'flex', gap: 8, overflowX: 'auto',
      padding: '16px 20px', scrollbarWidth: 'none',
    }}>
      {CATEGORIES.map(({ label, slug }) => {
        const isActive = activeCategory === slug
        return (
          <Link
            key={slug}
            href={slug ? `/?categoria=${slug}` : '/'}
            style={{
              flexShrink: 0,
              padding: '6px 14px',
              fontSize: 10,
              letterSpacing: 2,
              textTransform: 'uppercase',
              textDecoration: 'none',
              border: '1px solid',
              borderColor: isActive ? 'var(--yez-black)' : 'var(--yez-lightgray)',
              background: isActive ? 'var(--yez-black)' : 'transparent',
              color: isActive ? '#fff' : 'var(--yez-gray)',
              whiteSpace: 'nowrap',
            }}
          >
            {label}
          </Link>
        )
      })}
    </div>
  )
}
