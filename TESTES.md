# Testes — Yez Store

Guia de metodologia, estrutura e como continuar escrevendo testes no projeto.

---

## Stack de testes

| Ferramenta | Papel |
|---|---|
| **Vitest** | Runner de testes (substitui Jest — mais rápido, melhor suporte a ESM/TypeScript) |
| **@vitest/ui** | Interface visual opcional (`npx vitest --ui`) |

### Comandos

```bash
npm test           # roda todos os testes uma vez
npm run test:watch # fica rodando e re-executa ao salvar arquivos
```

---

## Metodologia: TDD (Test-Driven Development)

O ciclo tem 3 passos:

```
🔴 RED     → escrever o teste antes do código (vai falhar — esperado)
🟢 GREEN   → escrever o mínimo de código para o teste passar
🔵 REFACTOR → melhorar o código sem quebrar os testes
```

### Por que escrever o teste antes?

- Força você a pensar no **comportamento esperado** antes de pensar em como implementar
- Evita código que nunca é testado
- O teste falhar primeiro **confirma que o teste funciona** — um teste que nunca falha pode estar errado

### Exemplo prático (do que foi feito aqui)

```
1. Escrevemos os testes de formatPhone
2. Rodamos → RED (formatPhone is not a function)
3. Implementamos formatPhone em format.ts
4. Rodamos → GREEN (4 testes passando)
```

Durante o processo, um teste mal escrito revelou um problema de spec:

```ts
// Teste original — ERRADO
expect(formatPhone('+55 (11) 98765-4321')).toBe('(11) 98765-4321')
// Erro: '+55 (11) 98765-4321' tem 13 dígitos, formatou como '(55) 11987-6543'

// Teste corrigido — correto para o escopo da função
expect(formatPhone('(11) 98765-4321')).toBe('(11) 98765-4321')
```

**Lição:** o teste errado forçou uma decisão: "a função lida com código de país?" → Não. O teste foi ajustado para documentar essa decisão.

---

## Estrutura de arquivos

```
app/
  lib/
    format.ts
    store.ts
    formStyles.ts
    __tests__/
      format.test.ts
      store.test.ts
  components/
    CartLink.tsx
    AddToCartButton.tsx
    FreteCalculator.tsx
    __tests__/
      CartLink.test.tsx
      AddToCartButton.test.tsx
      FreteCalculator.test.tsx
  checkout/
    page.tsx
    __tests__/
      page.test.tsx
      sucesso-page.test.tsx
      pendente-page.test.tsx
      falha-page.test.tsx
  sacola/
    page.tsx
    __tests__/
      page.test.tsx
  admin/
    lib/
      orderTotals.ts
      __tests__/
        orderTotals.test.ts
    produtos/
      ProdutoForm.tsx
      __tests__/
        ProdutoForm.test.tsx
  api/
    checkout/route.ts
    frete/route.ts
    webhooks/mercadopago/route.ts
    admin/
      products/route.ts
      products/[id]/route.ts
      products/[id]/toggle/route.ts
      artisans/route.ts
      artisans/[id]/route.ts
      orders/[id]/status/route.ts
    __tests__/
      checkout.test.ts
      frete.test.ts
      webhook-mercadopago.test.ts
      payments-verify.test.ts
      admin-products.test.ts
      admin-products-toggle.test.ts
      admin-artisans.test.ts
      admin-orders.test.ts
  __tests__/
    middleware.test.ts
```

### Convenção de nomenclatura

- Arquivos de teste ficam em `__tests__/` dentro da mesma pasta do arquivo testado
- Nome do arquivo: `[nome-do-arquivo].test.ts`
- Componentes React usam `// @vitest-environment jsdom` no topo do arquivo

---

## O que está testado

**Total: 296 testes — todos passando (21 arquivos)**

### `app/lib/__tests__/format.test.ts` — 13 testes

Testa as funções utilitárias de formatação.

#### `formatCurrency`
| Teste | Comportamento verificado |
|---|---|
| formata valor inteiro em reais | `120` → `"R$ 120,00"` |
| formata valor com centavos | `9.9` → `"R$ 9,90"` |
| formata zero | `0` → `"R$ 0,00"` |
| formata valor alto com separador de milhar | `1500` → `"R$ 1.500,00"` |

#### `formatCep`
| Teste | Comportamento verificado |
|---|---|
| formata CEP completo (8 dígitos) | `"12345678"` → `"12345-678"` |
| formata CEP incompleto (menos de 5 dígitos) | `"123"` → `"123"` |
| formata CEP com 6 dígitos | `"123456"` → `"12345-6"` |
| ignora caracteres não numéricos | `"12.345-678abc"` → `"12345-678"` |
| limita a 8 dígitos | `"123456789999"` → `"12345-678"` |

#### `formatPhone` ← implementada via TDD
| Teste | Comportamento verificado |
|---|---|
| formata celular com 11 dígitos | `"11987654321"` → `"(11) 98765-4321"` |
| formata telefone fixo com 10 dígitos | `"1132345678"` → `"(11) 3234-5678"` |
| ignora caracteres não numéricos | `"(11) 98765-4321"` → `"(11) 98765-4321"` |
| retorna dígitos sem formato se < 10 dígitos | `"1198765"` → `"1198765"` |

---

### `app/lib/__tests__/store.test.ts` — 20 testes

Testa o carrinho Zustand. O store é testado fora do React via `.getState()` e `.setState()`.

**Padrão de reset:** cada teste começa com o carrinho vazio:
```ts
beforeEach(() => {
  useCartStore.setState({ items: [], shipping: null })
})
```
Sem isso, o estado de um teste vazaria para o próximo.

#### `addItem`
| Teste | Comportamento verificado |
|---|---|
| adiciona item novo | carrinho tem 1 item |
| item novo sempre começa com quantity 1 | mesmo passando `quantity: 5`, inicia com `1` |
| incrementa quantidade se item já existe | adicionar mesmo item 2x → `quantity: 2`, ainda 1 item |
| itens diferentes ficam separados | 2 ids diferentes → 2 itens |

#### `removeItem`
| Teste | Comportamento verificado |
|---|---|
| remove item existente | carrinho fica vazio |
| id inexistente não afeta estado | carrinho permanece com 1 item |
| remove apenas o item correto | remove `id: '1'`, preserva `id: '2'` |

#### `updateQuantity`
| Teste | Comportamento verificado |
|---|---|
| atualiza para quantidade válida | `quantity` muda para o novo valor |
| quantidade 0 remove o item | item é deletado |
| quantidade negativa remove o item | item é deletado |

#### `clearCart`
| Teste | Comportamento verificado |
|---|---|
| remove todos os itens | `items` fica vazio |
| limpa o frete junto | `shipping` volta para `null` |

#### `setShipping`
| Teste | Comportamento verificado |
|---|---|
| define a opção de frete | `shipping.name` é o valor passado |
| aceita null para remover frete | `shipping` volta para `null` |

#### `subtotal`
| Teste | Comportamento verificado |
|---|---|
| retorna 0 com carrinho vazio | `subtotal()` → `0` |
| calcula preço × quantidade | 3 unidades a R$ 50 → `150` |
| soma múltiplos itens | R$ 50 + R$ 30 → `80` |

#### `total`
| Teste | Comportamento verificado |
|---|---|
| retorna só subtotal sem frete | `total()` === `subtotal()` |
| soma subtotal + frete | R$ 50 + frete R$ 18,50 → `68.50` |
| retorna 0 com carrinho vazio e sem frete | `total()` → `0` |

---

---

### `app/api/__tests__/checkout.test.ts` — 18 testes

Testa o Route Handler `POST /api/checkout` com mocks de Supabase e Mercado Pago.

**Padrão de mock:** `makeSmartChain()` — mock com consciência de tabela que diferencia comportamento por `from('products')`, `from('orders')` e `from('order_items')`.

| Grupo | Teste |
|---|---|
| Validação de entrada | 400 sem `customer.name`, sem `customer.email`, sem `items` |
| Erro no banco | 500 se Supabase falhar ao criar pedido |
| Sem MP configurado | 503 sem `MERCADO_PAGO_ACCESS_TOKEN` |
| Sucesso | 200 com `order_id`, `init_point`; itens criados corretamente |
| Segurança — preço | Ignora preço do cliente, usa banco; 400 se produto não existe; 400 se inativo |
| Validação de estoque | 409 se estoque insuficiente; 409 se estoque zerado; decremento atômico chamado; 409 em corrida (0 linhas atualizadas) |

---

### `app/api/__tests__/webhook-mercadopago.test.ts` — 15 testes

Testa o Route Handler `POST /api/webhooks/mercadopago` com `vi.stubGlobal('fetch', ...)` para mockar a API do MP.

| Grupo | Teste |
|---|---|
| Robustez | Sempre 200 para body inválido, type diferente de payment, `data.id` ausente, token ausente, erro na API do MP |
| Verificação de assinatura | 401 sem `x-signature`, com hash inválido, com formato errado; processa normalmente com assinatura válida; pula verificação se `MERCADO_PAGO_WEBHOOK_SECRET` não configurado |
| Atualização de status | `paid`, `cancelled`, `pending`; sem external_reference; cancelado pelo MP |

---

### `app/api/__tests__/frete.test.ts` — 14 testes

Testa o Route Handler `POST /api/frete` com mock do Melhor Envio.

| Grupo | Teste |
|---|---|
| Validação de input | 400 sem CEP, CEP < 8 dígitos, CEP > 8 dígitos; aceita CEP com máscara; 400 se totalItems zero, negativo, não número; 400 se body JSON inválido |
| Token ausente | 500 sem `MELHOR_ENVIO_TOKEN` |
| Erros externos | 502 se Melhor Envio retornar erro HTTP; 502 em falha de rede |
| Sucesso | 200 com opções de frete; CEP normalizado enviado; peso mínimo de 100g |

### `app/api/__tests__/admin-products.test.ts` — 16 testes

Testa os Route Handlers `POST /api/admin/products` e `PUT /api/admin/products/[id]` com mock do Supabase service client e upload de imagem.

| Grupo | Teste |
|---|---|
| POST — validação | 400 se body não for FormData, sem title, sem price, sem stock_quantity, price inválido |
| POST — sucesso | 201 sem imagem (image_url: null); 201 com imagem (upload no storage) |
| POST — erros | 500 se upload de imagem falhar; 500 se insert no DB falhar |
| POST — defaults | is_active default true quando ausente |
| PUT — validação | 400 se body não for FormData |
| PUT — sucesso | 200 preservando imagem existente; 200 com nova imagem |
| PUT — erros | 404 se produto não encontrado; 500 se update no DB falhar |
| PUT — defaults | image_url null quando produto não tem imagem |

### `app/api/__tests__/admin-products-toggle.test.ts` — 6 testes

Testa o Route Handler `PATCH /api/admin/products/[id]/toggle`.

| Grupo | Teste |
|---|---|
| Validação | 400 se is_active não for booleano, body inválido, is_active ausente |
| Sucesso | 200 ativa produto (true); 200 desativa produto (false) |
| Erro DB | 500 se Supabase retornar erro |

### `app/api/__tests__/admin-artisans.test.ts` — 16 testes

Testa os Route Handlers de CRUD de artesãos: `POST /api/admin/artisans`, `PUT /api/admin/artisans/[id]` e `DELETE /api/admin/artisans/[id]`.

| Grupo | Teste |
|---|---|
| POST — validação | 400 body inválido, sem name, name vazio; split < 1, > 99, não número |
| POST — sucesso | 201; campos opcionais vazios convertidos para null |
| POST — erro | 500 se Supabase der erro |
| PUT — validação | 400 body inválido, sem name |
| PUT — sucesso | 200 atualiza dados |
| PUT — erro | 500 se Supabase der erro |
| DELETE — sucesso | 200 remove artesão |
| DELETE — erros | FK violation → "Não é possível remover artesã com produtos vinculados."; 500 para outro erro |

### `app/api/__tests__/admin-orders.test.ts` — 8 testes

Testa o Route Handler `PATCH /api/admin/orders/[id]/status`.

| Grupo | Teste |
|---|---|
| Validação | 400 body inválido, status ausente, status inválido |
| Sucesso | 200 para cada status válido: pending, paid, shipped, cancelled |
| Erro DB | 500 se Supabase der erro |

### `app/__tests__/middleware.test.ts` — 15 testes

Testa o middleware do Next.js com 3 camadas de proteção: webhook passthrough, preview protection e admin authentication.

| Grupo | Teste |
|---|---|
| Webhook passthrough | permite webhook sem auth; permite mesmo em preview |
| Preview protection | sem proteção fora de preview; bloqueia páginas; 401 para API routes; permite com cookie válido; inativa sem secret; preserva path no redirect |
| Admin protection | /admin e /admin/produtos redirecionam sem sessão; /admin/login redireciona com sessão ativa; /admin/login sem sessão passa; rota admin com sessão passa |
| Interação entre camadas | preview tem prioridade sobre admin; preview + admin sem sessão redireciona para admin/login |

### `app/components/__tests__/CartLink.test.tsx` — 5 testes

Testa o componente `CartLink` que exibe o link da sacola com contagem de itens. Renderizado com `@testing-library/react` em ambiente jsdom.

| Grupo | Teste |
|---|---|
| Estado vazio | exibe "Sacola" sem contagem; não exibe contagem quando 0 itens |
| Com itens | exibe contagem total (soma quantidades); link aponta para /sacola |

### `app/components/__tests__/AddToCartButton.test.tsx` — 11 testes

Testa o componente `AddToCartButton` com jsdom e `userEvent`.

| Grupo | Teste |
|---|---|
| Estado visual | "Adicionar à sacola" com estoque ou sem stock informado; "Esgotado" com zero ou negativo |
| Botão | desabilitado se esgotado; habilitado com estoque |
| Interação | chama addItem ao clicar; não chama se esgotado |
| Feedback | exibe "Adicionado ✓" após clique; volta ao texto original após 1500ms; ainda visível antes do timeout |

### `app/components/__tests__/FreteCalculator.test.tsx` — 16 testes

Testa o componente `FreteCalculator` que consulta frete via API e exibe opções.

| Grupo | Teste |
|---|---|
| Renderização | input de CEP e botão Calcular; input começa vazio |
| Validação | erro visual se CEP < 8 dígitos; não chama fetch com CEP inválido |
| Carregamento | botão mostra "..." e fica desabilitado durante fetch |
| Resposta | exibe opções com empresa+nome; preço formatado; prazo; filtra opções com campo error; chama fetch com CEP limpo e totalItems |
| Erro | mensagem da API; "Nenhuma opção disponível"; erro genérico de rede |
| Seleção | clicar chama setShipping; clicar na já selecionada chama setShipping(null) |
| Tecla Enter | Enter no input dispara cálculo |

### `app/sacola/__tests__/page.test.tsx` — 22 testes

Testa a página de sacola (`/sacola`) com store mockada.

| Grupo | Teste |
|---|---|
| Estado vazio | "Sua sacola está vazia"; link "Ver produtos" → "/"; "0 itens"; sem FreteCalculator |
| Lista de itens | título, artesão, preço × quantidade, quantidade; singular "1 item", plural "N itens"; FreteCalculator presente |
| Controles | aumentar → updateQuantity; diminuir → updateQuantity; remover → removeItem |
| Resumo | subtotal; "Calcule acima" sem frete; valor do frete; total com frete |
| Checkout | "Calcule o frete para continuar" sem frete; "Finalizar compra →" com frete; link → /checkout; preventDefault sem frete |

### `app/checkout/__tests__/page.test.tsx` — 20 testes

Testa a página de checkout (`/checkout`) com store mockada, ViaCEP e submissão.

| Grupo | Teste |
|---|---|
| Sacola vazia | "Sua sacola está vazia"; link "Ver produtos" → "/"; formulário oculto |
| Formulário | campos renderizados; botão "Ir para o pagamento →" |
| Validação | erro com campos vazios; não chama fetch |
| ViaCEP | preenche endereço automaticamente; "Buscando endereço..."; erro se CEP não encontrado |
| Submissão | redirect para redirect_url; sandbox; limpa carrinho; "Processando..." e botão desabilitado; dados corretos enviados |
| Erros | mensagem da API; "Erro de conexão" |
| Resumo | subtotal formatado; "Não calculado" sem frete; valor e nome do frete |

### `app/admin/produtos/__tests__/ProdutoForm.test.tsx` — 3 testes

Testa o componente `ProdutoForm` quanto ao gerenciamento de memória de `URL.createObjectURL`.

| Grupo | Teste |
|---|---|
| Memory leak | revoga URL anterior ao selecionar nova imagem; revoga URL ao desmontar; não chama revoke sem imagem |

### `app/api/__tests__/payments-verify.test.ts` — 22 testes

Testa o Route Handler `POST /api/payments/verify` com mocks do Mercado Pago SDK e Supabase.

| Grupo | Teste |
|---|---|
| Validação de entrada | 400 body JSON inválido; 400 sem payment_id; 400 sem order_id; 400 ambos ausentes |
| Token | 503 sem MERCADO_PAGO_ACCESS_TOKEN |
| Erro MP | 502 se API do MP lançar erro |
| External reference | 403 se external_reference não pertence ao pedido |
| Atualização de status | paid (approved); pending (pending); pending (in_process); cancelled (rejected); cancelled (cancelled); null para status não mapeado; 500 se update falhar |
| Restauração de estoque | increment_stock para cada item (rejected/cancelled); não chama em approved/pending; não chama sem itens; loga erro do RPC e continua 200 |
| Sandbox | Configura sandbox com MERCADO_PAGO_SANDBOX=true |
| Resposta | corpo com status, mp_status e payment_id |

### `app/checkout/__tests__/sucesso-page.test.tsx` — 11 testes

Testa a página `/checkout/sucesso` com mock de `useSearchParams`, `useCartStore` e `fetch`.

| Grupo | Teste |
|---|---|
| Estado inicial | "Verificando pagamento..." ao carregar |
| Pagamento aprovado | "Pedido confirmado!"; limpa carrinho; exibe número do pedido; link "Continuar comprando" → "/" |
| Pagamento pendente | "Aguardando confirmação"; não limpa carrinho |
| Sem query params | "Pedido criado!" (estado de erro); não chama fetch |
| Falha de rede | "Pedido criado!" |
| Chamada à API | Envia payment_id e order_id no body |

### `app/checkout/__tests__/pendente-page.test.tsx` — 11 testes

Testa a página `/checkout/pendente` com mock de `useSearchParams`, `useCartStore` e `fetch`.

| Grupo | Teste |
|---|---|
| Estado inicial | "Verificando pagamento..." ao carregar |
| Pagamento aprovado | "Pagamento aprovado!"; limpa carrinho; link "Continuar comprando" |
| Pagamento pendente | "Aguardando pagamento"; não limpa carrinho; exibe número do pedido; exibe ID do pagamento |
| Sem query params | "Aguardando pagamento" (fallback para estado pendente) |
| Falha de rede | "Aguardando pagamento" (.catch → pending) |
| Chamada à API | Envia payment_id e order_id no body |

### `app/checkout/__tests__/falha-page.test.tsx` — 13 testes

Testa a página `/checkout/falha` com mock de `useSearchParams`, `useCartStore` e `fetch`.

| Grupo | Teste |
|---|---|
| Estado inicial | "Verificando pagamento..." ao carregar |
| Pagamento aprovado | "Pagamento aprovado!"; limpa carrinho; exibe número do pedido; link "Continuar comprando" |
| Pagamento falhou | "Pagamento não aprovado"; não limpa carrinho; link "Tentar novamente" → "/sacola"; link "Voltar à loja" → "/"; exibe ID do pagamento |
| Sem query params | "Pagamento não aprovado" |
| Falha de rede | "Pagamento não aprovado" (.catch → failed) |
| Chamada à API | Envia payment_id e order_id no body |

### `app/admin/lib/__tests__/orderTotals.test.ts` — 6 testes

Testa as funções utilitárias `getOrderTotal` e `getOrderProductsSubtotal`.

| Grupo | Teste |
|---|---|
| getOrderTotal | retorna total_amount como número; aceita string (Postgres numeric); lida com pedido sem frete |
| getOrderProductsSubtotal | retorna total_amount - shipping_cost; aceita string; retorna total_amount integral sem frete |

---

## O que testar a seguir

### Nível concluído — Componentes React (Nível 4)

Componentes React já estão testados com `@testing-library/react`, `userEvent` e ambiente `jsdom`:

- `AddToCartButton` — estados visuais, interação, feedback de "adicionado"
- `CartLink` — exibição com e sem itens
- `FreteCalculator` — cálculo, validação de CEP, seleção de opção
- `ProdutoForm` — memory leak de `URL.createObjectURL`
- Páginas `Sacola` e `Checkout` — renderização, formulário, submissão
- Páginas de retorno `sucesso`, `pendente`, `falha` — verificação de pagamento, estados verifying/paid/pending/failed
- `POST /api/payments/verify` — consulta MP, atualização de status, restauração de estoque

### Próximas oportunidades de teste

**Testes de integração (Nível 5)**
- `POST /api/checkout` + página de checkout — teste de ponta a ponta simulando fluxo completo
- Fluxo admin: criar produto → listar → editar → desativar

**Testes de regressão visual (Nível 6)**
- Stories com `@storybook/react` para componentes visuais
- Snapshot testing para detectar mudanças não intencionais no markup

**Testes de segurança**
- RLS policies: verificar que cliente não consegue acessar dados de outros clientes
- Rate limiting nos endpoints de API

---

## Regras de ouro para este projeto

1. **Teste comportamento, não implementação** — teste o que a função faz, não como ela faz internamente
2. **Um conceito por teste** — cada `it()` verifica uma coisa só
3. **Nome do teste descreve o comportamento** — leia como uma frase: *"formatCurrency formata zero"*
4. **Testes independentes** — use `beforeEach` para resetar estado compartilhado
5. **Teste os casos de borda** — zero, negativo, string vazia, null
6. **Se o teste for difícil de escrever** — provavelmente o código está acoplado demais
