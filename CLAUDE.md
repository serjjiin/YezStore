# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Início de sessão

Ao iniciar uma nova conversa, leia `PROJETO.md` para entender o estado atual do projeto — o que foi implementado, o que está pendente e as decisões tomadas. Mantenha `PROJETO.md` atualizado ao final de cada conjunto de mudanças significativas.

## Comandos

```bash
npm run dev      # servidor de desenvolvimento em localhost:3000
npm run build    # build de produção
npm run lint     # ESLint
```

Não há suite de testes configurada no MVP.

## Arquitetura

**Yez Store** é uma loja colaborativa de artesanato. Múltiplos artesãos cadastrados pelo admin vendem via vitrine única. O split financeiro é calculado pela plataforma mas executado manualmente via Pix.

### Stack

| Camada | Tecnologia |
|---|---|
| Frontend + Admin | Next.js 16 + React 19 + Tailwind CSS 4 |
| Estado do carrinho | Zustand (`app/lib/store.ts`) |
| Backend / DB / Auth | Supabase (PostgreSQL + RLS) |
| Pagamentos | Mercado Pago SDK |
| Frete | API Melhor Envio |

### Clientes Supabase

Há três helpers em `app/lib/supabase-server.ts` e `app/lib/supabase-browser.ts`:

- `createSupabaseBrowserClient()` — Client Components (usa localStorage)
- `createSupabaseServerClient()` — Server Components e Route Handlers (usa cookies)
- `createSupabaseServiceClient()` — **bypass de RLS**; usar apenas em Route Handlers server-side para operações admin (ex: criar pedidos, atualizar status via webhook)

### Proteção de rotas admin

`proxy.ts` funciona como middleware Next.js — intercepta `/admin/*`, verifica sessão Supabase e redireciona para `/admin/login` se não autenticado. O matcher está definido no próprio `proxy.ts` (não em `middleware.ts`).

### Fluxo de pedido

1. Cliente adiciona itens → estado Zustand (`useCartStore`)
2. `FreteCalculator` chama `POST /api/frete` → Melhor Envio API
3. `POST /api/checkout` cria `orders` + `order_items` no Supabase e retorna `init_point` do Mercado Pago
4. Cliente é redirecionado para o Mercado Pago; ao retornar cai em `/checkout/sucesso|pendente|falha`
5. `POST /api/webhooks/mercadopago` atualiza `orders.status` e `mp_payment_id` via service role

### Banco de dados (Supabase/PostgreSQL)

4 tabelas: `artisans` → `products` → `orders` → `order_items`.

- `products.is_active` oculta produtos sem apagar histórico de pedidos
- `artisans.split_percentage` (ex: `80` = 80% ao artesão) alimenta o relatório de repasse
- `orders.status`: `pending` | `paid` | `shipped` | `cancelled`
- `unit_price` em `order_items` é snapshot do preço no momento da compra
- Schema completo em `supabase/migrations/001_initial_schema.sql`

### Variáveis de ambiente

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=       # nunca expor ao cliente
MERCADO_PAGO_ACCESS_TOKEN=       # usar TEST-... para sandbox
MELHOR_ENVIO_TOKEN=
MELHOR_ENVIO_URL=                # default: sandbox.melhorenvio.com.br
MELHOR_ENVIO_CEP_ORIGEM=         # default: 70000000 (Brasília)
NEXT_PUBLIC_BASE_URL=            # base para back_urls do MP e webhook
```
