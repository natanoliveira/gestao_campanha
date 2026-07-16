# Financial Categories + Initiative Financial — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir categorias de texto livre por `FinancialCategory` (org-level), tornar `initiativeId` obrigatório em entradas e despesas, calcular `raised` da iniciativa via SUM, e mover formulários financeiros para um modal de iniciativa com abas.

**Architecture:** Modelo `FinancialCategory` org-scoped com enum ENTRY|EXIT. Entradas e saídas sempre vinculadas a uma iniciativa. `Initiative.raised` removido — computado via SUM das entries. Modal grande de iniciativa substitui drawer read-only, com abas Detalhes·Entradas·Despesas. ContasTab do projeto vira rollup somente leitura.

**Tech Stack:** Next.js 15 App Router, Prisma v7 (Neon Postgres), Zod, Tailwind v4, Lucide React, base-ui Dialog

## Global Constraints

- Bearer JWT: `Authorization: Bearer ${localStorage.getItem("access_token")}`
- Role: `JSON.parse(localStorage.getItem("user") ?? "{}").role ?? null`
- Params Next.js 15 são Promise: `const { id } = await params`
- Soft delete: `deletedAt: null` em todos os `where`; `softDelete` seta `deletedAt: new Date()`
- Tenant isolation: `organizationId` em todas as queries
- Criar/editar: ADMIN e MANAGER. Excluir: somente ADMIN
- `ConfirmDialog` para toda ação destrutiva
- `CurrencyInput` de `@/components/shared/currency-input` em todos campos de valor monetário
- `AppError(message, statusCode, code)` — ex: `new AppError("Não encontrado", 404, "NOT_FOUND")`
- Dark theme: `--background`, `--card`, `--primary`, `--border`, `--surface-2`, `--text-subtle`, `--success`, `--destructive`
- `inputCls = "w-full h-8 px-3 text-[13px] bg-background border border-border rounded-lg text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 transition-colors"`
- `getToken()` = `localStorage.getItem("access_token") ?? ""`
- `currentRole()` = `JSON.parse(localStorage.getItem("user") ?? "{}").role ?? null`

## File Map

**Remover:**
- `src/modules/financial/entry-categories.dto.ts`
- `src/modules/financial/entry-categories.repository.ts`
- `src/modules/financial/entry-categories.service.ts`
- `src/app/api/v1/projects/[id]/financial-entry-categories/route.ts`
- `src/app/api/v1/projects/[id]/financial-entry-categories/[catId]/route.ts`
- `src/app/api/v1/projects/[id]/financial-entries/report/route.ts` (recriar)

**Criar:**
- `src/modules/financial-categories/dto.ts`
- `src/modules/financial-categories/repository.ts`
- `src/modules/financial-categories/service.ts`
- `src/app/api/v1/financial-categories/route.ts`
- `src/app/api/v1/financial-categories/[id]/route.ts`
- `src/app/api/v1/projects/[id]/financial-entries/report/route.ts`
- `src/app/api/v1/projects/[id]/financial-exits/report/route.ts`
- `src/app/api/v1/projects/[id]/initiatives/[initId]/entries/route.ts`
- `src/app/api/v1/projects/[id]/initiatives/[initId]/entries/[entryId]/route.ts`
- `src/app/api/v1/projects/[id]/initiatives/[initId]/exits/route.ts`
- `src/app/api/v1/projects/[id]/initiatives/[initId]/exits/[exitId]/route.ts`
- `src/app/(app)/financial-categories/page.tsx`

**Modificar:**
- `prisma/schema.prisma`
- `prisma/seed.ts`
- `src/modules/financial/dto.ts`
- `src/modules/financial/repository.ts`
- `src/modules/initiatives/repository.ts`
- `src/modules/initiatives/service.ts`
- `src/modules/projects/repository.ts`
- `src/app/api/v1/dashboard/stats/route.ts`
- `src/app/(app)/projects/[id]/initiatives/page.tsx` (modal substitui drawer)
- `src/app/(app)/projects/[id]/page.tsx` (ContasTab vira rollup)
- `src/app/(app)/dashboard/page.tsx`

---

### Task 1: Schema + Migration

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `prisma/seed.ts`

**Interfaces:**
- Produces: enum `FinancialCategoryType`, model `FinancialCategory`, `FinancialEntry.initiativeId` obrigatório, `FinancialExit.initiativeId` obrigatório e `categoryId` FK, `Initiative` sem `raised` e com relações `entries`/`exits`

- [ ] **Step 1: Adicionar enum e model `FinancialCategory` em `prisma/schema.prisma`**

Remover o model `FinancialEntryCategory` inteiro (aprox 15 linhas com `@@map("financial_entry_categories")`).

Remover de `model Project`:
```prisma
  financialEntryCategories FinancialEntryCategory[]
```

Adicionar em `model Organization` (após `auditLogs AuditLog[]`):
```prisma
  financialCategories FinancialCategory[]
```

Adicionar **antes** de `model FinancialEntry`:
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

- [ ] **Step 2: Atualizar `model FinancialEntry`**

Tornar `initiativeId` obrigatório (remove `?`):
```prisma
  initiativeId   String
```

Substituir FK antiga `FinancialEntryCategory` por `FinancialCategory`:
```prisma
  category  FinancialCategory? @relation(fields: [categoryId], references: [id])
```

Adicionar relação com Initiative:
```prisma
  initiative Initiative @relation(fields: [initiativeId], references: [id])
```

- [ ] **Step 3: Atualizar `model FinancialExit`**

Tornar `initiativeId` obrigatório (remove `?`):
```prisma
  initiativeId   String
```

Substituir `category String?` por:
```prisma
  categoryId     String?
```

Adicionar relações:
```prisma
  category   FinancialCategory? @relation(fields: [categoryId], references: [id])
  initiative Initiative         @relation(fields: [initiativeId], references: [id])
```

Adicionar index:
```prisma
  @@index([categoryId])
```

- [ ] **Step 4: Atualizar `model Initiative`**

Remover campo:
```prisma
  raised         Decimal          @default(0) @db.Decimal(12, 2)
```

Adicionar relações (após relações existentes de `project`, `responsible`, `dependsOn`):
```prisma
  entries FinancialEntry[]
  exits   FinancialExit[]
```

- [ ] **Step 5: Aplicar ao banco e gerar client**

```bash
npx prisma db push --accept-data-loss
npx prisma generate
```

Esperado: `Your database is now in sync` e `Generated Prisma Client`.

- [ ] **Step 6: Atualizar `prisma/seed.ts` — remover `raised` de initiatives e adicionar entries vinculadas**

Localizar onde initiatives são criadas no seed. Remover `raised` de qualquer `create`/`upsert` de Initiative.

Se houver `financialEntry.createMany` com `initiativeId: undefined` ou sem initiativeId, vincular a uma initiative existente. Exemplo:
```ts
const initiative = await prisma.initiative.findFirst({ where: { projectId: project.id } });
await prisma.financialEntry.createMany({
  data: [
    { projectId: project.id, organizationId: org.id, createdById: tesoureiro!.id,
      initiativeId: initiative!.id, description: "Doação membro João", amount: 500, date: new Date("2025-02-01") },
    { projectId: project.id, organizationId: org.id, createdById: tesoureiro!.id,
      initiativeId: initiative!.id, description: "Campanha online", amount: 3200, date: new Date("2025-03-15") },
  ],
});
```

- [ ] **Step 7: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Esperado: zero erros (módulos ainda não atualizados gerarão erros — corrigir nas tasks seguintes).

- [ ] **Step 8: Commit**

```
feat: schema FinancialCategory org-level, initiativeId obrigatório, raised removido de Initiative
```

---

### Task 2: Módulo `financial-categories` (dto + repository + service)

**Files:**
- Create: `src/modules/financial-categories/dto.ts`
- Create: `src/modules/financial-categories/repository.ts`
- Create: `src/modules/financial-categories/service.ts`
- Delete: `src/modules/financial/entry-categories.dto.ts`
- Delete: `src/modules/financial/entry-categories.repository.ts`
- Delete: `src/modules/financial/entry-categories.service.ts`

**Interfaces:**
- Consumes: `prisma.financialCategory` (Task 1)
- Produces: `financialCategoryService.{ list, create, update, remove, reportEntries, reportExits }` consumido pelas Tasks 3 e 8

- [ ] **Step 1: Criar `src/modules/financial-categories/dto.ts`**

```ts
import { z } from "zod";

export const createFinancialCategorySchema = z.object({
  name: z.string().min(1).max(80),
  type: z.enum(["ENTRY", "EXIT"]),
});

export const updateFinancialCategorySchema = z.object({
  name: z.string().min(1).max(80),
});

export type CreateFinancialCategoryDTO = z.infer<typeof createFinancialCategorySchema>;
export type UpdateFinancialCategoryDTO = z.infer<typeof updateFinancialCategorySchema>;
```

- [ ] **Step 2: Criar `src/modules/financial-categories/repository.ts`**

```ts
import { prisma } from "@/lib/prisma";
import type { CreateFinancialCategoryDTO, UpdateFinancialCategoryDTO } from "./dto";
import type { FinancialCategoryType } from "@/generated/prisma";

const select = { id: true, name: true, type: true, createdAt: true };

export const financialCategoryRepository = {
  list(organizationId: string, type?: FinancialCategoryType) {
    return prisma.financialCategory.findMany({
      where: { organizationId, deletedAt: null, ...(type ? { type } : {}) },
      select,
      orderBy: { name: "asc" },
    });
  },

  create(data: CreateFinancialCategoryDTO & { organizationId: string }) {
    return prisma.financialCategory.create({ data, select });
  },

  findById(id: string, organizationId: string) {
    return prisma.financialCategory.findFirst({
      where: { id, organizationId, deletedAt: null },
      select: { id: true },
    });
  },

  update(id: string, data: UpdateFinancialCategoryDTO) {
    return prisma.financialCategory.update({ where: { id }, data, select });
  },

  softDelete(id: string) {
    return prisma.financialCategory.update({ where: { id }, data: { deletedAt: new Date() } });
  },

  reportEntries(projectId: string, organizationId: string) {
    return prisma.financialEntry.groupBy({
      by: ["categoryId"],
      where: { projectId, organizationId, deletedAt: null },
      _sum: { amount: true },
      _count: { id: true },
    });
  },

  reportExits(projectId: string, organizationId: string) {
    return prisma.financialExit.groupBy({
      by: ["categoryId"],
      where: { projectId, organizationId, deletedAt: null },
      _sum: { amount: true },
      _count: { id: true },
    });
  },
};
```

- [ ] **Step 3: Criar `src/modules/financial-categories/service.ts`**

```ts
import { AppError } from "@/lib/errors";
import { financialCategoryRepository } from "./repository";
import type { CreateFinancialCategoryDTO, UpdateFinancialCategoryDTO } from "./dto";
import type { FinancialCategoryType } from "@/generated/prisma";

async function buildReport(
  rows: { categoryId: string | null; _sum: { amount: unknown }; _count: { id: number } }[],
  organizationId: string,
  type: FinancialCategoryType,
) {
  const cats = await financialCategoryRepository.list(organizationId, type);
  const catMap = new Map(cats.map((c) => [c.id, c.name]));
  return rows.map((r) => ({
    categoryId:   r.categoryId,
    categoryName: r.categoryId ? (catMap.get(r.categoryId) ?? "Removida") : null,
    total:        Number(r._sum.amount ?? 0),
    count:        r._count.id,
  }));
}

export const financialCategoryService = {
  list(organizationId: string, type?: FinancialCategoryType) {
    return financialCategoryRepository.list(organizationId, type);
  },

  create(organizationId: string, dto: CreateFinancialCategoryDTO) {
    return financialCategoryRepository.create({ ...dto, organizationId });
  },

  async update(id: string, organizationId: string, dto: UpdateFinancialCategoryDTO) {
    const cat = await financialCategoryRepository.findById(id, organizationId);
    if (!cat) throw new AppError("Categoria não encontrada", 404, "NOT_FOUND");
    return financialCategoryRepository.update(id, dto);
  },

  async remove(id: string, organizationId: string) {
    const cat = await financialCategoryRepository.findById(id, organizationId);
    if (!cat) throw new AppError("Categoria não encontrada", 404, "NOT_FOUND");
    await financialCategoryRepository.softDelete(id);
  },

  async reportEntries(projectId: string, organizationId: string) {
    const rows = await financialCategoryRepository.reportEntries(projectId, organizationId);
    return buildReport(rows, organizationId, "ENTRY");
  },

  async reportExits(projectId: string, organizationId: string) {
    const rows = await financialCategoryRepository.reportExits(projectId, organizationId);
    return buildReport(rows, organizationId, "EXIT");
  },
};
```

- [ ] **Step 4: Deletar arquivos obsoletos**

```bash
rm src/modules/financial/entry-categories.dto.ts
rm src/modules/financial/entry-categories.repository.ts
rm src/modules/financial/entry-categories.service.ts
```

- [ ] **Step 5: Verificar TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```
feat: módulo financial-categories (dto, repository, service) org-level com reports
```

---

### Task 3: Atualizar módulo `financial` e `initiatives` (dto, repo, service)

**Files:**
- Modify: `src/modules/financial/dto.ts`
- Modify: `src/modules/financial/repository.ts`
- Modify: `src/modules/initiatives/repository.ts`
- Modify: `src/modules/initiatives/service.ts`
- Modify: `src/modules/projects/repository.ts`

**Interfaces:**
- Consumes: schema atualizado (Task 1), `FinancialCategory` via Prisma Client
- Produces: `financialRepository` com exits usando `categoryId`; `initiativeService.findById` retorna `raised` computado; `projectRepository.findById` retorna entries/exits com `category { id, name }`

- [ ] **Step 1: Atualizar `src/modules/financial/dto.ts`**

```ts
import { z } from "zod";

const base = z.object({
  description:  z.string().min(1).max(200),
  amount:       z.coerce.number().positive(),
  date:         z.string().datetime({ offset: true }),
});

export const createFinancialEntrySchema = base.extend({
  categoryId: z.string().uuid().optional(),
});

export const createFinancialExitSchema = base.extend({
  categoryId: z.string().uuid().optional(),
  supplier:   z.string().max(120).optional(),
});

export type CreateFinancialEntryDTO = z.infer<typeof createFinancialEntrySchema>;
export type CreateFinancialExitDTO  = z.infer<typeof createFinancialExitSchema>;
```

- [ ] **Step 2: Atualizar `src/modules/financial/repository.ts`**

```ts
import { prisma } from "@/lib/prisma";
import type { CreateFinancialEntryDTO, CreateFinancialExitDTO } from "./dto";

const catSelect = { select: { id: true, name: true } };

const entrySelect = {
  id: true, description: true, amount: true, date: true,
  categoryId: true, deletedAt: true,
  category: catSelect,
};

const exitSelect = {
  id: true, description: true, amount: true, date: true,
  categoryId: true, supplier: true, deletedAt: true,
  category: catSelect,
};

export const financialRepository = {
  listEntries(initiativeId: string, organizationId: string) {
    return prisma.financialEntry.findMany({
      where: { initiativeId, organizationId, deletedAt: null },
      select: entrySelect,
      orderBy: { date: "desc" },
    });
  },

  createEntry(data: CreateFinancialEntryDTO & { projectId: string; initiativeId: string; organizationId: string; createdById: string }) {
    return prisma.financialEntry.create({ data: { ...data, date: new Date(data.date) }, select: entrySelect });
  },

  findEntry(id: string, initiativeId: string) {
    return prisma.financialEntry.findFirst({ where: { id, initiativeId, deletedAt: null }, select: { id: true } });
  },

  softDeleteEntry(id: string) {
    return prisma.financialEntry.update({ where: { id }, data: { deletedAt: new Date() } });
  },

  listExits(initiativeId: string, organizationId: string) {
    return prisma.financialExit.findMany({
      where: { initiativeId, organizationId, deletedAt: null },
      select: exitSelect,
      orderBy: { date: "desc" },
    });
  },

  createExit(data: CreateFinancialExitDTO & { projectId: string; initiativeId: string; organizationId: string; createdById: string }) {
    return prisma.financialExit.create({ data: { ...data, date: new Date(data.date) }, select: exitSelect });
  },

  findExit(id: string, initiativeId: string) {
    return prisma.financialExit.findFirst({ where: { id, initiativeId, deletedAt: null }, select: { id: true } });
  },

  softDeleteExit(id: string) {
    return prisma.financialExit.update({ where: { id }, data: { deletedAt: new Date() } });
  },
};
```

- [ ] **Step 3: Atualizar `src/modules/financial/service.ts`**

```ts
import { financialRepository } from "./repository";
import { AppError } from "@/lib/errors";
import type { CreateFinancialEntryDTO, CreateFinancialExitDTO } from "./dto";

export const financialService = {
  listEntries: (initiativeId: string, orgId: string) =>
    financialRepository.listEntries(initiativeId, orgId),

  createEntry(projectId: string, initiativeId: string, orgId: string, userId: string, dto: CreateFinancialEntryDTO) {
    return financialRepository.createEntry({ ...dto, projectId, initiativeId, organizationId: orgId, createdById: userId });
  },

  async removeEntry(id: string, initiativeId: string) {
    const e = await financialRepository.findEntry(id, initiativeId);
    if (!e) throw new AppError("Lançamento não encontrado", 404, "NOT_FOUND");
    return financialRepository.softDeleteEntry(id);
  },

  listExits: (initiativeId: string, orgId: string) =>
    financialRepository.listExits(initiativeId, orgId),

  createExit(projectId: string, initiativeId: string, orgId: string, userId: string, dto: CreateFinancialExitDTO) {
    return financialRepository.createExit({ ...dto, projectId, initiativeId, organizationId: orgId, createdById: userId });
  },

  async removeExit(id: string, initiativeId: string) {
    const e = await financialRepository.findExit(id, initiativeId);
    if (!e) throw new AppError("Lançamento não encontrado", 404, "NOT_FOUND");
    return financialRepository.softDeleteExit(id);
  },
};
```

- [ ] **Step 4: Atualizar `src/modules/initiatives/repository.ts` — `findById` inclui entries para computar raised**

No método `findById`, adicionar ao select:
```ts
entries: { where: { deletedAt: null }, select: { amount: true } },
exits:   { where: { deletedAt: null }, select: { amount: true } },
```

- [ ] **Step 5: Atualizar `src/modules/initiatives/service.ts` — computar `raised` e `spent`**

No método `findById`, após buscar a iniciativa, adicionar:
```ts
if (!initiative) throw new AppError("Iniciativa não encontrada", 404, "NOT_FOUND");
const raised = initiative.entries.reduce((s, e) => s + Number(e.amount), 0);
const spent  = initiative.exits.reduce((s, e) => s + Number(e.amount), 0);
return { ...initiative, raised, spent };
```

No método `list`, o select de initiatives deve incluir entries para exibir raised nas listagens:
```ts
initiatives: {
  where: { deletedAt: null },
  select: {
    ...campos existentes...,
    entries: { where: { deletedAt: null }, select: { amount: true } },
  }
}
```
E no mapeamento retornar `raised` computado em vez do campo.

- [ ] **Step 6: Atualizar `src/modules/projects/repository.ts` — select de entries/exits**

No `findById`, substituir selects de `financialEntries` e `financialExits`:
```ts
financialEntries: {
  where: { deletedAt: null },
  orderBy: { date: "desc" },
  select: {
    id: true, description: true, amount: true, date: true,
    categoryId: true, initiativeId: true,
    category: { select: { id: true, name: true } },
    initiative: { select: { id: true, name: true } },
  },
},
financialExits: {
  where: { deletedAt: null },
  orderBy: { date: "desc" },
  select: {
    id: true, description: true, amount: true, date: true,
    categoryId: true, supplier: true, initiativeId: true,
    category: { select: { id: true, name: true } },
    initiative: { select: { id: true, name: true } },
  },
},
```

- [ ] **Step 7: Verificar TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 8: Commit**

```
fix: financial dto/repo/service usa initiativeId obrigatório; initiatives computa raised via SUM
```

---

### Task 4: API Routes — categorias, entries/exits de iniciativa, reports, dashboard

**Files:**
- Create: `src/app/api/v1/financial-categories/route.ts`
- Create: `src/app/api/v1/financial-categories/[id]/route.ts`
- Create: `src/app/api/v1/projects/[id]/initiatives/[initId]/entries/route.ts`
- Create: `src/app/api/v1/projects/[id]/initiatives/[initId]/entries/[entryId]/route.ts`
- Create: `src/app/api/v1/projects/[id]/initiatives/[initId]/exits/route.ts`
- Create: `src/app/api/v1/projects/[id]/initiatives/[initId]/exits/[exitId]/route.ts`
- Modify: `src/app/api/v1/projects/[id]/financial-entries/report/route.ts`
- Create: `src/app/api/v1/projects/[id]/financial-exits/report/route.ts`
- Delete: `src/app/api/v1/projects/[id]/financial-entry-categories/route.ts`
- Delete: `src/app/api/v1/projects/[id]/financial-entry-categories/[catId]/route.ts`
- Modify: `src/app/api/v1/projects/[id]/financial-entries/route.ts` (remover — entries agora são por iniciativa)
- Modify: `src/app/api/v1/projects/[id]/financial-exits/route.ts` (remover — exits agora são por iniciativa)
- Modify: `src/app/api/v1/dashboard/stats/route.ts`

**Interfaces:**
- Consumes: `financialCategoryService` (Task 2), `financialService` (Task 3)
- Produces: todos os endpoints consumidos pelas Tasks 5-7

- [ ] **Step 1: Criar `src/app/api/v1/financial-categories/route.ts`**

```ts
import { NextRequest } from "next/server";
import { authenticate } from "@/middlewares/authenticate";
import { authorize } from "@/middlewares/authorize";
import { financialCategoryService } from "@/modules/financial-categories/service";
import { createFinancialCategorySchema } from "@/modules/financial-categories/dto";
import { errorResponse } from "@/lib/errors";
import type { FinancialCategoryType } from "@/generated/prisma";

export async function GET(req: NextRequest) {
  try {
    const payload = authenticate(req);
    const type = req.nextUrl.searchParams.get("type") as FinancialCategoryType | null;
    return Response.json(await financialCategoryService.list(payload.organizationId, type ?? undefined));
  } catch (e) { return errorResponse(e); }
}

export async function POST(req: NextRequest) {
  try {
    const payload = authenticate(req);
    authorize(payload, ["ADMIN", "MANAGER"]);
    const dto = createFinancialCategorySchema.parse(await req.json());
    return Response.json(await financialCategoryService.create(payload.organizationId, dto), { status: 201 });
  } catch (e) { return errorResponse(e); }
}
```

- [ ] **Step 2: Criar `src/app/api/v1/financial-categories/[id]/route.ts`**

```ts
import { NextRequest } from "next/server";
import { authenticate } from "@/middlewares/authenticate";
import { authorize } from "@/middlewares/authorize";
import { financialCategoryService } from "@/modules/financial-categories/service";
import { updateFinancialCategorySchema } from "@/modules/financial-categories/dto";
import { errorResponse } from "@/lib/errors";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Ctx) {
  try {
    const payload = authenticate(req);
    authorize(payload, ["ADMIN", "MANAGER"]);
    const { id } = await params;
    const dto = updateFinancialCategorySchema.parse(await req.json());
    return Response.json(await financialCategoryService.update(id, payload.organizationId, dto));
  } catch (e) { return errorResponse(e); }
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  try {
    const payload = authenticate(req);
    authorize(payload, ["ADMIN"]);
    const { id } = await params;
    await financialCategoryService.remove(id, payload.organizationId);
    return new Response(null, { status: 204 });
  } catch (e) { return errorResponse(e); }
}
```

- [ ] **Step 3: Criar `src/app/api/v1/projects/[id]/initiatives/[initId]/entries/route.ts`**

```ts
import { NextRequest } from "next/server";
import { authenticate } from "@/middlewares/authenticate";
import { authorize } from "@/middlewares/authorize";
import { financialService } from "@/modules/financial/service";
import { createFinancialEntrySchema } from "@/modules/financial/dto";
import { errorResponse } from "@/lib/errors";

type Ctx = { params: Promise<{ id: string; initId: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  try {
    const payload = authenticate(req);
    const { initId } = await params;
    return Response.json(await financialService.listEntries(initId, payload.organizationId));
  } catch (e) { return errorResponse(e); }
}

export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const payload = authenticate(req);
    authorize(payload, ["ADMIN", "MANAGER"]);
    const { id, initId } = await params;
    const dto = createFinancialEntrySchema.parse(await req.json());
    return Response.json(
      await financialService.createEntry(id, initId, payload.organizationId, payload.userId, dto),
      { status: 201 }
    );
  } catch (e) { return errorResponse(e); }
}
```

- [ ] **Step 4: Criar `src/app/api/v1/projects/[id]/initiatives/[initId]/entries/[entryId]/route.ts`**

```ts
import { NextRequest } from "next/server";
import { authenticate } from "@/middlewares/authenticate";
import { authorize } from "@/middlewares/authorize";
import { financialService } from "@/modules/financial/service";
import { errorResponse } from "@/lib/errors";

type Ctx = { params: Promise<{ initId: string; entryId: string }> };

export async function DELETE(req: NextRequest, { params }: Ctx) {
  try {
    const payload = authenticate(req);
    authorize(payload, ["ADMIN"]);
    const { initId, entryId } = await params;
    await financialService.removeEntry(entryId, initId);
    return new Response(null, { status: 204 });
  } catch (e) { return errorResponse(e); }
}
```

- [ ] **Step 5: Criar `src/app/api/v1/projects/[id]/initiatives/[initId]/exits/route.ts`**

```ts
import { NextRequest } from "next/server";
import { authenticate } from "@/middlewares/authenticate";
import { authorize } from "@/middlewares/authorize";
import { financialService } from "@/modules/financial/service";
import { createFinancialExitSchema } from "@/modules/financial/dto";
import { errorResponse } from "@/lib/errors";

type Ctx = { params: Promise<{ id: string; initId: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  try {
    const payload = authenticate(req);
    const { initId } = await params;
    return Response.json(await financialService.listExits(initId, payload.organizationId));
  } catch (e) { return errorResponse(e); }
}

export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const payload = authenticate(req);
    authorize(payload, ["ADMIN", "MANAGER"]);
    const { id, initId } = await params;
    const dto = createFinancialExitSchema.parse(await req.json());
    return Response.json(
      await financialService.createExit(id, initId, payload.organizationId, payload.userId, dto),
      { status: 201 }
    );
  } catch (e) { return errorResponse(e); }
}
```

- [ ] **Step 6: Criar `src/app/api/v1/projects/[id]/initiatives/[initId]/exits/[exitId]/route.ts`**

```ts
import { NextRequest } from "next/server";
import { authenticate } from "@/middlewares/authenticate";
import { authorize } from "@/middlewares/authorize";
import { financialService } from "@/modules/financial/service";
import { errorResponse } from "@/lib/errors";

type Ctx = { params: Promise<{ initId: string; exitId: string }> };

export async function DELETE(req: NextRequest, { params }: Ctx) {
  try {
    const payload = authenticate(req);
    authorize(payload, ["ADMIN"]);
    const { initId, exitId } = await params;
    await financialService.removeExit(exitId, initId);
    return new Response(null, { status: 204 });
  } catch (e) { return errorResponse(e); }
}
```

- [ ] **Step 7: Recriar `src/app/api/v1/projects/[id]/financial-entries/report/route.ts`**

```ts
import { NextRequest } from "next/server";
import { authenticate } from "@/middlewares/authenticate";
import { financialCategoryService } from "@/modules/financial-categories/service";
import { errorResponse } from "@/lib/errors";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  try {
    const payload = authenticate(req);
    const { id } = await params;
    return Response.json(await financialCategoryService.reportEntries(id, payload.organizationId));
  } catch (e) { return errorResponse(e); }
}
```

- [ ] **Step 8: Criar `src/app/api/v1/projects/[id]/financial-exits/report/route.ts`**

```ts
import { NextRequest } from "next/server";
import { authenticate } from "@/middlewares/authenticate";
import { financialCategoryService } from "@/modules/financial-categories/service";
import { errorResponse } from "@/lib/errors";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  try {
    const payload = authenticate(req);
    const { id } = await params;
    return Response.json(await financialCategoryService.reportExits(id, payload.organizationId));
  } catch (e) { return errorResponse(e); }
}
```

- [ ] **Step 9: Deletar rotas obsoletas**

```bash
rm "src/app/api/v1/projects/[id]/financial-entry-categories/route.ts"
rm "src/app/api/v1/projects/[id]/financial-entry-categories/[catId]/route.ts"
rmdir "src/app/api/v1/projects/[id]/financial-entry-categories/[catId]" 2>/dev/null || true
rmdir "src/app/api/v1/projects/[id]/financial-entry-categories" 2>/dev/null || true
```

- [ ] **Step 10: Atualizar `src/app/api/v1/dashboard/stats/route.ts`**

No `Promise.all`, após `recentActivity`, adicionar três queries:
```ts
      prisma.financialEntry.groupBy({
        by: ["categoryId"],
        where: { organizationId, deletedAt: null },
        _sum: { amount: true },
        _count: { id: true },
      }),
      prisma.financialExit.groupBy({
        by: ["categoryId"],
        where: { organizationId, deletedAt: null },
        _sum: { amount: true },
        _count: { id: true },
      }),
      prisma.financialCategory.findMany({
        where: { organizationId, deletedAt: null },
        select: { id: true, name: true, type: true },
      }),
```

Atualizar desestruturação:
```ts
    const [
      projectsActive, projectsTotal, initiativeStats,
      entriesSum, exitsSum, recentProjects, recentActivity,
      entriesByCatRaw, exitsByCatRaw, allCategories,
    ] = await Promise.all([...]);
```

Adicionar antes do return:
```ts
    const catMap = new Map(allCategories.map((c) => [c.id, c.name]));
    const toReport = (rows: typeof entriesByCatRaw) => rows.map((r) => ({
      categoryId:   r.categoryId,
      categoryName: r.categoryId ? (catMap.get(r.categoryId) ?? "Removida") : null,
      total:        Number(r._sum.amount ?? 0),
      count:        r._count.id,
    }));
    const entriesByCategory = toReport(entriesByCatRaw);
    const exitsByCategory   = toReport(exitsByCatRaw);
```

Adicionar no objeto do return:
```ts
      entriesByCategory,
      exitsByCategory,
```

- [ ] **Step 11: Verificar TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 12: Commit**

```
feat: API financial-categories CRUD + entries/exits por iniciativa + reports + dashboard stats
```

---

### Task 5: Página `/financial-categories`

**Files:**
- Create: `src/app/(app)/financial-categories/page.tsx`

**Interfaces:**
- Consumes: `GET/POST /api/v1/financial-categories`, `PUT/DELETE /api/v1/financial-categories/[id]`
- Produces: página acessível em `/financial-categories`

- [ ] **Step 1: Criar `src/app/(app)/financial-categories/page.tsx`**

```tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Dialog } from "@base-ui/react/dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

type CategoryType = "ENTRY" | "EXIT";
type Category = { id: string; name: string; type: CategoryType; createdAt: string };

const inputCls = "w-full h-8 px-3 text-[13px] bg-background border border-border rounded-lg text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 transition-colors";
const dialogPopupCls = "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-card border border-border rounded-xl shadow-xl w-full max-w-sm p-5 outline-none";
const overlayBackdropCls = "fixed inset-0 z-40 bg-black/40 backdrop-blur-sm";

function getToken() { return localStorage.getItem("access_token") ?? ""; }
function currentRole(): string { try { return JSON.parse(localStorage.getItem("user") ?? "{}").role ?? ""; } catch { return ""; } }

const TABS: { id: CategoryType; label: string }[] = [
  { id: "ENTRY", label: "Entradas" },
  { id: "EXIT",  label: "Despesas" },
];

export default function FinancialCategoriesPage() {
  const [tab, setTab]           = useState<CategoryType>("ENTRY");
  const [cats, setCats]         = useState<Category[]>([]);
  const [loading, setLoading]   = useState(true);
  const [modalOpen, setModal]   = useState(false);
  const [editing, setEditing]   = useState<Category | null>(null);
  const [name, setName]         = useState("");
  const [saving, setSaving]     = useState(false);
  const [toDelete, setToDelete] = useState<Category | null>(null);
  const role                    = currentRole();
  const canManage               = role === "ADMIN" || role === "MANAGER";

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/v1/financial-categories?type=${tab}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then((r) => r.json())
      .then((d) => { setCats(Array.isArray(d) ? d : []); setLoading(false); });
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  function openCreate() { setEditing(null); setName(""); setModal(true); }
  function openEdit(cat: Category) { setEditing(cat); setName(cat.name); setModal(true); }

  async function submit(e: React.SyntheticEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    if (editing) {
      await fetch(`/api/v1/financial-categories/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ name }),
      });
    } else {
      await fetch("/api/v1/financial-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ name, type: tab }),
      });
    }
    setSaving(false);
    setModal(false);
    load();
  }

  async function confirmDelete() {
    if (!toDelete) return;
    await fetch(`/api/v1/financial-categories/${toDelete.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    setToDelete(null);
    load();
  }

  return (
    <div className="px-7 py-6">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-[18px] font-semibold">Categorias Financeiras</h1>
        {canManage && (
          <button onClick={openCreate} className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] bg-primary text-primary-foreground rounded-lg cursor-pointer">
            <Plus className="size-3.5" /> Nova Categoria
          </button>
        )}
      </div>

      <div className="flex gap-0 border-b border-border mb-5">
        {TABS.map(({ id, label }) => (
          <button key={id} onClick={() => setTab(id)}
            className={cn("px-4 py-2.5 text-[13px] border-b-2 -mb-px transition-colors cursor-pointer",
              tab === id ? "text-foreground border-primary" : "text-muted-foreground border-transparent hover:text-foreground")}>
            {label}
          </button>
        ))}
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-border bg-surface-2">
              <th className="text-left px-4 py-2.5 text-text-subtle font-medium">Nome</th>
              <th className="text-left px-4 py-2.5 text-text-subtle font-medium">Criado em</th>
              {canManage && <th className="px-4 py-2.5 w-20" />}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={canManage ? 3 : 2} className="px-4 py-6 text-center"><Spinner className="size-4 mx-auto" /></td></tr>
            )}
            {!loading && cats.length === 0 && (
              <tr><td colSpan={canManage ? 3 : 2} className="px-4 py-6 text-center text-muted-foreground">Nenhuma categoria cadastrada.</td></tr>
            )}
            {cats.map((cat) => (
              <tr key={cat.id} className="border-b border-border last:border-0 hover:bg-surface-2/50">
                <td className="px-4 py-3 font-medium">{cat.name}</td>
                <td className="px-4 py-3 text-text-subtle">{new Date(cat.createdAt).toLocaleDateString("pt-BR")}</td>
                {canManage && (
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(cat)} className="text-muted-foreground hover:text-foreground cursor-pointer"><Pencil className="size-3.5" /></button>
                      {role === "ADMIN" && (
                        <button onClick={() => setToDelete(cat)} className="text-destructive hover:opacity-80 cursor-pointer"><Trash2 className="size-3.5" /></button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog.Root open={modalOpen} onOpenChange={setModal}>
        <Dialog.Portal>
          <Dialog.Backdrop className={overlayBackdropCls} />
          <Dialog.Popup className={dialogPopupCls}>
            <Dialog.Title className="text-[15px] font-semibold mb-4">
              {editing ? "Editar Categoria" : `Nova Categoria de ${tab === "ENTRY" ? "Entrada" : "Despesa"}`}
            </Dialog.Title>
            <form onSubmit={submit} className="space-y-3">
              <div>
                <label className="text-[11px] text-text-subtle mb-1 block">Nome *</label>
                <input className={inputCls} placeholder="Ex: Dízimo, Oferta, Material..." value={name}
                  onChange={(e) => setName(e.target.value)} required autoFocus />
              </div>
              <div className="flex gap-2 pt-1">
                <button type="submit" disabled={saving || !name.trim()}
                  className="px-3 py-1.5 text-[12px] bg-primary text-primary-foreground rounded-lg disabled:opacity-50 cursor-pointer">
                  {saving ? <Spinner className="size-3.5" /> : editing ? "Salvar" : "Criar"}
                </button>
                <Dialog.Close className="px-3 py-1.5 text-[12px] border border-border rounded-lg cursor-pointer">Cancelar</Dialog.Close>
              </div>
            </form>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>

      {toDelete && (
        <ConfirmDialog open title="Excluir categoria"
          description={`Deseja excluir "${toDelete.name}"? Lançamentos vinculados ficarão sem categoria.`}
          onConfirm={confirmDelete} onCancel={() => setToDelete(null)} />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```
feat: página /financial-categories com gestão de categorias por tipo
```

---

### Task 6: Modal de Iniciativa com abas Detalhes · Entradas · Despesas

**Files:**
- Modify: `src/app/(app)/projects/[id]/initiatives/page.tsx`

**Interfaces:**
- Consumes: `GET /api/v1/projects/[id]/initiatives/[initId]/entries`, `POST` e `DELETE` do mesmo; idem para `/exits`; `GET /api/v1/financial-categories?type=ENTRY|EXIT`
- Produces: modal grande substituindo o `AppDrawer` existente; abas Detalhes | Entradas | Despesas

- [ ] **Step 1: Adicionar imports necessários em `initiatives/page.tsx`**

Adicionar:
```ts
import { CurrencyInput } from "@/components/shared/currency-input";
```

Verificar que `BarChart2` (ou outro ícone adequado) está importado de `lucide-react` se necessário.

- [ ] **Step 2: Adicionar tipos financeiros em `initiatives/page.tsx`**

Após os tipos existentes, adicionar:
```ts
type FinancialCategory = { id: string; name: string };
type FinancialRow = {
  id: string; description: string; amount: string; date: string;
  category?: FinancialCategory | null; supplier?: string;
};
type InitiativeTab = "detalhes" | "entradas" | "despesas";
```

- [ ] **Step 3: Substituir o `AppDrawer` de detalhe por modal com abas**

Localizar o componente `InitiativeDrawer` (ou o bloco que renderiza o `<AppDrawer>` com detalhe da iniciativa) e substituir por um `Dialog.Root` grande:

```tsx
{/* Modal de detalhe da iniciativa */}
<Dialog.Root open={!!viewInit} onOpenChange={(o) => { if (!o) setViewInit(null); }}>
  <Dialog.Portal>
    <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" />
    <Dialog.Popup className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-card border border-border rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col outline-none">
      {viewInit && <InitiativeModal init={viewInit} projectId={id} onClose={() => setViewInit(null)} onMutate={load} />}
    </Dialog.Popup>
  </Dialog.Portal>
</Dialog.Root>
```

- [ ] **Step 4: Criar componente `InitiativeModal` em `initiatives/page.tsx`**

Adicionar ao final do arquivo (antes do `export default`):

```tsx
function InitiativeModal({ init, projectId, onClose, onMutate }: {
  init: Initiative; projectId: string; onClose: () => void; onMutate: () => void;
}) {
  const [tab, setTab]           = useState<InitiativeTab>("detalhes");
  const [entries, setEntries]   = useState<FinancialRow[]>([]);
  const [exits, setExits]       = useState<FinancialRow[]>([]);
  const [cats, setCats]         = useState<FinancialCategory[]>([]);
  const role                    = currentRole();
  const canAdd                  = role === "ADMIN" || role === "MANAGER";

  const loadEntries = useCallback(() => {
    fetch(`/api/v1/projects/${projectId}/initiatives/${init.id}/entries`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    }).then((r) => r.json()).then((d) => setEntries(Array.isArray(d) ? d : []));
  }, [projectId, init.id]);

  const loadExits = useCallback(() => {
    fetch(`/api/v1/projects/${projectId}/initiatives/${init.id}/exits`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    }).then((r) => r.json()).then((d) => setExits(Array.isArray(d) ? d : []));
  }, [projectId, init.id]);

  useEffect(() => { if (tab === "entradas") { loadEntries(); loadCats("ENTRY"); } }, [tab]); // eslint-disable-line
  useEffect(() => { if (tab === "despesas") { loadExits(); loadCats("EXIT"); } }, [tab]); // eslint-disable-line

  function loadCats(type: "ENTRY" | "EXIT") {
    fetch(`/api/v1/financial-categories?type=${type}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    }).then((r) => r.json()).then((d) => setCats(Array.isArray(d) ? d : []));
  }

  const raised = entries.reduce((s, e) => s + Number(e.amount), 0);
  const spent  = exits.reduce((s, e) => s + Number(e.amount), 0);

  const MODAL_TABS: { id: InitiativeTab; label: string }[] = [
    { id: "detalhes",  label: "Detalhes"  },
    { id: "entradas",  label: "Entradas"  },
    { id: "despesas",  label: "Despesas"  },
  ];

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
        <div>
          <p className="text-[11px] text-text-subtle mb-0.5">Iniciativa</p>
          <h2 className="text-[15px] font-semibold">{init.name}</h2>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground cursor-pointer text-[20px] leading-none">×</button>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-border px-5 shrink-0">
        {MODAL_TABS.map(({ id, label }) => (
          <button key={id} onClick={() => setTab(id)}
            className={cn("px-3 py-2.5 text-[13px] border-b-2 -mb-px transition-colors cursor-pointer",
              tab === id ? "text-foreground border-primary" : "text-muted-foreground border-transparent hover:text-foreground")}>
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="overflow-y-auto flex-1 px-5 py-4">

        {/* Aba Detalhes */}
        {tab === "detalhes" && (
          <div className="space-y-3 text-[13px]">
            {init.description && <p className="text-muted-foreground">{init.description}</p>}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-surface-2 rounded-lg p-3">
                <p className="text-[11px] text-text-subtle mb-1">Meta</p>
                <p className="font-semibold">{fmt(Number(init.goal))}</p>
              </div>
              {init.minGoal && (
                <div className="bg-surface-2 rounded-lg p-3">
                  <p className="text-[11px] text-text-subtle mb-1">Meta mínima</p>
                  <p className="font-semibold">{fmt(Number(init.minGoal))}</p>
                </div>
              )}
              <div className="bg-surface-2 rounded-lg p-3">
                <p className="text-[11px] text-text-subtle mb-1">Status</p>
                <p className="font-semibold">{init.status}</p>
              </div>
              <div className="bg-surface-2 rounded-lg p-3">
                <p className="text-[11px] text-text-subtle mb-1">Prioridade</p>
                <p className="font-semibold">{init.priority}</p>
              </div>
            </div>
          </div>
        )}

        {/* Aba Entradas */}
        {tab === "entradas" && (
          <div className="space-y-3">
            <div className="bg-surface-2 rounded-lg p-3 text-[13px]">
              <p className="text-[11px] text-text-subtle mb-1">Total Arrecadado</p>
              <p className="text-[18px] font-semibold text-success">{fmt(raised)}</p>
            </div>
            {canAdd && (
              <FinancialInlineForm
                endpoint={`/api/v1/projects/${projectId}/initiatives/${init.id}/entries`}
                categories={cats}
                onSuccess={loadEntries}
                label="Registrar entrada"
              />
            )}
            <FinancialInlineTable rows={entries} onDelete={async (id) => {
              await fetch(`/api/v1/projects/${projectId}/initiatives/${init.id}/entries/${id}`, {
                method: "DELETE", headers: { Authorization: `Bearer ${getToken()}` },
              });
              loadEntries();
            }} />
          </div>
        )}

        {/* Aba Despesas */}
        {tab === "despesas" && (
          <div className="space-y-3">
            <div className="bg-surface-2 rounded-lg p-3 text-[13px]">
              <p className="text-[11px] text-text-subtle mb-1">Total Despesas</p>
              <p className="text-[18px] font-semibold text-destructive">{fmt(spent)}</p>
            </div>
            {canAdd && (
              <FinancialInlineForm
                endpoint={`/api/v1/projects/${projectId}/initiatives/${init.id}/exits`}
                categories={cats}
                onSuccess={loadExits}
                label="Registrar despesa"
                isExit
              />
            )}
            <FinancialInlineTable rows={exits} isExit onDelete={async (id) => {
              await fetch(`/api/v1/projects/${projectId}/initiatives/${init.id}/exits/${id}`, {
                method: "DELETE", headers: { Authorization: `Bearer ${getToken()}` },
              });
              loadExits();
            }} />
          </div>
        )}
      </div>
    </>
  );
}

function FinancialInlineForm({ endpoint, categories, onSuccess, label, isExit }: {
  endpoint: string; categories: FinancialCategory[]; onSuccess: () => void; label: string; isExit?: boolean;
}) {
  const [open, setOpen]       = useState(false);
  const [desc, setDesc]       = useState("");
  const [amount, setAmount]   = useState("");
  const [date, setDate]       = useState("");
  const [catId, setCatId]     = useState("");
  const [supplier, setSupplier] = useState("");
  const [saving, setSaving]   = useState(false);

  const inputCls = "w-full h-8 px-3 text-[13px] bg-background border border-border rounded-lg text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 transition-colors";

  async function submit(e: React.SyntheticEvent) {
    e.preventDefault();
    setSaving(true);
    const dateIso = new Date(date + "T12:00:00.000Z").toISOString();
    await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({
        description: desc, amount: Number(amount), date: dateIso,
        categoryId: catId || undefined,
        supplier: isExit ? (supplier || undefined) : undefined,
      }),
    });
    setDesc(""); setAmount(""); setDate(""); setCatId(""); setSupplier("");
    setSaving(false);
    setOpen(false);
    onSuccess();
  }

  return (
    <div>
      <button onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-[12px] text-primary hover:underline cursor-pointer mb-2">
        <Plus className="size-3" /> {label}
      </button>
      {open && (
        <form onSubmit={submit} className="bg-surface-2 border border-border rounded-lg p-3 space-y-2 mb-3">
          <div className="grid grid-cols-2 gap-2">
            <input className={inputCls} placeholder="Descrição" value={desc} onChange={(e) => setDesc(e.target.value)} required />
            <CurrencyInput value={amount} onChange={setAmount} placeholder="Valor (R$)" required />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input className={inputCls} type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            <select className={inputCls} value={catId} onChange={(e) => setCatId(e.target.value)}>
              <option value="">Sem categoria</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          {isExit && (
            <input className={inputCls} placeholder="Fornecedor" value={supplier} onChange={(e) => setSupplier(e.target.value)} />
          )}
          <div className="flex gap-2">
            <button type="submit" disabled={saving}
              className="px-3 py-1.5 text-[12px] bg-primary text-primary-foreground rounded-lg disabled:opacity-50 cursor-pointer">
              {saving ? "Salvando..." : "Salvar"}
            </button>
            <button type="button" onClick={() => setOpen(false)}
              className="px-3 py-1.5 text-[12px] border border-border rounded-lg cursor-pointer">
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function FinancialInlineTable({ rows, onDelete, isExit }: {
  rows: FinancialRow[]; onDelete: (id: string) => void; isExit?: boolean;
}) {
  const role = currentRole();
  const fmt = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 });

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b border-border bg-surface-2">
            <th className="text-left px-3 py-2 text-text-subtle font-medium">Descrição</th>
            <th className="text-left px-3 py-2 text-text-subtle font-medium">Categoria</th>
            {isExit && <th className="text-left px-3 py-2 text-text-subtle font-medium">Fornecedor</th>}
            <th className="text-left px-3 py-2 text-text-subtle font-medium">Data</th>
            <th className="text-right px-3 py-2 text-text-subtle font-medium">Valor</th>
            {role === "ADMIN" && <th className="px-3 py-2 w-8" />}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={isExit ? 6 : 5} className="px-3 py-6 text-center text-muted-foreground">Nenhum lançamento.</td></tr>
          )}
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-border last:border-0 hover:bg-surface-2/50">
              <td className="px-3 py-2">{row.description}</td>
              <td className="px-3 py-2 text-text-subtle">{row.category?.name ?? "—"}</td>
              {isExit && <td className="px-3 py-2 text-text-subtle">{row.supplier ?? "—"}</td>}
              <td className="px-3 py-2 text-text-subtle">{new Date(row.date).toLocaleDateString("pt-BR")}</td>
              <td className="px-3 py-2 text-right font-medium">{fmt(Number(row.amount))}</td>
              {role === "ADMIN" && (
                <td className="px-3 py-2 text-right">
                  <button onClick={() => onDelete(row.id)} className="text-destructive hover:opacity-80 cursor-pointer">
                    <Trash2 className="size-3.5" />
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 5: Remover `AppDrawer` de detalhe de iniciativa e importação não utilizada**

Verificar se `AppDrawer` ainda é importado no arquivo. Se não for mais utilizado após esta mudança, remover o import de `AppDrawer`.

- [ ] **Step 6: Verificar TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 7: Commit**

```
feat: modal de iniciativa com abas Detalhes/Entradas/Despesas substitui drawer read-only
```

---

### Task 7: ContasTab vira rollup + dashboard UI

**Files:**
- Modify: `src/app/(app)/projects/[id]/page.tsx`
- Modify: `src/app/(app)/dashboard/page.tsx`

**Interfaces:**
- Consumes: `GET /api/v1/projects/[id]/financial-entries/report`, `GET /api/v1/projects/[id]/financial-exits/report`, campos `entriesByCategory`/`exitsByCategory` do dashboard stats
- Produces: `ContasTab` somente leitura com KPIs + reports; dashboard com breakdown por categoria

- [ ] **Step 1: Reescrever `ContasTab` em `projects/[id]/page.tsx` como rollup somente leitura**

Substituir o componente `ContasTab` completo (incluindo `FinancialForm`, `useCategorias`, helpers de formulário) por:

```tsx
/* ── ContasTab — rollup somente leitura ── */
type ReportRow = { categoryId: string | null; categoryName: string | null; total: number; count: number };

function CategoryReport({ title, url }: { title: string; url: string }) {
  const [rows, setRows]       = useState<ReportRow[]>([]);
  const [open, setOpen]       = useState(false);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch(url, { headers: { Authorization: `Bearer ${getToken()}` } });
    setRows(await res.json());
    setLoading(false);
  }

  useEffect(() => { if (open) load(); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <button onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-[12px] text-primary hover:underline cursor-pointer mb-2">
        <BarChart2 className="size-3" /> {title}
      </button>
      {open && (
        <div className="bg-card border border-border rounded-lg overflow-hidden mb-4">
          {loading ? (
            <p className="text-[13px] text-muted-foreground py-6 text-center">Carregando...</p>
          ) : (
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-border bg-surface-2">
                  <th className="text-left px-3 py-2 text-text-subtle font-medium">Categoria</th>
                  <th className="text-right px-3 py-2 text-text-subtle font-medium">Qtd.</th>
                  <th className="text-right px-3 py-2 text-text-subtle font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr><td colSpan={3} className="px-3 py-6 text-center text-muted-foreground">Sem lançamentos.</td></tr>
                )}
                {rows.map((r, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="px-3 py-2">{r.categoryName ?? <span className="text-text-subtle italic">Sem categoria</span>}</td>
                    <td className="px-3 py-2 text-right text-text-subtle">{r.count}</td>
                    <td className="px-3 py-2 text-right font-medium">{fmt(r.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

function ContasTab({ projectId, entries, exits, totalIn, totalOut }: {
  projectId: string; entries: FinancialRow[]; exits: FinancialRow[]; totalIn: number; totalOut: number;
}) {
  const balance = totalIn - totalOut;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-[11px] text-text-subtle mb-1">Total Entradas</p>
          <p className="text-[18px] font-semibold text-success">{fmt(totalIn)}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-[11px] text-text-subtle mb-1">Total Despesas</p>
          <p className="text-[18px] font-semibold text-destructive">{fmt(totalOut)}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-[11px] text-text-subtle mb-1">Saldo</p>
          <p className={cn("text-[18px] font-semibold", balance >= 0 ? "text-success" : "text-destructive")}>{fmt(balance)}</p>
        </div>
      </div>

      <div>
        <p className="text-[13px] font-medium mb-3">Entradas por Categoria</p>
        <CategoryReport title="Ver relatório de entradas" url={`/api/v1/projects/${projectId}/financial-entries/report`} />
        <FinancialTable rows={entries} showCategory />
      </div>

      <div>
        <p className="text-[13px] font-medium mb-3">Despesas por Categoria</p>
        <CategoryReport title="Ver relatório de despesas" url={`/api/v1/projects/${projectId}/financial-exits/report`} />
        <FinancialTable rows={exits} showCategory />
      </div>
    </div>
  );
}
```

Remover da assinatura de `ContasTab` a prop `onMutate` (não há mais mutações aqui) e remover componentes não utilizados: `FinancialForm`, `useCategorias`, `EntryReport`, `ExitReport` (substituídos por `CategoryReport`).

Atualizar a chamada de `<ContasTab>` no JSX da página para remover `onMutate`:
```tsx
<ContasTab
  projectId={id}
  entries={project?.financialEntries ?? []}
  exits={project?.financialExits ?? []}
  totalIn={totalIn} totalOut={totalOut}
/>
```

Remover imports não utilizados (`Plus`, `Spinner` se não usados em outro lugar).

- [ ] **Step 2: Atualizar `FinancialTable` — remover prop `onMutate` e botão delete**

`FinancialTable` agora é somente leitura (deletes ficam no modal da iniciativa):
```tsx
function FinancialTable({ rows, showCategory }: {
  rows: FinancialRow[]; showCategory?: boolean;
}) {
  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b border-border bg-surface-2">
            <th className="text-left px-3 py-2 text-text-subtle font-medium">Descrição</th>
            <th className="text-left px-3 py-2 text-text-subtle font-medium">Iniciativa</th>
            <th className="text-left px-3 py-2 text-text-subtle font-medium">Data</th>
            {showCategory && <th className="text-left px-3 py-2 text-text-subtle font-medium">Categoria</th>}
            <th className="text-right px-3 py-2 text-text-subtle font-medium">Valor</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={showCategory ? 5 : 4} className="px-3 py-6 text-center text-muted-foreground">Nenhum lançamento.</td></tr>
          )}
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-border last:border-0 hover:bg-surface-2/50">
              <td className="px-3 py-2">{row.description}</td>
              <td className="px-3 py-2 text-text-subtle">{row.initiative?.name ?? "—"}</td>
              <td className="px-3 py-2 text-text-subtle">{new Date(row.date).toLocaleDateString("pt-BR")}</td>
              {showCategory && <td className="px-3 py-2 text-text-subtle">{row.category?.name ?? "—"}</td>}
              <td className="px-3 py-2 text-right font-medium">{fmt(Number(row.amount))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

Atualizar o tipo `FinancialRow` no arquivo para incluir `initiative`:
```ts
type FinancialRow = {
  id: string; description: string; amount: string; date: string;
  category?: { id: string; name: string } | null;
  initiative?: { id: string; name: string } | null;
  supplier?: string;
};
```

- [ ] **Step 3: Adicionar tipos e blocos de categoria no dashboard (`dashboard/page.tsx`)**

Adicionar ao tipo `Stats`:
```ts
type CategoryStat = { categoryId: string | null; categoryName: string | null; total: number; count: number };
// dentro de Stats:
entriesByCategory: CategoryStat[];
exitsByCategory:   CategoryStat[];
```

Adicionar após a grid de KPIs no JSX:
```tsx
{((stats.entriesByCategory?.length ?? 0) > 0 || (stats.exitsByCategory?.length ?? 0) > 0) && (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 px-7 mt-4">
    {stats.entriesByCategory?.length > 0 && (
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <p className="text-[11px] font-medium text-text-subtle px-4 py-2 border-b border-border bg-surface-2">
          Entradas por Categoria
        </p>
        <table className="w-full text-[13px]">
          <tbody>
            {stats.entriesByCategory.map((r, i) => (
              <tr key={i} className="border-b border-border last:border-0">
                <td className="px-4 py-2">{r.categoryName ?? <span className="text-text-subtle italic">Sem categoria</span>}</td>
                <td className="px-4 py-2 text-right text-text-subtle">{r.count}×</td>
                <td className="px-4 py-2 text-right font-medium text-success">{fmt(r.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
    {stats.exitsByCategory?.length > 0 && (
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <p className="text-[11px] font-medium text-text-subtle px-4 py-2 border-b border-border bg-surface-2">
          Despesas por Categoria
        </p>
        <table className="w-full text-[13px]">
          <tbody>
            {stats.exitsByCategory.map((r, i) => (
              <tr key={i} className="border-b border-border last:border-0">
                <td className="px-4 py-2">{r.categoryName ?? <span className="text-text-subtle italic">Sem categoria</span>}</td>
                <td className="px-4 py-2 text-right text-text-subtle">{r.count}×</td>
                <td className="px-4 py-2 text-right font-medium text-destructive">{fmt(r.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
)}
```

- [ ] **Step 4: Verificar TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Build final**

```bash
npm run build
```

Esperado: build limpo, todas as rotas listadas sem erros.

- [ ] **Step 6: Commit**

```
feat: ContasTab rollup somente leitura + dashboard breakdown por categoria
```
