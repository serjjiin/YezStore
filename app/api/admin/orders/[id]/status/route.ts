import { createSupabaseServiceClient } from '@/app/lib/supabase-server'

const STATUSES = ['pending', 'paid', 'shipped', 'cancelled'] as const

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  let body: { status?: unknown }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Body inválido.' }, { status: 400 })
  }

  if (!body.status || !STATUSES.includes(body.status as typeof STATUSES[number])) {
    return Response.json(
      { error: `Status inválido. Valores aceitos: ${STATUSES.join(', ')}.` },
      { status: 400 }
    )
  }

  const supabase = createSupabaseServiceClient()
  const { error } = await supabase
    .from('orders')
    .update({ status: body.status })
    .eq('id', id)

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ ok: true })
}
