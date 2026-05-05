import { createSupabaseServiceClient } from '@/app/lib/supabase-server'
import { formatCurrency } from '@/app/lib/format'
import { STATUS_LABELS, STATUS_COLORS } from '@/app/admin/lib/status'
import { getOrderTotal } from '@/app/admin/lib/orderTotals'
import Link from 'next/link'

export default async function AdminPedidosPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams
  const supabase = createSupabaseServiceClient()

  let query = supabase
    .from('orders')
    .select('id, customer_name, customer_email, status, total_amount, shipping_cost, created_at')
    .order('created_at', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }

  const { data: rawOrders, error } = await query

  if (error) {
    return <p style={{ color: 'red' }}>Erro ao carregar pedidos.</p>
  }

  type OrderRow = {
    id: string
    customer_name: string
    customer_email: string
    status: string
    total_amount: number
    shipping_cost: number
    created_at: string
  }

  const orders = (rawOrders ?? []) as OrderRow[]

  const filters = ['', 'pending', 'paid', 'shipped', 'cancelled']
  const filterLabels = ['Todos', 'Pendente', 'Pago', 'Enviado', 'Cancelado']

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: "'Dancing Script', cursive", fontSize: 34, marginBottom: 4 }}>
          Pedidos
        </div>
        <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--yez-gray)' }}>
          {orders.length} pedido{orders.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Filtros de status */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {filters.map((f, i) => {
          const isActive = (status ?? '') === f
          return (
            <Link
              key={f}
              href={f ? `/admin/pedidos?status=${f}` : '/admin/pedidos'}
              style={{
                padding: '7px 14px', fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase',
                textDecoration: 'none',
                background: isActive ? 'var(--yez-black)' : 'var(--yez-white)',
                color: isActive ? '#fff' : 'var(--yez-gray)',
                border: '1px solid var(--yez-lightgray)',
              }}
            >
              {filterLabels[i]}
            </Link>
          )
        })}
      </div>

      <div style={{ background: 'var(--yez-white)', border: '1px solid var(--yez-lightgray)' }}>
        {orders.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', fontSize: 12, color: 'var(--yez-gray)' }}>
            Nenhum pedido encontrado.
          </div>
        ) : (
          <>
            <div style={{
              display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 100px 40px',
              padding: '10px 16px', borderBottom: '1px solid var(--yez-lightgray)',
              fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--yez-gray)'
            }}>
              <span>Cliente</span>
              <span>Data</span>
              <span>Total</span>
              <span>Status</span>
              <span></span>
            </div>
            {orders.map((order) => (
              <Link
                key={order.id}
                href={`/admin/pedidos/${order.id}`}
                style={{
                  display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 100px 40px',
                  padding: '13px 16px', borderBottom: '1px solid var(--yez-lightgray)',
                  fontSize: 12, textDecoration: 'none', color: 'var(--yez-black)',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 2 }}>{order.customer_name}</div>
                  <div style={{ fontSize: 11, color: 'var(--yez-gray)' }}>{order.customer_email}</div>
                </div>
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
                <span style={{ fontSize: 16, color: 'var(--yez-gray)' }}>→</span>
              </Link>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
