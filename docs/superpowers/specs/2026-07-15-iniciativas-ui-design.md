# Spec: Módulo Iniciativas — UI + API

**Data:** 2026-07-15
**Fase:** Iniciativas (2ª de 4 — Usuários ✅ → Iniciativas → Financeiro → Timeline)
**Escopo:** API completa (módulo + rotas) + UI de gestão com tabela, criar/editar via modal, detalhes via drawer e soft delete.

---

## 1. Contexto

Iniciativas pertencem a Projetos. Não existe API nem módulo implementado — tudo será criado do zero. O schema Prisma já existe:

```prisma
model Initiative {
  id             String           @id @default(uuid())
  projectId      String
  organizationId String
  name           String
  description    String?
  goal           Decimal          @db.Decimal(12, 2)
  minGoal        Decimal?         @db.Decimal(12, 2)
  raised         Decimal          @default(0) @db.Decimal(12, 2)
  priority       Int              @default(0)
  status         InitiativeStatus @default(PENDING)
  responsibleId  String?
  dependsOnId    String?
  createdAt      DateTime         @default(now())
  updatedAt      DateTime         @updatedAt
  deletedAt      DateTime?
}
```

`InitiativeStatus`: `PENDING | IN_PROGRESS | COMPLETED | CANCELLED`

---

## 2. Arquivos

| Arquivo | Status |
|---------|--------|
| `src/modules/initiatives/dto.ts` | novo |
| `src/modules/initiatives/repository.ts` | novo |
| `src/modules/initiatives/service.ts` | novo |
| `src/app/api/v1/projects/[id]/initiatives/route.ts` | novo |
| `src/app/api/v1/projects/[id]/initiatives/[initId]/route.ts` | novo |
| `src/app/(app)/projects/[id]/initiatives/page.tsx` | novo |
| `src/app/(app)/projects/[id]/page.tsx` | modificar — adicionar link "Gerenciar" na aba Iniciativas |

---

## 3. Padrões globais (herdados do módulo Usuários)

| Ação | Componente |
|------|-----------|
| Criar | `Dialog` base-ui (modal) |
| Editar | `Dialog` base-ui (modal) |
| Ver detalhes | `AppDrawer` (drawer lateral, read-only, `open`/`onOpenChange`) |
| Excluir (soft) | `ConfirmDialog` destrutivo → `DELETE` |

Sem desativar/reativar — `Initiative` não tem campo `active`.

Soft delete — removidos invisíveis para não-ADMIN; ADMIN vê com `opacity-60` + badge `danger` "Removido" via toggle "Mostrar removidos".

---

## 4. API

### Rotas

| Método | Rota | Roles |
|--------|------|-------|
| GET | `/api/v1/projects/[id]/initiatives` | autenticado |
| POST | `/api/v1/projects/[id]/initiatives` | ADMIN, MANAGER |
| GET | `/api/v1/projects/[id]/initiatives/[initId]` | autenticado |
| PUT | `/api/v1/projects/[id]/initiatives/[initId]` | ADMIN, MANAGER |
| DELETE | `/api/v1/projects/[id]/initiatives/[initId]` | ADMIN |

### DTOs

```ts
// createInitiativeSchema
{
  name: string (min 2, max 150)
  description?: string
  goal: number (positive)
  minGoal?: number (positive)
  raised?: number (≥ 0, default 0)
  priority?: number (integer, default 0)
  status?: InitiativeStatus (default PENDING)
  responsibleId?: string (uuid)
  dependsOnId?: string (uuid)
}

// updateInitiativeSchema — todos opcionais
{ name?, description?, goal?, minGoal?, raised?, priority?, status?, responsibleId?, dependsOnId? }

// listInitiativesSchema
{ status?, q?, showDeleted?, page?, limit? }
```

### Repository

- `select` inclui todos os campos + `deletedAt`
- `list()`: `deletedAt: null` por padrão; `showDeleted` remove o filtro
- `q`: busca por `name contains` (case-insensitive)
- `softDelete()`: seta `deletedAt: new Date()`
- Ordenação padrão: `priority ASC, createdAt ASC`

### Validações de negócio no service

- `dependsOnId` deve pertencer ao mesmo `projectId` — validar antes de criar/editar
- `responsibleId` deve pertencer à mesma `organizationId`
- `showDeleted: true` apenas para ADMIN (bloqueado na rota, igual ao padrão de usuários)

---

## 5. UI — Página `/projects/[id]/initiatives`

### Header
- Breadcrumb: `← Projetos / [nome do projeto] / Iniciativas`
- Contagem de iniciativas
- Botão "Nova Iniciativa" — visível para ADMIN e MANAGER

### Filtros
- Input search (nome)
- Select status (Todos / Pendente / Em Andamento / Concluída / Cancelada)
- Toggle "Mostrar removidos" — visível somente para ADMIN

### Tabela

| Coluna | Conteúdo |
|--------|----------|
| # | `priority` |
| Iniciativa | nome + descrição truncada em `text-muted-foreground` |
| Meta | `goal` BRL + `ProgressBar` inline + `%` |
| Arrecadado | `raised` BRL |
| Status | Badge (ver mapa abaixo) |
| Responsável | nome do usuário ou `—` |
| Ações | Eye · Pencil · ConfirmDialog excluir |

Pencil e excluir: somente `isAdminOrManager && !init.deletedAt`
Eye: disponível para todos

Removidos: `opacity-60` + badge `danger` "Removido"

### Status badges

```ts
PENDING:     { variant: "draft",     label: "Pendente"      }
IN_PROGRESS: { variant: "active",    label: "Em Andamento"  }
COMPLETED:   { variant: "completed", label: "Concluída"     }
CANCELLED:   { variant: "archived",  label: "Cancelada"     }
```

---

## 6. Estado local

```ts
initiatives: Initiative[] | null
project: { id: string; name: string } | null   // breadcrumb
users: { id: string; name: string }[]           // select responsável
q: string
statusFilter: string
showDeleted: boolean
createOpen: boolean
editInit: Initiative | null
detailInit: Initiative | null
```

---

## 7. Carregamento inicial (paralelo)

```
GET /api/v1/projects/[id]            → { name } para breadcrumb
GET /api/v1/projects/[id]/initiatives
GET /api/v1/users?limit=100          → lista para select de responsável
```

`dependsOnId` select: usa `initiatives` já no estado — sem fetch extra. Filtra a própria iniciativa em edição para evitar auto-dependência.

---

## 8. Modal Criar/Editar — campos

| Campo | Tipo | Obrigatório |
|-------|------|-------------|
| Nome | text | sim |
| Descrição | textarea | não |
| Meta (R$) | number | sim |
| Meta mínima (R$) | number | não |
| Arrecadado (R$) | number | não (default 0) |
| Status | select | sim (default PENDING) |
| Prioridade | number | não (default 0) |
| Responsável | select usuários | não |
| Depende de | select iniciativas do projeto | não |

---

## 9. Drawer Detalhes (read-only)

Exibe: nome, descrição, meta, meta mínima, arrecadado, progresso (%), status badge, responsável, depende de (nome da iniciativa), prioridade, data de criação.

---

## 10. Modificação em `/projects/[id]/page.tsx`

Na aba "Iniciativas", adicionar botão/link após o título da aba ou acima dos cards:

```tsx
<Link href={`/projects/${id}/initiatives`} className="...">
  Gerenciar Iniciativas →
</Link>
```

Os `InitiativeCard` de resumo permanecem.

---

## 11. Fora de escopo

- Cálculo automático de `raised` a partir de lançamentos financeiros (fase posterior)
- Reordenação drag-and-drop por `priority`
- Restaurar registros removidos
- Paginação avançada (`limit=50` suficiente por ora)
