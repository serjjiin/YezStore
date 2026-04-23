import { supabase } from '@/app/lib/supabase'
import { formatCurrency } from '@/app/lib/format'
import AddToCartButton from '@/app/components/AddToCartButton'
import CartLink from '@/app/components/CartLink'
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
        return (
            <main>
                <div style={{ textAlign: 'center', padding: '60px 20px', fontSize: 13, color: 'var(--yez-gray)' }}>
                    Produto não encontrado.{' '}
                    <Link href="/" style={{ color: 'var(--yez-black)' }}>Voltar à loja</Link>
                </div>
            </main>
        )
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
                <CartLink />
            </nav>

            <Link href="/" style={{
                fontSize: 11, letterSpacing: 2, textTransform: 'uppercase',
                color: 'var(--yez-gray)', textDecoration: 'none',
                display: 'inline-block', padding: '16px 20px'
            }}>
                ← Voltar
            </Link>

            {/* Imagem */}
            <div style={{
                width: '100%', aspectRatio: '4 / 3',
                background: 'var(--yez-cream)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, letterSpacing: 1, textTransform: 'uppercase',
                color: 'var(--yez-gray)', overflow: 'hidden',
            }}>
                {product.image_url
                    ? <img src={product.image_url} alt={product.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : 'Foto em breve'
                }
            </div>

            <div style={{ padding: '20px' }}>
                {/* Artesã */}
                <div style={{
                    fontSize: 11, letterSpacing: 2, textTransform: 'uppercase',
                    color: 'var(--yez-gray)', marginBottom: 6
                }}>
                    {product.artisans?.name}
                </div>

                {/* Nome */}
                <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: .5, marginBottom: 8, lineHeight: 1.3 }}>
                    {product.title}
                </div>

                {/* Preço */}
                <div style={{
                    fontFamily: "'Dancing Script', cursive", fontSize: 34, marginBottom: 16
                }}>
                    {formatCurrency(Number(product.price))}
                </div>

                {/* Divisor */}
                <div style={{ height: 1, background: 'var(--yez-lightgray)', marginBottom: 16 }} />

                {/* Descrição */}
                <div style={{
                    fontSize: 14, color: 'var(--yez-gray)', lineHeight: 1.7,
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
                            <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--yez-gray)', marginBottom: 3 }}>
                                {label}
                            </div>
                            <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: .3 }}>
                                {value}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Estoque */}
                {product.stock_quantity <= 3 && product.stock_quantity > 0 && (
                    <div style={{ fontSize: 11, color: '#b85c00', letterSpacing: .5, marginBottom: 12 }}>
                        Restam apenas {product.stock_quantity} {product.stock_quantity === 1 ? 'unidade' : 'unidades'}
                    </div>
                )}

                {/* Botão */}
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
        </main>
    )
}
