# Financial Categories + Initiative Financial — Design Spec

**Data:** 2026-07-15  
**Status:** Aprovado

## Contexto

O sistema possui `FinancialEntry` e `FinancialExit` com `initiativeId` opcional e `Initiative.raised` como campo manual. O objetivo é:

1. Substituir categorias de texto livre por um modelo `FinancialCategory` (org-level, ENTRY|EXIT)
2. Tornar `initiativeId` obrigatório em entradas e despesas — cada transação pertence a uma iniciativa
3. Calcular `raised` da iniciativa dinamicamente via SUM das entradas (remover campo armazenado)
4. Mover formulários financeiros para dentro da iniciativa (modal com abas)
5. Expor relatórios por categoria e breakdown no dashboard

## Schema

### Remover
- Model `FinancialEntryCategory` (era project-scoped)
- Campo `category: String?` de `FinancialExit`
- Campo `categoryId` FK para `FinancialEntryCategory` em `FinancialEntry`
- Campo `raised: Decimal` de `Initiative` (passa a ser computado)

### Adicionar

```prisma
enum FinancialCategoryType {
  ENTRY
  EXIT
}

model FinancialCategory {
  id             String                @id @default(uuid())
  organizationId String
  name           String                @db.VarChar(80)
  type           FinancialCategoryType
  createdAt      DateTime              @default(now())
  deletedAt      DateTime?

  organization Organization     @relation(fields: [organizationId], references: [id])
  entries      FinancialEntry[]
  exits        FinancialExit[]

  @@index([organizationId])
  @@index([type])
  @@index([deletedAt])
  @@map("financial_categories")
}
```

### Atualizar `Organization`
```prisma
  financialCategories FinancialCategory[]
```

### Atualizar `FinancialEntry`
- `categoryId String?` → FK para `FinancialCategory`
- `initiativeId String` → **obrigatório** (remove `?`)
- Relação: `category FinancialCategory? @relation(...)`
- Relação: `initiative Initiative @relation(...)`

### Atualizar `FinancialExit`
- Remove `category: String?`
- Adiciona `categoryId String?` → FK para `FinancialCategory`
- `initiativeId String` → **obrigatório** (remove `?`)
- Relações: `category FinancialCategory?`, `initiative Initiative`

### Atualizar `Initiative`
- Remove campo `raised Decimal`
- Adiciona relações:
  ```prisma
  entries FinancialEntry[]
  exits   FinancialExit[]
  ```

## Backend

### Módulo `src/modules/financial-categories/`

**`dto.ts`**
```ts
createFinancialCategorySchema: { name: string (min 1, max 80), type: "ENTRY" | "EXIT" }
updateFinancialCategorySchema: { name: string (min 1, max 80) }
```

**`repository.ts`**
- `list(organizationId, type?)` — filtra por org + deletedAt null + type opcional
- `create(data)` — cria com organizationId + name + type
- `findById(id, organizationId)` — validação de posse
- `update(id, name)` — só nome editável
- `softDelete(id)` — seta deletedAt
- `reportEntries(projectId, organizationId)` — groupBy categoryId em FinancialEntry
- `reportExits(projectId, organizationId)` — groupBy categoryId em FinancialExit

**`service.ts`**
- `list`, `create`, `update`, `remove`, `reportEntries`, `reportExits`

### Módulo `src/modules/financial/`

**`dto.ts`**
- `createFinancialEntrySchema`: `{ description, amount, date, categoryId?, initiativeId }` — initiativeId **obrigatório**
- `createFinancialExitSchema`: `{ description, amount, date, categoryId?, supplier?, initiativeId }` — initiativeId **obrigatório**

**`repository.ts`**
- `entrySelect` inclui `categoryId + category { id, name }`
- `exitSelect` inclui `categoryId + category { id, name }` (remove `category: true` string)
- Todos os métodos existentes mantidos

### Módulo `src/modules/initiatives/`

**`repository.ts`** — `findById` inclui:
```ts
entries: { where: { deletedAt: null }, select: { amount: true } }
```
Para calcular `raised = entries.reduce((s, e) => s + Number(e.amount), 0)` na service.

**`service.ts`** — `findById` retorna `raised` computado:
```ts
const raised = project.entries.reduce((s, e) => s + Number(e.amount), 0)
```
Remove qualquer referência a `initiative.raised` como campo armazenado.

## API Routes

### Categorias (org-level)

| Método | Rota | Auth |
|--------|------|------|
| GET | `/api/v1/financial-categories?type=ENTRY\|EXIT` | qualquer role |
| POST | `/api/v1/financial-categories` | ADMIN, MANAGER |
| PUT | `/api/v1/financial-categories/[id]` | ADMIN, MANAGER |
| DELETE | `/api/v1/financial-categories/[id]` | ADMIN |

### Entradas e despesas de iniciativa

| Método | Rota | Auth |
|--------|------|------|
| GET | `/api/v1/projects/[id]/initiatives/[initId]/entries` | qualquer role |
| POST | `/api/v1/projects/[id]/initiatives/[initId]/entries` | ADMIN, MANAGER |
| DELETE | `/api/v1/projects/[id]/initiatives/[initId]/entries/[entryId]` | ADMIN |
| GET | `/api/v1/projects/[id]/initiatives/[initId]/exits` | qualquer role |
| POST | `/api/v1/projects/[id]/initiatives/[initId]/exits` | ADMIN, MANAGER |
| DELETE | `/api/v1/projects/[id]/initiatives/[initId]/exits/[exitId]` | ADMIN |

### Relatórios por projeto

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/v1/projects/[id]/financial-entries/report` | groupBy categoryId (atualizado para FinancialCategory) |
| GET | `/api/v1/projects/[id]/financial-exits/report` | novo — mesmo padrão |

### Dashboard

`GET /api/v1/dashboard/stats` adiciona:
```json
"entriesByCategory": [{ "categoryId", "categoryName", "total", "count" }],
"exitsByCategory":   [{ "categoryId", "categoryName", "total", "count" }]
```

## UI

### Página `/financial-categories`

- Menu lateral (ícone `Tag`)
- Duas abas: **Entradas** / **Despesas**
- Tabela: Nome · Criado em · Ações (editar, excluir)
- Modal simples para criar/editar (só campo nome; type vem da aba ativa)
- Excluir: ADMIN + ConfirmDialog
- Padrão visual de `users/page.tsx`

### Modal de Iniciativa (substitui AppDrawer read-only)

Modal grande (`max-w-3xl`, `max-h-[90vh]`, overflow-y-auto) com 3 abas:

**Aba Detalhes** — campos read-only da iniciativa (nome, descrição, meta, status, responsável, prioridade)

**Aba Entradas**
- `raised` computado exibido como KPI (soma das entradas)
- Tabela: Descrição · Categoria · Data · Valor · Ações
- Formulário inline (toggle): Descrição · Categoria (dropdown ENTRY) · Valor (`CurrencyInput`) · Data
- Excluir entrada: ADMIN + ConfirmDialog

**Aba Despesas**
- `spent` computado (soma das saídas)
- Tabela: Descrição · Categoria · Fornecedor · Data · Valor · Ações
- Formulário inline (toggle): Descrição · Categoria (dropdown EXIT) · Fornecedor · Valor (`CurrencyInput`) · Data
- Excluir saída: ADMIN + ConfirmDialog

### Aba Prestação de Contas do Projeto (`ContasTab`)

Somente leitura — rollup das iniciativas:
- KPIs: Total Entradas · Total Despesas · Saldo
- `EntryReport`: relatório por categoria de entrada (expandível)
- `ExitReport`: relatório por categoria de despesa (expandível)
- **Sem formulários de lançamento** (esses ficam no modal da iniciativa)

### Dashboard

Dois blocos abaixo dos KPIs (grid-cols-2), visíveis apenas quando há dados:
- **Entradas por Categoria**: tabela nome · qtd · total (verde)
- **Despesas por Categoria**: tabela nome · qtd · total (vermelho)

## Constraints globais

- Bearer JWT: `Authorization: Bearer ${localStorage.getItem("access_token")}`
- Role: `JSON.parse(localStorage.getItem("user") ?? "{}").role`
- Params Next.js 15 são Promise: `const { id } = await params`
- Soft delete: `deletedAt: null` em todos os `where`
- Tenant isolation: `organizationId` em todas as queries
- Criar/editar: ADMIN e MANAGER. Excluir: somente ADMIN
- `ConfirmDialog` para toda ação destrutiva
- `CurrencyInput` de `@/components/shared/currency-input` em todos os campos de valor
- Dark theme CSS vars: `--background`, `--card`, `--primary`, `--border`, `--surface-2`, `--text-subtle`, `--success`, `--destructive`

## Ordem de implementação

1. Schema + migration
2. Módulo `financial-categories` (dto + repo + service)
3. API routes de categorias + reports + dashboard stats
4. Atualizar módulo `financial` (dto + repo)
5. API routes de entradas/despesas por iniciativa
6. Página `/financial-categories`
7. Modal de iniciativa com 3 abas (substitui drawer)
8. ContasTab vira rollup (remove formulários)
9. Dashboard UI com breakdown por categoria
