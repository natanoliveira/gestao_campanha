# Módulo Iniciativas — UI + API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar API completa de iniciativas (módulo + rotas nested em projetos) e UI de gestão com tabela, criar/editar via modal, detalhes via drawer e soft delete.

**Architecture:** Módulo `src/modules/initiatives/` (dto + repository + service) + rotas nested em `/api/v1/projects/[id]/initiatives/`. Página única `src/app/(app)/projects/[id]/initiatives/page.tsx` com todos os sub-componentes inline, seguindo exatamente o padrão de `users/page.tsx`. Página de projeto ganha link "Gerenciar Iniciativas" na aba Iniciativas.

**Tech Stack:** Next.js 15 App Router, Prisma v7, base-ui Dialog/Drawer, Tailwind v4, Lucide React, Zod

## Global Constraints

- Bearer JWT: `Authorization: Bearer ${localStorage.getItem("access_token")}`
- Role: `JSON.parse(localStorage.getItem("user") ?? "{}").role`
- Params Next.js 15 são Promise: `const { id, initId } = await params`
- Soft delete: `deletedAt` — `softDelete()` seta `deletedAt: new Date()`
- `ConfirmDialog` para toda ação destrutiva
- `showDeleted: true` bloqueado no servidor para não-ADMIN (strip before Zod parse)
- Criar/editar: ADMIN e MANAGER. Excluir: somente ADMIN
- `dependsOnId` deve pertencer ao mesmo `projectId`; `responsibleId` à mesma `organizationId`
- `goal`, `minGoal`, `raised` são Decimal no Prisma — chegam como string no JSON, converter com `Number()`
- Ordenação padrão: `priority ASC, createdAt ASC`
- Dark theme CSS vars: `--background`, `--card`, `--primary`, `--border`, `--surface-2`

---

### Task 1: Backend — módulo iniciativas (dto + repository + service)

**Files:**
- Create: `src/modules/initiatives/dto.ts`
- Create: `src/modules/initiatives/repository.ts`
- Create: `src/modules/initiatives/service.ts`

**Interfaces:**
- Produces: `initiativeService.{ list, findById, create, update, remove }` consumido pela Task 2
- Produces: tipos `CreateInitiativeDTO`, `UpdateInitiativeDTO`, `ListInitiativesDTO` exportados de dto.ts

- [ ] **Step 1: Criar `src/modules/initiatives/dto.ts`**

```ts
import { z } from "zod";

const statuses = ["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;

export const createInitiativeSchema = z.object({
  name:          z.string().min(2).max(150),
  description:   z.string().optional(),
  goal:          z.coerce.number().positive(),
  minGoal:       z.coerce.number().positive().optional(),
  raised:        z.coerce.number().min(0).optional(),
  priority:      z.coerce.number().int().optional(),
  status:        z.enum(statuses).optional(),
  responsibleId: z.string().uuid().optional(),
  dependsOnId:   z.string().uuid().optional(),
});

export const updateInitiativeSchema = createInitiativeSchema.partial();

export const listInitiativesSchema = z.object({
  status:      z.enum(statuses).optional(),
  q:           z.string().optional(),
  showDeleted: z.coerce.boolean().optional(),
  page:        z.coerce.number().optional(),
  limit:       z.coerce.number().optional(),
});

export type CreateInitiativeDTO = z.infer<typeof createInitiativeSchema>;
export type UpdateInitiativeDTO = z.infer<typeof updateInitiativeSchema>;
export type ListInitiativesDTO  = z.infer<typeof listInitiativesSchema>;
```

- [ ] **Step 2: Criar `src/modules/initiatives/repository.ts`**

```ts
import { prisma } from "@/lib/prisma";
import type { CreateInitiativeDTO, UpdateInitiativeDTO, ListInitiativesDTO } from "./dto";

const select = {
  id: true, projectId: true, organizationId: true,
  name: true, description: true,
  goal: true, minGoal: true, raised: true,
  priority: true, status: true,
  responsibleId: true, dependsOnId: true,
  createdAt: true, deletedAt: true,
};

export const initiativeRepository = {
  findById(id: string, projectId: string) {
    return prisma.initiative.findFirst({ where: { id, projectId, deletedAt: null }, select });
  },

  async list(projectId: string, params: ListInitiativesDTO) {
    const where = {
      projectId,
      ...(!params.showDeleted && { deletedAt: null }),
      ...(params.status && { status: params.status }),
      ...(params.q && { name: { contains: params.q, mode: "insensitive" as const } }),
    };
    const page  = Math.max(1, params.page  ?? 1);
    const limit = Math.min(100, params.limit ?? 50);
    const [data, total] = await Promise.all([
      prisma.initiative.findMany({
        where, select,
        skip: (page - 1) * limit, take: limit,
        orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
      }),
      prisma.initiative.count({ where }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  },

  create(data: CreateInitiativeDTO & { projectId: string; organizationId: string }) {
    return prisma.initiative.create({ data, select });
  },

  update(id: string, data: UpdateInitiativeDTO) {
    return prisma.initiative.update({ where: { id }, data, select });
  },

  softDelete(id: string) {
    return prisma.initiative.update({ where: { id }, data: { deletedAt: new Date() }, select });
  },
};
```

- [ ] **Step 3: Criar `src/modules/initiatives/service.ts`**

```ts
import { initiativeRepository } from "./repository";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import type { CreateInitiativeDTO, UpdateInitiativeDTO, ListInitiativesDTO } from "./dto";

export const initiativeService = {
  list(projectId: string, params: ListInitiativesDTO) {
    return initiativeRepository.list(projectId, params);
  },

  async findById(id: string, projectId: string) {
    const init = await initiativeRepository.findById(id, projectId);
    if (!init) throw new AppError("Iniciativa não encontrada", 404, "NOT_FOUND");
    return init;
  },

  async create(projectId: string, organizationId: string, dto: CreateInitiativeDTO) {
    if (dto.dependsOnId) {
      const dep = await prisma.initiative.findFirst({
        where: { id: dto.dependsOnId, projectId, deletedAt: null },
      });
      if (!dep) throw new AppError("Iniciativa de dependência não encontrada neste projeto", 400, "BAD_REQUEST");
    }
    if (dto.responsibleId) {
      const user = await prisma.user.findFirst({
        where: { id: dto.responsibleId, organizationId, deletedAt: null },
      });
      if (!user) throw new AppError("Responsável não encontrado nesta organização", 400, "BAD_REQUEST");
    }
    return initiativeRepository.create({ ...dto, projectId, organizationId });
  },

  async update(id: string, projectId: string, organizationId: string, dto: UpdateInitiativeDTO) {
    await this.findById(id, projectId);
    if (dto.dependsOnId) {
      if (dto.dependsOnId === id) throw new AppError("Uma iniciativa não pode depender de si mesma", 400, "BAD_REQUEST");
      const dep = await prisma.initiative.findFirst({
        where: { id: dto.dependsOnId, projectId, deletedAt: null },
      });
      if (!dep) throw new AppError("Iniciativa de dependência não encontrada neste projeto", 400, "BAD_REQUEST");
    }
    if (dto.responsibleId) {
      const user = await prisma.user.findFirst({
        where: { id: dto.responsibleId, organizationId, deletedAt: null },
      });
      if (!user) throw new AppError("Responsável não encontrado nesta organização", 400, "BAD_REQUEST");
    }
    return initiativeRepository.update(id, dto);
  },

  async remove(id: string, projectId: string) {
    await this.findById(id, projectId);
    return initiativeRepository.softDelete(id);
  },
};
```

- [ ] **Step 4: Verificar tipos com tsc**

```bash
npx --prefix /Users/natanoliveira/Projetos/javascript/react/gestao_campanha tsc --noEmit
```

Esperado: zero erros.

- [ ] **Step 5: Gerar mensagem de commit (não executar)**

```
feat: módulo de iniciativas (dto, repository, service)
```

---

### Task 2: API routes — iniciativas nested em projetos

**Files:**
- Create: `src/app/api/v1/projects/[id]/initiatives/route.ts`
- Create: `src/app/api/v1/projects/[id]/initiatives/[initId]/route.ts`

**Interfaces:**
- Consumes: `initiativeService` de Task 1, `createInitiativeSchema`, `updateInitiativeSchema`, `listInitiativesSchema`
- Produces: `GET/POST /api/v1/projects/:id/initiatives`, `GET/PUT/DELETE /api/v1/projects/:id/initiatives/:initId`

- [ ] **Step 1: Criar `src/app/api/v1/projects/[id]/initiatives/route.ts`**

```ts
import { NextRequest } from "next/server";
import { authenticate } from "@/middlewares/authenticate";
import { authorize } from "@/middlewares/authorize";
import { initiativeService } from "@/modules/initiatives/service";
import { createInitiativeSchema, listInitiativesSchema } from "@/modules/initiatives/dto";
import { errorResponse } from "@/lib/errors";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  try {
    const payload = authenticate(req);
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const rawParams = Object.fromEntries(searchParams);
    if (rawParams.showDeleted && payload.role !== "ADMIN") delete rawParams.showDeleted;
    const p = listInitiativesSchema.parse(rawParams);
    return Response.json(await initiativeService.list(id, p));
  } catch (e) { return errorResponse(e); }
}

export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const payload = authenticate(req);
    authorize(payload, ["ADMIN", "MANAGER"]);
    const { id } = await params;
    const dto = createInitiativeSchema.parse(await req.json());
    const init = await initiativeService.create(id, payload.organizationId, dto);
    return Response.json(init, { status: 201 });
  } catch (e) { return errorResponse(e); }
}
```

- [ ] **Step 2: Criar `src/app/api/v1/projects/[id]/initiatives/[initId]/route.ts`**

```ts
import { NextRequest } from "next/server";
import { authenticate } from "@/middlewares/authenticate";
import { authorize } from "@/middlewares/authorize";
import { initiativeService } from "@/modules/initiatives/service";
import { updateInitiativeSchema } from "@/modules/initiatives/dto";
import { errorResponse } from "@/lib/errors";

type Ctx = { params: Promise<{ id: string; initId: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  try {
    authenticate(req);
    const { id, initId } = await params;
    return Response.json(await initiativeService.findById(initId, id));
  } catch (e) { return errorResponse(e); }
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  try {
    const payload = authenticate(req);
    authorize(payload, ["ADMIN", "MANAGER"]);
    const { id, initId } = await params;
    const dto = updateInitiativeSchema.parse(await req.json());
    return Response.json(await initiativeService.update(initId, id, payload.organizationId, dto));
  } catch (e) { return errorResponse(e); }
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  try {
    const payload = authenticate(req);
    authorize(payload, ["ADMIN"]);
    const { id, initId } = await params;
    await initiativeService.remove(initId, id);
    return new Response(null, { status: 204 });
  } catch (e) { return errorResponse(e); }
}
```

- [ ] **Step 3: Verificar tipos**

```bash
npx --prefix /Users/natanoliveira/Projetos/javascript/react/gestao_campanha tsc --noEmit
```

Esperado: zero erros.

- [ ] **Step 4: Testar manualmente (com servidor rodando)**

```bash
# Login e listagem (ajustar credenciais)
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"senha123"}' | jq -r '.accessToken')

# Listar iniciativas de um projeto (ajustar PROJECT_ID)
PROJECT_ID="<uuid-de-um-projeto>"
curl -s "http://localhost:3000/api/v1/projects/$PROJECT_ID/initiatives" \
  -H "Authorization: Bearer $TOKEN" | jq '.meta'
```

Esperado: `{ total, page, limit, totalPages }` sem erro 500.

- [ ] **Step 5: Gerar mensagem de commit (não executar)**

```
feat: API de iniciativas (GET, POST, PUT, DELETE) nested em projetos
```

---

### Task 3: Página base — listagem, filtros, skeleton, ações

**Files:**
- Create: `src/app/(app)/projects/[id]/initiatives/page.tsx`

**Interfaces:**
- Consumes: `GET /api/v1/projects/[id]/initiatives`, `GET /api/v1/projects/[id]`, `GET /api/v1/users?limit=100`
- Produces: tipos `Initiative`, `SimpleUser`, `InitStatus`; helpers `getToken()`, `currentRole()`, `fmt()`, `pct()`, `progressVariant()`; constantes `STATUS_MAP`, `STATUSES`; classes `inputCls`, `selectCls`, `textareaCls`; componentes `Skeleton`, `FieldLabel`; estados `initiatives`, `users`, `projectId`, `load()`

- [ ] **Step 1: Criar `src/app/(app)/projects/[id]/initiatives/page.tsx`**

```tsx
"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Eye, Pencil, Trash2, Plus, Search } from "lucide-react"
import { Dialog } from "@base-ui/react/dialog"
import { AppDrawer } from "@/components/shared/app-drawer"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { Badge, type BadgeVariant } from "@/components/ui/badge"
import { ProgressBar } from "@/components/shared/progress-bar"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

type InitStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"

type Initiative = {
  id: string
  name: string
  description: string | null
  goal: string
  minGoal: string | null
  raised: string
  priority: number
  status: InitStatus
  responsibleId: string | null
  dependsOnId: string | null
  createdAt: string
  deletedAt: string | null
}

type SimpleUser = { id: string; name: string }

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_MAP: Record<InitStatus, { variant: BadgeVariant; label: string }> = {
  PENDING:     { variant: "draft",     label: "Pendente"     },
  IN_PROGRESS: { variant: "active",    label: "Em Andamento" },
  COMPLETED:   { variant: "completed", label: "Concluída"    },
  CANCELLED:   { variant: "archived",  label: "Cancelada"    },
}

const STATUSES: InitStatus[] = ["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getToken() { return localStorage.getItem("access_token") ?? "" }

function currentRole(): string | null {
  try { return JSON.parse(localStorage.getItem("user") ?? "{}").role ?? null }
  catch { return null }
}

const fmt = (n: number | string) =>
  Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 })

function pct(raised: string, goal: string) {
  const g = Number(goal)
  return g > 0 ? Math.round((Number(raised) / g) * 100) : 0
}

const progressVariant = (p: number): "default" | "success" | "warning" =>
  p >= 100 ? "success" : p < 40 ? "warning" : "default"

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("rounded bg-border/40 animate-pulse", className)} />
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-[12px] font-medium text-muted-foreground mb-1">{children}</label>
}

const inputCls    = "w-full h-9 px-3 text-[13px] bg-background border border-border rounded-lg text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 transition-colors"
const selectCls   = "w-full h-9 px-3 text-[13px] bg-background border border-border rounded-lg text-foreground outline-none focus:border-ring cursor-pointer"
const textareaCls = "w-full px-3 py-2 text-[13px] bg-background border border-border rounded-lg text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 transition-colors resize-none"

// ─── Página ───────────────────────────────────────────────────────────────────

export default function InitiativesPage() {
  const { id: projectId } = useParams<{ id: string }>()

  const [initiatives, setInitiatives]   = useState<Initiative[] | null>(null)
  const [projectName, setProjectName]   = useState("")
  const [users, setUsers]               = useState<SimpleUser[]>([])
  const [q, setQ]                       = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [showDeleted, setShowDeleted]   = useState(false)
  const [createOpen, setCreateOpen]     = useState(false)
  const [editInit, setEditInit]         = useState<Initiative | null>(null)
  const [detailInit, setDetailInit]     = useState<Initiative | null>(null)

  const role             = currentRole()
  const isAdmin          = role === "ADMIN"
  const isAdminOrManager = role === "ADMIN" || role === "MANAGER"

  const load = useCallback(() => {
    const params = new URLSearchParams()
    if (q)            params.set("q", q)
    if (statusFilter) params.set("status", statusFilter)
    if (showDeleted && isAdmin) params.set("showDeleted", "true")
    setInitiatives(null)
    fetch(`/api/v1/projects/${projectId}/initiatives?${params}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then(r => r.json())
      .then(d => setInitiatives(d.data ?? []))
  }, [projectId, q, statusFilter, showDeleted, isAdmin])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    fetch(`/api/v1/projects/${projectId}`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.json()).then(d => setProjectName(d.name ?? ""))
    fetch(`/api/v1/users?limit=100`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.json()).then(d => setUsers(d.data ?? []))
  }, [projectId])

  async function removeInit(initId: string) {
    const res = await fetch(`/api/v1/projects/${projectId}/initiatives/${initId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${getToken()}` },
    })
    if (!res.ok) throw new Error("Erro ao remover iniciativa")
    load()
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between px-7 py-5 border-b border-border">
        <div>
          <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground mb-1">
            <Link href="/projects" className="hover:text-foreground transition-colors">Projetos</Link>
            <span>/</span>
            <Link href={`/projects/${projectId}`} className="hover:text-foreground transition-colors">
              {projectName || "..."}
            </Link>
            <span>/</span>
            <span className="text-foreground">Iniciativas</span>
          </div>
          <h1 className="text-[18px] font-semibold font-sans">Iniciativas</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            {initiatives
              ? `${initiatives.length} iniciativa${initiatives.length !== 1 ? "s" : ""}`
              : "Carregando..."}
          </p>
        </div>
        {isAdminOrManager && (
          <button
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-primary text-white text-[13px] font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="size-3.5" />
            Nova Iniciativa
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
              onChange={e => setQ(e.target.value)}
              onKeyDown={e => e.key === "Enter" && load()}
              placeholder="Buscar por nome..."
              className="h-8 pl-8 pr-3 w-52 text-[13px] bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 transition-colors"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="h-8 px-3 text-[13px] bg-card border border-border rounded-lg text-foreground outline-none focus:border-ring cursor-pointer"
          >
            <option value="">Todos os status</option>
            {STATUSES.map(s => <option key={s} value={s}>{STATUS_MAP[s].label}</option>)}
          </select>
          {isAdmin && (
            <label className="inline-flex items-center gap-2 h-8 px-3 text-[13px] text-muted-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showDeleted}
                onChange={e => setShowDeleted(e.target.checked)}
                className="accent-primary"
              />
              Mostrar removidas
            </label>
          )}
        </div>

        {/* Tabela */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border text-muted-foreground text-left">
                <th className="px-4 py-3 font-medium w-8">#</th>
                <th className="px-4 py-3 font-medium">Iniciativa</th>
                <th className="px-4 py-3 font-medium min-w-[180px]">Meta</th>
                <th className="px-4 py-3 font-medium">Arrecadado</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Responsável</th>
                <th className="px-4 py-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {/* Skeleton */}
              {!initiatives && [...Array(4)].map((_, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  <td className="px-4 py-3"><Skeleton className="h-3 w-4" /></td>
                  <td className="px-4 py-3">
                    <div className="space-y-1.5">
                      <Skeleton className="h-3 w-36" />
                      <Skeleton className="h-2.5 w-48" />
                    </div>
                  </td>
                  <td className="px-4 py-3"><Skeleton className="h-5 w-28" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-3 w-16" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-5 w-24 rounded-full" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-3 w-24" /></td>
                  <td className="px-4 py-3" />
                </tr>
              ))}

              {/* Empty */}
              {initiatives?.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-muted-foreground">
                    Nenhuma iniciativa encontrada.
                  </td>
                </tr>
              )}

              {/* Rows */}
              {initiatives?.map(init => {
                const p = pct(init.raised, init.goal)
                const responsible = users.find(u => u.id === init.responsibleId)
                return (
                  <tr
                    key={init.id}
                    className={cn(
                      "border-b border-border last:border-0 hover:bg-surface-2/40 transition-colors",
                      init.deletedAt && "opacity-60",
                    )}
                  >
                    <td className="px-4 py-3 text-muted-foreground text-[12px]">{init.priority}</td>
                    <td className="px-4 py-3 max-w-xs">
                      <div className="font-medium text-foreground leading-snug">{init.name}</div>
                      {init.description && (
                        <div className="text-[12px] text-muted-foreground truncate max-w-[220px]">
                          {init.description}
                        </div>
                      )}
                      {init.deletedAt && (
                        <Badge variant="danger" dot={false}>Removida</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 min-w-[180px]">
                      <div className="text-[12px] text-muted-foreground mb-1">
                        {fmt(init.goal)} · {p}%
                      </div>
                      <ProgressBar value={p} variant={progressVariant(p)} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{fmt(init.raised)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_MAP[init.status].variant}>
                        {STATUS_MAP[init.status].label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-muted-foreground">
                      {responsible?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setDetailInit(init)}
                          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-surface-2 transition-colors"
                          title="Ver detalhes"
                        >
                          <Eye className="size-3.5" />
                        </button>
                        {isAdminOrManager && !init.deletedAt && (
                          <>
                            <button
                              onClick={() => setEditInit(init)}
                              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-surface-2 transition-colors"
                              title="Editar"
                            >
                              <Pencil className="size-3.5" />
                            </button>
                            {isAdmin && (
                              <ConfirmDialog
                                trigger={
                                  <button
                                    className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                    title="Excluir"
                                  >
                                    <Trash2 className="size-3.5" />
                                  </button>
                                }
                                title="Excluir iniciativa?"
                                description={`Esta ação marcará "${init.name}" como removida.`}
                                confirmLabel="Excluir"
                                variant="destructive"
                                onConfirm={() => removeInit(init.id)}
                              />
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stubs — substituídos nas Tasks 4-5 */}
      <CreateInitiativeModal
        open={createOpen} onClose={() => setCreateOpen(false)} onCreated={load}
        projectId={projectId} users={users} initiatives={initiatives ?? []}
      />
      <EditInitiativeModal
        init={editInit} onClose={() => setEditInit(null)} onUpdated={load}
        projectId={projectId} users={users} initiatives={initiatives ?? []}
      />
      <InitiativeDetailDrawer
        init={detailInit} onClose={() => setDetailInit(null)}
        users={users} initiatives={initiatives ?? []}
      />
    </div>
  )
}

// ─── Stubs ────────────────────────────────────────────────────────────────────

function CreateInitiativeModal(_: {
  open: boolean; onClose: () => void; onCreated: () => void
  projectId: string; users: SimpleUser[]; initiatives: Initiative[]
}) { return null }

function EditInitiativeModal(_: {
  init: Initiative | null; onClose: () => void; onUpdated: () => void
  projectId: string; users: SimpleUser[]; initiatives: Initiative[]
}) { return null }

function InitiativeDetailDrawer(_: {
  init: Initiative | null; onClose: () => void
  users: SimpleUser[]; initiatives: Initiative[]
}) { return null }
```

- [ ] **Step 2: Verificar tipos**

```bash
npx --prefix /Users/natanoliveira/Projetos/javascript/react/gestao_campanha tsc --noEmit
```

Esperado: zero erros.

- [ ] **Step 3: Verificar no browser**

Abra `http://localhost:3000/projects/<uuid>/initiatives`. Deve mostrar:
- Breadcrumb com nome do projeto
- Filtros: search, status, toggle "Mostrar removidas" (ADMIN)
- Skeleton de 4 linhas durante carregamento
- Tabela com dados (ou "Nenhuma iniciativa encontrada")
- Botão "Nova Iniciativa" para ADMIN/MANAGER

- [ ] **Step 4: Gerar mensagem de commit (não executar)**

```
feat: página base de listagem de iniciativas com tabela e filtros
```

---

### Task 4: Modais criar e editar iniciativa

**Files:**
- Modify: `src/app/(app)/projects/[id]/initiatives/page.tsx` — substituir stubs `CreateInitiativeModal` e `EditInitiativeModal`

**Interfaces:**
- Consumes: `POST /api/v1/projects/[projectId]/initiatives`, `PUT /api/v1/projects/[projectId]/initiatives/[initId]`
- Consumes (do Task 3): `STATUS_MAP`, `STATUSES`, `getToken()`, `inputCls`, `selectCls`, `textareaCls`, `FieldLabel`, `Spinner`, `Initiative`, `SimpleUser`, `InitStatus`

- [ ] **Step 1: Adicionar tipo `InitForm` e helper `InitiativeFormFields` antes dos stubs**

Adicionar imediatamente antes da linha `// ─── Stubs`:

```tsx
type InitForm = {
  name: string; description: string; goal: string; minGoal: string
  raised: string; priority: string; status: InitStatus
  responsibleId: string; dependsOnId: string
}

const emptyForm: InitForm = {
  name: "", description: "", goal: "", minGoal: "",
  raised: "0", priority: "0", status: "PENDING",
  responsibleId: "", dependsOnId: "",
}

function InitiativeFormFields({
  form, setForm, users, initiatives, excludeId,
}: {
  form: InitForm
  setForm: React.Dispatch<React.SetStateAction<InitForm>>
  users: SimpleUser[]
  initiatives: Initiative[]
  excludeId?: string
}) {
  const available = initiatives.filter(i => !i.deletedAt && i.id !== excludeId)
  return (
    <div className="space-y-3">
      <div>
        <FieldLabel>Nome *</FieldLabel>
        <input required minLength={2} maxLength={150} value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          className={inputCls} />
      </div>
      <div>
        <FieldLabel>Descrição</FieldLabel>
        <textarea rows={2} value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          className={textareaCls} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel>Meta (R$) *</FieldLabel>
          <input required type="number" min="0.01" step="0.01" value={form.goal}
            onChange={e => setForm(f => ({ ...f, goal: e.target.value }))}
            className={inputCls} />
        </div>
        <div>
          <FieldLabel>Meta mínima (R$)</FieldLabel>
          <input type="number" min="0" step="0.01" value={form.minGoal}
            onChange={e => setForm(f => ({ ...f, minGoal: e.target.value }))}
            className={inputCls} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel>Arrecadado (R$)</FieldLabel>
          <input type="number" min="0" step="0.01" value={form.raised}
            onChange={e => setForm(f => ({ ...f, raised: e.target.value }))}
            className={inputCls} />
        </div>
        <div>
          <FieldLabel>Prioridade</FieldLabel>
          <input type="number" step="1" value={form.priority}
            onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
            className={inputCls} />
        </div>
      </div>
      <div>
        <FieldLabel>Status</FieldLabel>
        <select value={form.status}
          onChange={e => setForm(f => ({ ...f, status: e.target.value as InitStatus }))}
          className={selectCls}>
          {STATUSES.map(s => <option key={s} value={s}>{STATUS_MAP[s].label}</option>)}
        </select>
      </div>
      <div>
        <FieldLabel>Responsável</FieldLabel>
        <select value={form.responsibleId}
          onChange={e => setForm(f => ({ ...f, responsibleId: e.target.value }))}
          className={selectCls}>
          <option value="">Nenhum</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
      </div>
      <div>
        <FieldLabel>Depende de</FieldLabel>
        <select value={form.dependsOnId}
          onChange={e => setForm(f => ({ ...f, dependsOnId: e.target.value }))}
          className={selectCls}>
          <option value="">Nenhuma</option>
          {available.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
        </select>
      </div>
    </div>
  )
}

const dialogPopupCls = "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg bg-card border border-border rounded-lg p-6 shadow-[0_10px_40px_rgba(0,0,0,.5)] transition-all duration-200 data-[starting-style]:opacity-0 data-[starting-style]:scale-95 data-[ending-style]:opacity-0 data-[ending-style]:scale-95 max-h-[90vh] overflow-y-auto"
const dialogBdCls   = "fixed inset-0 bg-black/50 z-40 transition-opacity duration-200 data-[starting-style]:opacity-0 data-[ending-style]:opacity-0"
const cancelBtnCls  = "h-8 px-4 rounded-lg border border-border text-[13px] text-foreground hover:bg-surface-2 transition-colors disabled:opacity-50"
const submitBtnCls  = "h-8 px-4 rounded-lg bg-primary text-white text-[13px] font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 min-w-20 flex items-center justify-center"
```

- [ ] **Step 2: Substituir stub `CreateInitiativeModal`**

Localizar `function CreateInitiativeModal` no final do arquivo e substituir por:

```tsx
function CreateInitiativeModal({
  open, onClose, onCreated, projectId, users, initiatives,
}: {
  open: boolean; onClose: () => void; onCreated: () => void
  projectId: string; users: SimpleUser[]; initiatives: Initiative[]
}) {
  const [form, setForm]       = useState<InitForm>(emptyForm)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  function handleOpenChange(next: boolean) {
    if (loading) return
    if (!next) { setError(null); setForm(emptyForm); onClose() }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError(null)
    try {
      const body: Record<string, unknown> = {
        name: form.name, goal: form.goal, status: form.status,
        priority: form.priority || 0,
      }
      if (form.description) body.description = form.description
      if (form.minGoal)     body.minGoal     = form.minGoal
      if (form.raised)      body.raised      = form.raised
      if (form.responsibleId) body.responsibleId = form.responsibleId
      if (form.dependsOnId)   body.dependsOnId   = form.dependsOnId

      const res = await fetch(`/api/v1/projects/${projectId}/initiatives`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(body),
      })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error?.message ?? "Erro ao criar") }
      setLoading(false); onCreated(); onClose(); setForm(emptyForm)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ocorreu um erro")
      setLoading(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className={dialogBdCls} />
        <Dialog.Popup className={dialogPopupCls}>
          <Dialog.Title className="text-base font-semibold text-foreground mb-1 font-sans">Nova Iniciativa</Dialog.Title>
          <Dialog.Description className="text-sm text-muted-foreground mb-5">
            Preencha os dados para criar uma nova iniciativa.
          </Dialog.Description>
          <form onSubmit={handleSubmit}>
            <InitiativeFormFields form={form} setForm={setForm} users={users} initiatives={initiatives} />
            {error && <p className="text-xs text-destructive bg-destructive/10 rounded px-3 py-2 mt-3">{error}</p>}
            <div className="flex gap-2 justify-end mt-5">
              <Dialog.Close render={<button type="button" disabled={loading} className={cancelBtnCls}>Cancelar</button>} />
              <button type="submit" disabled={loading} className={submitBtnCls}>
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

- [ ] **Step 3: Substituir stub `EditInitiativeModal`**

Localizar `function EditInitiativeModal` e substituir por:

```tsx
function EditInitiativeModal({
  init, onClose, onUpdated, projectId, users, initiatives,
}: {
  init: Initiative | null; onClose: () => void; onUpdated: () => void
  projectId: string; users: SimpleUser[]; initiatives: Initiative[]
}) {
  const [form, setForm]       = useState<InitForm>(emptyForm)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    if (init) setForm({
      name:          init.name,
      description:   init.description ?? "",
      goal:          init.goal,
      minGoal:       init.minGoal ?? "",
      raised:        init.raised,
      priority:      String(init.priority),
      status:        init.status,
      responsibleId: init.responsibleId ?? "",
      dependsOnId:   init.dependsOnId ?? "",
    })
  }, [init])

  function handleOpenChange(next: boolean) {
    if (loading) return
    if (!next) { setError(null); onClose() }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!init) return
    setLoading(true); setError(null)
    try {
      const body: Record<string, unknown> = {
        name: form.name, goal: form.goal, status: form.status,
        raised: form.raised, priority: form.priority,
      }
      if (form.description)   body.description   = form.description
      if (form.minGoal)       body.minGoal       = form.minGoal
      body.responsibleId = form.responsibleId || null
      body.dependsOnId   = form.dependsOnId   || null

      const res = await fetch(`/api/v1/projects/${projectId}/initiatives/${init.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(body),
      })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error?.message ?? "Erro ao atualizar") }
      setLoading(false); onUpdated(); onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ocorreu um erro")
      setLoading(false)
    }
  }

  return (
    <Dialog.Root open={!!init} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className={dialogBdCls} />
        <Dialog.Popup className={dialogPopupCls}>
          <Dialog.Title className="text-base font-semibold text-foreground mb-1 font-sans">Editar Iniciativa</Dialog.Title>
          <Dialog.Description className="text-sm text-muted-foreground mb-5">{init?.name}</Dialog.Description>
          <form onSubmit={handleSubmit}>
            <InitiativeFormFields form={form} setForm={setForm} users={users} initiatives={initiatives} excludeId={init?.id} />
            {error && <p className="text-xs text-destructive bg-destructive/10 rounded px-3 py-2 mt-3">{error}</p>}
            <div className="flex gap-2 justify-end mt-5">
              <Dialog.Close render={<button type="button" disabled={loading} className={cancelBtnCls}>Cancelar</button>} />
              <button type="submit" disabled={loading} className={submitBtnCls}>
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

- [ ] **Step 4: Verificar tipos e funcionamento**

```bash
npx --prefix /Users/natanoliveira/Projetos/javascript/react/gestao_campanha tsc --noEmit
```

No browser: "Nova Iniciativa" abre modal com todos os 9 campos. Submit cria e fecha. Pencil abre modal com dados pré-preenchidos. Erros da API aparecem em vermelho.

- [ ] **Step 5: Gerar mensagem de commit (não executar)**

```
feat: modais de criar e editar iniciativa com todos os campos
```

---

### Task 5: Drawer de detalhes + link "Gerenciar" no projeto

**Files:**
- Modify: `src/app/(app)/projects/[id]/initiatives/page.tsx` — substituir stub `InitiativeDetailDrawer`
- Modify: `src/app/(app)/projects/[id]/page.tsx` — adicionar link "Gerenciar Iniciativas" na aba Iniciativas

**Interfaces:**
- Consumes: `AppDrawer` com `open`/`onOpenChange` (Task 2 do módulo Usuários já adicionou esses props)
- Consumes (do Task 3): `fmt()`, `pct()`, `progressVariant()`, `STATUS_MAP`, `Badge`, `ProgressBar`, `Initiative`, `SimpleUser`

- [ ] **Step 1: Substituir stub `InitiativeDetailDrawer`**

Localizar `function InitiativeDetailDrawer` e substituir por:

```tsx
function InitiativeDetailDrawer({
  init, onClose, users, initiatives,
}: {
  init: Initiative | null; onClose: () => void
  users: SimpleUser[]; initiatives: Initiative[]
}) {
  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })

  const responsible = users.find(u => u.id === init?.responsibleId)
  const dependsOn   = initiatives.find(i => i.id === init?.dependsOnId)
  const p           = init ? pct(init.raised, init.goal) : 0

  return (
    <AppDrawer
      open={!!init}
      onOpenChange={next => { if (!next) onClose() }}
      title="Detalhes da Iniciativa"
      description={init?.name}
    >
      {init && (
        <div className="space-y-0 px-6 py-4">
          {/* Progresso */}
          <div className="mb-5">
            <div className="flex justify-between text-[12px] text-muted-foreground mb-1.5">
              <span>{fmt(init.raised)} arrecadados</span>
              <span>{p}%</span>
            </div>
            <ProgressBar value={p} variant={progressVariant(p)} />
            <div className="text-[12px] text-muted-foreground mt-1">
              Meta: {fmt(init.goal)}
              {init.minGoal && ` · Mínima: ${fmt(init.minGoal)}`}
            </div>
          </div>

          <DrawerRow label="Status">
            <Badge variant={STATUS_MAP[init.status].variant}>{STATUS_MAP[init.status].label}</Badge>
          </DrawerRow>
          <DrawerRow label="Prioridade">
            <span className="text-[13px] text-foreground">{init.priority}</span>
          </DrawerRow>
          <DrawerRow label="Responsável">
            <span className="text-[13px] text-foreground">{responsible?.name ?? "—"}</span>
          </DrawerRow>
          <DrawerRow label="Depende de">
            <span className="text-[13px] text-foreground">{dependsOn?.name ?? "—"}</span>
          </DrawerRow>
          {init.description && (
            <div className="py-3 border-b border-border">
              <p className="text-[12px] text-muted-foreground mb-1">Descrição</p>
              <p className="text-[13px] text-foreground leading-relaxed">{init.description}</p>
            </div>
          )}
          <DrawerRow label="Criada em">
            <span className="text-[13px] text-foreground">{fmtDate(init.createdAt)}</span>
          </DrawerRow>
          {init.deletedAt && (
            <DrawerRow label="Situação">
              <Badge variant="danger">Removida</Badge>
            </DrawerRow>
          )}
        </div>
      )}
    </AppDrawer>
  )
}

function DrawerRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <span className="text-[13px] text-muted-foreground">{label}</span>
      {children}
    </div>
  )
}
```

- [ ] **Step 2: Adicionar link "Gerenciar Iniciativas" em `/projects/[id]/page.tsx`**

Abrir `src/app/(app)/projects/[id]/page.tsx`. Localizar o bloco `{tab === "iniciativas" && (` e adicionar o link logo após a abertura do `<div className="space-y-2.5">`:

```tsx
{tab === "iniciativas" && (
  <div className="space-y-2.5">
    {/* Link para gestão completa */}
    <div className="flex justify-end mb-1">
      <Link
        href={`/projects/${project?.id}/initiatives`}
        className="text-[12px] text-primary hover:underline"
      >
        Gerenciar Iniciativas →
      </Link>
    </div>

    {project?.initiatives.length === 0 && (
      <p className="text-[13px] text-muted-foreground">Nenhuma iniciativa cadastrada.</p>
    )}
    {project?.initiatives.map((init) => <InitiativeCard key={init.id} init={init} />)}
  </div>
)}
```

Verificar que `Link` já está importado no topo do arquivo (já estava no código original).

- [ ] **Step 3: Verificar tipos**

```bash
npx --prefix /Users/natanoliveira/Projetos/javascript/react/gestao_campanha tsc --noEmit
```

- [ ] **Step 4: Verificar no browser**

- Clicar em Eye na tabela de iniciativas → drawer abre com progresso, status, responsável, depende de, descrição, data
- Ir em `/projects/<id>` → aba "Iniciativas" → link "Gerenciar Iniciativas →" aparece e navega para `/projects/<id>/initiatives`

- [ ] **Step 5: Gerar mensagem de commit (não executar)**

```
feat: drawer de detalhes de iniciativa e link Gerenciar na aba do projeto
```
