'use client'

import { useCartStore } from '@/app/lib/store'
import { formatCurrency } from '@/app/lib/format'
import FreteCalculator from '@/app/components/FreteCalculator'
import Link from 'next/link'

export default function Sacola() {
    const { items, removeItem, shipping, subtotal, total } = useCartStore()

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
                <span style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--yez-gray)' }}>
                    Sua sacola
                </span>
            </nav>

            <div style={{ padding: '20px' }}>
                <Link href="/" style={{
                    fontSize: 11, letterSpacing: 2, textTransform: 'uppercase',
                    color: 'var(--yez-gray)', textDecoration: 'none',
                    display: 'inline-block', marginBottom: 20
                }}>
                    ← Continuar comprando
                </Link>

                <div style={{
                    fontFamily: "'Dancing Script', cursive", fontSize: 32, marginBottom: 4
                }}>
                    Sacola
                </div>
                <div style={{
                    fontSize: 11, letterSpacing: 2, textTransform: 'uppercase',
                    color: 'var(--yez-gray)', marginBottom: 24
                }}>
                    {items.length} {items.length === 1 ? 'item' : 'itens'}
                </div>

                {items.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '48px 0' }}>
                        <div style={{ fontSize: 13, color: 'var(--yez-gray)', marginBottom: 20 }}>
                            Sua sacola está vazia
                        </div>
                        <Link href="/" style={{
                            display: 'inline-block',
                            background: 'var(--yez-black)', color: '#fff',
                            padding: '12px 28px', fontSize: 11, letterSpacing: 2,
                            textTransform: 'uppercase', textDecoration: 'none',
                            fontFamily: "'Josefin Sans', sans-serif"
                        }}>
                            Ver produtos
                        </Link>
                    </div>
                ) : (
                    <>
                        {/* Lista de itens */}
                        {items.map((item) => (
                            <div key={item.id} style={{
                                display: 'flex', gap: 12, padding: '14px 0',
                                borderBottom: '1px solid var(--yez-lightgray)', alignItems: 'center'
                            }}>
                                <div style={{
                                    width: 60, height: 60, background: 'var(--yez-cream)',
                                    flexShrink: 0, overflow: 'hidden',
                                }}>
                                    {item.image_url
                                        ? <img src={item.image_url} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        : null
                                    }
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 3 }}>
                                        {item.title}
                                    </div>
                                    <div style={{ fontSize: 11, color: 'var(--yez-gray)', letterSpacing: .5 }}>
                                        {item.artisan} · Qtd: {item.quantity}
                                    </div>
                                </div>
                                <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: .3, flexShrink: 0 }}>
                                    {formatCurrency(item.price * item.quantity)}
                                </div>
                                <button
                                    className="remove-btn"
                                    onClick={() => removeItem(item.id)}
                                    aria-label={`Remover ${item.title} da sacola`}
                                >
                                    ×
                                </button>
                            </div>
                        ))}

                        {/* Frete */}
                        <FreteCalculator />

                        {/* Resumo de valores */}
                        <div style={{ marginTop: 20, borderTop: '1px solid var(--yez-lightgray)', paddingTop: 16 }}>
                            <div style={{
                                display: 'flex', justifyContent: 'space-between',
                                fontSize: 13, color: 'var(--yez-gray)', marginBottom: 6
                            }}>
                                <span>Subtotal</span>
                                <span>{formatCurrency(subtotal())}</span>
                            </div>
                            <div style={{
                                display: 'flex', justifyContent: 'space-between',
                                fontSize: 13, color: 'var(--yez-gray)', marginBottom: 12
                            }}>
                                <span>Frete</span>
                                <span>
                                    {shipping
                                        ? formatCurrency(parseFloat(shipping.price))
                                        : 'Calcule acima'}
                                </span>
                            </div>
                            <div style={{
                                display: 'flex', justifyContent: 'space-between',
                                fontSize: 16, fontWeight: 600, letterSpacing: 1,
                                padding: '12px 0', borderTop: '1.5px solid var(--yez-black)',
                            }}>
                                <span>Total</span>
                                <span>{formatCurrency(total())}</span>
                            </div>
                        </div>

                        <Link href="/checkout" style={{
                            display: 'block', width: '100%', background: 'var(--yez-black)', color: '#fff',
                            border: 'none', padding: 16, fontSize: 11, letterSpacing: 2.5,
                            textTransform: 'uppercase', fontFamily: "'Josefin Sans', sans-serif",
                            textDecoration: 'none', textAlign: 'center', marginTop: 8,
                            cursor: shipping ? 'pointer' : 'default',
                            opacity: shipping ? 1 : 0.5,
                        }}
                            onClick={(e) => { if (!shipping) e.preventDefault() }}
                        >
                            {shipping ? 'Finalizar compra →' : 'Calcule o frete para continuar'}
                        </Link>
                    </>
                )}
            </div>
        </main>
    )
}
