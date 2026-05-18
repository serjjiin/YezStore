# Yez Store — Ideias, Avaliação e Decisões

> Anotações de avaliação técnica e de produto. Documento de consulta — atualize quando algo aqui mudar de status (feito, descartado, repensado).
> Criado em 2026-05-18.

---

## Índice

1. [Contexto do negócio](#1-contexto-do-negócio)
2. [Avaliação técnica priorizada](#2-avaliação-técnica-priorizada)
3. [Ideias para vender mais](#3-ideias-para-vender-mais)
4. [Evolução do modelo de dados](#4-evolução-do-modelo-de-dados)
5. [Stack — por que manter e quando reconsiderar](#5-stack--por-que-manter-e-quando-reconsiderar)

---

## 1. Contexto do negócio

A Yez Store é um negócio familiar pequeno — sonho da mãe, lojinha física na casa, volume baixo de vendas, orçamento curto. O modelo real tem **três tipos de produto** misturados:

- **Próprio** — a mãe faz. Margem 100% pra Yez.
- **Consignado** — amigas deixam produtos na loja. Yez vende e repassa, com comissão acordada.
- **Revenda** — a mãe compra para revender. Margem = preço de venda − custo de compra.

Esse contexto muda toda a priorização: o gargalo não é tecnologia, é tráfego e conversão. Otimizações de escala são prematuras.

---

## 2. Avaliação técnica priorizada

A base de código está acima da média para o porte (RLS, HMAC no webhook, snapshot de preço, TDD com 238 testes, três clientes Supabase separados). Os pontos abaixo são dívidas reais identificadas — mas reordenados pelo impacto **no volume atual**.

### Urgente (vale fazer mesmo no volume baixo)

| Item | Issue | Por quê |
|---|---|---|
| **Idempotência do webhook MP** | [#57](https://github.com/serjjiin/YezStore/issues/57) | O MP reenvia notificações mesmo com pouco tráfego. Sem guard, duas chamadas com `cancelled` chamam `increment_stock` duas vezes e inflam o estoque |
| **Renomear `NEXT_PUBLIC_YEZ_PREVIEW_SECRET` → `YEZ_PREVIEW_SECRET`** | [#58](https://github.com/serjjiin/YezStore/issues/58) | Hoje só é lido no server e não vaza, mas o prefixo `NEXT_PUBLIC_` convida acidente futuro de uso em Client Component |

### Importante (antes do relatório financeiro)

- **Snapshot de `split_percentage` em `order_items`** ([#38](https://github.com/serjjiin/YezStore/issues/38)) — sem isso, mudar o split de uma artesã corrompe o histórico de repasses passados.
- **Distinguir tipo de produto** (próprio / consignado / revenda) ([#59](https://github.com/serjjiin/YezStore/issues/59)) — ver seção 4. Bloqueia o relatório de repasse.

### Pode esperar (só importa com tráfego de verdade)

- **Race condition no decremento de estoque** em `app/api/checkout/route.ts:96-110`. O código faz read-then-write não-atômico (lê `stock_quantity`, calcula `newStock` no Node, dá `UPDATE SET stock_quantity = newStock` com guard `gte`). Dois pedidos simultâneos no mesmo produto podem fazer um sobrescrever o decremento do outro. **Solução correta** quando importar:
  ```sql
  -- nova RPC em supabase/migrations/005_decrement_stock.sql
  CREATE OR REPLACE FUNCTION decrement_stock(p_product_id uuid, p_qty integer)
  RETURNS integer LANGUAGE sql AS $$
    UPDATE products
    SET stock_quantity = stock_quantity - p_qty
    WHERE id = p_product_id AND stock_quantity >= p_qty
    RETURNING stock_quantity;
  $$;
  ```
  Aí no checkout: `await supabase.rpc('decrement_stock', { p_product_id, p_qty })` e checar se retornou linha. Com 1-5 pedidos/dia, dois simultâneos no mesmo produto é praticamente impossível — por isso pode esperar.
- **Sem transação no checkout** — criar order → criar items → decrementar estoque pode quebrar no meio sem rollback. Solução: extrair tudo para uma função SQL `create_order()`.
- **Rate limiting** nas APIs públicas (RNF-01.5) — sem tráfego, sem ataque.
- **Job de garbage collection** de orders `pending` antigos que travam estoque (cron job ou Supabase Edge Function).

### Ignorar por enquanto

- `<img>` em vez de `next/image` — performance OK no volume.
- Tailwind instalado mas não usado — cosmético.
- Cobertura de testes do middleware ([#51](https://github.com/serjjiin/YezStore/issues/51)) — bom ter, não bloqueia nada real.

---

## 3. Ideias para vender mais

O gargalo real é tráfego e conversão. Em ordem do que mais retorna por hora investida:

1. **Botão "Comprar pelo WhatsApp" no produto** ([#60](https://github.com/serjjiin/YezStore/issues/60)) — abre conversa com mensagem pré-preenchida (nome do produto + link). Cliente brasileiro de loja artesanal confia mais em WhatsApp que em checkout MP. ~2h de trabalho.
2. **Opção de Pix direto** ([#61](https://github.com/serjjiin/YezStore/issues/61)) (paralelo ao MP) — mostra QR Code, sua mãe confere e marca como pago no admin. Economiza ~5% de taxa MP em vendas para conhecidos. ~meio dia de trabalho.
3. **Múltiplas fotos por produto + variações simples** ([#62](https://github.com/serjjiin/YezStore/issues/62)) (cor / tamanho) — essencial pra artesanato. Sem isso, brinco dourado e prateado têm que virar produtos diferentes.
4. **SEO básico** ([#17](https://github.com/serjjiin/YezStore/issues/17)) — `<title>` e `<meta description>` por produto. Grátis, traz tráfego orgânico do Google ao longo do tempo.
5. **Email transacional** ([#16](https://github.com/serjjiin/YezStore/issues/16)) — Resend tem 3000/mês grátis. Confirmação de pedido profissionaliza muito.
6. **QR code físico no balcão** apontando pra loja online — cada venda presencial vira oportunidade de venda recorrente online.
7. **Fotos boas + descrição emocional** com a história da artesã — "feito à mão pela Bia em Brasília, aprendeu com a avó" vende mais que descrição técnica. Não é código, mas afeta receita.
8. **Instagram → site** — bio com link, cada post de produto com link direto pro produto (`/produto/[id]`). Maior parte das vendas de artesanato no Brasil vem do Instagram.
9. **Cadastro simples de cliente recorrente** ([#63](https://github.com/serjjiin/YezStore/issues/63)) com campo de anotações — sua mãe atende as mesmas pessoas várias vezes; anotações ajudam mais que dashboards sofisticados.

---

## 4. Evolução do modelo de dados

O schema atual trata todo produto como "de um artesão com `split_percentage`". Funciona pra próprio e consignado, mas perde a categoria revenda — sem custo de compra, não dá pra calcular lucro real.

Mudança mínima recomendada (fazer **antes** do relatório de repasse):

```sql
-- nova migration: supabase/migrations/005_product_types.sql
ALTER TABLE products
  ADD COLUMN product_type text
    CHECK (product_type IN ('proprio', 'consignado', 'revenda')),
  ADD COLUMN cost_price numeric(10,2);

-- Convenções:
-- proprio:    artisan_id = registro "Yez/Mãe", split = 100
-- consignado: artisan_id = amiga, split conforme acordo
-- revenda:    artisan_id = NULL, cost_price preenchido
```

Combinar com a issue [#38](https://github.com/serjjiin/YezStore/issues/38) (snapshot de `split_percentage` em `order_items`) para que mudanças futuras de comissão não corrompam histórico.

---

## 5. Stack — por que manter e quando reconsiderar

### Por que manter a stack atual

| Item | Custo atual | Limite no plano grátis |
|---|---|---|
| Vercel (hosting + CDN) | R$ 0 | 100 GB bandwidth/mês |
| Supabase (DB + auth + storage) | R$ 0 | 500 MB DB, 1 GB storage, 50k auth/mês |
| Mercado Pago | R$ 0 fixo | taxa por venda (~4-5%) |
| Melhor Envio | R$ 0 fixo | só custo da etiqueta |
| Domínio `.com.br` (opcional) | ~R$ 40/ano | — |
| **Total fixo/mês** | **R$ 0** (ou ~R$ 3 com domínio) | — |

Para o volume e orçamento atuais, é a escolha **certa**, não de compromisso. Você já domina a stack, controla tudo, e mantém custo zero.

### Quando uma alternativa faria sentido

Referência pra não esquecer:

| Alternativa | Custo aproximado | Quando consideraria | Quando não |
|---|---|---|---|
| **Shopify + app multi-vendor** (Webkul) | ~R$ 350-500/mês | Quando vender 100+ pedidos/dia E o tempo de manter código custar mais que a mensalidade | Agora — mensalidade come margem de loja pequena |
| **Medusa.js** (self-hosted, open source) | R$ 0 código + ~R$ 100/mês servidor | Se um dia expandir (5+ vendedoras, B2B, múltiplas lojas físicas) e precisar de features de marketplace de verdade | Agora — caminhão pra 3 sacolas, mais código pra manter |
| **Vendure** | Igual Medusa | Mesma lógica do Medusa, perfil mais "enterprise" | Igual Medusa |
| **WooCommerce** (WordPress) | ~R$ 50-100/mês | **Nunca recomendado** — WordPress é frágil, ataques constantes, plugins quebram entre si | Sempre — sairia de uma stack moderna pra uma selva |
| **Nuvemshop / Loja Integrada** (SaaS BR) | ~R$ 50-100/mês | Só se você abandonasse o projeto e a sua mãe quisesse tocar sozinha sem programador | Agora — você tem coisa melhor |

### Gatilho real para reconsiderar

A pergunta certa pro futuro: **"quando vender 50+ pedidos/dia, ainda vale manter código?"**. Se sim, fica com a stack atual e investe nas dívidas técnicas (race condition, idempotência, rate limit). Se não, migra pra Shopify e foca em vender.

Antes disso, qualquer migração é prejuízo de tempo e dinheiro.
