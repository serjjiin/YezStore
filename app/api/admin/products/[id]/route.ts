import { createSupabaseServiceClient } from '@/app/lib/supabase-server'
import { parseProductFormData, uploadProductImage } from '../shared'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return Response.json({ error: 'FormData inválido.' }, { status: 400 })
  }

  const parsed = parseProductFormData(formData)
  if (!parsed.ok) return parsed.error
  const { title, description, price, stock_quantity, category, artisan_id, is_active } = parsed.data

  const supabase = createSupabaseServiceClient()

  const { data: current, error: fetchError } = await supabase
    .from('products')
    .select('image_url')
    .eq('id', id)
    .single()

  if (fetchError) {
    return Response.json({ error: 'Produto não encontrado.' }, { status: 404 })
  }

  const uploaded = await uploadProductImage(supabase, formData)
  if (!uploaded.ok) return uploaded.error

  const imageUrl = uploaded.imageUrl ?? current.image_url

  const { error } = await supabase
    .from('products')
    .update({ title, description, price, stock_quantity, category, artisan_id, image_url: imageUrl, is_active })
    .eq('id', id)

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ id, image_url: imageUrl })
}
