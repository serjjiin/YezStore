import { createSupabaseServiceClient } from '@/app/lib/supabase-server'
import ProdutoForm from '../../ProdutoForm'
import { notFound } from 'next/navigation'

type Props = { params: Promise<{ id: string }> }

export default async function EditarProdutoPage({ params }: Props) {
  const { id } = await params
  const supabase = createSupabaseServiceClient()

  const [productResult, artisansResult] = await Promise.all([
    supabase.from('products').select('*').eq('id', id).single(),
    supabase.from('artisans').select('id, name').order('name'),
  ])

  if (productResult.error || !productResult.data) {
    notFound()
  }

  const product = productResult.data

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: "'Dancing Script', cursive", fontSize: 34, marginBottom: 4 }}>
          Editar produto
        </div>
        <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--yez-gray)' }}>
          {product.title}
        </div>
      </div>
      <ProdutoForm
        artisans={artisansResult.data ?? []}
        initialData={{
          id: product.id,
          title: product.title,
          description: product.description ?? '',
          price: Number(product.price),
          stock_quantity: product.stock_quantity,
          category: product.category ?? '',
          artisan_id: product.artisan_id ?? '',
          image_url: product.image_url ?? null,
          is_active: product.is_active,
        }}
      />
    </div>
  )
}
