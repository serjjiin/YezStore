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

## O que testar a seguir

### Nível 3 — API Routes (requer mocks)

As API routes dependem do Supabase e do Mercado Pago. Para testá-las sem fazer chamadas reais, usamos **mocks** — substituímos as dependências externas por versões simuladas.

**O que instalar quando for fazer:**
```bash
npm install -D @testing-library/react @testing-library/jest-dom jsdom
```

**Arquivo de configuração do mock do Supabase:**
```ts
// app/api/__tests__/mocks/supabase.ts
vi.mock('@/app/lib/supabase-server', () => ({
  createSupabaseServiceClient: () => ({
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { id: 'uuid-fake' }, error: null }),
  }),
}))
```

**Exemplos de casos para `/api/checkout`:**
```
→ retorna 400 se dados do cliente estiverem faltando
→ retorna 409 se estoque for insuficiente
→ retorna 503 se MERCADO_PAGO_ACCESS_TOKEN não estiver configurado
→ retorna order_id e init_point em caso de sucesso
```

**Exemplos de casos para `/api/webhooks/mercadopago`:**
```
→ retorna 200 (silencioso) se body for inválido
→ ignora eventos que não sejam do tipo "payment"
→ muda status do pedido para "paid" quando pagamento aprovado
→ muda status para "cancelled" quando rejeitado
→ retorna 401 se assinatura x-signature for inválida (a implementar)
```

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
