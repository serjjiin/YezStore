import { createSupabaseServiceClient } from '@/app/lib/supabase-server'
import Link from 'next/link'
import DeleteArtisanButton from './DeleteArtisanButton'

export default async function AdminArtesaosPage() {
  const supabase = createSupabaseServiceClient()

  const { data: rawArtisans, error } = await supabase
    .from('artisans')
    .select(`
      *,
      products ( id )
    `)
    .order('name')

  if (error) {
    return <p style={{ color: 'red' }}>Erro ao carregar artesãos.</p>
  }

  type ArtisanRow = {
    id: string
    name: string
    contact_email: string | null
    phone: string | null
    pix_key: string | null
    split_percentage: number | null
    products: { id: string }[] | null
  }

  const artisans = (rawArtisans ?? []) as ArtisanRow[]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <div style={{ fontFamily: "'Dancing Script', cursive", fontSize: 34, marginBottom: 4 }}>
            Artesãos
          </div>
          <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--yez-gray)' }}>
            {artisans.length} artesão{artisans.length !== 1 ? 's' : ''} cadastrado{artisans.length !== 1 ? 's' : ''}
          </div>
        </div>
        <Link href="/admin/artesaos/novo" style={{
          background: 'var(--yez-black)', color: '#fff',
          padding: '12px 20px', fontSize: 10, letterSpacing: 2,
          textTransform: 'uppercase', textDecoration: 'none',
          fontFamily: "'Josefin Sans', sans-serif"
        }}>
          + Novo artesão
        </Link>
      </div>

      <div style={{ background: 'var(--yez-white)', border: '1px solid var(--yez-lightgray)' }}>
        {artisans.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', fontSize: 12, color: 'var(--yez-gray)' }}>
            Nenhum artesão cadastrado.{' '}
            <Link href="/admin/artesaos/novo" style={{ color: 'var(--yez-black)' }}>Criar o primeiro</Link>
          </div>
        ) : (
          <>
            <div style={{
              display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 80px 120px',
              padding: '10px 16px', borderBottom: '1px solid var(--yez-lightgray)',
              fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--yez-gray)'
            }}>
              <span>Artesã</span>
              <span>Contato</span>
              <span>Pix</span>
              <span>Split %</span>
              <span></span>
            </div>
            {artisans.map((artisan) => (
              <div
                key={artisan.id}
                style={{
                  display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 80px 120px',
                  padding: '13px 16px', borderBottom: '1px solid var(--yez-lightgray)',
                  fontSize: 12, alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 2 }}>{artisan.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--yez-gray)' }}>
                    {artisan.products?.length ?? 0} produto{(artisan.products?.length ?? 0) !== 1 ? 's' : ''}
                  </div>
                </div>
                <div style={{ fontSize: 11, color: 'var(--yez-gray)' }}>
                  {artisan.contact_email ?? artisan.phone ?? '—'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--yez-gray)', wordBreak: 'break-all' }}>
                  {artisan.pix_key ?? '—'}
                </div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>
                  {artisan.split_percentage ?? 80}%
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <Link
                    href={`/admin/artesaos/${artisan.id}/editar`}
                    style={{
                      fontSize: 9, letterSpacing: 1, textTransform: 'uppercase',
                      color: 'var(--yez-gray)', textDecoration: 'none',
                      border: '1px solid var(--yez-lightgray)', padding: '5px 10px'
                    }}
                  >
                    Editar
                  </Link>
                  <DeleteArtisanButton id={artisan.id} />
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
