import { createSupabaseServiceClient } from '@/app/lib/supabase-server'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  let body: { is_active?: unknown }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Body inválido.' }, { status: 400 })
  }

  if (typeof body.is_active !== 'boolean') {
    return Response.json({ error: 'Campo is_active (boolean) é obrigatório.' }, { status: 400 })
  }

  const supabase = createSupabaseServiceClient()
  const { error } = await supabase
    .from('products')
    .update({ is_active: body.is_active })
    .eq('id', id)

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ ok: true })
}
