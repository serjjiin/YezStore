# Revisão Técnica Completa — Yez Store

> Diagnóstico feito em 2026-04-27. Cobre domínio, requisitos, arquitetura, segurança,
> qualidade de código, testes, documentação e metodologia.

---

## Veredicto geral

O projeto está **bem acima da média para um MVP**: stack moderna e bem escolhida, estrutura
organizada, boas decisões de produto documentadas. Mas tem **vulnerabilidades críticas de
segurança que impedem o lançamento**, uma lacuna de modelagem que vai causar retrabalho, e
problemas de processo que crescem com o tempo.

---

## 1. Domínio e Modelagem de Negócio

### O que está correto
- Modelo central `artisans → products → orders → order_items` é correto para o negócio
- Snapshot de preço em `order_items.unit_price` — decisão excelente, preserva histórico
- Soft delete com `is_active` — não destrói histórico de pedidos ao desativar produto

### Problemas

**🔴 `split_percentage` no lugar errado**

O percentual está no artesão, mas deveria estar no produto (ou num relacionamento
produto-artesão com vigência temporal). Hoje, se a Ana muda de 80% para 70%, todos os
pedidos passados são afetados retroativamente no relatório — a informação histórica fica
incorreta.

Estrutura correta:
```sql
artisan_product_splits (
  artisan_id, product_id, split_percentage,
  valid_from, valid_until  -- histórico de vigência
)
```

**🔴 Sem entidade de repasse**

O modelo não registra quando e quanto foi pago a cada artesão. O repasse é feito via Pix
manualmente, mas não há rastreamento disso no sistema. Entidade necessária:

```sql
artisan_payouts (
  artisan_id, period_start, period_end,
  total_amount, status,  -- pending | paid | failed
  paid_at, pix_reference
)
```

**🟡 Sem auditoria de mudanças**

Nenhuma tabela tem `updated_at` ou registro de quem fez a última alteração. Se um preço ou
estoque mudar, não se sabe quando nem quem mudou.

---

## 2. Requisitos e Planejamento

### O que está correto
- Requisitos funcionais e não-funcionais listados com status real
- Roadmap dividido em fases
- Decisões arquiteturais registradas (por que Mercado Pago e não Stripe — excelente hábito)

### Problemas

**🔴 Itens de segurança estão na Fase 2, mas são pré-requisitos da Fase 1**

A priorização correta deveria ser:

```
Fase 0 — Segurança (antes de qualquer deploy)
  ├── Validar preço do produto no servidor (não confiar no cliente)
  ├── Verificação de assinatura webhook MP
  ├── Redirect real em /admin/* quando não autenticado
  └── Validação de estoque com transação atômica

Fase 1 — Produção (bloqueado por conta MP)
  ├── Criar conta Mercado Pago
  ├── Configurar variáveis na Vercel
  └── Testar fluxo completo em sandbox

Fase 2 — Operação
  ├── Email transacional
  ├── Relatório de repasse
  └── SEO
```

**🟡 Status de requisitos inconsistentes**

Vários itens marcados como "⏳ Aguardando conta MP" têm código pronto. O checkout e o
webhook já existem — o bloqueador é apenas a conta, não a implementação.

**🟡 CEP de origem conflitante entre documentos**
- `PROJETO.md`: `73086130`
- `CLAUDE.md` e `doc.md`: `70000000`

Precisa ser esclarecido qual é o CEP real da sede da Yez.

---

## 3. Arquitetura

### O que está correto
- Separação clara: frontend (React/Next.js), backend (Route Handlers), dados (Supabase)
- Três clientes Supabase separados (browser, server, service) — decisão excelente
- Server Components por padrão, Client só quando necessário
- Zustand para estado do carrinho — leve e correto para o escopo

### Problemas

**🔴 `middleware.ts` não existe — admin está desprotegido**

O arquivo `proxy.ts` tem a lógica correta, mas o Next.js só executa middleware se o arquivo
se chama `middleware.ts` na raiz. Como se chama `proxy.ts`, o middleware **nunca é
executado**.

Além disso, `admin/layout.tsx` faz isso quando não há usuário:
```typescript
if (!user) {
  return <>{children}> // renderiza a página sem sidebar — dados ainda aparecem!
}
```

Fix necessário — criar `/middleware.ts`:
```typescript
export { proxy as middleware, config } from './proxy'
```

E adicionar no layout:
```typescript
if (!user) redirect('/admin/login')
```

**🔴 Preço calculado com dados do cliente — manipulação possível**

Em `api/checkout/route.ts`, o total é calculado com os preços enviados pelo browser:
```typescript
const totalAmount = items.reduce((sum, i) => sum + i.price * i.quantity, 0)
```
Um usuário pode editar o preço no DevTools antes de enviar. O servidor deve buscar os preços
no banco de dados e recalcular.

**🟡 Componentes admin fazem escrita direta com anon key**

`UpdateOrderStatus`, `DeleteArtisanButton`, `ToggleProductButton` fazem `supabase.update()`
direto do browser com a anon key. Deveria usar Server Actions ou Route Handlers para
centralizar autorização e validação.

**🟡 Sem caching de produtos**

Páginas de produto buscam do banco a cada request sem `revalidate`. Para uma loja, produtos
mudam raramente — deveriam ter cache com revalidação por tag no Next.js.

---

## 4. Segurança

### Vulnerabilidades por severidade

| # | Vulnerabilidade | Severidade | Impacto real |
|---|---|---|---|
| 1 | Webhook MP sem verificação de assinatura | 🔴 CRÍTICO | Atacante marca pedidos como pagos sem pagar |
| 2 | Preço vem do cliente no checkout | 🔴 CRÍTICO | Atacante compra produtos pelo preço que quiser |
| 3 | Admin sem redirect real quando não autenticado | 🔴 CRÍTICO | Dados admin visíveis sem login |
| 4 | RLS verifica só `authenticated`, não role de admin | 🔴 ALTO | Qualquer conta Supabase altera qualquer dado |
| 5 | Sem validação de estoque com lock | 🔴 ALTO | Dois clientes compram o mesmo item simultâneo |
| 6 | Sem rate limiting em `/api/frete` | 🟡 MÉDIO | Abuso da cota do Melhor Envio |
| 7 | Sem sanitização em campos de texto admin | 🟡 MÉDIO | XSS potencial em title/description |
| 8 | `product_id` no checkout não é validado no servidor | 🟡 MÉDIO | Pedidos com produtos inexistentes |

**Nota sobre RLS:** As policies em `002_admin_rls_policies.sql` usam
`auth.role() = 'authenticated'` — isso verifica apenas se o usuário está logado, não se é
admin. Qualquer conta criada no Supabase passaria essa verificação.

---

## 5. Qualidade de Código

### O que está correto
- TypeScript strict mode ativo em todo o projeto
- Tipos bem definidos para as entidades principais
- Server Components usados corretamente
- Error handling presente nos componentes admin (após PR #6)
- Zero `any` explícito, imports limpos

### Problemas

**🟡 Styling 100% inline — difícil de manter**

Todo o projeto usa `style={{ ... }}` em vez de classes CSS. Com mais de 30 componentes,
isso significa: sem tema global, sem responsividade fácil, estilos duplicados entre arquivos.
O Tailwind está instalado mas não é usado. A decisão entre Tailwind ou CSS precisa ser feita
e aplicada de forma consistente.

**🟡 Componentes muito grandes**
- `app/checkout/page.tsx` — 339 linhas misturando formulário, validação, busca de CEP e
  integração com MP
- `app/page.tsx` — 163 linhas

Ambos deveriam ser quebrados em componentes menores com responsabilidades claras.

**🟡 `ShippingOption.price` é `string`, deveria ser `number`**

Em `store.ts`:
```typescript
price: string // causa conversão desnecessária em dois lugares
```
Depois converte com `parseFloat()` em dois lugares diferentes. Deveria ser `number` desde
a origem (no retorno da API de frete).

**🟡 Sem persistência do carrinho**

O Zustand store não usa o middleware `persist`. Se o usuário fechar ou recarregar a página,
o carrinho é perdido — má experiência para o cliente.

---

## 6. Testes

### O que está correto
- Vitest configurado corretamente
- 33 testes cobrindo `format.ts` (13) e `store.ts` (20)
- Ciclo TDD aplicado para `formatPhone` — red → green documentado
- `beforeEach` para reset de estado entre testes — padrão correto
- Fábrica `makeItem()` para reduzir repetição — boa prática

### Lacunas

**🔴 Zero cobertura nas áreas de maior risco**

| Área | Testes | Risco |
|---|---|---|
| `api/checkout` | 0 | Bug pode gerar pedido sem pagamento |
| `api/webhooks/mercadopago` | 0 | Bug pode não atualizar status de pedido pago |
| Componentes React | 0 | Regressões visuais e de interação |

**🟡 Sem testes de integração**

Não há nenhum teste que cubra o fluxo completo:
`adicionar ao carrinho → checkout → webhook → estoque atualizado`

**Próximo passo:** quando o `.env` estiver disponível, usar mocks para testar as API routes
sem depender de serviços externos. Ver guia em `TESTES.md`.

---

## 7. Documentação

### O que está correto
- `PROJETO.md` é detalhado, estruturado e mantido atualizado — ponto mais forte do projeto
- Decisões arquiteturais registradas com justificativa (inclusive reversões)
- Histórico de PRs documentado
- `TESTES.md` explica TDD de forma clara com exemplos reais
- Stack justificado com contexto de negócio

### Problemas

**🟡 `doc.md` é redundante**

Tem conteúdo quase idêntico ao `PROJETO.md`. Duplicação que gera custo de manutenção.
Recomendação: deletar `doc.md` (conteúdo útil já está em `PROJETO.md`).

**🟡 `README.md` ainda é o template padrão do create-next-app**

Deveria referenciar `PROJETO.md` e ter um guia mínimo de setup local.

**🟡 Sem guia de setup local**

Não há passo a passo de como um novo desenvolvedor configura o projeto do zero:
rodar migration SQL, criar usuário admin no Supabase, configurar Storage bucket,
quais variáveis de ambiente são obrigatórias vs. opcionais.

**🟡 Sem documentação de API**

Nenhum contrato documentado para os endpoints (`/api/checkout`, `/api/frete`,
`/api/webhooks`): quais campos são obrigatórios, o que retorna, quais erros são possíveis.

---

## 8. Metodologia e Processo

### O que está correto
- Workflow de feature branches + Pull Requests — correto e sendo seguido
- Commits semânticos (`feat:`, `fix:`, `docs:`) — padrão consistente
- `PROJETO.md` atualizado após cada conjunto de mudanças — excelente hábito
- TDD adotado para novas funcionalidades — ótimo começo

### O que melhorar

**🟡 Sem CI/CD**

Não há GitHub Actions rodando `npm run lint` e `npm test` automaticamente a cada push.
Hoje é possível fazer merge de código que quebra os testes sem perceber.

```yaml
# .github/workflows/ci.yml
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run lint
      - run: npm test
```

**🟡 Sem template de PR**

Não há checklist padrão no Pull Request: "testei localmente?", "testes passando?",
"documentação atualizada?". Isso previne merge de código incompleto.

**🟡 Backlog só no `PROJETO.md`**

GitHub Issues permitiria rastrear cada item individualmente, associar a PRs, adicionar
labels de prioridade e ver histórico de quando foi resolvido.

---

## 9. Roadmap de ação priorizado

### Imediato — antes de qualquer deploy em produção

1. Criar `middleware.ts` + `redirect()` no admin layout
2. Validar preços no servidor no `/api/checkout`
3. Verificar assinatura `x-signature` no webhook MP
4. Validar e bloquear estoque no checkout com transação atômica

### Curto prazo — próximas semanas

5. Corrigir RLS policies para verificar role de admin
6. Testes para `api/checkout` e `api/webhooks` com mocks
7. Configurar GitHub Actions com lint + test
8. Decidir: Tailwind ou CSS — aplicar consistentemente
9. Corrigir CEP de origem conflitante nos documentos

### Médio prazo — antes de crescer

10. Entidade `artisan_payouts` para rastrear repasses
11. `split_percentage` por produto com histórico de vigência
12. Quebrar `checkout/page.tsx` em componentes menores
13. `ShippingOption.price` como `number`
14. Persistência do carrinho com Zustand `persist`
15. Guia de setup local no README

### Futuro — quando o negócio crescer

16. Server Actions para operações admin (substituir cliente browser)
17. Auditoria de mudanças nas tabelas (`updated_at`, `updated_by`)
18. Caching de produtos com revalidação por tag
19. Documentação de API (OpenAPI/Swagger ou similar)
20. `artisan_product_splits` com histórico de comissão por produto
