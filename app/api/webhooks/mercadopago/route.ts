import { createSupabaseServiceClient } from '@/app/lib/supabase-server'

// O Mercado Pago envia notificações IPN/webhook neste endpoint.
// Atualiza o status do pedido quando o pagamento é confirmado.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null)

  if (!body) {
    return Response.json({ ok: true }) // Retorna 200 para evitar reenvios desnecessários
  }

  const { type, data } = body

  if (type !== 'payment' || !data?.id) {
    return Response.json({ ok: true })
  }

  // Consulta o pagamento no Mercado Pago para obter status e referência
  if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) {
    return Response.json({ ok: true })
  }

  const paymentResponse = await fetch(
    `https://api.mercadopago.com/v1/payments/${data.id}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`,
      },
    }
  )

  if (!paymentResponse.ok) {
    console.error('Erro ao consultar pagamento MP:', data.id)
    return Response.json({ ok: true })
  }

  const payment = await paymentResponse.json()
  const { status, external_reference, id: paymentId } = payment

  if (!external_reference) {
    return Response.json({ ok: true })
  }

  const supabase = createSupabaseServiceClient()

  let orderStatus: string | null = null
  if (status === 'approved') orderStatus = 'paid'
  else if (status === 'pending' || status === 'in_process') orderStatus = 'pending'
  else if (status === 'rejected' || status === 'cancelled') orderStatus = 'cancelled'

  if (orderStatus) {
    await supabase
      .from('orders')
      .update({
        status: orderStatus,
        mp_payment_id: String(paymentId),
      })
      .eq('id', external_reference)
  }

  return Response.json({ ok: true })
}
