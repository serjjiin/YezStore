export async function POST(request: Request) {
  const { cep, totalItems } = await request.json()

  const token = process.env.MELHOR_ENVIO_TOKEN
  const baseUrl = process.env.MELHOR_ENVIO_URL ?? 'https://sandbox.melhorenvio.com.br'
  const cepOrigem = process.env.MELHOR_ENVIO_CEP_ORIGEM ?? '70000000'

  if (!token) {
    return Response.json({ error: 'Token do Melhor Envio não configurado.' }, { status: 500 })
  }

  // Peso estimado: 300g por item, mínimo 100g
  const weight = Math.max(totalItems * 0.3, 0.1)

  const body = {
    from: { postal_code: cepOrigem },
    to: { postal_code: cep },
    package: {
      height: 10,
      width: 20,
      length: 15,
      weight,
    },
    options: {
      receipt: false,
      own_hand: false,
    },
  }

  const response = await fetch(`${baseUrl}/api/v2/me/shipment/calculate`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'User-Agent': 'Aplicação Yez Store (contato@yezstore.com.br)',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    return Response.json({ error: 'Erro ao consultar Melhor Envio.' }, { status: 502 })
  }

  const data = await response.json()
  return Response.json(data)
}
