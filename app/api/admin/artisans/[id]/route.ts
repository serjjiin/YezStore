import { createSupabaseServiceClient } from '@/app/lib/supabase-server'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  let body: { name?: unknown; contact_email?: unknown; phone?: unknown; pix_key?: unknown; split_percentage?: unknown }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Body inválido.' }, { status: 400 })
  }

  if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
    return Response.json({ error: 'Nome da artesã é obrigatório.' }, { status: 400 })
  }

  const percentage = Number(body.split_percentage)
  if (isNaN(percentage) || percentage < 1 || percentage > 99) {
    return Response.json({ error: 'Split percentage deve ser um número entre 1 e 99.' }, { status: 400 })
  }

  const supabase = createSupabaseServiceClient()
  const { error } = await supabase
    .from('artisans')
    .update({
      name: body.name.trim(),
      contact_email: (body.contact_email as string)?.trim() || null,
      phone: (body.phone as string)?.trim() || null,
      pix_key: (body.pix_key as string)?.trim() || null,
      split_percentage: percentage,
    })
    .eq('id', id)

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ ok: true })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const supabase = createSupabaseServiceClient()
  const { error } = await supabase
    .from('artisans')
    .delete()
    .eq('id', id)

  if (error) {
    const msg = error.code === '23503'
      ? 'Não é possível remover artesã com produtos vinculados.'
      : error.message
    return Response.json({ error: msg }, { status: 500 })
  }

  return Response.json({ ok: true })
}
