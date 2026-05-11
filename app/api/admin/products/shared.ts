export interface ProductFields {
  title: string
  description: string | null
  price: number
  stock_quantity: number
  category: string | null
  artisan_id: string | null
  is_active: boolean
}

type ParseResult =
  | { ok: true; data: ProductFields }
  | { ok: false; error: Response }

export function parseProductFormData(formData: FormData): ParseResult {
  const title = (formData.get('title') as string)?.trim()
  const priceStr = (formData.get('price') as string)?.trim()
  const stockStr = (formData.get('stock_quantity') as string)?.trim()

  if (!title) return { ok: false, error: Response.json({ error: 'Título é obrigatório.' }, { status: 400 }) }
  if (!priceStr) return { ok: false, error: Response.json({ error: 'Preço é obrigatório.' }, { status: 400 }) }
  if (!stockStr) return { ok: false, error: Response.json({ error: 'Estoque é obrigatório.' }, { status: 400 }) }

  const price = parseFloat(priceStr)
  const stock_quantity = parseInt(stockStr, 10)

  if (isNaN(price) || price < 0) return { ok: false, error: Response.json({ error: 'Preço inválido.' }, { status: 400 }) }
  if (isNaN(stock_quantity) || stock_quantity < 0) return { ok: false, error: Response.json({ error: 'Estoque inválido.' }, { status: 400 }) }

  const is_active = formData.get('is_active') !== 'false'

  return {
    ok: true,
    data: {
      title,
      description: (formData.get('description') as string)?.trim() || null,
      price,
      stock_quantity,
      category: (formData.get('category') as string)?.trim() || null,
      artisan_id: (formData.get('artisan_id') as string)?.trim() || null,
      is_active,
    },
  }
}
