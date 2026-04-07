import { supabase } from '@/app/lib/supabase'
import AddToCartButton from '@/app/components/AddToCartButton'
import Link from 'next/link'

type Props = {
    params: Promise<{ id: string }>
}

export default async function ProdutoPage({ params }: Props) {
    const { id } = await params

    const { data: product, error } = await supabase
        .from('products')
        .select(`*, artisans ( name )`)
        .eq('id', id)
        .single()

    if (error || !product) {
        return <p>Produto não encontrado.</p>
    }

    return (
        <main>
            {/* Nav */}
            <nav style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 20px', borderBottom: '1px solid var(--yez-lightgray)',
                background: 'var(--yez-white)', position: 'sticky', top: 0, zIndex: 10
            }}>
                <Link href="/" style={{
                    fontFamily: "'Dancing Script', cursive", fontSize: 26,
                    color: 'var(--yez-black)', textDecoration: 'none'
                }}>
                    Yez Store
                </Link>
                <Link href="/sacola" style={{
                    fontSize: 11, letterSpacing: 2, textTransform: 'uppercase',
                    color: 'var(--yez-gray)', textDecoration: 'none'
                }}>
                    Sacola
                </Link>
            </nav>

            <Link href="/" style={{
                fontSize: 10, letterSpacing: 2, textTransform: 'uppercase',
                color: 'var(--yez-gray)', textDecoration: 'none',
                display: 'inline-block', padding: '16px 20px'
            }}>
                ← Voltar
            </Link>

            {/* Imagem */}
            <div style={{
                width: '100%', height: 240,
                background: 'var(--yez-cream)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, letterSpacing: 1, textTransform: 'uppercase',
                color: 'var(--yez-gray)'
            }}>
                {product.image_url
                    ? <img src={product.image_url} alt={product.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : 'Foto em breve'
                }
            </div>

            <div style={{ padding: '20px' }}>
                {/* Artesã */}
                <div style={{
                    fontSize: 9, letterSpacing: 2, textTransform: 'uppercase',
                    color: 'var(--yez-gray)', marginBottom: 6
                }}>
                    {product.artisans?.name}
                </div>

                {/* Nome */}
                <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: .5, marginBottom: 6, lineHeight: 1.3 }}>
                    {product.title}
                </div>

                {/* Preço */}
                <div style={{
                    fontFamily: "'Dancing Script', cursive", fontSize: 32, marginBottom: 16
                }}>
                    R$ {Number(product.price).toFixed(2)}
                </div>

                {/* Divisor */}
                <div style={{ height: 1, background: 'var(--yez-lightgray)', marginBottom: 16 }} />

                {/* Descrição */}
                <div style={{
                    fontSize: 13, color: 'var(--yez-gray)', lineHeight: 1.7,
                    marginBottom: 16, letterSpacing: .3
                }}>
                    {product.description}
                </div>

                {/* Info */}
                <div style={{
                    display: 'grid', gridTemplateColumns: '1fr 1fr',
                    gap: 10, marginBottom: 20
                }}>
                    {[
                        { label: 'Origem', value: 'Brasília, DF' },
                        { label: 'Envio', value: 'PAC / SEDEX' },
                        { label: 'Prazo', value: '3–8 dias úteis' },
                        { label: 'Feito', value: 'À mão' },
                    ].map(({ label, value }) => (
                        <div key={label} style={{ background: 'var(--yez-cream)', padding: '10px 12px' }}>
                            <div style={{ fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--yez-gray)', marginBottom: 3 }}>
                                {label}
                            </div>
                            <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: .3 }}>
                                {value}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Botão */}
                <AddToCartButton
                    product={{
                        id: product.id,
                        title: product.title,
                        price: Number(product.price),
                        artisan: product.artisans?.name ?? '',
                    }}
                />
            </div>
        </main>
    )
}