import { supabase } from '@/app/lib/supabase'
import AddToCartButton from './components/AddToCartButton'
import CategoryFilter from './components/CategoryFilter'
import Link from 'next/link'

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string }>
}) {
  const { categoria = '' } = await searchParams

  let query = supabase
    .from('products')
    .select(`
      *,
      artisans ( name )
    `)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (categoria) {
    query = query.eq('category', categoria)
  }

  const { data: products, error } = await query

  if (error) {
    console.error(error)
    return <p>Erro ao carregar produtos.</p>
  }

  return (
    <main>
      {/* Nav */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 20px', borderBottom: '1px solid var(--yez-lightgray)',
        background: 'var(--yez-white)', position: 'sticky', top: 0, zIndex: 10
      }}>
        <span style={{ fontFamily: "'Dancing Script', cursive", fontSize: 26 }}>
          Yez Store
        </span>
        <Link href="/sacola" style={{
          fontSize: 11, letterSpacing: 2, textTransform: 'uppercase',
          color: 'var(--yez-gray)', textDecoration: 'none'
        }}>
          Sacola
        </Link>
      </nav>

      {/* Hero */}
      <div style={{
        background: 'var(--yez-black)', color: '#fff',
        padding: '40px 24px', textAlign: 'center'
      }}>
        <div style={{ fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: 'rgba(255,255,255,.5)', marginBottom: 12 }}>
          Loja Colaborativa
        </div>
        <div style={{ fontFamily: "'Dancing Script', cursive", fontSize: 52, marginBottom: 8 }}>
          Yez Store
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,.6)', letterSpacing: .5, lineHeight: 1.6 }}>
          Peças únicas de artesãs locais.<br />
          Cada compra apoia diretamente quem faz.
        </div>
      </div>

      {/* Filtro de categorias */}
      <CategoryFilter activeCategory={categoria} />

      {/* Grid de produtos */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 1, background: 'var(--yez-lightgray)', margin: '20px 0'
      }}>
        {products.map((product) => (
          <div key={product.id} style={{ background: 'var(--yez-white)', padding: 12 }}>
            <div style={{
              height: 140, background: 'var(--yez-cream)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 10, fontSize: 13, color: 'var(--yez-gray)',
              letterSpacing: 1, textTransform: 'uppercase'
            }}>
              Foto em breve
            </div>
            <div style={{ fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--yez-gray)', marginBottom: 4 }}>
              {product.artisans?.name}
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, lineHeight: 1.3 }}>
              {product.title}
            </div>
            <div style={{ fontFamily: "'Dancing Script', cursive", fontSize: 22 }}>
              R$ {Number(product.price).toFixed(2)}
              <AddToCartButton
                product={{
                  id: product.id,
                  title: product.title,
                  price: Number(product.price),
                  artisan: product.artisans?.name ?? '',
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}