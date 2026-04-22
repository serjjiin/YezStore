import { createSupabaseServiceClient } from '@/app/lib/supabase-server'
import ProdutoForm from '../ProdutoForm'

export default async function NovoProdutoPage() {
  const supabase = createSupabaseServiceClient()
  const { data: artisans } = await supabase
    .from('artisans')
    .select('id, name')
    .order('name')

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: "'Dancing Script', cursive", fontSize: 34, marginBottom: 4 }}>
          Novo produto
        </div>
        <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--yez-gray)' }}>
          Preencha os dados do produto
        </div>
      </div>
      <ProdutoForm artisans={artisans ?? []} />
    </div>
  )
}
