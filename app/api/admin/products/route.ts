import { createSupabaseServiceClient } from '@/app/lib/supabase-server'
import { parseProductFormData } from './shared'

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

  let imageUrl: string | null = null
  const imageFile = formData.get('image') as File | null

  if (imageFile && imageFile.size > 0) {
    const ext = imageFile.name.split('.').pop()
    const path = `${crypto.randomUUID()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('produtos')
      .upload(path, imageFile, { upsert: true })

    if (uploadError) {
      return Response.json({ error: 'Erro ao fazer upload da imagem.' }, { status: 500 })
    }

    const { data: urlData } = supabase.storage.from('produtos').getPublicUrl(path)
    imageUrl = urlData.publicUrl
  }

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
