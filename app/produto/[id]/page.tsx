import { createSupabaseServerClient } from '@/app/lib/supabase-server'
import { formatCurrency } from '@/app/lib/format'
import AddToCartButton from '@/app/components/AddToCartButton'
import CartLink from '@/app/components/CartLink'
import Link from 'next/link'

type Props = {
    params: Promise<{ id: string }>
}

export default async function ProdutoPage({ params }: Props) {
    const { id } = await params
    const supabase = await createSupabaseServerClient()

    const { data: product, error } = await supabase
        .from('products')
        .select('*, artisans(name)')
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

    const { data: related } = product.category
        ? await supabase
            .from('products')
            .select('id, title, price, image_url, artisans(name)')
            .eq('is_active', true)
            .eq('category', product.category)
            .neq('id', product.id)
            .limit(4)
        : { data: [] }

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

            {/* Layout 2 colunas no desktop */}
            <div className="product-detail-grid">

                {/* Coluna esquerda: imagem */}
                <div className="product-detail-image-col">
                    <Link href="/" style={{
                        fontSize: 11, letterSpacing: 2, textTransform: 'uppercase',
                        color: 'var(--yez-gray)', textDecoration: 'none',
                        display: 'inline-block', padding: '16px 20px'
                    }}>
                        ← Voltar
                    </Link>
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
                </div>

                {/* Coluna direita: informações */}
                <div className="product-detail-info-col">
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

                    <div style={{ height: 1, background: 'var(--yez-lightgray)', marginBottom: 16 }} />

                    {/* Descrição */}
                    <div style={{
                        fontSize: 14, color: 'var(--yez-gray)', lineHeight: 1.7,
                        marginBottom: 20, letterSpacing: .3
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

                    {/* Alerta de estoque baixo */}
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

                    {/* Seção da artesã */}
                    {product.artisans?.name && (
                        <div style={{
                            marginTop: 32,
                            borderTop: '1px solid var(--yez-lightgray)',
                            paddingTop: 24,
                        }}>
                            <div style={{
                                fontSize: 10, letterSpacing: 2, textTransform: 'uppercase',
                                color: 'var(--yez-gray)', marginBottom: 12
                            }}>
                                Sobre a artesã
                            </div>
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 16,
                                padding: '16px', background: 'var(--yez-cream)',
                            }}>
                                <div style={{
                                    width: 44, height: 44, background: 'var(--yez-lightgray)',
                                    flexShrink: 0, display: 'flex', alignItems: 'center',
                                    justifyContent: 'center',
                                    fontFamily: "'Dancing Script', cursive", fontSize: 20,
                                    color: 'var(--yez-gray)',
                                }}>
                                    {product.artisans.name.charAt(0)}
                                </div>
                                <div>
                                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
                                        {product.artisans.name}
                                    </div>
                                    <div style={{ fontSize: 11, color: 'var(--yez-gray)', letterSpacing: .5, lineHeight: 1.6 }}>
                                        Artesã parceira · Brasília, DF · Peças feitas à mão
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Produtos relacionados */}
            {related && related.length > 0 && (
                <div style={{ borderTop: '1px solid var(--yez-lightgray)', paddingTop: 32, marginTop: 16 }}>
                    <div style={{
                        padding: '0 20px 16px',
                        fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', color: 'var(--yez-gray)'
                    }}>
                        Você também pode gostar
                    </div>
                    <div className="product-grid">
                        {related.map((rel) => (
                            <Link
                                key={rel.id}
                                href={`/produto/${rel.id}`}
                                style={{ textDecoration: 'none', color: 'inherit' }}
                                className="product-card"
                            >
                                <div
                                    className="product-image"
                                    style={{
                                        width: '100%', aspectRatio: '1 / 1',
                                        background: 'var(--yez-cream)', overflow: 'hidden',
                                        marginBottom: 10,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: 12, color: 'var(--yez-gray)',
                                    }}
                                >
                                    {rel.image_url
                                        ? <img src={rel.image_url} alt={rel.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        : 'Foto em breve'
                                    }
                                </div>
                                <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--yez-gray)', marginBottom: 4 }}>
                                    {(rel.artisans as { name: string } | null)?.name}
                                </div>
                                <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3, marginBottom: 6 }}>
                                    {rel.title}
                                </div>
                                <div style={{ fontSize: 14, fontWeight: 600 }}>
                                    {formatCurrency(Number(rel.price))}
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </main>
    )
}
