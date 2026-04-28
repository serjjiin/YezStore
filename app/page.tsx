import { createSupabaseServerClient } from '@/app/lib/supabase-server'
import { formatCurrency } from '@/app/lib/format'
import AddToCartButton from './components/AddToCartButton'
import CategoryFilter from './components/CategoryFilter'
import CartLink from './components/CartLink'
import Link from 'next/link'

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string }>
}) {
  const { categoria = '' } = await searchParams
  const supabase = createSupabaseServerClient()

  const [{ data: heroProducts }, { data: products, error }] = await Promise.all([
    supabase
      .from('products')
      .select('id, image_url, title')
      .eq('is_active', true)
      .not('image_url', 'is', null)
      .order('created_at', { ascending: false })
      .limit(4),
    (() => {
      let q = supabase
        .from('products')
        .select('*, artisans(name)')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
      if (categoria) q = q.eq('category', categoria)
      return q
    })(),
  ])

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
        <CartLink />
      </nav>

      {/* Hero */}
      <div className="hero-section">
        <div className="hero-text">
          <div style={{
            fontSize: 11, letterSpacing: 3, textTransform: 'uppercase',
            color: 'rgba(255,255,255,.4)', marginBottom: 16
          }}>
            Loja Colaborativa · Brasília, DF
          </div>
          <div style={{
            fontFamily: "'Dancing Script', cursive", fontSize: 56,
            lineHeight: 1.1, marginBottom: 16
          }}>
            Yez Store
          </div>
          <div style={{
            fontSize: 14, color: 'rgba(255,255,255,.6)',
            letterSpacing: .5, lineHeight: 1.8, marginBottom: 32
          }}>
            Peças únicas criadas por artesãs locais.<br />
            Cada compra apoia diretamente quem faz.
          </div>
          <a href="#produtos" style={{
            display: 'inline-block',
            border: '1px solid rgba(255,255,255,.35)',
            color: '#fff', padding: '11px 28px',
            fontSize: 10, letterSpacing: 2.5,
            textTransform: 'uppercase', textDecoration: 'none',
          }}>
            Ver coleção
          </a>
        </div>
        <div className="hero-mosaic">
          {(heroProducts ?? []).map((p) => (
            <Link key={p.id} href={`/produto/${p.id}`} style={{ overflow: 'hidden', display: 'block' }}>
              <img
                src={p.image_url!}
                alt={p.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            </Link>
          ))}
          {Array.from({ length: Math.max(0, 4 - (heroProducts?.length ?? 0)) }).map((_, i) => (
            <div key={`empty-${i}`} style={{ background: 'rgba(255,255,255,0.04)' }} />
          ))}
        </div>
      </div>

      {/* Filtro de categorias */}
      <div id="produtos">
        <CategoryFilter activeCategory={categoria} />
      </div>

      {/* Contagem */}
      <div style={{
        padding: '0 20px 12px',
        fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--yez-gray)'
      }}>
        {products?.length ?? 0} {(products?.length ?? 0) === 1 ? 'produto' : 'produtos'}
        {categoria ? ` em ${categoria}` : ''}
      </div>

      {/* Grid de produtos */}
      <div className="product-grid" style={{ margin: '0 0 40px' }}>
        {products?.map((product) => (
          <div key={product.id} className="product-card">
            <Link href={`/produto/${product.id}`} style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
              <div
                className="product-image"
                style={{
                  width: '100%', aspectRatio: '1 / 1',
                  background: 'var(--yez-cream)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 10, overflow: 'hidden',
                  fontSize: 12, color: 'var(--yez-gray)',
                  letterSpacing: 1, textTransform: 'uppercase',
                }}
              >
                {product.image_url
                  ? <img src={product.image_url} alt={product.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : 'Foto em breve'
                }
              </div>
              <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--yez-gray)', marginBottom: 4 }}>
                {product.artisans?.name}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, lineHeight: 1.3 }}>
                {product.title}
              </div>
            </Link>
            <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: .5, marginBottom: 2 }}>
              {formatCurrency(Number(product.price))}
            </div>
            <AddToCartButton
              product={{
                id: product.id,
                title: product.title,
                price: Number(product.price),
                artisan: product.artisans?.name ?? '',
                image_url: product.image_url ?? undefined,
              }}
              stock={product.stock_quantity}
            />
          </div>
        ))}
      </div>
    </main>
  )
}
