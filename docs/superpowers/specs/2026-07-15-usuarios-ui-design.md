# Spec: Módulo Usuários — UI

**Data:** 2026-07-15
**Fase:** Usuários (1ª de 4 — Usuários → Iniciativas → Financeiro → Timeline)
**Escopo:** CRUD completo com gerenciamento de roles, soft delete e visibilidade por role.

---

## 1. Contexto

A API REST de usuários já existe e está completa:

| Método | Rota | Auth |
|--------|------|------|
| GET | `/api/v1/users` | ADMIN, MANAGER, AUDITOR |
| POST | `/api/v1/users` | ADMIN |
| GET | `/api/v1/users/:id` | qualquer autenticado |
| PUT | `/api/v1/users/:id` | ADMIN |
| DELETE | `/api/v1/users/:id` | ADMIN |

O repositório já implementa soft delete (`deletedAt`), mas a listagem tem `deletedAt: null` hardcoded — precisará de ajuste para ADMIN ver removidos.

---

## 2. Arquivos

| Arquivo | Status |
|---------|--------|
| `src/app/(app)/users/page.tsx` | novo |

Arquivo único. Todos os sub-componentes inline (padrão `projects/page.tsx`).

---

## 3. Padrões globais (valem para todos os módulos)

| Ação | Componente |
|------|-----------|
| Criar | `Dialog` base-ui (modal) |
| Editar | `Dialog` base-ui (modal) |
| Ver detalhes | `AppDrawer` (drawer lateral, read-only) |
| Desativar / Reativar | `ConfirmDialog` → `PUT { active }` |
| Excluir (soft) | `ConfirmDialog` destrutivo → `DELETE` |

---

## 4. Layout da página

### Header
- Título "Usuários" + contagem
- Botão "Novo Usuário" (ADMIN) → abre modal criar

### Filtros
- Input search (nome ou email)
- Select role (Todos / Admin / Gerente / Tesoureiro / Comunicação / Auditor / Membro)
- Select status (Todos / Ativo / Inativo)
- Toggle "Mostrar removidos" — visível somente para ADMIN

### Tabela
| Coluna | Conteúdo |
|--------|----------|
| Usuário | Avatar circular (inicial, bg `--primary`) + nome + email em `text-muted-foreground` |
| Role | Badge mapeado (ver abaixo) |
| Status | Badge `active` "Ativo" / `danger` "Inativo" |
| Ações | Eye → drawer detalhes · Pencil → modal editar · ConfirmDialog desativar/reativar · ConfirmDialog excluir (ADMIN) |

Registros com `deletedAt != null`: `opacity-60` + badge `danger` "Removido". Sem ações exceto futura restauração.

### Mapeamento de roles
```ts
const ROLE_MAP = {
  ADMIN:         { variant: "danger",    label: "Admin"       },
  MANAGER:       { variant: "active",    label: "Gerente"     },
  TREASURER:     { variant: "completed", label: "Tesoureiro"  },
  COMMUNICATION: { variant: "archived",  label: "Comunicação" },
  AUDITOR:       { variant: "warning",   label: "Auditor"     },
  MEMBER:        { variant: "draft",     label: "Membro"      },
}
```

---

## 5. Estado local

```ts
users: User[] | null       // null = carregando
q: string                  // search
roleFilter: string         // filtro role
activeFilter: string       // "true" | "false" | ""
showDeleted: boolean        // toggle ADMIN
detailUser: User | null    // drawer detalhes aberto
editUser: User | null      // modal editar aberto
createOpen: boolean        // modal criar aberto
```

---

## 6. Formulários

### Modal Criar
Campos: nome (text), email (email), senha (password, min 8), role (select, default MEMBER).
Submit → `POST /api/v1/users` → refresh lista → fecha modal.

### Modal Editar
Campos: nome (text), role (select).
Submit → `PUT /api/v1/users/:id { name, role }` → refresh → fecha modal.

### Drawer Detalhes (read-only)
Exibe: avatar grande, nome, email, role badge, status badge, data de criação.

---

## 7. Ajuste de API necessário

`userRepository.list` tem `deletedAt: null` fixo. Para suportar ADMIN ver removidos:

```ts
// Adicionar ao listUsersSchema
showDeleted: z.coerce.boolean().optional(),

// No repository.list
const where = {
  organizationId,
  ...(!params.showDeleted && { deletedAt: null }),
  // ...resto
}
```

A rota GET deve ser ajustada para ignorar `showDeleted: true` se o role do payload não for `ADMIN` (validação no service ou na própria rota, antes de chamar o repositório).

---

## 8. Fluxo de dados

```
mount / filtro muda
  → GET /api/v1/users?q=&role=&active=&showDeleted=
  → setUsers(data)

Criar
  → POST /api/v1/users { name, email, password, role }
  → refresh → fecha modal criar

Editar
  → PUT /api/v1/users/:id { name, role }
  → refresh → fecha modal editar

Desativar / Reativar
  → PUT /api/v1/users/:id { active: !user.active }
  → refresh

Excluir (ADMIN)
  → DELETE /api/v1/users/:id
  → refresh
```

---

## 9. Controle de visibilidade por role (cliente)

O JWT payload é decodificado no cliente via `localStorage.getItem("access_token")` + `JSON.parse(atob(token.split(".")[1]))`.

- Botão "Novo Usuário": visível somente se `role === "ADMIN"`
- Ações Editar / Excluir / Desativar: visível somente se `role === "ADMIN"`
- Toggle "Mostrar removidos": visível somente se `role === "ADMIN"`

---

## 10. Fora de escopo

- Convite por email
- Reset de senha
- Paginação avançada (limit=20 suficiente por ora)
- Restaurar registro removido (futura fase)
