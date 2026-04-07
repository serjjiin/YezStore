'use client'

import { useCartStore } from '@/app/lib/store'
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
                    fontSize: 10, letterSpacing: 2, textTransform: 'uppercase',
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
                    fontSize: 10, letterSpacing: 2, textTransform: 'uppercase',
                    color: 'var(--yez-gray)', marginBottom: 24
                }}>
                    {items.length} {items.length === 1 ? 'item' : 'itens'}
                </div>

                {items.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '48px 0' }}>
                        <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--yez-gray)' }}>
                            Sua sacola está vazia
                        </div>
                        <Link href="/" style={{
                            display: 'inline-block', marginTop: 20,
                            background: 'var(--yez-black)', color: '#fff',
                            padding: '12px 28px', fontSize: 10, letterSpacing: 2,
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
                                    width: 56, height: 56, background: 'var(--yez-cream)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 10, color: 'var(--yez-gray)', flexShrink: 0
                                }}>
                                    foto
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>
                                        {item.title}
                                    </div>
                                    <div style={{ fontSize: 10, color: 'var(--yez-gray)', letterSpacing: .5 }}>
                                        {item.artisan} · Qtd: {item.quantity}
                                    </div>
                                </div>
                                <div style={{ fontFamily: "'Dancing Script', cursive", fontSize: 20 }}>
                                    R$ {(item.price * item.quantity).toFixed(2)}
                                </div>
                                <button
                                    onClick={() => removeItem(item.id)}
                                    style={{
                                        background: 'none', border: 'none',
                                        color: 'var(--yez-gray)', fontSize: 18, cursor: 'pointer'
                                    }}
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
                                fontSize: 12, color: 'var(--yez-gray)', marginBottom: 6
                            }}>
                                <span>Subtotal</span>
                                <span>R$ {subtotal().toFixed(2)}</span>
                            </div>
                            <div style={{
                                display: 'flex', justifyContent: 'space-between',
                                fontSize: 12, color: 'var(--yez-gray)', marginBottom: 12
                            }}>
                                <span>Frete</span>
                                <span>
                                    {shipping
                                        ? `R$ ${parseFloat(shipping.price).toFixed(2)}`
                                        : 'Calcule acima'}
                                </span>
                            </div>
                            <div style={{
                                display: 'flex', justifyContent: 'space-between',
                                fontSize: 16, fontWeight: 600, letterSpacing: 1,
                                padding: '12px 0', borderTop: '1.5px solid var(--yez-black)',
                            }}>
                                <span>Total</span>
                                <span>R$ {total().toFixed(2)}</span>
                            </div>
                        </div>

                        <button style={{
                            width: '100%', background: 'var(--yez-black)', color: '#fff',
                            border: 'none', padding: 16, fontSize: 11, letterSpacing: 2.5,
                            textTransform: 'uppercase', fontFamily: "'Josefin Sans', sans-serif",
                            cursor: 'pointer', marginTop: 8
                        }}>
                            Finalizar compra
                        </button>
                    </>
                )}
            </div>
        </main>
    )
}