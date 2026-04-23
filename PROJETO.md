# Yez Store — Documentação Completa do Projeto

> Documento vivo. Atualizar sempre que decisões arquiteturais ou de produto mudarem.

---

## Índice

1. [Visão do Produto](#1-visão-do-produto)
2. [Stakeholders](#2-stakeholders)
3. [Requisitos Funcionais](#3-requisitos-funcionais)
4. [Requisitos Não-Funcionais](#4-requisitos-não-funcionais)
5. [Arquitetura Técnica](#5-arquitetura-técnica)
6. [Banco de Dados](#6-banco-de-dados)
7. [API — Referência de Endpoints](#7-api--referência-de-endpoints)
8. [Fluxos Principais](#8-fluxos-principais)
9. [Segurança](#9-segurança)
10. [Integrações Externas](#10-integrações-externas)
11. [Frontend — Estrutura de Páginas](#11-frontend--estrutura-de-páginas)
12. [Estado Atual do MVP](#12-estado-atual-do-mvp)
13. [Roadmap e Backlog](#13-roadmap-e-backlog)
14. [Dívida Técnica](#14-dívida-técnica)
15. [Deploy e Infraestrutura](#15-deploy-e-infraestrutura)
16. [Guia de Desenvolvimento](#16-guia-de-desenvolvimento)

---

## 1. Visão do Produto

### O que é

**Yez Store** é uma loja virtual colaborativa de decoração, artesanato e bem-estar. Funciona como vitrine e ponto de venda para múltiplos artesãos parceiros, com toda a operação centralizada na sede da Yez Store.

### Proposta de valor

| Para quem | Valor entregue |
|---|---|
| **Clientes** | Descobrir produtos artesanais únicos em um só lugar, com checkout simples e frete calculado |
| **Artesãos** | Vender sem precisar gerenciar loja, site, logística ou cobrança |
| **Yez Store** | Curar produtos, operar a logística e receber comissão por venda |

### Modelo de negócio

- A Yez Store cadastra os artesãos e seus produtos
- Estoque físico centralizado na sede da Yez
- A Yez embala e despacha todos os pedidos
- O lucro é dividido por artesão via campo `split_percentage`
  - Exemplo: `split_percentage = 80` → artesão recebe 80%, Yez retém 20%
- Repasse feito manualmente via Pix após confirmação do pagamento

### Escopo do MVP

O MVP cobre o ciclo completo de uma venda:

```
Cliente navega → adiciona à sacola → calcula frete → faz checkout
→ paga via Mercado Pago → Yez recebe notificação → Yez despacha
→ Admin atualiza status → Cliente recebe produto
```

---

## 2. Stakeholders

| Papel | Descrição | Acesso ao sistema |
|---|---|---|
| **Cliente** | Comprador final | Loja pública (`/`) |
| **Admin Yez** | Gerencia tudo | Painel admin (`/admin`) |
| **Artesão** | Parceiro fornecedor | Nenhum no MVP (futuro: portal próprio) |

---

## 3. Requisitos Funcionais

### RF-01 — Vitrine (Loja Pública)

| ID | Requisito | Status |
|---|---|---|
| RF-01.1 | Exibir catálogo de produtos ativos com foto, nome e preço | ✅ Implementado |
| RF-01.2 | Filtrar produtos por categoria | ✅ Implementado |
| RF-01.3 | Ver detalhe do produto (descrição, artesão, estoque) | ✅ Implementado |
| RF-01.4 | Adicionar produto à sacola | ✅ Implementado |
| RF-01.5 | Ver e editar itens da sacola | ✅ Implementado |
| RF-01.6 | Calcular frete por CEP | ✅ Implementado |
| RF-01.7 | Selecionar opção de frete | ✅ Implementado |

### RF-02 — Checkout

| ID | Requisito | Status |
|---|---|---|
| RF-02.1 | Preencher dados pessoais (nome, email, telefone) | ✅ Implementado |
| RF-02.2 | Preencher endereço de entrega | ✅ Implementado |
| RF-02.3 | Redirecionar para pagamento no Mercado Pago | ✅ Implementado |
| RF-02.4 | Exibir página de sucesso/falha/pendente após pagamento | ✅ Implementado |
| RF-02.5 | Limpar carrinho após compra confirmada | ✅ Implementado |
| RF-02.6 | Validar estoque antes de finalizar pedido | ❌ Não implementado |
| RF-02.7 | Enviar email de confirmação ao cliente | ❌ Não implementado |

### RF-03 — Webhooks e Status

| ID | Requisito | Status |
|---|---|---|
| RF-03.1 | Receber notificação de pagamento do Mercado Pago | ✅ Implementado |
| RF-03.2 | Atualizar status do pedido automaticamente | ✅ Implementado |
| RF-03.3 | Verificar assinatura do webhook (segurança) | ❌ Não implementado |

### RF-04 — Painel Admin

| ID | Requisito | Status |
|---|---|---|
| RF-04.1 | Login com email e senha | ✅ Implementado |
| RF-04.2 | Dashboard com métricas (pedidos, faturamento, estoque baixo) | ✅ Implementado |
| RF-04.3 | Criar, editar e desativar produtos | ✅ Implementado |
| RF-04.4 | Upload de foto do produto | ✅ Implementado |
| RF-04.5 | Criar, editar e remover artesãos | ✅ Implementado |
| RF-04.6 | Listar pedidos com filtro por status | ✅ Implementado |
| RF-04.7 | Ver detalhe do pedido (cliente, itens, endereço, valores) | ✅ Implementado |
| RF-04.8 | Atualizar status do pedido manualmente | ✅ Implementado |
| RF-04.9 | Relatório de repasse financeiro por artesão | ❌ Não implementado |
| RF-04.10 | Baixa automática de estoque ao confirmar pagamento | ❌ Não implementado |

---

## 4. Requisitos Não-Funcionais

### RNF-01 — Segurança

| ID | Requisito | Status |
|---|---|---|
| RNF-01.1 | Rotas admin protegidas por autenticação | ✅ |
| RNF-01.2 | Credenciais nunca expostas ao cliente (`service_role`) | ✅ |
| RNF-01.3 | RLS ativo no Supabase para dados públicos | ✅ (parcial) |
| RNF-01.4 | Verificação de assinatura do webhook MP | ❌ |
| RNF-01.5 | Rate limiting nas rotas de API públicas | ❌ |
| RNF-01.6 | Sanitização de inputs antes de gravar no banco | ⚠️ (feito pelo Supabase SDK, não explícito) |

### RNF-02 — Performance

| ID | Requisito | Observação |
|---|---|---|
| RNF-02.1 | Home carrega em < 2s na conexão 4G | Server Component — eficiente |
| RNF-02.2 | Imagens otimizadas | Usar `next/image` (não usado atualmente) |
| RNF-02.3 | Cache de dados de produtos | Não configurado |

### RNF-03 — Disponibilidade

| ID | Requisito | Observação |
|---|---|---|
| RNF-03.1 | Uptime ≥ 99% | Garantido pela Vercel + Supabase |
| RNF-03.2 | Webhook MP deve responder em < 5s | Crítico — MP reenvio se timeout |

### RNF-04 — Manutenibilidade

| ID | Requisito | Status |
|---|---|---|
| RNF-04.1 | TypeScript strict em todo o projeto | ✅ |
| RNF-04.2 | Variáveis de ambiente documentadas | ✅ (`.env.example`) |
| RNF-04.3 | Schema do banco versionado | ✅ (`supabase/migrations/`) |

---

## 5. Arquitetura Técnica

### Stack

| Camada | Tecnologia | Versão | Por que foi escolhido |
|---|---|---|---|
| Framework | Next.js | 16 | Full-stack, SSR nativo, file-based routing |
| UI | React | 19 | Base do Next.js |
| Estilo | CSS Variables + inline styles | — | Controle fino, sem overhead de framework |
| Estado global | Zustand | 5 | Simples, sem boilerplate, perfeito para carrinho |
| Banco de dados | Supabase (PostgreSQL) | — | Auth + DB + Storage em um serviço, BaaS ideal para MVPs |
| Pagamentos | Mercado Pago SDK | 2.12 | Líder no Brasil, suporte a Pix + cartão |
| Frete | Melhor Envio API | REST | Melhor cobertura no Brasil, fácil integração |
| Hospedagem | Vercel | — | Zero config com Next.js, deploy automático |

### Diagrama de camadas

```
┌─────────────────────────────────────────────┐
│                   CLIENTE                    │
│          Browser (React / Zustand)           │
└─────────────────┬───────────────────────────┘
                  │ HTTP
┌─────────────────▼───────────────────────────┐
│               NEXT.JS (Vercel)               │
│  ┌──────────────┐  ┌───────────────────────┐ │
│  │ Server       │  │ API Routes            │ │
│  │ Components   │  │ /api/checkout         │ │
│  │ (SSR)        │  │ /api/frete            │ │
│  │              │  │ /api/webhooks/mp      │ │
│  └──────┬───────┘  └──────────┬────────────┘ │
└─────────┼────────────────────┼──────────────┘
          │                    │
   ┌──────▼──────┐    ┌────────▼──────────────┐
   │  SUPABASE   │    │   SERVIÇOS EXTERNOS    │
   │ PostgreSQL  │    │ ┌──────────────────┐   │
   │ Auth        │    │ │  Mercado Pago    │   │
   │ Storage     │    │ └──────────────────┘   │
   └─────────────┘    │ ┌──────────────────┐   │
                      │ │  Melhor Envio    │   │
                      │ └──────────────────┘   │
                      └────────────────────────┘
```

### Decisões arquiteturais importantes

**1. Server Components por padrão**
Todas as páginas são Server Components (RSC) exceto quando precisam de interatividade. Isso melhora performance e segurança — dados sensíveis nunca chegam ao cliente.

**2. Três clientes Supabase distintos**
- `BrowserClient` → Client Components (RLS ativo)
- `ServerClient` → Server Components (RLS ativo, cookie-based)
- `ServiceClient` → Route Handlers admin (bypassa RLS) — usado apenas onde necessário

**3. Snapshot de preço em `order_items`**
O campo `unit_price` em `order_items` armazena o preço no momento da compra. Isso garante que mudanças futuras de preço não afetam pedidos antigos — fundamental para relatórios e disputas.

**4. Soft delete em produtos**
Produtos são desativados (`is_active = false`) ao invés de deletados. Preserva histórico de pedidos e integridade referencial.

---

## 6. Banco de Dados

### Diagrama de relacionamentos

```
artisans
  id (PK)
  name
  contact_email
  phone
  split_percentage   ← % que vai para o artesão
  pix_key
  created_at
       │
       │ 1:N
       ▼
products
  id (PK)
  artisan_id (FK) ──── artisans.id
  title
  description
  price
  stock_quantity
  category
  image_url
  is_active
  created_at
       │
       │ 1:N (via order_items)
       ▼
order_items
  id (PK)
  order_id (FK) ──── orders.id
  product_id (FK) ── products.id
  quantity
  unit_price         ← snapshot no momento da compra
  created_at

orders
  id (PK)
  customer_name
  customer_email
  customer_phone
  status             ← pending | paid | shipped | cancelled
  total_amount
  shipping_cost
  shipping_address   ← JSONB
  shipping_option    ← JSONB
  mp_payment_id
  mp_preference_id
  created_at
```

### Row-Level Security (RLS)

| Tabela | Operação | Política | Motivo |
|---|---|---|---|
| `products` | SELECT | `is_active = true` | Clientes não veem produtos desativados |
| `artisans` | SELECT | Público | Nome do artesão aparece nos produtos |
| `orders` | Todas | Via service role | Admin only; nunca exposto ao cliente |
| `order_items` | Todas | Via service role | Admin only |

### Storage

| Bucket | Visibilidade | Uso |
|---|---|---|
| `produtos` | Público | Imagens dos produtos (upload pelo admin) |

---

## 7. API — Referência de Endpoints

### POST /api/checkout

Cria o pedido no banco e inicia o pagamento no Mercado Pago.

**Request**
```json
{
  "customer": {
    "name": "string (obrigatório)",
    "email": "string (obrigatório)",
    "phone": "string (opcional)"
  },
  "items": [
    {
      "id": "uuid",
      "title": "string",
      "price": 0.00,
      "quantity": 1
    }
  ],
  "shipping": {
    "id": 1,
    "name": "PAC",
    "price": "15.50",
    "delivery_time": 5,
    "company": { "name": "Correios" }
  },
  "shippingAddress": {
    "cep": "01310100",
    "street": "Av. Paulista",
    "number": "1000",
    "complement": "Apto 42",
    "neighborhood": "Bela Vista",
    "city": "São Paulo",
    "state": "SP"
  }
}
```

**Response 200**
```json
{
  "order_id": "uuid",
  "init_point": "https://www.mercadopago.com.br/...",
  "sandbox_init_point": "https://sandbox.mercadopago.com.br/..."
}
```

**Response 400** — Dados obrigatórios ausentes
**Response 500** — Erro ao criar pedido ou preferência MP

---

### POST /api/frete

Calcula opções de frete via Melhor Envio.

**Request**
```json
{
  "cep": "01310100",
  "totalItems": 3
}
```

**Response 200**
```json
[
  {
    "id": 1,
    "name": "PAC",
    "price": "15.50",
    "delivery_time": 5,
    "company": { "name": "Correios" }
  },
  {
    "id": 2,
    "name": "SEDEX",
    "price": "32.00",
    "delivery_time": 2,
    "company": { "name": "Correios" }
  }
]
```

---

### POST /api/webhooks/mercadopago

Recebe notificações de pagamento do Mercado Pago. Sempre retorna 200 para evitar reenvios.

**Request (enviado pelo MP)**
```json
{
  "type": "payment",
  "data": { "id": 12345678 }
}
```

**Lógica de mapeamento de status**

| Status MP | Status Yez |
|---|---|
| `approved` | `paid` |
| `pending`, `in_process` | `pending` |
| `rejected`, `cancelled` | `cancelled` |

---

## 8. Fluxos Principais

### Fluxo de compra (cliente)

```
1. Cliente acessa / (home)
2. Filtra por categoria (opcional)
3. Clica no produto → /produto/[id]
4. Clica "Adicionar à sacola"
   → Zustand: addItem()
5. Acessa /sacola
6. Insere CEP → POST /api/frete
7. Seleciona opção de frete → Zustand: setShipping()
8. Clica "Finalizar compra" → /checkout
9. Preenche nome, email, telefone, endereço completo
10. Clica "Pagar" → POST /api/checkout
    → Cria order + order_items no Supabase
    → Cria preferência no Mercado Pago
    → Retorna init_point
11. Redirecionado para Mercado Pago
12. Efetua pagamento
13. MP redireciona para:
    - /checkout/sucesso → limpa carrinho
    - /checkout/pendente → aguarda Pix (limpa carrinho)
    - /checkout/falha → mantém carrinho, tenta novamente
```

### Fluxo de notificação de pagamento (webhook)

```
1. Mercado Pago envia POST /api/webhooks/mercadopago
2. Extrai payment_id de data.id
3. Consulta GET https://api.mercadopago.com/v1/payments/{id}
4. Lê external_reference (= order_id no Supabase)
5. Mapeia status MP → status Yez
6. Atualiza orders.status e orders.mp_payment_id
7. Retorna 200
```

### Fluxo admin — gerenciar pedido

```
1. Admin acessa /admin (requer autenticação)
2. Vê pedidos recentes no dashboard
3. Acessa /admin/pedidos
4. Filtra por status (pendente, pago, enviado, cancelado)
5. Clica no pedido → /admin/pedidos/[id]
6. Vê todos os dados: cliente, itens, endereço, valores
7. Despacha o produto fisicamente
8. Seleciona "Enviado" no dropdown → clica "Atualizar"
9. Status atualizado no banco
```

---

## 9. Segurança

### O que está protegido

| Proteção | Como | Onde |
|---|---|---|
| Rotas admin | Middleware (`proxy.ts`) verifica sessão Supabase | Todas as rotas `/admin/*` |
| Dados sensíveis no banco | RLS + service role apenas em route handlers server-side | Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Nunca enviado ao cliente | Apenas em `app/api/` |
| `MERCADO_PAGO_ACCESS_TOKEN` | Nunca enviado ao cliente | Apenas em `app/api/` |

### Vulnerabilidades conhecidas (a corrigir)

#### 1. Webhook sem autenticação (ALTO RISCO)
Qualquer pessoa pode fazer um POST para `/api/webhooks/mercadopago` com um payment_id falso e potencialmente marcar um pedido como pago.

**Correção:** Verificar o header `x-signature` que o MP envia.

```typescript
// Implementar em /api/webhooks/mercadopago/route.ts
const signature = request.headers.get('x-signature')
const requestId = request.headers.get('x-request-id')
// Validar usando HMAC-SHA256 com MP_WEBHOOK_SECRET
```

#### 2. Sem rate limiting nas APIs públicas (MÉDIO RISCO)
`/api/frete` e `/api/checkout` podem ser chamados em volume por bots, gerando custos desnecessários com Melhor Envio e Mercado Pago.

**Correção:** Implementar rate limiting via Vercel Edge Middleware ou `@upstash/ratelimit`.

#### 3. Sem validação de estoque no checkout (MÉDIO RISCO)
Cliente pode comprar produto com estoque = 0 se dois clientes comprarem simultaneamente.

**Correção:** Verificar estoque dentro de uma transação antes de criar o pedido.

---

## 10. Integrações Externas

### Mercado Pago

**Propósito:** Processar pagamentos (cartão + Pix)

**Modo de integração:** Redirect (Checkout Pro) — cliente é redirecionado para o site do MP

**Configuração necessária:**
- `MERCADO_PAGO_ACCESS_TOKEN` — usar `TEST-...` para sandbox, token real para produção
- Back URLs configuradas no código (`/checkout/sucesso`, `/checkout/pendente`, `/checkout/falha`)
- Webhook URL: `{NEXT_PUBLIC_BASE_URL}/api/webhooks/mercadopago` (configurar no painel MP)

**Fluxo:**
```
Frontend → POST /api/checkout → SDK MP cria preferência → retorna init_point
→ cliente paga no MP → MP chama webhook → backend atualiza status
```

**Sandbox:** Usar cartões de teste do MP. Ver [documentação MP](https://www.mercadopago.com.br/developers/pt/docs/checkout-pro/test)

---

### Melhor Envio

**Propósito:** Calcular frete em tempo real por CEP

**Modo de integração:** REST API via Bearer token

**Configuração necessária:**
- `MELHOR_ENVIO_TOKEN` — token da conta no Melhor Envio
- `MELHOR_ENVIO_URL` — `sandbox.melhorenvio.com.br` (teste) ou `melhorenvio.com.br` (produção)
- `MELHOR_ENVIO_CEP_ORIGEM` — CEP do local de despacho da Yez Store

**Limitação atual:** Peso calculado como estimativa (300g por item). Para produção, deve ser o peso real cadastrado em cada produto.

**Funcionalidades não implementadas:**
- Geração de etiqueta de envio
- Rastreamento de encomenda
- Adição ao carrinho do Melhor Envio

---

### Supabase

**Propósito:** Banco de dados (PostgreSQL), autenticação, storage de imagens

**Configuração necessária:**
- Criar projeto no Supabase
- Rodar migration `supabase/migrations/001_initial_schema.sql`
- Criar bucket `produtos` como público
- Criar usuário admin em Authentication > Users
- Configurar variáveis de ambiente

---

## 11. Frontend — Estrutura de Páginas

### Loja pública

| Rota | Tipo | Descrição |
|---|---|---|
| `/` | Server Component | Home com catálogo e filtros por categoria |
| `/produto/[id]` | Server Component | Detalhe do produto |
| `/sacola` | Client Component | Carrinho + calculadora de frete |
| `/checkout` | Client Component | Formulário de dados + finalização |
| `/checkout/sucesso` | Client Component | Confirmação de pedido pago |
| `/checkout/pendente` | Client Component | Aguardando pagamento (Pix) |
| `/checkout/falha` | Client Component | Pagamento recusado |

### Painel admin (requer login)

| Rota | Tipo | Descrição |
|---|---|---|
| `/admin/login` | Client Component | Login com email e senha |
| `/admin` | Server Component | Dashboard com métricas e pedidos recentes |
| `/admin/produtos` | Server Component | Lista de produtos |
| `/admin/produtos/novo` | Server + Client | Formulário de criação |
| `/admin/produtos/[id]/editar` | Server + Client | Formulário de edição |
| `/admin/artesaos` | Server Component | Lista de artesãos |
| `/admin/artesaos/novo` | Server + Client | Formulário de criação |
| `/admin/artesaos/[id]/editar` | Server + Client | Formulário de edição |
| `/admin/pedidos` | Server Component | Lista com filtro por status |
| `/admin/pedidos/[id]` | Server + Client | Detalhe + atualização de status |

### Estado global (Zustand)

```typescript
// app/lib/store.ts
useCartStore {
  items: CartItem[]        // produtos na sacola
  shipping: ShippingOption | null  // frete selecionado

  addItem(item)     // adiciona ou incrementa
  removeItem(id)    // remove item
  clearCart()       // limpa tudo (após compra)
  setShipping(opt)  // seleciona frete

  subtotal()        // sum(price * qty)
  total()           // subtotal + frete
}
```

---

## 12. Estado Atual do MVP

### Funcionalidades prontas

- [x] Catálogo de produtos com filtro por categoria
- [x] Página de detalhe do produto
- [x] Sacola de compras (Zustand, persiste no localStorage)
- [x] Calculadora de frete por CEP (Melhor Envio)
- [x] Checkout com dados pessoais e endereço
- [x] Integração Mercado Pago (Checkout Pro)
- [x] Páginas de retorno (sucesso / pendente / falha)
- [x] Webhook de atualização de status
- [x] Login admin (Supabase Auth)
- [x] CRUD de artesãos
- [x] CRUD de produtos com upload de imagem
- [x] Listagem e filtro de pedidos
- [x] Detalhe de pedido
- [x] Atualização manual de status do pedido
- [x] Dashboard com métricas básicas

### O que falta para produção

| Prioridade | Item | Complexidade |
|---|---|---|
| 🔴 Alta | Verificação de assinatura do webhook MP | Baixa |
| 🔴 Alta | Validação de estoque no checkout | Média |
| 🔴 Alta | Baixa automática de estoque após pagamento confirmado | Baixa |
| 🟡 Média | Email de confirmação ao cliente | Média |
| 🟡 Média | Relatório de repasse por artesão | Média |
| 🟡 Média | Rate limiting nas APIs públicas | Baixa |
| 🟢 Baixa | Peso real por produto (frete mais preciso) | Média |
| 🟢 Baixa | Geração de etiqueta Melhor Envio | Alta |
| 🟢 Baixa | Otimização de imagens com `next/image` | Baixa |
| 🟢 Baixa | Rastreamento de envio para o cliente | Alta |

---

## 13. Roadmap e Backlog

### Fase 1 — Produção (MVP estável)

Objetivo: tudo que é obrigatório para aceitar dinheiro real com segurança.

- [ ] **Webhook seguro** — verificar assinatura `x-signature` do MP
- [ ] **Validar estoque** — checagem atômica no checkout (evitar oversell)
- [ ] **Baixa de estoque** — decrementar `stock_quantity` quando status → `paid`
- [ ] **Configurar variáveis de produção** — tokens reais MP e Melhor Envio
- [ ] **Criar bucket `produtos` no Supabase** — confirmar que upload de imagem funciona
- [ ] **Configurar webhook URL no painel MP** — apontar para a URL de produção

### Fase 2 — Operação (conforto para o admin)

Objetivo: tornar o dia a dia do admin mais eficiente.

- [ ] **Email transacional** — confirmação de pedido e notificação de envio (Resend ou SendGrid)
- [ ] **Relatório de repasse** — página `/admin/relatorio` com cálculo por artesão e período
- [ ] **Gerar etiqueta Melhor Envio** — botão no pedido para gerar etiqueta automaticamente
- [ ] **Alerta de estoque baixo por email** — notificar admin quando produto ≤ 2 unidades

### Fase 3 — Crescimento (experiência do cliente)

- [ ] **Rastreamento** — código de rastreio visível para o cliente (página ou email)
- [ ] **Busca de produtos** — campo de pesquisa na home
- [ ] **Múltiplas fotos por produto** — galeria de imagens
- [ ] **Avaliações** — clientes avaliam produtos após recebimento
- [ ] **Cupons de desconto** — campo de cupom no checkout

### Fase 4 — Escala

- [ ] **Portal da artesã** — login próprio, visualizar vendas e repasses pendentes
- [ ] **Relatórios avançados** — gráficos de vendas por período, categoria, artesão
- [ ] **Programa de fidelidade** — pontos ou cashback para clientes recorrentes

---

## 14. Dívida Técnica

| Item | Impacto | Esforço | Ação recomendada |
|---|---|---|---|
| Tailwind instalado mas não usado | Baixo | Baixo | Remover da dependência ou adotar completamente |
| Peso de frete estimado (300g/item) | Médio | Médio | Adicionar campo `weight_grams` em `products` |
| Dimensões de embalagem hardcoded | Médio | Médio | Cadastrar dimensões por produto ou categoria |
| `next/image` não usado | Baixo | Baixo | Substituir `<img>` por `<Image>` do Next |
| Sem testes automatizados | Alto | Alto | Iniciar com testes de integração nas APIs críticas |
| Inline styles em todo frontend | Baixo | Alto | Migrar gradualmente para Tailwind ou CSS Modules |

---

## 15. Deploy e Infraestrutura

### Arquitetura de deploy

```
GitHub (main) → Vercel (auto-deploy)
                    ↕
               Supabase (banco, auth, storage)
                    ↕
          Mercado Pago / Melhor Envio (APIs externas)
```

### Variáveis de ambiente necessárias

Configurar tanto no `.env.local` (desenvolvimento) quanto no painel da Vercel (produção).

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...        # nunca expor ao cliente

# Mercado Pago
MERCADO_PAGO_ACCESS_TOKEN=APP_USR-...   # usar TEST-... para sandbox

# Melhor Envio
MELHOR_ENVIO_TOKEN=eyJ...
MELHOR_ENVIO_URL=https://melhorenvio.com.br   # ou sandbox.melhorenvio.com.br
MELHOR_ENVIO_CEP_ORIGEM=73086130

# App
NEXT_PUBLIC_BASE_URL=https://yezstore.com.br  # URL de produção
```

### Checklist de deploy para produção

- [ ] Variáveis de ambiente configuradas na Vercel
- [ ] Migration SQL rodada no Supabase de produção
- [ ] Bucket `produtos` criado e configurado como público
- [ ] Usuário admin criado no Supabase Auth
- [ ] Token Mercado Pago de produção configurado
- [ ] Webhook URL configurada no painel do Mercado Pago
- [ ] Token Melhor Envio de produção configurado
- [ ] `MELHOR_ENVIO_URL` apontando para produção (não sandbox)
- [ ] Domínio personalizado configurado na Vercel
- [ ] `NEXT_PUBLIC_BASE_URL` com domínio de produção

---

## 16. Guia de Desenvolvimento

### Pré-requisitos

- Node.js 18+
- npm ou pnpm
- Conta no Supabase (plano gratuito funciona)
- Conta de teste no Mercado Pago
- Conta no Melhor Envio (sandbox disponível)

### Configuração inicial

```bash
# 1. Clonar e instalar
git clone https://github.com/serjjiin/YezStore
cd YezStore
npm install

# 2. Configurar variáveis de ambiente
cp .env.example .env.local
# Preencher com credenciais reais

# 3. Rodar migration no Supabase
# Acessar Supabase > SQL Editor e colar o conteúdo de:
# supabase/migrations/001_initial_schema.sql

# 4. Iniciar servidor de desenvolvimento
npm run dev
# Acessa: http://localhost:3000
```

### Comandos disponíveis

```bash
npm run dev     # servidor de desenvolvimento em localhost:3000
npm run build   # build de produção
npm run lint    # ESLint
```

### Workflow de desenvolvimento

```bash
# Sempre partir do main atualizado
git checkout main && git pull

# Criar branch para a feature
git checkout -b feat/nome-da-feature

# Desenvolver...

# Commitar com mensagem semântica
git commit -m "feat: descrição do que foi implementado"

# Enviar para o GitHub
git push -u origin feat/nome-da-feature

# Abrir Pull Request
gh pr create --title "feat: nome da feature"

# Após review e aprovação: merge
# Voltar ao main
git checkout main && git pull
```

### Convenções de commit

| Prefixo | Quando usar |
|---|---|
| `feat:` | Nova funcionalidade |
| `fix:` | Correção de bug |
| `chore:` | Configuração, dependências, infra |
| `docs:` | Apenas documentação |
| `refactor:` | Refatoração sem mudança de comportamento |
| `style:` | Formatação, espaços, sem mudança lógica |

---

*Última atualização: 2026-04-23*
