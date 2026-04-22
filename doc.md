# Documentação do Projeto: Yez Store

## 1. Visão Geral e Proposta de Valor

- **O que é:** Uma loja online colaborativa focada em decoração, artesanato e bem-estar.

- **Missão:** Valorizar o feito à mão e conectar pequenos produtores/artesãos com clientes que buscam exclusividade e propósito.

- **Diferencial:** A loja não vende apenas estoque próprio, mas funciona como vitrine e ponto de venda para múltiplos artesãos, incentivando a economia local.

---

## 2. O Que Vendemos (Catálogo Inicial)

- Decoração para casa
- Peças artesanais e Semi-joias
- Laços infantis e Acessórios
- Peças em crochê e Sousplats
- Louças decorativas

---

## 3. Regras de Negócio

- **Gestão de Produtos:** A Yez Store faz a curadoria e o cadastro de todos os produtos via painel admin (`/admin`). Os artesãos não têm acesso direto à plataforma no MVP.

- **Comissionamento:** A divisão de lucros é configurada por artesão via o campo `split_percentage`. Ex: `80` significa que 80% do valor da venda vai para o artesão e 20% fica com a Yez Store.

- **Logística e Estoque (Modelo Centralizado):**
  - Todos os produtos dos artesãos parceiros ficam armazenados fisicamente na sede da Yez Store.
  - A Yez Store é a única responsável por embalar e despachar os pedidos.
  - **Vantagem técnica:** o cálculo de frete tem sempre um único CEP de origem, simplificando a integração com o Melhor Envio.

- **Repasse financeiro:** Feito manualmente via Pix ao final de cada período, usando a `pix_key` cadastrada na tabela `artisans`. O campo `split_percentage` é usado para gerar o relatório de repasses.

---

## 4. Arquitetura e Stack Tecnológica

| Camada | Tecnologia | Motivo |
|---|---|---|
| Frontend + Admin | Next.js 16 + React 19 + Tailwind CSS 4 | Performance, SEO, componentização |
| Estado do carrinho | Zustand | Leve, sem boilerplate |
| Backend / DB / Auth / Storage | Supabase (PostgreSQL) | BaaS completo, tier gratuito |
| Pagamentos | SDK do Mercado Pago | Checkout transparente, Pix nativo, amplo uso no Brasil |
| Frete | API do Melhor Envio | Cálculo multi-transportadora com desconto, geração de etiquetas |
| Hospedagem | Vercel | Deploy contínuo integrado ao repositório, tier gratuito |

> **Decisão registrada — Mercado Pago (não Stripe):** A escolha inicial foi Stripe Connect para automatizar o split. A decisão foi revertida para Mercado Pago porque: (1) melhor suporte a Pix, (2) base de usuários brasileiros já familiarizada, (3) SDK mais simples para o MVP. O split é feito manualmente via Pix por enquanto, sem necessidade do Stripe Connect.

---

## 5. Modelagem do Banco de Dados (Supabase / PostgreSQL)

4 tabelas principais. A lógica central é garantir que, ao final do período, seja possível gerar um relatório exato de quanto cada artesão vendeu.

### Tabela `artisans`

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | UUID (PK) | |
| `name` | Texto | Nome do artesão ou marca |
| `contact_email` | Texto | |
| `phone` | Texto | WhatsApp para contato rápido |
| `split_percentage` | Inteiro | Ex: `80` → 80% do valor vai para o artesão |
| `pix_key` | Texto | Chave Pix para repasse |
| `created_at` | Timestamp | |

### Tabela `products`

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | UUID (PK) | |
| `artisan_id` | UUID (FK → artisans) | Liga o produto ao artesão |
| `title` | Texto | Ex: "Sousplat de Crochê Mostarda" |
| `description` | Texto | |
| `price` | Decimal | Preço de venda ao cliente final |
| `stock_quantity` | Inteiro | Controlado manualmente pela Yez |
| `image_url` | Texto | Link da foto no Supabase Storage |
| `is_active` | Booleano | Oculta produtos sem apagar histórico |

### Tabela `orders`

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | UUID (PK) | |
| `customer_name` | Texto | |
| `customer_email` | Texto | |
| `status` | Texto | `pending` / `paid` / `shipped` |
| `mp_payment_id` | Texto | ID do pagamento no Mercado Pago |
| `total_amount` | Decimal | Valor total dos produtos |
| `shipping_cost` | Decimal | Frete calculado pelo Melhor Envio |
| `shipping_address` | JSON | Endereço de entrega do cliente |

### Tabela `order_items`

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | UUID (PK) | |
| `order_id` | UUID (FK → orders) | |
| `product_id` | UUID (FK → products) | |
| `quantity` | Inteiro | |
| `unit_price` | Decimal | Snapshot do preço no momento da compra |

### Como funciona na prática

1. Cliente fecha a compra → cria uma linha em `orders` com valor total e frete.
2. Para cada item do carrinho → cria uma linha em `order_items`.
3. Relatório de repasse: query que soma `order_items` por `artisan_id` (via `product_id`), multiplica por `split_percentage` → valor exato a transferir via Pix.

---

## 6. Escopo do MVP — Status de Implementação

### Storefront (visão do cliente)

- [x] **Vitrine:** Página inicial com listagem de produtos (`app/page.tsx`)
- [x] **Categorias/Filtros:** Componente de filtro por categoria (`app/components/CategoryFilter.tsx`)
- [x] **Página do produto:** Rota dinâmica com detalhes do produto (`app/produto/[id]/page.tsx`)
- [x] **Sacola/Carrinho:** Página da sacola + botão de adicionar ao carrinho (`app/sacola/page.tsx`, `app/components/AddToCartButton.tsx`)
- [x] **Estado do carrinho:** Zustand store (`app/lib/store.ts`)
- [x] **Cálculo de Frete:** API route + componente integrado ao carrinho (`app/api/frete/route.ts`, `app/components/FreteCalculator.tsx`)
- [x] **Checkout transparente:** Formulário de dados + criação de pedido + redirect para Mercado Pago (`app/checkout/page.tsx`, `app/api/checkout/route.ts`)
- [x] **Páginas de retorno:** Sucesso, pendente (Pix) e falha (`app/checkout/sucesso`, `pendente`, `falha`)
- [x] **Webhook Mercado Pago:** Atualiza status do pedido automaticamente (`app/api/webhooks/mercadopago/route.ts`)

### Painel Admin (visão do lojista)

- [x] **Autenticação:** Login via Supabase Auth + proteção de rotas via `proxy.ts`
- [x] **Dashboard:** Métricas gerais, alertas de estoque baixo e pedidos recentes (`app/admin/page.tsx`)
- [x] **Gestão de catálogo:** CRUD de produtos com upload de fotos para Supabase Storage (`app/admin/produtos/`)
- [x] **Gestão de pedidos:** Visualização com filtro por status + atualização manual de status (`app/admin/pedidos/`)
- [x] **Gestão de artesãs:** CRUD de parceiros com split % e chave Pix (`app/admin/artesaos/`)

---

## 7. Variáveis de Ambiente

Criar um arquivo `.env.local` na raiz com as seguintes variáveis:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=        # URL do projeto no Supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=   # Chave anon do Supabase

# Melhor Envio
MELHOR_ENVIO_TOKEN=              # Token de acesso (OAuth) do Melhor Envio
MELHOR_ENVIO_URL=                # Opcional. Default: https://sandbox.melhorenvio.com.br
                                 # Produção: https://melhorenvio.com.br
MELHOR_ENVIO_CEP_ORIGEM=         # Opcional. Default: 70000000 (Brasília)

# Mercado Pago (a configurar quando o checkout for implementado)
MERCADO_PAGO_ACCESS_TOKEN=       # Access token do Mercado Pago
```

> **Atenção:** nunca commitar o `.env.local`. O `.gitignore` já o exclui.

---

## 8. Como Rodar Localmente

```bash
# Instalar dependências
npm install

# Rodar em modo de desenvolvimento
npm run dev
```

Acesse `http://localhost:3000`.

---

## 9. Próximos Passos (pós-MVP)

- [ ] Criar conta admin no Supabase: Dashboard > Authentication > Users > Add user
- [ ] Criar bucket `produtos` no Supabase Storage (público) para upload de imagens
- [ ] Executar `supabase/migrations/001_initial_schema.sql` no SQL Editor do Supabase
- [ ] Preencher `SUPABASE_SERVICE_ROLE_KEY` no `.env.local`
- [ ] Preencher `MERCADO_PAGO_ACCESS_TOKEN` (usar `TEST-...` para sandbox)
- [ ] Preencher `MELHOR_ENVIO_TOKEN` e testar cálculo de frete
- [ ] Configurar webhook no painel do Mercado Pago apontando para `/api/webhooks/mercadopago`
- [ ] Trocar `MELHOR_ENVIO_URL` para produção antes do lançamento
- [ ] Configurar domínio na Vercel e atualizar `NEXT_PUBLIC_BASE_URL`
