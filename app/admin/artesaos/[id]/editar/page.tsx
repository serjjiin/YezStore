import { createSupabaseServiceClient } from '@/app/lib/supabase-server'
import ArtesaoForm from '../../ArtesaoForm'
import { notFound } from 'next/navigation'

type Props = { params: Promise<{ id: string }> }

export default async function EditarArtesaoPage({ params }: Props) {
  const { id } = await params
  const supabase = createSupabaseServiceClient()

  const { data: artisan, error } = await supabase
    .from('artisans')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !artisan) {
    notFound()
  }

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: "'Dancing Script', cursive", fontSize: 34, marginBottom: 4 }}>
          Editar artesã
        </div>
        <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--yez-gray)' }}>
          {artisan.name}
        </div>
      </div>
      <ArtesaoForm initialData={artisan} />
    </div>
  )
}
