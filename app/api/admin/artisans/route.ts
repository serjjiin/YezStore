import { createSupabaseServiceClient } from '@/app/lib/supabase-server'

export async function POST(request: Request) {
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
  const { data, error } = await supabase
    .from('artisans')
    .insert({
      name: body.name.trim(),
      contact_email: (body.contact_email as string)?.trim() || null,
      phone: (body.phone as string)?.trim() || null,
      pix_key: (body.pix_key as string)?.trim() || null,
      split_percentage: percentage,
    })
    .select('id')
    .single()

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ id: data.id }, { status: 201 })
}
