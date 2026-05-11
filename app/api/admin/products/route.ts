import { createSupabaseServiceClient } from '@/app/lib/supabase-server'

export async function POST(request: Request) {
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return Response.json({ error: 'FormData inválido.' }, { status: 400 })
  }

  const title = (formData.get('title') as string)?.trim()
  const priceStr = (formData.get('price') as string)?.trim()
  const stockStr = (formData.get('stock_quantity') as string)?.trim()

  if (!title) return Response.json({ error: 'Título é obrigatório.' }, { status: 400 })
  if (!priceStr) return Response.json({ error: 'Preço é obrigatório.' }, { status: 400 })
  if (!stockStr) return Response.json({ error: 'Estoque é obrigatório.' }, { status: 400 })

  const price = parseFloat(priceStr)
  const stock_quantity = parseInt(stockStr, 10)

  if (isNaN(price) || price < 0) return Response.json({ error: 'Preço inválido.' }, { status: 400 })
  if (isNaN(stock_quantity) || stock_quantity < 0) return Response.json({ error: 'Estoque inválido.' }, { status: 400 })

  const supabase = createSupabaseServiceClient()

  // Upload de imagem se houver
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

  const isActiveStr = formData.get('is_active') as string | null
  const is_active = isActiveStr === 'true' || isActiveStr === null || isActiveStr === '' ? true : false

  const { data, error } = await supabase
    .from('products')
    .insert({
      title,
      description: (formData.get('description') as string)?.trim() || null,
      price,
      stock_quantity,
      category: (formData.get('category') as string)?.trim() || null,
      artisan_id: (formData.get('artisan_id') as string)?.trim() || null,
      image_url: imageUrl,
      is_active,
    })
    .select('id')
    .single()

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ id: data.id, image_url: imageUrl }, { status: 201 })
}
