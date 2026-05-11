import { createSupabaseServiceClient } from '@/app/lib/supabase-server'
import { parseProductFormData, uploadProductImage } from './shared'

export async function POST(request: Request) {
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

  const uploaded = await uploadProductImage(supabase, formData)
  if (!uploaded.ok) return uploaded.error
  const imageUrl = uploaded.imageUrl

  const { data, error } = await supabase
    .from('products')
    .insert({ title, description, price, stock_quantity, category, artisan_id, image_url: imageUrl, is_active })
    .select('id')
    .single()

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ id: data.id, image_url: imageUrl }, { status: 201 })
}
