# Módulo Usuários — UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar UI completa de gerenciamento de usuários — listagem com filtros, criar/editar via modal, visualizar detalhes via drawer, desativar/reativar e soft delete, com visibilidade de removidos restrita a ADMIN.

**Architecture:** Single page `src/app/(app)/users/page.tsx` com todos os sub-componentes inline. Backend recebe ajuste mínimo para suportar `showDeleted` restrito a ADMIN. `AppDrawer` ganha prop `open`/`onOpenChange` para controle externo. Reutiliza `ConfirmDialog`, `Badge`, `Spinner`, `Dialog` e `Drawer` do base-ui já instalados.

**Tech Stack:** Next.js 15 App Router, base-ui `Dialog` e `Drawer`, Tailwind v4, Lucide React

## Global Constraints

- Bearer JWT: `Authorization: Bearer ${localStorage.getItem("access_token")}`
- Role do usuário logado: `JSON.parse(localStorage.getItem("user") ?? "{}").role`
- Soft delete: `deletedAt` — nunca usar `DELETE` direto no Prisma; repositório já tem `softDelete()`
- `ConfirmDialog` obrigatório para toda ação destrutiva
- Dark theme always-on: CSS vars `--background`, `--card`, `--primary`, `--border`, `--surface-2`
- Tailwind v4 CSS-first: sem `tw-` prefix
- Ícones: Lucide React
- Params Next.js 15 são Promise: `const { id } = await params`

---

### Task 1: Backend — suporte a `showDeleted` na listagem de usuários

**Files:**
- Modify: `src/modules/users/dto.ts`
- Modify: `src/modules/users/repository.ts`
- Modify: `src/app/api/v1/users/route.ts`

**Interfaces:**
- Produces: `GET /api/v1/users?showDeleted=true` retorna registros com `deletedAt != null` apenas para ADMIN; outros roles recebem só `deletedAt: null`

- [ ] **Step 1: Adicionar `showDeleted` ao listUsersSchema**

Em `src/modules/users/dto.ts`, adicionar campo ao schema e rederive o tipo:

```ts
import { z } from "zod";

const roles = ["ADMIN", "MANAGER", "TREASURER", "COMMUNICATION", "AUDITOR", "MEMBER"] as const;

export const createUserSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(roles).default("MEMBER"),
});

export const updateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  role: z.enum(roles).optional(),
  active: z.boolean().optional(),
});

export const listUsersSchema = z.object({
  page: z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
  role: z.enum(roles).optional(),
  active: z.coerce.boolean().optional(),
  showDeleted: z.coerce.boolean().optional(),
});

export type CreateUserDTO = z.infer<typeof createUserSchema>;
export type UpdateUserDTO = z.infer<typeof updateUserSchema>;
export type ListUsersDTO = z.infer<typeof listUsersSchema>;
```

- [ ] **Step 2: Ajustar filtro de `deletedAt` no repositório**

Em `src/modules/users/repository.ts`, substituir o bloco `list`:

```ts
async list(organizationId: string, params: ListUsersDTO) {
  const where = {
    organizationId,
    ...(!params.showDeleted && { deletedAt: null }),
    ...(params.role   && { role: params.role }),
    ...(params.active !== undefined && { active: params.active }),
  };
  const page  = Math.max(1, params.page  ?? 1);
  const limit = Math.min(100, params.limit ?? 20);
  const [data, total] = await Promise.all([
    prisma.user.findMany({ where, select, skip: (page - 1) * limit, take: limit, orderBy: { name: "asc" } }),
    prisma.user.count({ where }),
  ]);
  return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
},
```

- [ ] **Step 3: Bloquear `showDeleted` para não-ADMIN na rota GET**

Em `src/app/api/v1/users/route.ts`, substituir o handler GET:

```ts
export async function GET(req: NextRequest) {
  try {
    const payload = authenticate(req);
    authorize(payload, ["ADMIN", "MANAGER", "AUDITOR"]);
    const { searchParams } = new URL(req.url);
    const rawParams = Object.fromEntries(searchParams);
    if (rawParams.showDeleted && payload.role !== "ADMIN") {
      delete rawParams.showDeleted;
    }
    const params = listUsersSchema.parse(rawParams);
    const result = await userService.list(payload.organizationId, params);
    return Response.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
```

- [ ] **Step 4: Testar manualmente**

Com o servidor rodando (`npm run dev`), execute no terminal (substitua credenciais reais):

```bash
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"senha123"}' | jq -r '.accessToken')

# Deve retornar só registros sem deletedAt
curl -s "http://localhost:3000/api/v1/users" \
  -H "Authorization: Bearer $TOKEN" | jq '.meta.total'

# Deve retornar incluindo removidos (se houver)
curl -s "http://localhost:3000/api/v1/users?showDeleted=true" \
  -H "Authorization: Bearer $TOKEN" | jq '.meta.total'
```

Esperado: segundo número ≥ primeiro.

- [ ] **Step 5: Commit**

```bash
git add src/modules/users/dto.ts src/modules/users/repository.ts src/app/api/v1/users/route.ts
git commit -m "feat: suporte a showDeleted na listagem de usuários (ADMIN)"
```

---

### Task 2: AppDrawer — suporte a controle externo via `open`/`onOpenChange`

**Files:**
- Modify: `src/components/shared/app-drawer.tsx`

**Interfaces:**
- Produces: `AppDrawerProps` com `open?: boolean` e `onOpenChange?: (open: boolean) => void` opcionais; comportamento atual com `trigger` permanece idêntico quando essas props são omitidas

- [ ] **Step 1: Adicionar props opcionais de controle ao AppDrawer**

Em `src/components/shared/app-drawer.tsx`, atualizar a interface e o componente:

```tsx
"use client"

import { Drawer } from "@base-ui/react/drawer"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface AppDrawerProps {
  trigger?: React.ReactElement
  title: string
  description?: string
  children: React.ReactNode
  width?: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function AppDrawer({
  trigger,
  title,
  description,
  children,
  width = "480px",
  open,
  onOpenChange,
}: AppDrawerProps) {
  return (
    <Drawer.Root swipeDirection="right" open={open} onOpenChange={onOpenChange}>
      {trigger && <Drawer.Trigger render={trigger} />}

      <Drawer.Portal>
        <Drawer.Backdrop
          className={cn(
            "fixed inset-0 bg-black/50 z-40",
            "transition-opacity duration-300",
            "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0",
          )}
        />
        <Drawer.Popup
          style={{ width, maxWidth: "90vw" }}
          className={cn(
            "fixed right-0 top-0 bottom-0 z-50 flex flex-col",
            "bg-card border-l border-border",
            "shadow-[-10px_0_40px_rgba(0,0,0,.4)]",
            "transition-transform duration-300 ease-out",
            "data-[starting-style]:translate-x-full data-[ending-style]:translate-x-full",
          )}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-border shrink-0">
            <div>
              <h2 className="text-base font-semibold text-foreground font-sans">{title}</h2>
              {description && (
                <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
              )}
            </div>
            <Drawer.Close
              render={
                <Button variant="ghost" size="icon" className="shrink-0 -mr-1 -mt-1">
                  <X className="size-4" />
                </Button>
              }
            />
          </div>

          {children}
        </Drawer.Popup>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
```

- [ ] **Step 2: Verificar que usos existentes continuam funcionando**

Abra `http://localhost:3000/projects`. Testar que os drawers existentes (se houver) ainda abrem normalmente — o `trigger` agora é opcional mas o comportamento é idêntico.

- [ ] **Step 3: Commit**

```bash
git add src/components/shared/app-drawer.tsx
git commit -m "feat: AppDrawer aceita open/onOpenChange para controle externo"
```

---

### Task 3: Página base — listagem com tabela, filtros e skeleton

**Files:**
- Create: `src/app/(app)/users/page.tsx`

**Interfaces:**
- Consumes: `GET /api/v1/users?q=&role=&active=&showDeleted=` → `{ data: User[], meta: { total } }`
- Produces: componente `UsersPage` com `users`, `load()`, filtros, `isAdmin`, `ROLE_MAP`, `ROLES`, `getToken()`, `Avatar`, `Skeleton` — todos disponíveis para as tasks seguintes (que expandem esse mesmo arquivo)

- [ ] **Step 1: Criar `src/app/(app)/users/page.tsx`**

```tsx
"use client"

import { useEffect, useState, useCallback } from "react"
import { Eye, Pencil, UserX, UserCheck, Trash2, Plus, Search } from "lucide-react"
import { Dialog } from "@base-ui/react/dialog"
import { AppDrawer } from "@/components/shared/app-drawer"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { Badge, type BadgeVariant } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Role = "ADMIN" | "MANAGER" | "TREASURER" | "COMMUNICATION" | "AUDITOR" | "MEMBER"

type User = {
  id: string
  name: string
  email: string
  role: Role
  active: boolean
  createdAt: string
  deletedAt?: string | null
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const ROLE_MAP: Record<Role, { variant: BadgeVariant; label: string }> = {
  ADMIN:         { variant: "danger",    label: "Admin"       },
  MANAGER:       { variant: "active",    label: "Gerente"     },
  TREASURER:     { variant: "completed", label: "Tesoureiro"  },
  COMMUNICATION: { variant: "archived",  label: "Comunicação" },
  AUDITOR:       { variant: "warning",   label: "Auditor"     },
  MEMBER:        { variant: "draft",     label: "Membro"      },
}

const ROLES: Role[] = ["ADMIN", "MANAGER", "TREASURER", "COMMUNICATION", "AUDITOR", "MEMBER"]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getToken() {
  return localStorage.getItem("access_token") ?? ""
}

function currentRole(): Role | null {
  try {
    return JSON.parse(localStorage.getItem("user") ?? "{}").role ?? null
  } catch {
    return null
  }
}

// ─── Sub-componentes inline ───────────────────────────────────────────────────

function Avatar({ name }: { name: string }) {
  return (
    <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-white text-[12px] font-semibold">
      {name[0]?.toUpperCase()}
    </span>
  )
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("rounded bg-border/40 animate-pulse", className)} />
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-[12px] font-medium text-muted-foreground mb-1">{children}</label>
}

const inputCls =
  "w-full h-9 px-3 text-[13px] bg-background border border-border rounded-lg text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 transition-colors"

const selectCls =
  "w-full h-9 px-3 text-[13px] bg-background border border-border rounded-lg text-foreground outline-none focus:border-ring cursor-pointer"

// ─── Página ───────────────────────────────────────────────────────────────────

export default function UsersPage() {
  const [users, setUsers]             = useState<User[] | null>(null)
  const [q, setQ]                     = useState("")
  const [roleFilter, setRoleFilter]   = useState("")
  const [activeFilter, setActiveFilter] = useState("")
  const [showDeleted, setShowDeleted] = useState(false)

  // Estados para modais/drawer — preenchidos nas Tasks 4-7
  const [createOpen, setCreateOpen]   = useState(false)
  const [editUser, setEditUser]       = useState<User | null>(null)
  const [detailUser, setDetailUser]   = useState<User | null>(null)

  const isAdmin = currentRole() === "ADMIN"

  const load = useCallback(() => {
    const params = new URLSearchParams()
    if (q)            params.set("q", q)
    if (roleFilter)   params.set("role", roleFilter)
    if (activeFilter) params.set("active", activeFilter)
    if (showDeleted && isAdmin) params.set("showDeleted", "true")
    setUsers(null)
    fetch(`/api/v1/users?${params}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then((r) => r.json())
      .then((d) => setUsers(d.data ?? []))
  }, [q, roleFilter, activeFilter, showDeleted, isAdmin])

  useEffect(() => { load() }, [load])

  // Ações destrutivas — preenchidas na Task 7
  async function toggleActive(u: User) {
    const res = await fetch(`/api/v1/users/${u.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ active: !u.active }),
    })
    if (!res.ok) throw new Error("Erro ao atualizar status")
    load()
  }

  async function removeUser(id: string) {
    const res = await fetch(`/api/v1/users/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${getToken()}` },
    })
    if (!res.ok) throw new Error("Erro ao remover usuário")
    load()
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between px-7 py-5 border-b border-border">
        <div>
          <h1 className="text-[18px] font-semibold font-sans">Usuários</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            {users
              ? `${users.length} usuário${users.length !== 1 ? "s" : ""}`
              : "Carregando..."}
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-primary text-white text-[13px] font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="size-3.5" />
            Novo Usuário
          </button>
        )}
      </div>

      <div className="p-7 space-y-5">
        {/* Filtros */}
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && load()}
              placeholder="Buscar por nome ou email..."
              className="h-8 pl-8 pr-3 w-60 text-[13px] bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 transition-colors"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="h-8 px-3 text-[13px] bg-card border border-border rounded-lg text-foreground outline-none focus:border-ring cursor-pointer"
          >
            <option value="">Todos os roles</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>{ROLE_MAP[r].label}</option>
            ))}
          </select>
          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value)}
            className="h-8 px-3 text-[13px] bg-card border border-border rounded-lg text-foreground outline-none focus:border-ring cursor-pointer"
          >
            <option value="">Todos os status</option>
            <option value="true">Ativo</option>
            <option value="false">Inativo</option>
          </select>
          {isAdmin && (
            <label className="inline-flex items-center gap-2 h-8 px-3 text-[13px] text-muted-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showDeleted}
                onChange={(e) => setShowDeleted(e.target.checked)}
                className="accent-primary"
              />
              Mostrar removidos
            </label>
          )}
        </div>

        {/* Tabela */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border text-muted-foreground text-left">
                <th className="px-5 py-3 font-medium">Usuário</th>
                <th className="px-5 py-3 font-medium">Role</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {/* Skeleton */}
              {!users && [...Array(5)].map((_, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <Skeleton className="size-8 rounded-full" />
                      <div className="space-y-1.5">
                        <Skeleton className="h-3 w-32" />
                        <Skeleton className="h-3 w-44" />
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3"><Skeleton className="h-5 w-20 rounded-full" /></td>
                  <td className="px-5 py-3"><Skeleton className="h-5 w-14 rounded-full" /></td>
                  <td className="px-5 py-3" />
                </tr>
              ))}

              {/* Empty */}
              {users?.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-16 text-center text-muted-foreground">
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              )}

              {/* Rows */}
              {users?.map((u) => (
                <tr
                  key={u.id}
                  className={cn(
                    "border-b border-border last:border-0 hover:bg-surface-2/40 transition-colors",
                    u.deletedAt && "opacity-60",
                  )}
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={u.name} />
                      <div>
                        <div className="font-medium text-foreground leading-snug">{u.name}</div>
                        <div className="text-muted-foreground text-[12px]">{u.email}</div>
                      </div>
                      {u.deletedAt && (
                        <Badge variant="danger" dot={false}>Removido</Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <Badge variant={ROLE_MAP[u.role].variant}>{ROLE_MAP[u.role].label}</Badge>
                  </td>
                  <td className="px-5 py-3">
                    <Badge variant={u.active ? "active" : "danger"}>
                      {u.active ? "Ativo" : "Inativo"}
                    </Badge>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {/* Eye — ver detalhes */}
                      <button
                        onClick={() => setDetailUser(u)}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-surface-2 transition-colors"
                        title="Ver detalhes"
                      >
                        <Eye className="size-3.5" />
                      </button>

                      {/* Ações ADMIN — somente para não-removidos */}
                      {isAdmin && !u.deletedAt && (
                        <>
                          {/* Editar */}
                          <button
                            onClick={() => setEditUser(u)}
                            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-surface-2 transition-colors"
                            title="Editar"
                          >
                            <Pencil className="size-3.5" />
                          </button>

                          {/* Desativar / Reativar */}
                          <ConfirmDialog
                            trigger={
                              <button
                                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-surface-2 transition-colors"
                                title={u.active ? "Desativar" : "Reativar"}
                              >
                                {u.active
                                  ? <UserX className="size-3.5" />
                                  : <UserCheck className="size-3.5" />}
                              </button>
                            }
                            title={u.active ? "Desativar usuário?" : "Reativar usuário?"}
                            description={
                              u.active
                                ? `${u.name} não poderá mais acessar o sistema.`
                                : `${u.name} voltará a ter acesso ao sistema.`
                            }
                            confirmLabel={u.active ? "Desativar" : "Reativar"}
                            variant={u.active ? "destructive" : "default"}
                            onConfirm={() => toggleActive(u)}
                          />

                          {/* Excluir */}
                          <ConfirmDialog
                            trigger={
                              <button
                                className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                title="Excluir"
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            }
                            title="Excluir usuário?"
                            description={`Esta ação marcará ${u.name} como removido. Somente administradores poderão visualizá-lo.`}
                            confirmLabel="Excluir"
                            variant="destructive"
                            onConfirm={() => removeUser(u.id)}
                          />
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modais e Drawer — Tasks 4-5 */}
      <CreateUserModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={load}
      />
      <EditUserModal
        user={editUser}
        onClose={() => setEditUser(null)}
        onUpdated={load}
      />
      <UserDetailDrawer
        user={detailUser}
        onClose={() => setDetailUser(null)}
      />
    </div>
  )
}

// ─── Stubs para Tasks 4-5 (evitar erro de compilação) ────────────────────────

function CreateUserModal(_: { open: boolean; onClose: () => void; onCreated: () => void }) {
  return null
}

function EditUserModal(_: { user: User | null; onClose: () => void; onUpdated: () => void }) {
  return null
}

function UserDetailDrawer(_: { user: User | null; onClose: () => void }) {
  return null
}
```

- [ ] **Step 2: Verificar no browser**

Abra `http://localhost:3000/users`. Deve mostrar:
- Header "Usuários" com contagem e botão "Novo Usuário" (somente ADMIN)
- Filtros: search, role, status, toggle "Mostrar removidos" (somente ADMIN)
- Skeleton de 5 linhas durante carregamento
- Tabela com dados reais após carga
- Ícones Eye, Pencil, UserX/UserCheck, Trash2 na coluna Ações

- [ ] **Step 3: Commit**

```bash
git add "src/app/(app)/users/page.tsx"
git commit -m "feat: página base de listagem de usuários com tabela e filtros"
```

---

### Task 4: Modais de criar e editar usuário

**Files:**
- Modify: `src/app/(app)/users/page.tsx` — substituir os stubs `CreateUserModal` e `EditUserModal`

**Interfaces:**
- Consumes: `POST /api/v1/users { name, email, password, role }`, `PUT /api/v1/users/:id { name, role }`
- Consumes: `ROLE_MAP`, `ROLES`, `getToken()`, `inputCls`, `selectCls`, `FieldLabel`, `Spinner` — todos definidos na Task 3

- [ ] **Step 1: Substituir stub `CreateUserModal` pela implementação real**

Localizar a função `CreateUserModal` no final do arquivo e substituir por:

```tsx
function CreateUserModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: () => void
}) {
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "MEMBER" as Role })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleOpenChange(next: boolean) {
    if (loading) return
    if (!next) { setError(null); setForm({ name: "", email: "", password: "", role: "MEMBER" }) }
    onClose()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/v1/users", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message ?? "Erro ao criar usuário")
      }
      onCreated()
      handleOpenChange(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ocorreu um erro")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-black/50 z-40 transition-opacity duration-200 data-[starting-style]:opacity-0 data-[ending-style]:opacity-0" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-card border border-border rounded-lg p-6 shadow-[0_10px_40px_rgba(0,0,0,.5)] transition-all duration-200 data-[starting-style]:opacity-0 data-[starting-style]:scale-95 data-[ending-style]:opacity-0 data-[ending-style]:scale-95">
          <Dialog.Title className="text-base font-semibold text-foreground mb-1 font-sans">Novo Usuário</Dialog.Title>
          <Dialog.Description className="text-sm text-muted-foreground mb-5">
            Preencha os dados para criar um novo usuário.
          </Dialog.Description>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <FieldLabel>Nome</FieldLabel>
              <input required minLength={2} value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={inputCls} />
            </div>
            <div>
              <FieldLabel>Email</FieldLabel>
              <input required type="email" value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className={inputCls} />
            </div>
            <div>
              <FieldLabel>Senha</FieldLabel>
              <input required type="password" minLength={8} value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className={inputCls} />
            </div>
            <div>
              <FieldLabel>Role</FieldLabel>
              <select value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
                className={selectCls}>
                {ROLES.map((r) => <option key={r} value={r}>{ROLE_MAP[r].label}</option>)}
              </select>
            </div>

            {error && <p className="text-xs text-destructive bg-destructive/10 rounded px-3 py-2">{error}</p>}

            <div className="flex gap-2 justify-end pt-1">
              <Dialog.Close render={
                <button type="button" disabled={loading}
                  className="h-8 px-4 rounded-lg border border-border text-[13px] text-foreground hover:bg-surface-2 transition-colors disabled:opacity-50">
                  Cancelar
                </button>
              } />
              <button type="submit" disabled={loading}
                className="h-8 px-4 rounded-lg bg-primary text-white text-[13px] font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 min-w-20 flex items-center justify-center">
                {loading ? <Spinner size="sm" /> : "Criar"}
              </button>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
```

- [ ] **Step 2: Substituir stub `EditUserModal` pela implementação real**

Localizar `function EditUserModal` e substituir por:

```tsx
function EditUserModal({
  user,
  onClose,
  onUpdated,
}: {
  user: User | null
  onClose: () => void
  onUpdated: () => void
}) {
  const [form, setForm] = useState({ name: "", role: "MEMBER" as Role })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user) setForm({ name: user.name, role: user.role })
  }, [user])

  function handleOpenChange(next: boolean) {
    if (loading) return
    if (!next) { setError(null); onClose() }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/v1/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message ?? "Erro ao atualizar usuário")
      }
      onUpdated()
      handleOpenChange(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ocorreu um erro")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog.Root open={!!user} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-black/50 z-40 transition-opacity duration-200 data-[starting-style]:opacity-0 data-[ending-style]:opacity-0" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-card border border-border rounded-lg p-6 shadow-[0_10px_40px_rgba(0,0,0,.5)] transition-all duration-200 data-[starting-style]:opacity-0 data-[starting-style]:scale-95 data-[ending-style]:opacity-0 data-[ending-style]:scale-95">
          <Dialog.Title className="text-base font-semibold text-foreground mb-1 font-sans">Editar Usuário</Dialog.Title>
          <Dialog.Description className="text-sm text-muted-foreground mb-5">{user?.email}</Dialog.Description>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <FieldLabel>Nome</FieldLabel>
              <input required minLength={2} value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={inputCls} />
            </div>
            <div>
              <FieldLabel>Role</FieldLabel>
              <select value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
                className={selectCls}>
                {ROLES.map((r) => <option key={r} value={r}>{ROLE_MAP[r].label}</option>)}
              </select>
            </div>

            {error && <p className="text-xs text-destructive bg-destructive/10 rounded px-3 py-2">{error}</p>}

            <div className="flex gap-2 justify-end pt-1">
              <Dialog.Close render={
                <button type="button" disabled={loading}
                  className="h-8 px-4 rounded-lg border border-border text-[13px] text-foreground hover:bg-surface-2 transition-colors disabled:opacity-50">
                  Cancelar
                </button>
              } />
              <button type="submit" disabled={loading}
                className="h-8 px-4 rounded-lg bg-primary text-white text-[13px] font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 min-w-20 flex items-center justify-center">
                {loading ? <Spinner size="sm" /> : "Salvar"}
              </button>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
```

Adicionar import do `useEffect` no topo (já deve estar importado da Task 3 via `useCallback` — verificar e adicionar se necessário):
```ts
import { useEffect, useState, useCallback } from "react"
```

- [ ] **Step 3: Verificar no browser**

- "Novo Usuário": modal abre, submit cria e fecha, lista atualiza
- Ícone Pencil: modal abre com nome e role pré-preenchidos, submit atualiza e fecha
- Erros de API: mensagem em vermelho dentro do modal
- Fechar durante loading: não fecha

- [ ] **Step 4: Commit**

```bash
git add "src/app/(app)/users/page.tsx"
git commit -m "feat: modais de criar e editar usuário com gerenciamento de role"
```

---

### Task 5: Drawer de detalhes do usuário (read-only)

**Files:**
- Modify: `src/app/(app)/users/page.tsx` — substituir stub `UserDetailDrawer`

**Interfaces:**
- Consumes: `User` do estado `detailUser`, `AppDrawer` com `open`/`onOpenChange` (definidos na Task 2)
- Consumes: `ROLE_MAP`, `Badge`, `Avatar` — definidos na Task 3

- [ ] **Step 1: Substituir stub `UserDetailDrawer` pela implementação real**

Localizar `function UserDetailDrawer` e substituir por:

```tsx
function UserDetailDrawer({
  user,
  onClose,
}: {
  user: User | null
  onClose: () => void
}) {
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })

  return (
    <AppDrawer
      open={!!user}
      onOpenChange={(next) => { if (!next) onClose() }}
      title="Detalhes do Usuário"
      description={user?.email}
    >
      {user && (
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="flex items-center gap-4">
            <span className="inline-flex size-14 shrink-0 items-center justify-center rounded-full bg-primary text-white text-xl font-semibold">
              {user.name[0]?.toUpperCase()}
            </span>
            <div>
              <div className="font-semibold text-foreground text-[16px]">{user.name}</div>
              <div className="text-muted-foreground text-[13px]">{user.email}</div>
            </div>
          </div>

          <div className="space-y-0">
            <DetailRow label="Role">
              <Badge variant={ROLE_MAP[user.role].variant}>{ROLE_MAP[user.role].label}</Badge>
            </DetailRow>
            <DetailRow label="Status">
              <Badge variant={user.active ? "active" : "danger"}>
                {user.active ? "Ativo" : "Inativo"}
              </Badge>
            </DetailRow>
            {user.deletedAt && (
              <DetailRow label="Situação">
                <Badge variant="danger">Removido</Badge>
              </DetailRow>
            )}
            <DetailRow label="Criado em">
              <span className="text-[13px] text-foreground">{fmt(user.createdAt)}</span>
            </DetailRow>
          </div>
        </div>
      )}
    </AppDrawer>
  )
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <span className="text-[13px] text-muted-foreground">{label}</span>
      {children}
    </div>
  )
}
```

- [ ] **Step 2: Verificar no browser**

- Clicar em Eye em qualquer linha deve abrir o drawer lateral direito
- Conteúdo: avatar grande, nome, email, role badge, status badge, data de criação
- Swipe para fechar (mobile) e botão X devem fechar o drawer
- Clicar em Eye em registro removido deve mostrar badge "Removido"

- [ ] **Step 3: Commit**

```bash
git add "src/app/(app)/users/page.tsx"
git commit -m "feat: drawer de detalhes do usuário (read-only)"
```
