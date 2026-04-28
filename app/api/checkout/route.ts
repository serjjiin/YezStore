import { MercadoPagoConfig, Preference } from 'mercadopago'
import { createSupabaseServiceClient } from '@/app/lib/supabase-server'

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'

type RequestItem = { id: string; quantity: number }
type DbProduct = { id: string; title: string; price: number; is_active: boolean; stock_quantity: number | null }

export async function POST(request: Request) {
  const body = await request.json()
  const { customer, items, shipping, shippingAddress } = body

  if (!customer?.name || !customer?.email || !items?.length) {
    return Response.json({ error: 'Dados incompletos.' }, { status: 400 })
  }

  const supabase = createSupabaseServiceClient()

  // Busca preços reais do banco — nunca confiar no preço enviado pelo cliente
  const productIds = (items as RequestItem[]).map((i) => i.id)
  const { data: dbProducts, error: productsError } = await supabase
    .from('products')
    .select('id, price, title, is_active, stock_quantity')
    .in('id', productIds)

  if (productsError || !dbProducts?.length) {
    return Response.json({ error: 'Produtos não encontrados.' }, { status: 400 })
  }

  const productMap = Object.fromEntries(
    (dbProducts as DbProduct[]).map((p) => [p.id, p])
  )

  for (const item of items as RequestItem[]) {
    const product = productMap[item.id]
    if (!product?.is_active) {
      return Response.json({ error: 'Produto indisponível.' }, { status: 400 })
    }
    const available = product.stock_quantity ?? 0
    if (available < item.quantity) {
      return Response.json({ error: 'Estoque insuficiente.' }, { status: 409 })
    }
  }

  const shippingCost = shipping ? parseFloat(shipping.price) : 0
  const totalAmount =
    (items as RequestItem[]).reduce(
      (sum, i) => sum + productMap[i.id].price * i.quantity,
      0
    ) + shippingCost

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

  const orderItems = (items as RequestItem[]).map((item) => ({
    order_id: order.id,
    product_id: item.id,
    quantity: item.quantity,
    unit_price: productMap[item.id].price,
  }))

  const { error: itemsError } = await supabase.from('order_items').insert(orderItems)
  if (itemsError) {
    console.error('Erro ao criar itens do pedido:', itemsError)
  }

  // Decrementa estoque atomicamente — WHERE stock_quantity >= qty impede corrida entre requisições
  for (const item of items as RequestItem[]) {
    const currentStock = productMap[item.id].stock_quantity ?? 0
    const newStock = currentStock - item.quantity
    const { data: updated } = await supabase
      .from('products')
      .update({ stock_quantity: newStock })
      .eq('id', item.id)
      .gte('stock_quantity', item.quantity)
      .select('id')

    if (!updated?.length) {
      return Response.json({ error: 'Estoque insuficiente. Tente novamente.' }, { status: 409 })
    }
  }

  if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) {
    return Response.json({
      error: 'Mercado Pago não configurado. Defina MERCADO_PAGO_ACCESS_TOKEN no .env.local.',
    }, { status: 503 })
  }

  const client = new MercadoPagoConfig({
    accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN,
  })
  const preference = new Preference(client)

  const mpItems = (items as RequestItem[]).map((item) => ({
    title: productMap[item.id].title,
    quantity: item.quantity,
    unit_price: productMap[item.id].price,
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
