import { MercadoPagoConfig, Payment } from 'mercadopago'
import { createSupabaseServiceClient } from '@/app/lib/supabase-server'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const { payment_id, order_id } = body ?? {}

  if (!payment_id || !order_id) {
    return Response.json({ error: 'payment_id e order_id são obrigatórios.' }, { status: 400 })
  }

  if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) {
    return Response.json({ error: 'Token do Mercado Pago não configurado.' }, { status: 503 })
  }

  const client = new MercadoPagoConfig({
    accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN,
  })
  const paymentApi = new Payment(client)

  let payment
  try {
    payment = await paymentApi.get({ id: String(payment_id) })
  } catch (err) {
    console.error('Erro ao consultar pagamento MP:', err)
    return Response.json({ error: 'Erro ao consultar status do pagamento.' }, { status: 502 })
  }

  const { status: mpStatus, external_reference } = payment

  // Verifica se o pagamento pertence a este pedido
  if (external_reference !== order_id) {
    return Response.json({ error: 'Pagamento não pertence a este pedido.' }, { status: 403 })
  }

  let orderStatus: string | null = null
  if (mpStatus === 'approved') orderStatus = 'paid'
  else if (mpStatus === 'pending' || mpStatus === 'in_process') orderStatus = 'pending'
  else if (mpStatus === 'rejected' || mpStatus === 'cancelled') orderStatus = 'cancelled'

  const supabase = createSupabaseServiceClient()

  if (orderStatus) {
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: orderStatus,
        mp_payment_id: String(payment_id),
      })
      .eq('id', order_id)

    if (updateError) {
      console.error('Erro ao atualizar status do pedido:', updateError)
      return Response.json({ error: 'Erro ao atualizar pedido.' }, { status: 500 })
    }
  }

  // Restaura estoque se pagamento foi cancelado ou rejeitado
  if (orderStatus === 'cancelled') {
    const { data: orderItems } = await supabase
      .from('order_items')
      .select('product_id, quantity')
      .eq('order_id', order_id)

    if (orderItems?.length) {
      for (const item of orderItems) {
        const { error } = await supabase.rpc('increment_stock', {
          p_product_id: item.product_id,
          p_qty: item.quantity,
        })
        if (error) {
          console.error('Falha ao restaurar estoque', {
            orderId: order_id,
            productId: item.product_id,
            qty: item.quantity,
            error: error.message,
          })
        }
      }
    }
  }

  return Response.json({
    status: orderStatus,
    mp_status: mpStatus,
    payment_id: String(payment_id),
  })
}
