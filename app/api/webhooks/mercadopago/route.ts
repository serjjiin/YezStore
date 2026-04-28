import { createHmac, timingSafeEqual } from 'crypto'
import { createSupabaseServiceClient } from '@/app/lib/supabase-server'

// Verifica a assinatura HMAC-SHA256 enviada pelo Mercado Pago no header x-signature.
// Formato: ts=TIMESTAMP,v1=HASH — conteúdo assinado: id:{data_id};request-id:{x-request-id};ts:{ts};
function verifyMpSignature(
  xSignature: string | null,
  xRequestId: string | null,
  dataId: string,
  secret: string
): boolean {
  if (!xSignature) return false

  const parts: Record<string, string> = {}
  for (const part of xSignature.split(',')) {
    const [key, value] = part.split('=')
    if (key && value) parts[key.trim()] = value.trim()
  }

  const ts = parts['ts']
  const v1 = parts['v1']
  if (!ts || !v1) return false

  const manifest = `id:${dataId};request-id:${xRequestId ?? ''};ts:${ts};`
  const computedBuf = Buffer.from(createHmac('sha256', secret).update(manifest).digest('hex'))
  const v1Buf = Buffer.from(v1)

  // timingSafeEqual previne timing attacks; requer buffers de mesmo tamanho
  return computedBuf.byteLength === v1Buf.byteLength && timingSafeEqual(computedBuf, v1Buf)
}

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

  if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) {
    return Response.json({ ok: true })
  }

  // Verifica assinatura quando MERCADO_PAGO_WEBHOOK_SECRET estiver configurado
  const webhookSecret = process.env.MERCADO_PAGO_WEBHOOK_SECRET
  if (webhookSecret) {
    const xSignature = request.headers.get('x-signature')
    const xRequestId = request.headers.get('x-request-id')

    if (!verifyMpSignature(xSignature, xRequestId, String(data.id), webhookSecret)) {
      return Response.json({ error: 'Assinatura inválida.' }, { status: 401 })
    }
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
