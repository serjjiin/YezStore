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
app/lib/
  format.ts                     ← código
  store.ts                      ← código
  __tests__/
    format.test.ts              ← testes de format.ts
    store.test.ts               ← testes do carrinho Zustand
```

### Convenção de nomenclatura

- Arquivos de teste ficam em `__tests__/` dentro da mesma pasta do arquivo testado
- Nome do arquivo: `[nome-do-arquivo].test.ts`
- Futuramente: componentes React em `app/components/__tests__/`

---

## O que está testado

**Total: 63 testes — todos passando**

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

## O que testar a seguir

### Nível 4 — Componentes React

Para testar componentes como `AddToCartButton` e `FreteCalculator`:

```bash
npm install -D @testing-library/react @testing-library/user-event jsdom
```

E atualizar `vitest.config.ts`:
```ts
test: {
  environment: 'jsdom', // necessário para simular o DOM do browser
}
```

**Exemplos de casos para `AddToCartButton`:**
```
→ renderiza botão "Adicionar à sacola"
→ ao clicar, mostra "Adicionado ✓" por alguns segundos
→ botão fica desabilitado quando estoque = 0
```

---

## Regras de ouro para este projeto

1. **Teste comportamento, não implementação** — teste o que a função faz, não como ela faz internamente
2. **Um conceito por teste** — cada `it()` verifica uma coisa só
3. **Nome do teste descreve o comportamento** — leia como uma frase: *"formatCurrency formata zero"*
4. **Testes independentes** — use `beforeEach` para resetar estado compartilhado
5. **Teste os casos de borda** — zero, negativo, string vazia, null
6. **Se o teste for difícil de escrever** — provavelmente o código está acoplado demais
