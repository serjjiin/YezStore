import { MercadoPagoConfig, Preference } from 'mercadopago'
import { createSupabaseServiceClient } from '@/app/lib/supabase-server'

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'

export async function POST(request: Request) {
  const body = await request.json()
  const { customer, items, shipping, shippingAddress } = body

  if (!customer?.name || !customer?.email || !items?.length) {
    return Response.json({ error: 'Dados incompletos.' }, { status: 400 })
  }

  const supabase = createSupabaseServiceClient()

  // Cria o pedido no banco com status pending
  const totalAmount = items.reduce(
    (sum: number, i: { price: number; quantity: number }) => sum + i.price * i.quantity,
    0
  )
  const shippingCost = shipping ? parseFloat(shipping.price) : 0

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      customer_name: customer.name,
      customer_email: customer.email,
      customer_phone: customer.phone ?? null,
      status: 'pending',
      total_amount: totalAmount,
      shipping_cost: shippingCost,
      shipping_address: shippingAddress ?? null,
      shipping_option: shipping
        ? { name: shipping.name, company: shipping.company?.name ?? '', delivery_time: shipping.delivery_time }
        : null,
    })
    .select()
    .single()

  if (orderError || !order) {
    console.error('Erro ao criar pedido:', orderError)
    return Response.json({ error: 'Erro ao criar pedido.' }, { status: 500 })
  }

  // Cria os itens do pedido
  const orderItems = items.map((item: { id: string; price: number; quantity: number }) => ({
    order_id: order.id,
    product_id: item.id,
    quantity: item.quantity,
    unit_price: item.price,
  }))

  const { error: itemsError } = await supabase.from('order_items').insert(orderItems)
  if (itemsError) {
    console.error('Erro ao criar itens do pedido:', itemsError)
  }

  // Cria preferência no Mercado Pago
  if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) {
    return Response.json({
      error: 'Mercado Pago não configurado. Defina MERCADO_PAGO_ACCESS_TOKEN no .env.local.',
    }, { status: 503 })
  }

  const client = new MercadoPagoConfig({
    accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN,
  })
  const preference = new Preference(client)

  const mpItems = items.map((item: { title: string; price: number; quantity: number }) => ({
    title: item.title,
    quantity: item.quantity,
    unit_price: item.price,
    currency_id: 'BRL',
  }))

  if (shippingCost > 0) {
    mpItems.push({
      title: `Frete (${shipping?.name ?? 'Entrega'})`,
      quantity: 1,
      unit_price: shippingCost,
      currency_id: 'BRL',
    })
  }

  const preferenceBody = {
    items: mpItems,
    payer: {
      name: customer.name,
      email: customer.email,
    },
    back_urls: {
      success: `${baseUrl}/checkout/sucesso`,
      failure: `${baseUrl}/checkout/falha`,
      pending: `${baseUrl}/checkout/pendente`,
    },
    auto_return: 'approved' as const,
    notification_url: `${baseUrl}/api/webhooks/mercadopago`,
    external_reference: order.id,
    statement_descriptor: 'Yez Store',
  }

  const prefResponse = await preference.create({ body: preferenceBody })

  await supabase
    .from('orders')
    .update({ mp_preference_id: prefResponse.id })
    .eq('id', order.id)

  return Response.json({
    order_id: order.id,
    init_point: prefResponse.init_point,
    sandbox_init_point: prefResponse.sandbox_init_point,
  })
}
