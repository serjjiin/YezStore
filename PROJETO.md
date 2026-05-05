# Yez Store — Documentação Completa do Projeto

> Documento vivo. Atualizar sempre que decisões arquiteturais ou de produto mudarem.
> Última atualização: 2026-05-04 — frete em dobro corrigido nos painéis admin; CI ganha `tsc --noEmit` e `npm run build`; webhook do MP loga falha em `increment_stock`.

> 📋 **Revisão técnica histórica disponível em [`REVISAO.md`](./REVISAO.md)** — congelada em 2026-04-28; o estado atual está aqui em `PROJETO.md`.

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
12. [Estado Atual](#12-estado-atual)
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
| RF-01.1 | Exibir catálogo de produtos ativos com foto, nome e preço | ✅ |
| RF-01.2 | Filtrar produtos por categoria | ✅ |
| RF-01.3 | Ver detalhe do produto (descrição, artesão, estoque) | ✅ |
| RF-01.4 | Adicionar produto à sacola com feedback visual | ✅ |
| RF-01.5 | Ver e editar itens da sacola com foto do produto | ✅ |
| RF-01.6 | Calcular frete por CEP (Melhor Envio — produção) | ✅ |
| RF-01.7 | Selecionar opção de frete | ✅ |
| RF-01.8 | Contador de itens no nav da sacola | ✅ |

### RF-02 — Checkout

| ID | Requisito | Status |
|---|---|---|
| RF-02.1 | Preencher dados pessoais (nome, email, telefone) | ✅ |
| RF-02.2 | Auto-preenchimento de endereço ao digitar CEP (ViaCEP) | ✅ |
| RF-02.3 | Redirecionar para pagamento no Mercado Pago | ⏳ Aguardando conta MP |
| RF-02.4 | Exibir página de sucesso/falha/pendente após pagamento | ✅ (páginas prontas) |
| RF-02.5 | Limpar carrinho após compra confirmada | ✅ |
| RF-02.6 | Validar estoque e decrementar atomicamente no checkout | ✅ |
| RF-02.7 | Enviar email de confirmação ao cliente | ❌ |

### RF-03 — Webhooks e Status

| ID | Requisito | Status |
|---|---|---|
| RF-03.1 | Receber notificação de pagamento do Mercado Pago | ⏳ Aguardando conta MP |
| RF-03.2 | Atualizar status do pedido automaticamente | ⏳ Aguardando conta MP |
| RF-03.3 | Verificar assinatura do webhook (segurança) | ✅ |

### RF-04 — Painel Admin

| ID | Requisito | Status |
|---|---|---|
| RF-04.1 | Login com email e senha | ✅ |
| RF-04.2 | Dashboard com métricas | ✅ |
| RF-04.3 | Criar, editar e desativar produtos | ✅ |
| RF-04.4 | Upload de foto do produto | ✅ |
| RF-04.5 | Criar, editar e remover artesãos | ✅ |
| RF-04.6 | Listar pedidos com filtro por status | ✅ |
| RF-04.7 | Ver detalhe do pedido | ✅ |
| RF-04.8 | Atualizar status do pedido manualmente | ✅ |
| RF-04.9 | Relatório de repasse financeiro por artesão | ❌ |
| RF-04.10 | Restaurar estoque se pagamento falhar (webhook) | ✅ |
| RF-04.11 | Feedback de erro inline nas ações do admin | ✅ |
| RF-04.12 | Botão de reativar produto desativado | ✅ |

---

## 4. Requisitos Não-Funcionais

### RNF-01 — Segurança

| ID | Requisito | Status |
|---|---|---|
| RNF-01.1 | Rotas admin protegidas por autenticação | ✅ |
| RNF-01.2 | Credenciais nunca expostas ao cliente | ✅ |
| RNF-01.3 | RLS ativo no Supabase (policies com `is_admin()`) | ✅ |
| RNF-01.4 | Verificação de assinatura do webhook MP (HMAC-SHA256) | ✅ |
| RNF-01.5 | Rate limiting nas rotas de API públicas | ❌ |

### RNF-02 — Qualidade de código

| ID | Requisito | Status |
|---|---|---|
| RNF-02.1 | TypeScript strict | ✅ |
| RNF-02.2 | Formatação de moeda em pt-BR (`R$ 120,00`) | ✅ |
| RNF-02.3 | Acessibilidade básica (focus, aria-labels) | ✅ |
| RNF-02.4 | Imagens com aspect-ratio correto | ✅ |
| RNF-02.5 | CI/CD com GitHub Actions (lint + testes em todo push/PR) | ✅ |
| RNF-02.6 | Cobertura de testes (163 testes — Vitest + TDD) | ✅ |

---

## 5. Arquitetura Técnica

### Stack

| Camada | Tecnologia | Versão |
|---|---|---|
| Framework | Next.js | 16 |
| UI | React | 19 |
| Estilo | CSS Variables + inline styles | — |
| Estado global | Zustand | 5 |
| Banco de dados | Supabase (PostgreSQL) | — |
| Pagamentos | Mercado Pago SDK | 2.12 |
| Frete | Melhor Envio API | REST |
| CEP lookup | ViaCEP API | REST (grátis) |
| Hospedagem | Vercel | — |

### Decisões arquiteturais

- **Server Components por padrão** — dados nunca expostos ao cliente desnecessariamente
- **Três clientes Supabase** — browser (RLS), server (RLS + cookies), service (bypass RLS só em route handlers)
- **Snapshot de preço** — `order_items.unit_price` preserva o preço no momento da compra
- **Soft delete** — produtos desativados (`is_active = false`), nunca deletados

---

## 6. Banco de Dados

```
artisans (id, name, contact_email, phone, split_percentage, pix_key)
    │ 1:N
products (id, artisan_id, title, description, price, stock_quantity,
          category, image_url, is_active)
    │ 1:N (via order_items)
order_items (id, order_id, product_id, quantity, unit_price)

orders (id, customer_name, customer_email, customer_phone, status,
        total_amount, shipping_cost, shipping_address JSONB,
        shipping_option JSONB, mp_payment_id, mp_preference_id)
```

**Status possíveis de pedido:** `pending` | `paid` | `shipped` | `cancelled`

**Schema completo:** `supabase/migrations/001_initial_schema.sql`

---

## 7. API — Referência de Endpoints

### POST /api/checkout
Cria pedido no Supabase e inicia pagamento no Mercado Pago.
- **Requer:** dados do cliente, itens, frete selecionado, endereço
- **Retorna:** `{ order_id, init_point, sandbox_init_point }`
- **Segurança:** preços buscados do banco; estoque validado e decrementado atomicamente
- **Erros:** 400 (dados inválidos / produto inativo), 409 (estoque insuficiente), 500 (DB), 503 (sem token MP)
- **Depende de:** `MERCADO_PAGO_ACCESS_TOKEN` válido

### POST /api/frete
Calcula opções de frete via Melhor Envio.
- **Requer:** `{ cep, totalItems }`
- **Retorna:** array de opções com preço e prazo
- **Token:** `MELHOR_ENVIO_TOKEN` (produção configurado)

### POST /api/webhooks/mercadopago
Recebe notificação de pagamento e atualiza status do pedido.
- **Sempre retorna 200** (evita reenvios do MP)
- **Segurança:** verifica assinatura HMAC-SHA256 (`x-signature`) se `MERCADO_PAGO_WEBHOOK_SECRET` configurado

---

## 8. Fluxos Principais

### Fluxo de compra

```
Home → Produto → "Adicionar à sacola" (feedback ✓)
→ Sacola (foto do item, contador no nav)
→ Calcular frete por CEP
→ Checkout (CEP auto-preenche endereço via ViaCEP)
→ POST /api/checkout → Mercado Pago (⏳ aguardando conta)
→ sucesso | pendente | falha
```

### Fluxo admin

```
/admin/login → dashboard → produtos/artesaos/pedidos
→ Atualizar status do pedido manualmente
```

---

## 9. Segurança

### Protegido
- Rotas `/admin/*` → `proxy.ts` (middleware Next.js 16) verifica sessão Supabase
- `SUPABASE_SERVICE_ROLE_KEY` e `MERCADO_PAGO_ACCESS_TOKEN` — nunca ao cliente
- Preços sempre buscados do banco no checkout (nunca confiando no body do cliente)
- RLS com `is_admin()` — verifica `app_metadata.role = 'admin'` no JWT, não só `authenticated`
- Webhook MP com verificação de assinatura HMAC-SHA256 via `timingSafeEqual` (timing-safe)
- Estoque validado e decrementado atomicamente — guard `WHERE stock_quantity >= qty` previne corrida

### Vulnerabilidades conhecidas (a corrigir)

| Risco | Descrição | Solução |
|---|---|---|
| Médio | Sem rate limiting em `/api/frete` e `/api/checkout` | Vercel Edge Middleware |
| Médio | Sem restauração de estoque se pagamento falhar | Webhook `cancelled` → `stock_quantity += qty` |
| Baixo | Sem sanitização XSS nos campos de texto admin | `sanitize-html` ou Content-Security-Policy |

---

## 10. Integrações Externas

### Melhor Envio
- **Status:** ✅ Token de produção configurado no `.env.local`
- **URL:** `https://melhorenvio.com.br` (produção)
- **CEP origem:** `73086130` (sede da Yez)
- **Funcionalidade atual:** cálculo de frete
- **Não implementado:** geração de etiqueta, rastreamento

### Mercado Pago
- **Status:** ⏳ Aguardando criação de conta
- **Token atual:** `TEST` (inválido — checkout não funciona)
- **Quando configurar:** substituir `MERCADO_PAGO_ACCESS_TOKEN` no `.env.local` e Vercel

### ViaCEP
- **Status:** ✅ Ativo no checkout
- **Uso:** auto-preenche rua, bairro, cidade, UF ao digitar CEP
- **Autenticação:** nenhuma (API pública gratuita)

### Supabase
- **Status:** ✅ Configurado e funcionando
- **Projeto:** `ezccgrycjpusqrcbegmw.supabase.co`

---

## 11. Frontend — Estrutura de Páginas

### Loja pública

| Rota | Tipo | Status |
|---|---|---|
| `/` | Server Component | ✅ Grid com aspect-ratio, hover, filtros |
| `/produto/[id]` | Server Component | ✅ Imagem 4:3, preço formatado |
| `/sacola` | Client Component | ✅ Fotos dos itens, contador no nav |
| `/checkout` | Client Component | ✅ Auto-preenchimento de CEP |
| `/checkout/sucesso` | Client Component | ✅ |
| `/checkout/pendente` | Client Component | ✅ |
| `/checkout/falha` | Client Component | ✅ |

### Painel admin

| Rota | Status |
|---|---|
| `/admin/login` | ✅ |
| `/admin` | ✅ Dashboard com métricas |
| `/admin/produtos` + CRUD | ✅ |
| `/admin/artesaos` + CRUD | ✅ |
| `/admin/pedidos` + detalhe | ✅ |

### Componentes compartilhados

| Componente | Descrição |
|---|---|
| `CartLink` | Link da sacola com contador (Client) |
| `AddToCartButton` | Botão com feedback "Adicionado ✓" |
| `CheckoutNav` | Nav das páginas de retorno do checkout |
| `FreteCalculator` | Calculadora de frete com opções |
| `CategoryFilter` | Filtro de categorias na home |

### Utilitários (`app/lib/`)

| Arquivo | Funções |
|---|---|
| `format.ts` | `formatCurrency()`, `formatCep()` |
| `store.ts` | `useCartStore` (Zustand) com `CartItem` + `image_url` |
| `supabase-browser.ts` | `createSupabaseBrowserClient()` |
| `supabase-server.ts` | `createSupabaseServerClient()`, `createSupabaseServiceClient()` |

---

## 12. Estado Atual

### O que está pronto e funcionando

- [x] Catálogo, filtros, detalhe de produto
- [x] Sacola com fotos, contador no nav, feedback de adição
- [x] Cálculo de frete real (Melhor Envio produção)
- [x] Checkout com auto-preenchimento de CEP (ViaCEP)
- [x] Páginas de retorno do Mercado Pago (aguardando conta MP)
- [x] Painel admin completo (login, produtos, artesãos, pedidos)
- [x] Formatação de moeda em pt-BR
- [x] Acessibilidade básica (focus, aria-labels)
- [x] Proteção de branch `main` no GitHub
- [x] Repositório público em `github.com/serjjiin/YezStore`
- [x] Preço buscado do banco no checkout (segurança anti-manipulação)
- [x] Verificação de assinatura HMAC-SHA256 no webhook MP
- [x] RLS com `is_admin()` — policies corretas por role
- [x] Validação e decremento atômico de estoque no checkout
- [x] CI/CD com GitHub Actions (lint + 163 testes a cada push/PR)
- [x] TDD completo de componentes React (CartLink, AddToCartButton, FreteCalculator, sacola/page, checkout/page)

### O que falta para produção completa

| Prioridade | Item |
|---|---|
| 🔴 Alta | Criar conta Mercado Pago + configurar token |
| 🟡 Média | Email de confirmação ao cliente |
| 🟡 Média | Relatório de repasse por artesão |
| 🟡 Média | SEO (meta tags por página) |
| 🟡 Média | `next/image` para otimização de imagens |
| 🟢 Baixa | Página 404 global |
| 🟢 Baixa | Busca de produtos |
| 🟢 Baixa | Paginação |
| 🟢 Baixa | Geração de etiqueta Melhor Envio |

---

## 13. Roadmap e Backlog

### Fase 1 — Produção (bloqueado por Mercado Pago)
- [ ] Criar conta Mercado Pago e configurar `MERCADO_PAGO_ACCESS_TOKEN`
- [x] ~~Verificar assinatura do webhook MP (`x-signature`)~~ — PR #10
- [x] ~~Validar estoque no checkout (transação atômica)~~ — PR #11
- [x] ~~Restaurar estoque quando pagamento falhar (webhook `cancelled`)~~ — webhook + log de falha (PR #43)
- [ ] Configurar webhook URL no painel MP apontando para produção

### Fase 2 — Operação
- [ ] Email transacional (Resend ou SendGrid)
- [ ] Relatório de repasse por artesão (`/admin/relatorio`)
- [ ] SEO — `<title>` e `<meta description>` por página
- [ ] `next/image` em todas as `<img>`
- [ ] Alerta de estoque baixo por email para admin

### Fase 3 — Crescimento
- [ ] Busca de produtos
- [ ] Múltiplas fotos por produto
- [ ] Rastreamento de envio para o cliente
- [ ] Avaliações de produto
- [ ] Cupons de desconto

### Fase 4 — Escala
- [ ] Portal da artesã (login + dashboard individual)
- [ ] Relatórios avançados com gráficos
- [ ] Programa de fidelidade

---

## 14. Dívida Técnica

| Item | Impacto | Issue / Ação |
|---|---|---|
| Tailwind instalado mas não usado | Baixo | Remover ou adotar |
| Peso de frete estimado (300g/item) | Médio | Adicionar `weight_grams` em `products` |
| Dimensões de embalagem hardcoded | Médio | Cadastrar por produto ou categoria |
| `<img>` em vez de `next/image` | Baixo | [#18](https://github.com/serjjiin/YezStore/issues/18) |
| `ShippingOption.price` é `string` | Baixo | [#20](https://github.com/serjjiin/YezStore/issues/20) — trocar por `number` |
| Operações admin de escrita usam anon key no browser | Médio | [#37](https://github.com/serjjiin/YezStore/issues/37) — mover para Server Actions / Route Handlers |
| Sem snapshot de `split_percentage` em `order_items` | Médio | [#38](https://github.com/serjjiin/YezStore/issues/38) — necessário antes do relatório de repasse |
| CI sem cache de npm no `setup-node` | Baixo | [#41](https://github.com/serjjiin/YezStore/issues/41) |
| Env vars fake no step de Build do CI | Baixo | [#42](https://github.com/serjjiin/YezStore/issues/42) — frágil se SSG depender de dados reais |
| ~~Sem restauração de estoque em falha~~ | ~~Alto~~ | ~~Webhook `cancelled` + log de falha — PR #43~~ |
| ~~API routes sem cobertura~~ | ~~Alto~~ | ~~163 testes com Vitest + TDD — PR #10/#11~~ |
| ~~Carrinho não persiste ao recarregar~~ | ~~Médio~~ | ~~Zustand `persist` middleware — já implementado em `app/lib/store.ts`~~ |

---

## 15. Deploy e Infraestrutura

### Arquitetura

```
GitHub (main) → Vercel (auto-deploy)
                    ↕
               Supabase (banco, auth, storage)
                    ↕
          Mercado Pago / Melhor Envio (APIs externas)
```

### Variáveis de ambiente

```bash
NEXT_PUBLIC_SUPABASE_URL=https://ezccgrycjpusqrcbegmw.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...             # nunca expor ao cliente

MERCADO_PAGO_ACCESS_TOKEN=...            # ⏳ aguardando conta

MELHOR_ENVIO_TOKEN=...                   # ✅ configurado (produção)
MELHOR_ENVIO_URL=https://melhorenvio.com.br
MELHOR_ENVIO_CEP_ORIGEM=73086130

NEXT_PUBLIC_BASE_URL=http://localhost:3000  # trocar para domínio em produção
```

### Checklist de deploy

- [ ] `MERCADO_PAGO_ACCESS_TOKEN` real configurado na Vercel
- [ ] `NEXT_PUBLIC_BASE_URL` com domínio de produção
- [ ] Webhook URL configurada no painel do Mercado Pago
- [x] Bucket `produtos` criado no Supabase Storage
- [x] Migration SQL rodada no Supabase
- [x] Usuário admin criado no Supabase Auth
- [x] Token Melhor Envio de produção configurado

---

## 16. Guia de Desenvolvimento

### Workflow de PR

```bash
git checkout main && git pull
git checkout -b feat/nome-da-feature
# ... desenvolve e commita ...
git push -u origin feat/nome-da-feature
gh pr create --title "feat: descrição"
# /review no Claude Code antes de merge
git checkout main && git pull  # após merge
```

### Convenções de commit

| Prefixo | Quando |
|---|---|
| `feat:` | Nova funcionalidade |
| `fix:` | Correção de bug |
| `chore:` | Config, deps, refactor sem lógica |
| `docs:` | Documentação |

### Histórico de PRs

| PR | Descrição | Status |
|---|---|---|
| #1 | Extrai nav do checkout para `CheckoutNav` | ✅ Merged |
| #2 | Documentação completa (`PROJETO.md`) | ✅ Merged |
| #3 | Correções de design e UX | ✅ Merged |
| #4 | Auto-preenchimento de CEP no checkout | ✅ Merged |
| #5 | Bloqueio de estoque esgotado (AddToCartButton + prod detail) | ✅ Merged |
| #6 | Correções do painel admin (erro inline, reativar produto, status centralizado, formatCurrency) | ✅ Merged |
| #7 | Fix: padroniza setLoading e corrige erro de lint | ✅ Merged |
| #8 | Responsividade, UX e melhorias de design do frontend | ✅ Merged |
| #9 | Docs: remove seção obsoleta do PR #6 e corrige numeração | ✅ Merged |
| #10 | TDD, testes de API (63 testes) e correções de segurança críticas (preço do banco, assinatura webhook, RLS com `is_admin()`, CI/CD) | ✅ Merged |
| #11 | Validação e decremento atômico de estoque no checkout | ✅ Merged |
| #12 | Limpeza estrutural — remove boilerplate e unifica clientes Supabase | ✅ Merged |
| #13 | TDD de componentes React: CartLink, AddToCartButton, FreteCalculator, sacola/page, checkout/page (163 testes total) | ✅ Merged |
| #39 | Frete contado em dobro nos painéis admin — helper `orderTotals` + 4 telas + 6 testes | ✅ Merged |
| #40 | Tipagem dos testes (cast duplo) + `tsc --noEmit` e `npm run build` no CI | ✅ Merged |
| #43 | Log de falha de `increment_stock` no webhook do MP — payload selecionado, sem PII | ✅ Merged |
| #44 | Sincroniza `PROJETO.md` e marca `REVISAO.md` como histórico | 🔄 Branch atual |
