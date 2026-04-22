import { createSupabaseServiceClient } from '@/app/lib/supabase-server'
import { notFound } from 'next/navigation'
import UpdateOrderStatus from './UpdateOrderStatus'
import Link from 'next/link'

type Props = { params: Promise<{ id: string }> }

const statusLabel: Record<string, string> = {
  pending: 'Pendente',
  paid: 'Pago',
  shipped: 'Enviado',
  cancelled: 'Cancelado',
}

const statusColor: Record<string, string> = {
  pending: '#F4A100',
  paid: '#2E7D32',
  shipped: '#1565C0',
  cancelled: '#CC0000',
}

export default async function PedidoDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = createSupabaseServiceClient()

  const { data: order, error } = await supabase
    .from('orders')
    .select(`
      *,
      order_items (
        id,
        quantity,
        unit_price,
        products ( title, image_url, artisans ( name ) )
      )
    `)
    .eq('id', id)
    .single()

  if (error || !order) {
    notFound()
  }

  const addr = order.shipping_address
  const totalPago = Number(order.total_amount) + Number(order.shipping_cost)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <Link href="/admin/pedidos" style={{
            fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase',
            color: 'var(--yez-gray)', textDecoration: 'none', display: 'block', marginBottom: 8
          }}>
            ← Pedidos
          </Link>
          <div style={{ fontFamily: "'Dancing Script', cursive", fontSize: 34, marginBottom: 4 }}>
            Pedido
          </div>
          <div style={{ fontSize: 10, letterSpacing: 1.5, color: 'var(--yez-gray)', wordBreak: 'break-all' }}>
            #{order.id}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{
            fontSize: 11, letterSpacing: 1, textTransform: 'uppercase',
            color: statusColor[order.status] ?? 'var(--yez-gray)', fontWeight: 700, marginBottom: 8
          }}>
            {statusLabel[order.status] ?? order.status}
          </div>
          <UpdateOrderStatus orderId={order.id} currentStatus={order.status} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        {/* Cliente */}
        <div style={{ background: 'var(--yez-white)', border: '1px solid var(--yez-lightgray)', padding: 20 }}>
          <div style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--yez-gray)', marginBottom: 12 }}>
            Cliente
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{order.customer_name}</div>
          <div style={{ fontSize: 12, color: 'var(--yez-gray)', marginBottom: 2 }}>{order.customer_email}</div>
          {order.customer_phone && (
            <div style={{ fontSize: 12, color: 'var(--yez-gray)' }}>{order.customer_phone}</div>
          )}
          <div style={{ fontSize: 10, color: 'var(--yez-gray)', marginTop: 8, letterSpacing: .5 }}>
            {new Date(order.created_at).toLocaleString('pt-BR')}
          </div>
        </div>

        {/* Endereço */}
        <div style={{ background: 'var(--yez-white)', border: '1px solid var(--yez-lightgray)', padding: 20 }}>
          <div style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--yez-gray)', marginBottom: 12 }}>
            Endereço de entrega
          </div>
          {addr ? (
            <div style={{ fontSize: 13, lineHeight: 1.8, color: 'var(--yez-black)' }}>
              {addr.street}, {addr.number} {addr.complement && `— ${addr.complement}`}<br />
              {addr.neighborhood && `${addr.neighborhood}, `}{addr.city} – {addr.state}<br />
              CEP: {addr.cep}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: 'var(--yez-gray)' }}>Não informado</div>
          )}
          {order.shipping_option && (
            <div style={{ marginTop: 10, fontSize: 11, color: 'var(--yez-gray)' }}>
              Envio: {order.shipping_option.company} {order.shipping_option.name} — {order.shipping_option.delivery_time} dias úteis
            </div>
          )}
        </div>
      </div>

      {/* Itens do pedido */}
      <div style={{ background: 'var(--yez-white)', border: '1px solid var(--yez-lightgray)', marginBottom: 20 }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--yez-lightgray)' }}>
          <div style={{ fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--yez-gray)' }}>
            Itens do pedido
          </div>
        </div>
        {order.order_items?.map((item: {
          id: string
          quantity: number
          unit_price: number
          products: { title: string; image_url: string | null; artisans: { name: string } | null } | null
        }) => (
          <div key={item.id} style={{
            display: 'flex', gap: 14, padding: '14px 20px',
            borderBottom: '1px solid var(--yez-lightgray)', alignItems: 'center'
          }}>
            <div style={{ width: 52, height: 52, background: 'var(--yez-cream)', flexShrink: 0, overflow: 'hidden' }}>
              {item.products?.image_url && (
                <img src={item.products.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              )}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>
                {item.products?.title ?? 'Produto removido'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--yez-gray)' }}>
                {item.products?.artisans?.name} · Qtd: {item.quantity}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>
                R$ {(item.unit_price * item.quantity).toFixed(2)}
              </div>
              <div style={{ fontSize: 10, color: 'var(--yez-gray)' }}>
                R$ {item.unit_price.toFixed(2)} un.
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Resumo financeiro */}
      <div style={{
        background: 'var(--yez-white)', border: '1px solid var(--yez-lightgray)',
        padding: 20, maxWidth: 320, marginLeft: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--yez-gray)', marginBottom: 6 }}>
          <span>Produtos</span>
          <span>R$ {Number(order.total_amount).toFixed(2)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--yez-gray)', marginBottom: 12 }}>
          <span>Frete</span>
          <span>R$ {Number(order.shipping_cost).toFixed(2)}</span>
        </div>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          fontSize: 16, fontWeight: 700, paddingTop: 12,
          borderTop: '1.5px solid var(--yez-black)'
        }}>
          <span>Total</span>
          <span>R$ {totalPago.toFixed(2)}</span>
        </div>
        {order.mp_payment_id && (
          <div style={{ marginTop: 10, fontSize: 10, color: 'var(--yez-gray)', letterSpacing: .5 }}>
            ID MP: {order.mp_payment_id}
          </div>
        )}
      </div>
    </div>
  )
}
