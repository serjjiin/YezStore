import { createSupabaseServiceClient } from '@/app/lib/supabase-server'
import Link from 'next/link'
import DeleteProductButton from './DeleteProductButton'

export default async function AdminProdutosPage() {
  const supabase = createSupabaseServiceClient()

  const { data: rawProducts, error } = await supabase
    .from('products')
    .select(`*, artisans ( name )`)
    .order('created_at', { ascending: false })

  if (error) {
    return <p style={{ color: 'red' }}>Erro ao carregar produtos.</p>
  }

  type ProductRow = {
    id: string
    title: string
    price: number
    stock_quantity: number
    category: string | null
    image_url: string | null
    is_active: boolean
    artisans: { name: string } | null
  }

  const products = (rawProducts ?? []) as ProductRow[]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <div style={{ fontFamily: "'Dancing Script', cursive", fontSize: 34, marginBottom: 4 }}>
            Produtos
          </div>
          <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--yez-gray)' }}>
            {products.length} produto{products.length !== 1 ? 's' : ''} cadastrado{products.length !== 1 ? 's' : ''}
          </div>
        </div>
        <Link href="/admin/produtos/novo" style={{
          background: 'var(--yez-black)', color: '#fff',
          padding: '12px 20px', fontSize: 10, letterSpacing: 2,
          textTransform: 'uppercase', textDecoration: 'none',
          fontFamily: "'Josefin Sans', sans-serif"
        }}>
          + Novo produto
        </Link>
      </div>

      <div style={{ background: 'var(--yez-white)', border: '1px solid var(--yez-lightgray)' }}>
        {products.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', fontSize: 12, color: 'var(--yez-gray)' }}>
            Nenhum produto cadastrado.{' '}
            <Link href="/admin/produtos/novo" style={{ color: 'var(--yez-black)' }}>Criar o primeiro</Link>
          </div>
        ) : (
          <>
            <div style={{
              display: 'grid', gridTemplateColumns: '80px 2fr 1fr 80px 80px 120px',
              padding: '10px 16px', borderBottom: '1px solid var(--yez-lightgray)',
              fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--yez-gray)'
            }}>
              <span>Foto</span>
              <span>Produto</span>
              <span>Artesã</span>
              <span>Preço</span>
              <span>Estoque</span>
              <span></span>
            </div>
            {products.map((product) => (
              <div
                key={product.id}
                style={{
                  display: 'grid', gridTemplateColumns: '80px 2fr 1fr 80px 80px 120px',
                  padding: '12px 16px', borderBottom: '1px solid var(--yez-lightgray)',
                  alignItems: 'center', opacity: product.is_active ? 1 : 0.5,
                }}
              >
                <div style={{
                  width: 52, height: 52, background: 'var(--yez-cream)',
                  overflow: 'hidden', flexShrink: 0
                }}>
                  {product.image_url && (
                    <img src={product.image_url} alt={product.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  )}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{product.title}</div>
                  {!product.is_active && (
                    <div style={{ fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', color: '#CC0000' }}>
                      Inativo
                    </div>
                  )}
                </div>
                <div style={{ fontSize: 12, color: 'var(--yez-gray)' }}>
                  {product.artisans?.name ?? '—'}
                </div>
                <div style={{ fontSize: 13 }}>
                  R$ {Number(product.price).toFixed(2)}
                </div>
                <div style={{
                  fontSize: 13,
                  color: product.stock_quantity <= 2 ? '#CC0000' : 'var(--yez-black)',
                  fontWeight: product.stock_quantity <= 2 ? 600 : 400,
                }}>
                  {product.stock_quantity}
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <Link
                    href={`/admin/produtos/${product.id}/editar`}
                    style={{
                      fontSize: 9, letterSpacing: 1, textTransform: 'uppercase',
                      color: 'var(--yez-gray)', textDecoration: 'none',
                      border: '1px solid var(--yez-lightgray)', padding: '5px 10px'
                    }}
                  >
                    Editar
                  </Link>
                  <DeleteProductButton id={product.id} />
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
