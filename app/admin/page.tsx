import { createSupabaseServiceClient } from '@/app/lib/supabase-server'
import { formatCurrency } from '@/app/lib/format'
import { STATUS_LABELS, STATUS_COLORS } from '@/app/admin/lib/status'
import { getOrderTotal } from '@/app/admin/lib/orderTotals'
import Link from 'next/link'

export default async function AdminDashboard() {
  const supabase = createSupabaseServiceClient()

  const [ordersResult, productsResult, artisansResult] = await Promise.all([
    supabase
      .from('orders')
      .select('id, status, total_amount, shipping_cost, created_at, customer_name')
      .order('created_at', { ascending: false })
      .limit(8),
    supabase.from('products').select('id, is_active, stock_quantity').eq('is_active', true),
    supabase.from('artisans').select('id'),
  ])

  const orders = ordersResult.data ?? []
  const products = productsResult.data ?? []
  const artisansCount = artisansResult.data?.length ?? 0

  type OrderRow = { id: string; status: string; total_amount: number; shipping_cost: number; created_at: string; customer_name: string }
  type ProductRow = { id: string; is_active: boolean; stock_quantity: number }

  const typedOrders = orders as OrderRow[]
  const typedProducts = products as ProductRow[]

  const paidOrders = typedOrders.filter((o) => o.status === 'paid' || o.status === 'shipped')
  const totalRevenue = paidOrders.reduce(
    (sum: number, o: OrderRow) => sum + getOrderTotal(o),
    0
  )
  const lowStock = typedProducts.filter((p) => p.stock_quantity <= 2).length

  const stats = [
    { label: 'Produtos ativos', value: products.length },
    { label: 'Artesãos', value: artisansCount },
    { label: 'Pedidos pagos', value: paidOrders.length },
    { label: 'Faturamento total', value: formatCurrency(totalRevenue) },
  ]

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: "'Dancing Script', cursive", fontSize: 34, marginBottom: 4 }}>
          Dashboard
        </div>
        <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--yez-gray)' }}>
          Visão geral da loja
        </div>
      </div>

      {/* Stats */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 16, marginBottom: 36
      }}>
        {stats.map((s) => (
          <div key={s.label} style={{
            background: 'var(--yez-white)', padding: '20px 18px',
            border: '1px solid var(--yez-lightgray)'
          }}>
            <div style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--yez-gray)', marginBottom: 8 }}>
              {s.label}
            </div>
            <div style={{ fontSize: 26, fontWeight: 700, fontFamily: "'Dancing Script', cursive" }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {lowStock > 0 && (
        <div style={{
          background: '#FFF3CD', border: '1px solid #FFC107',
          padding: '10px 16px', fontSize: 12, marginBottom: 24, color: '#856404'
        }}>
          ⚠️ {lowStock} produto{lowStock > 1 ? 's' : ''} com estoque baixo (≤ 2 unidades).{' '}
          <Link href="/admin/produtos" style={{ color: '#856404', fontWeight: 600 }}>Ver produtos</Link>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: .5 }}>
          Pedidos recentes
        </div>
        <Link href="/admin/pedidos" style={{
          fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase',
          color: 'var(--yez-gray)', textDecoration: 'none'
        }}>
          Ver todos →
        </Link>
      </div>

      {/* Tabela de pedidos */}
      <div style={{ background: 'var(--yez-white)', border: '1px solid var(--yez-lightgray)' }}>
        {orders.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', fontSize: 12, color: 'var(--yez-gray)' }}>
            Nenhum pedido ainda.
          </div>
        ) : (
          <>
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 100px',
              padding: '10px 16px', borderBottom: '1px solid var(--yez-lightgray)',
              fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--yez-gray)'
            }}>
              <span>Cliente</span>
              <span>Data</span>
              <span>Total</span>
              <span>Status</span>
            </div>
            {typedOrders.map((order) => (
              <Link
                key={order.id}
                href={`/admin/pedidos/${order.id}`}
                style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 100px',
                  padding: '12px 16px', borderBottom: '1px solid var(--yez-lightgray)',
                  fontSize: 12, textDecoration: 'none', color: 'var(--yez-black)',
                  alignItems: 'center'
                }}
              >
                <span>{order.customer_name}</span>
                <span style={{ color: 'var(--yez-gray)', fontSize: 11 }}>
                  {new Date(order.created_at).toLocaleDateString('pt-BR')}
                </span>
                <span>
                  {formatCurrency(getOrderTotal(order))}
                </span>
                <span style={{
                  fontSize: 10, letterSpacing: 1, textTransform: 'uppercase',
                  color: STATUS_COLORS[order.status] ?? 'var(--yez-gray)', fontWeight: 600
                }}>
                  {STATUS_LABELS[order.status] ?? order.status}
                </span>
              </Link>
            ))}
          </>
        )}
      </div>

      {/* Ações rápidas */}
      <div style={{ marginTop: 32 }}>
        <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: .5, marginBottom: 16 }}>
          Ações rápidas
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <Link href="/admin/produtos/novo" style={{
            background: 'var(--yez-black)', color: '#fff',
            padding: '12px 20px', fontSize: 10, letterSpacing: 2,
            textTransform: 'uppercase', textDecoration: 'none',
            fontFamily: "'Josefin Sans', sans-serif"
          }}>
            + Novo produto
          </Link>
          <Link href="/admin/artesaos/novo" style={{
            background: 'var(--yez-white)', color: 'var(--yez-black)',
            border: '1px solid var(--yez-black)',
            padding: '12px 20px', fontSize: 10, letterSpacing: 2,
            textTransform: 'uppercase', textDecoration: 'none',
            fontFamily: "'Josefin Sans', sans-serif"
          }}>
            + Novo artesão
          </Link>
        </div>
      </div>
    </div>
  )
}
