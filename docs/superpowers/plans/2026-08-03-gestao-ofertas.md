# Gestão das Ofertas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar o ciclo completo de ofertas/compromissos ao sistema: doador registra compromisso pelo portal público, admin confirma e lança manualmente; portal exibe métricas 4D (Meta/Compromissado/Arrecadado/Executado) e seção PIX + WhatsApp.

**Architecture:** Nova entidade `Pledge` captura promessas de doação antes do pagamento efetivo. Os campos `pixKey`, `whatsapp`, `pixQrCodeUrl` são adicionados à `Organization`. O portal público é redesenhado para exibir as 4 métricas por iniciativa e um formulário de compromisso. Uma página `/ofertas` no admin gerencia o ciclo.

**Tech Stack:** Prisma v7 + Neon, Next.js 16 App Router, Tailwind v4, base-ui Dialog, React Hook Form + Zod v4, Lucide React, sonner, R2 upload existente.

## Global Constraints

- Next.js 16: `const { id } = await params` — params é Promise
- Soft delete: sempre `where: { deletedAt: null }` (Pledge não tem soft delete)
- Auth: `authenticate(req)` → `{ userId, organizationId, role, isMaster }`
- Permissions: `authorize(payload, "financial:write")` para rotas admin de ofertas
- Erros: `errorResponse(error)` em todos os catch das rotas API
- Proxy: `/api/v1/public/` já está em PUBLIC_PATHS — POST pledge não precisa de auth
- Design: dark-only, CSS vars `--primary: #f59e0b`, `--card: #151413`, `--border: #2c2824`
- Ícones: Lucide React (não Phosphor)
- Toasts: `toast.success` / `toast.error` do sonner
- Paginação: `paginatedResponse(data, total, page, limit)`

---

## File Map

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `prisma/schema.prisma` | Modify | Adicionar enum PledgeStatus, model Pledge, campos na Organization |
| `src/modules/organizations/dto.ts` | Modify | Adicionar pixKey/whatsapp/pixQrCodeUrl ao updateOrganizationSchema |
| `src/modules/organizations/repository.ts` | Modify | Adicionar campos ao select |
| `src/app/api/v1/public/projects/[slug]/route.ts` | Modify | Incluir PIX data + métricas 4D (compromissado) |
| `src/app/api/v1/public/projects/[slug]/pledges/route.ts` | Create | POST público — cria Pledge PENDING |
| `src/app/api/v1/pledges/route.ts` | Create | GET (admin lista) + POST (admin cria manual CONFIRMED) |
| `src/app/api/v1/pledges/[id]/route.ts` | Create | PATCH (confirm/cancel) |
| `src/app/(app)/configuracoes/page.tsx` | Modify | Aba Organização: campos PIX key, WhatsApp, upload QR code |
| `src/app/(app)/ofertas/page.tsx` | Create | Admin: lista de pledges, confirmar/cancelar, nova oferta manual |
| `src/components/layout/sidebar.tsx` | Modify | Adicionar item /ofertas com ícone HandCoins |
| `src/app/(public)/p/[slug]/page.tsx` | Modify | Redesign completo: 4 KPIs, cards por iniciativa, PIX/WhatsApp/pledge form |

---

## Task 1: Schema — Pledge model + campos Organization

**Files:**
- Modify: `prisma/schema.prisma`

**Interfaces:**
- Produces: enum `PledgeStatus { PENDING CONFIRMED CANCELLED }`, model `Pledge`, campos `pixKey String?`, `whatsapp String?`, `pixQrCodeUrl String?` na Organization

- [ ] **Step 1: Adicionar campos à Organization**

Em `prisma/schema.prisma`, no model `Organization`, após `deletedAt DateTime?`, adicionar:

```prisma
  pixKey       String?
  whatsapp     String?
  pixQrCodeUrl String?
  pledges      Pledge[]
```

- [ ] **Step 2: Adicionar relation Pledge ao Project**

No model `Project`, após `files File[]`, adicionar:

```prisma
  pledges      Pledge[]
```

- [ ] **Step 3: Adicionar relation Pledge ao Initiative**

No model `Initiative`, após `exits FinancialExit[]`, adicionar:

```prisma
  pledges      Pledge[]
```

- [ ] **Step 4: Adicionar enum PledgeStatus e model Pledge**

Após o model `Initiative`, antes do model `TimelinePost`, inserir:

```prisma
enum PledgeStatus {
  PENDING
  CONFIRMED
  CANCELLED
}

model Pledge {
  id             String       @id @default(uuid())
  organizationId String
  projectId      String
  initiativeId   String?
  name           String
  email          String?
  amount         Decimal      @db.Decimal(12, 2)
  note           String?
  status         PledgeStatus @default(PENDING)
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt

  organization Organization @relation(fields: [organizationId], references: [id])
  project      Project      @relation(fields: [projectId], references: [id])
  initiative   Initiative?  @relation(fields: [initiativeId], references: [id])

  @@index([organizationId])
  @@index([projectId])
  @@index([initiativeId])
  @@index([status])
  @@map("pledges")
}
```

- [ ] **Step 5: Gerar e aplicar migration**

```bash
cd /Users/natanoliveira/Projetos/javascript/react/gestao_campanha
npx prisma migrate dev --name add_pledge_and_org_pix_fields
```

Resultado esperado: migration criada e aplicada, sem erros.

- [ ] **Step 6: Verificar geração do client**

```bash
npx tsc --noEmit 2>&1 | grep "PledgeStatus\|Pledge\|pixKey" | head -5
```

Esperado: sem erros de tipo relacionados ao Pledge.

- [ ] **Step 7: Commit**

```
feat(schema): add Pledge model and PIX/WhatsApp fields to Organization
```

---

## Task 2: Organization module — expor campos PIX no DTO e repository

**Files:**
- Modify: `src/modules/organizations/dto.ts`
- Modify: `src/modules/organizations/repository.ts`

**Interfaces:**
- Consumes: schema Prisma com `pixKey`, `whatsapp`, `pixQrCodeUrl` (Task 1)
- Produces: `updateOrganizationSchema` aceita os novos campos; `select` no repository os retorna

- [ ] **Step 1: Atualizar dto.ts**

Substituir o conteúdo de `src/modules/organizations/dto.ts`:

```typescript
import { z } from "zod";

export const createOrganizationSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/, "Apenas letras minúsculas, números e hífens"),
  logo: z.string().url().optional(),
});

export const updateOrganizationSchema = createOrganizationSchema.extend({
  pixKey:       z.string().max(200).optional().nullable(),
  whatsapp:     z.string().max(20).optional().nullable(),
  pixQrCodeUrl: z.string().url().optional().nullable(),
}).partial();

export type CreateOrganizationDTO = z.infer<typeof createOrganizationSchema>;
export type UpdateOrganizationDTO = z.infer<typeof updateOrganizationSchema>;
```

- [ ] **Step 2: Atualizar repository.ts — adicionar campos ao select**

Substituir o `const select` em `src/modules/organizations/repository.ts`:

```typescript
const select = {
  id: true,
  name: true,
  slug: true,
  logo: true,
  active: true,
  createdAt: true,
  pixKey: true,
  whatsapp: true,
  pixQrCodeUrl: true,
  plan: { select: { id: true, name: true, priceMonthly: true } },
};
```

- [ ] **Step 3: Verificar tipos**

```bash
npx tsc --noEmit 2>&1 | grep "organizations\|dto\|repository" | head -10
```

Esperado: sem erros.

- [ ] **Step 4: Commit**

```
feat(organizations): expose pixKey, whatsapp, pixQrCodeUrl in DTO and repository
```

---

## Task 3: API pública — POST pledge

**Files:**
- Create: `src/app/api/v1/public/projects/[slug]/pledges/route.ts`

**Interfaces:**
- Consumes: schema Prisma Pledge (Task 1); project lookup por `publicSlug`
- Produces: `POST /api/v1/public/projects/[slug]/pledges` → `{ id, name, amount, status }`

- [ ] **Step 1: Criar a rota**

Criar `src/app/api/v1/public/projects/[slug]/pledges/route.ts`:

```typescript
import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { errorResponse, AppError } from "@/lib/errors";

const schema = z.object({
  name:        z.string().min(2).max(100),
  email:       z.string().email().optional(),
  amount:      z.coerce.number().positive(),
  initiativeId: z.string().optional(),
  note:        z.string().max(500).optional(),
});

type Ctx = { params: Promise<{ slug: string }> };

export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const { slug } = await params;

    const project = await prisma.project.findFirst({
      where: { publicSlug: slug, isPublic: true, deletedAt: null },
      select: { id: true, organizationId: true },
    });
    if (!project) throw new AppError("Projeto não encontrado", 404, "NOT_FOUND");

    const body = schema.parse(await req.json());

    if (body.initiativeId) {
      const init = await prisma.initiative.findFirst({
        where: { id: body.initiativeId, projectId: project.id, deletedAt: null },
        select: { id: true },
      });
      if (!init) throw new AppError("Iniciativa não encontrada", 404, "NOT_FOUND");
    }

    const pledge = await prisma.pledge.create({
      data: {
        organizationId: project.organizationId,
        projectId:      project.id,
        initiativeId:   body.initiativeId ?? null,
        name:           body.name,
        email:          body.email ?? null,
        amount:         body.amount,
        note:           body.note ?? null,
      },
      select: { id: true, name: true, amount: true, status: true },
    });

    return Response.json(pledge, { status: 201 });
  } catch (e) { return errorResponse(e); }
}
```

- [ ] **Step 2: Verificar tipos**

```bash
npx tsc --noEmit 2>&1 | grep "pledges/route" | head -5
```

Esperado: sem erros.

- [ ] **Step 3: Commit**

```
feat(api): public POST /projects/[slug]/pledges — create pending pledge
```

---

## Task 4: API admin — CRUD de pledges

**Files:**
- Create: `src/app/api/v1/pledges/route.ts`
- Create: `src/app/api/v1/pledges/[id]/route.ts`

**Interfaces:**
- Consumes: `authenticate`, `authorize`, `paginatedResponse`, `errorResponse`, `logAudit`
- Produces:
  - `GET /api/v1/pledges?page&limit&status&projectId` → paginatedResponse com pledges
  - `POST /api/v1/pledges` → cria pledge CONFIRMED (manual pelo admin)
  - `PATCH /api/v1/pledges/[id]` → `{ status: "CONFIRMED"|"CANCELLED", note? }`

- [ ] **Step 1: Criar route.ts (GET + POST)**

Criar `src/app/api/v1/pledges/route.ts`:

```typescript
import { NextRequest } from "next/server";
import { z } from "zod";
import { authenticate } from "@/middlewares/authenticate";
import { authorize } from "@/middlewares/authorize";
import { prisma } from "@/lib/prisma";
import { paginatedResponse } from "@/lib/pagination";
import { errorResponse } from "@/lib/errors";
import { logAudit } from "@/lib/audit";

const createSchema = z.object({
  projectId:    z.string(),
  initiativeId: z.string().optional(),
  name:         z.string().min(2).max(100),
  email:        z.string().email().optional(),
  amount:       z.coerce.number().positive(),
  note:         z.string().max(500).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const payload = authenticate(req);
    authorize(payload, "financial:write");

    const { searchParams } = new URL(req.url);
    const page      = Math.max(1, Number(searchParams.get("page")  ?? 1));
    const limit     = Math.min(50, Math.max(1, Number(searchParams.get("limit") ?? 20)));
    const status    = searchParams.get("status")    ?? undefined;
    const projectId = searchParams.get("projectId") ?? undefined;

    const where = {
      organizationId: payload.organizationId,
      ...(status    ? { status: status as "PENDING" | "CONFIRMED" | "CANCELLED" } : {}),
      ...(projectId ? { projectId } : {}),
    };

    const [data, total] = await Promise.all([
      prisma.pledge.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true, name: true, email: true, amount: true, note: true,
          status: true, createdAt: true,
          project:    { select: { id: true, name: true } },
          initiative: { select: { id: true, name: true } },
        },
      }),
      prisma.pledge.count({ where }),
    ]);

    return Response.json(paginatedResponse(data, total, page, limit));
  } catch (e) { return errorResponse(e); }
}

export async function POST(req: NextRequest) {
  try {
    const payload = authenticate(req);
    authorize(payload, "financial:write");
    const ip = req.headers.get("x-forwarded-for");

    const body = createSchema.parse(await req.json());

    const pledge = await prisma.pledge.create({
      data: {
        organizationId: payload.organizationId,
        projectId:      body.projectId,
        initiativeId:   body.initiativeId ?? null,
        name:           body.name,
        email:          body.email ?? null,
        amount:         body.amount,
        note:           body.note ?? null,
        status:         "CONFIRMED",
      },
      select: { id: true, name: true, amount: true, status: true },
    });

    await logAudit({
      organizationId: payload.organizationId,
      userId: payload.userId,
      action: "create",
      entity: "pledge",
      entityId: pledge.id,
      ip,
    });

    return Response.json(pledge, { status: 201 });
  } catch (e) { return errorResponse(e); }
}
```

- [ ] **Step 2: Criar [id]/route.ts (PATCH)**

Criar `src/app/api/v1/pledges/[id]/route.ts`:

```typescript
import { NextRequest } from "next/server";
import { z } from "zod";
import { authenticate } from "@/middlewares/authenticate";
import { authorize } from "@/middlewares/authorize";
import { prisma } from "@/lib/prisma";
import { errorResponse, AppError } from "@/lib/errors";
import { logAudit } from "@/lib/audit";

const patchSchema = z.object({
  status: z.enum(["CONFIRMED", "CANCELLED"]),
  note:   z.string().max(500).optional(),
});

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const payload = authenticate(req);
    authorize(payload, "financial:write");
    const { id } = await params;
    const ip = req.headers.get("x-forwarded-for");

    const existing = await prisma.pledge.findFirst({
      where: { id, organizationId: payload.organizationId },
      select: { id: true, status: true },
    });
    if (!existing) throw new AppError("Oferta não encontrada", 404, "NOT_FOUND");

    const body = patchSchema.parse(await req.json());

    const pledge = await prisma.pledge.update({
      where: { id },
      data: { status: body.status, ...(body.note !== undefined ? { note: body.note } : {}) },
      select: { id: true, name: true, amount: true, status: true },
    });

    await logAudit({
      organizationId: payload.organizationId,
      userId: payload.userId,
      action: "update",
      entity: "pledge",
      entityId: id,
      ip,
      before: { status: existing.status },
      after:  { status: body.status },
    });

    return Response.json(pledge);
  } catch (e) { return errorResponse(e); }
}
```

- [ ] **Step 3: Verificar tipos**

```bash
npx tsc --noEmit 2>&1 | grep "pledges" | head -10
```

Esperado: sem erros.

- [ ] **Step 4: Commit**

```
feat(api): admin CRUD for pledges — GET, POST manual, PATCH confirm/cancel
```

---

## Task 5: Expandir API pública do projeto — métricas 4D + PIX

**Files:**
- Modify: `src/app/api/v1/public/projects/[slug]/route.ts`

**Interfaces:**
- Consumes: Pledge (Task 1), campos PIX da org (Task 2)
- Produces: resposta adiciona `pixKey`, `whatsapp`, `pixQrCodeUrl`; stats inclui `totalPledged`; initiatives inclui `pledged`

- [ ] **Step 1: Atualizar a query e a resposta**

Substituir o conteúdo de `src/app/api/v1/public/projects/[slug]/route.ts`:

```typescript
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse, AppError } from "@/lib/errors";

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const { slug } = await params;

    const project = await prisma.project.findFirst({
      where: { publicSlug: slug, isPublic: true, deletedAt: null },
      select: {
        id: true, name: true, description: true, status: true, endDate: true,
        organization: {
          select: { name: true, pixKey: true, whatsapp: true, pixQrCodeUrl: true },
        },
        initiatives: {
          where: { deletedAt: null },
          orderBy: { priority: "asc" },
          select: {
            id: true, name: true, goal: true, status: true,
            entries: { where: { deletedAt: null }, select: { amount: true } },
            exits:   { where: { deletedAt: null }, select: { amount: true } },
            pledges: { where: { status: "CONFIRMED" }, select: { amount: true } },
          },
        },
        timelinePosts: {
          where: { deletedAt: null },
          orderBy: { publishedAt: "desc" },
          take: 20,
          select: {
            id: true, content: true, type: true, publishedAt: true,
            author: { select: { name: true } },
          },
        },
        financialExits: {
          where: { deletedAt: null },
          orderBy: { date: "desc" },
          select: { id: true, description: true, amount: true, date: true, supplier: true },
        },
        pledges: {
          where: { status: "CONFIRMED" },
          select: { amount: true },
        },
        _count: { select: { financialEntries: true } },
      },
    });

    if (!project) throw new AppError("Portal não encontrado", 404, "NOT_FOUND");

    const totalGoal     = project.initiatives.reduce((s, i) => s + Number(i.goal), 0);
    const totalRaised   = project.initiatives.reduce(
      (s, i) => s + i.entries.reduce((a, e) => a + Number(e.amount), 0), 0
    );
    const totalExecuted = project.initiatives.reduce(
      (s, i) => s + i.exits.reduce((a, e) => a + Number(e.amount), 0), 0
    );
    const totalPledged  = project.pledges.reduce((s, p) => s + Number(p.amount), 0);

    return Response.json({
      id:          project.id,
      name:        project.name,
      description: project.description,
      status:      project.status,
      endDate:     project.endDate,
      organization: project.organization.name,
      pix: {
        key:      project.organization.pixKey    ?? null,
        qrCode:   project.organization.pixQrCodeUrl ?? null,
        whatsapp: project.organization.whatsapp  ?? null,
      },
      stats: {
        totalGoal,
        totalPledged,
        totalRaised,
        totalExecuted,
        goalPercent: totalGoal > 0 ? Math.round((totalRaised / totalGoal) * 100) : 0,
        supporters:  project._count.financialEntries,
      },
      initiatives: project.initiatives.map(({ entries, exits, pledges: ip, ...i }) => ({
        ...i,
        goal:     Number(i.goal),
        pledged:  ip.reduce((s, p) => s + Number(p.amount), 0),
        raised:   entries.reduce((s, e) => s + Number(e.amount), 0),
        executed: exits.reduce((s, e)   => s + Number(e.amount), 0),
      })),
      timelinePosts:  project.timelinePosts,
      financialExits: project.financialExits,
    });
  } catch (e) { return errorResponse(e); }
}
```

- [ ] **Step 2: Verificar tipos**

```bash
npx tsc --noEmit 2>&1 | grep "public/projects" | head -5
```

Esperado: sem erros.

- [ ] **Step 3: Commit**

```
feat(api): public project endpoint returns 4-metric stats and PIX data
```

---

## Task 6: Settings UI — PIX key, WhatsApp, QR code upload

**Files:**
- Modify: `src/app/(app)/configuracoes/page.tsx`

**Interfaces:**
- Consumes: `PUT /api/v1/organizations/[id]` (aceita pixKey/whatsapp/pixQrCodeUrl desde Task 2); `POST /api/v1/upload` para QR code
- Produces: aba "Organização" com 3 novos campos abaixo do slug

- [ ] **Step 1: Localizar o type OrgData e adicionar campos**

Encontrar a declaração `type OrgData` (por volta da linha 30–60) e adicionar os campos:

```typescript
type OrgData = {
  id: string
  name: string
  slug: string
  logo?: string | null
  pixKey?: string | null
  whatsapp?: string | null
  pixQrCodeUrl?: string | null
  // ... campos existentes
}
```

- [ ] **Step 2: Localizar o bloco do formulário da aba Organização**

Encontrar onde os campos `name` e `slug` são renderizados na aba "organizacao". Logo após o campo `slug` (e seu parágrafo de descrição), adicionar os 3 novos campos:

```tsx
{/* PIX key */}
<div>
  <label htmlFor="org-pix-key" className="block text-[12px] font-medium text-muted-foreground mb-1">
    Chave PIX
  </label>
  <input
    id="org-pix-key"
    defaultValue={org.pixKey ?? ""}
    onChange={(e) => setOrg({ ...org, pixKey: e.target.value })}
    placeholder="email@org.com.br ou CNPJ"
    className="w-full h-9 px-3 text-[13px] bg-background border border-border rounded-lg text-foreground outline-none focus:border-ring transition-colors"
  />
</div>

{/* WhatsApp */}
<div>
  <label htmlFor="org-whatsapp" className="block text-[12px] font-medium text-muted-foreground mb-1">
    WhatsApp (com DDD e código do país)
  </label>
  <input
    id="org-whatsapp"
    defaultValue={org.whatsapp ?? ""}
    onChange={(e) => setOrg({ ...org, whatsapp: e.target.value })}
    placeholder="+55 86 99999-0000"
    className="w-full h-9 px-3 text-[13px] bg-background border border-border rounded-lg text-foreground outline-none focus:border-ring transition-colors"
  />
</div>

{/* QR Code PIX */}
<div>
  <label className="block text-[12px] font-medium text-muted-foreground mb-1">
    QR Code PIX (imagem)
  </label>
  {org.pixQrCodeUrl && (
    <img src={org.pixQrCodeUrl} alt="QR Code PIX" className="w-32 h-32 object-contain rounded-lg border border-border mb-2" />
  )}
  <input
    type="file"
    accept="image/*"
    onChange={async (e) => {
      const file = e.target.files?.[0]
      if (!file) return
      const fd = new FormData()
      fd.append("file", file)
      fd.append("folder", "pix-qrcode")
      const res = await fetchWithAuth("/api/v1/upload", { method: "POST", body: fd })
      const data = await res.json()
      if (data.url) setOrg({ ...org, pixQrCodeUrl: data.url })
    }}
    className="text-[12px] text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-[12px] file:bg-surface-2 file:text-foreground file:cursor-pointer hover:file:bg-border/60 transition-colors"
  />
  <p className="text-[11px] text-muted-foreground mt-1">Exibido no portal público para doações via PIX.</p>
</div>
```

- [ ] **Step 3: Garantir que o handleSave inclui os novos campos**

Encontrar a função que faz `PUT` para `/api/v1/organizations/${org.id}` e garantir que o body inclui:

```typescript
body: JSON.stringify({
  name: org.name,
  slug: org.slug,
  pixKey:       org.pixKey       ?? null,
  whatsapp:     org.whatsapp     ?? null,
  pixQrCodeUrl: org.pixQrCodeUrl ?? null,
})
```

- [ ] **Step 4: Verificar tipos**

```bash
npx tsc --noEmit 2>&1 | grep "configuracoes" | head -5
```

Esperado: sem erros.

- [ ] **Step 5: Commit**

```
feat(settings): add PIX key, WhatsApp and QR code upload to org settings
```

---

## Task 7: Admin UI — /ofertas + sidebar

**Files:**
- Create: `src/app/(app)/ofertas/page.tsx`
- Modify: `src/components/layout/sidebar.tsx`

**Interfaces:**
- Consumes: `GET /api/v1/pledges`, `PATCH /api/v1/pledges/[id]`, `POST /api/v1/pledges` (Tasks 4)
- Produces: página com tabela de ofertas, ações confirmar/cancelar, modal nova oferta manual

- [ ] **Step 1: Adicionar item ao sidebar**

Em `src/components/layout/sidebar.tsx`, adicionar `HandCoins` ao import do lucide-react e inserir o item após `/decisoes`:

```typescript
// no import de lucide-react, adicionar HandCoins
import { ..., HandCoins } from "lucide-react"

// na lista de items, após { href: "/decisoes", ... }:
{ href: "/ofertas", label: "Ofertas", Icon: HandCoins, permission: "financial:write" },
```

- [ ] **Step 2: Criar a página /ofertas**

Criar `src/app/(app)/ofertas/page.tsx`:

```tsx
"use client"

import { useCallback, useEffect, useState } from "react"
import { HandCoins, Check, X, Plus, ChevronLeft, ChevronRight } from "lucide-react"
import { toast } from "sonner"
import { fetchWithAuth } from "@/lib/fetch-with-auth"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import * as Dialog from "@base-ui-components/react/dialog"

type Pledge = {
  id: string
  name: string
  email: string | null
  amount: string
  note: string | null
  status: "PENDING" | "CONFIRMED" | "CANCELLED"
  createdAt: string
  project: { id: string; name: string }
  initiative: { id: string; name: string } | null
}

type Project = { id: string; name: string }
type Initiative = { id: string; name: string; projectId: string }

const STATUS_BADGE: Record<Pledge["status"], { variant: "draft" | "active" | "archived"; label: string }> = {
  PENDING:   { variant: "draft",    label: "Pendente"   },
  CONFIRMED: { variant: "active",   label: "Confirmada" },
  CANCELLED: { variant: "archived", label: "Cancelada"  },
}

const fmt = (n: string | number) =>
  Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 })

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("rounded bg-border/40 animate-pulse", className)} />
}

const inputCls = "w-full h-9 px-3 text-[13px] bg-background border border-border rounded-lg text-foreground outline-none focus:border-ring transition-colors"

export default function OfertasPage() {
  const [pledges, setPledges]       = useState<Pledge[] | null>(null)
  const [total, setTotal]           = useState(0)
  const [page, setPage]             = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [filterStatus, setFilterStatus] = useState("")
  const [projects, setProjects]     = useState<Project[]>([])
  const [initiatives, setInitiatives] = useState<Initiative[]>([])
  const [newOpen, setNewOpen]       = useState(false)
  const [form, setForm]             = useState({ name: "", email: "", amount: "", projectId: "", initiativeId: "", note: "" })
  const [saving, setSaving]         = useState(false)

  const load = useCallback(() => {
    setPledges(null)
    const params = new URLSearchParams({ page: String(page), limit: "20" })
    if (filterStatus) params.set("status", filterStatus)
    fetchWithAuth(`/api/v1/pledges?${params}`)
      .then(r => r.json())
      .then(d => {
        setPledges(d.data ?? [])
        setTotal(d.meta?.total ?? 0)
        setTotalPages(d.meta?.totalPages ?? 1)
      })
  }, [page, filterStatus])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    fetchWithAuth("/api/v1/projects?limit=100")
      .then(r => r.json())
      .then(d => setProjects(d.data ?? []))
  }, [])

  useEffect(() => {
    if (!form.projectId) return setInitiatives([])
    fetchWithAuth(`/api/v1/projects/${form.projectId}/initiatives?limit=100`)
      .then(r => r.json())
      .then(d => setInitiatives((d.data ?? []).map((i: Initiative & { projectId?: string }) => ({ ...i, projectId: form.projectId }))))
  }, [form.projectId])

  async function updateStatus(id: string, status: "CONFIRMED" | "CANCELLED") {
    const res = await fetchWithAuth(`/api/v1/pledges/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    if (!res.ok) { toast.error("Erro ao atualizar oferta"); return }
    toast.success(status === "CONFIRMED" ? "Oferta confirmada" : "Oferta cancelada")
    load()
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetchWithAuth("/api/v1/pledges", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId:    form.projectId,
        initiativeId: form.initiativeId || undefined,
        name:         form.name,
        email:        form.email || undefined,
        amount:       Number(form.amount.replace(/\D/g, "")),
        note:         form.note || undefined,
      }),
    })
    setSaving(false)
    if (!res.ok) { toast.error("Erro ao registrar oferta"); return }
    toast.success("Oferta registrada")
    setNewOpen(false)
    setForm({ name: "", email: "", amount: "", projectId: "", initiativeId: "", note: "" })
    load()
  }

  const selectCls = "h-8 px-3 text-[12px] bg-background border border-border rounded-lg text-foreground outline-none focus:border-ring transition-colors cursor-pointer"

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between px-7 py-5 border-b border-border">
        <div>
          <h1 className="text-[18px] font-semibold font-sans flex items-center gap-2">
            <HandCoins className="size-5 text-muted-foreground" />
            Ofertas
          </h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            {total > 0 ? `${total.toLocaleString("pt-BR")} ${total === 1 ? "oferta" : "ofertas"}` : "Compromissos e doações da campanha"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select value={filterStatus} onChange={e => { setPage(1); setFilterStatus(e.target.value) }} className={selectCls}>
            <option value="">Todas</option>
            <option value="PENDING">Pendentes</option>
            <option value="CONFIRMED">Confirmadas</option>
            <option value="CANCELLED">Canceladas</option>
          </select>

          {/* Nova oferta manual */}
          <Dialog.Root open={newOpen} onOpenChange={setNewOpen}>
            <Dialog.Trigger className="inline-flex items-center gap-1.5 h-8 px-3 text-[12px] bg-primary text-white rounded-lg font-medium hover:bg-accent-hover transition-colors cursor-pointer">
              <Plus className="size-3.5" /> Nova oferta
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Backdrop className="fixed inset-0 bg-black/60 z-40" />
              <Dialog.Popup className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-2xl">
                <Dialog.Title className="text-[16px] font-semibold mb-4">Nova oferta (manual)</Dialog.Title>
                <form onSubmit={handleCreate} className="space-y-3">
                  <div>
                    <label className="block text-[11px] text-muted-foreground mb-1">Projeto *</label>
                    <select required value={form.projectId} onChange={e => setForm(f => ({ ...f, projectId: e.target.value, initiativeId: "" }))} className={inputCls}>
                      <option value="">Selecione...</option>
                      {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  {initiatives.length > 0 && (
                    <div>
                      <label className="block text-[11px] text-muted-foreground mb-1">Iniciativa</label>
                      <select value={form.initiativeId} onChange={e => setForm(f => ({ ...f, initiativeId: e.target.value }))} className={inputCls}>
                        <option value="">Geral (sem iniciativa)</option>
                        {initiatives.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="block text-[11px] text-muted-foreground mb-1">Nome do doador *</label>
                    <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nome completo" className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-[11px] text-muted-foreground mb-1">E-mail</label>
                    <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="opcional" className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-[11px] text-muted-foreground mb-1">Valor (R$) *</label>
                    <input required value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="1.200" className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-[11px] text-muted-foreground mb-1">Observação</label>
                    <input value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="opcional" className={inputCls} />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Dialog.Close className="h-9 px-4 text-[13px] border border-border rounded-lg text-muted-foreground hover:bg-surface-2 transition-colors cursor-pointer">
                      Cancelar
                    </Dialog.Close>
                    <button type="submit" disabled={saving} className="h-9 px-4 text-[13px] bg-primary text-white rounded-lg font-medium hover:bg-accent-hover disabled:opacity-60 transition-colors cursor-pointer">
                      {saving ? "Salvando..." : "Registrar"}
                    </button>
                  </div>
                </form>
              </Dialog.Popup>
            </Dialog.Portal>
          </Dialog.Root>
        </div>
      </div>

      {/* Table */}
      <div className="p-7 flex-1 flex flex-col gap-4">
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border text-muted-foreground text-left">
                <th className="px-5 py-3 font-medium">Doador</th>
                <th className="px-5 py-3 font-medium">Projeto / Iniciativa</th>
                <th className="px-5 py-3 font-medium">Valor</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Data</th>
                <th className="px-5 py-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {!pledges && [...Array(6)].map((_, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  {[40, 56, 24, 20, 24, 20].map((w, j) => (
                    <td key={j} className="px-5 py-3"><Skeleton className={`h-4 w-${w}`} /></td>
                  ))}
                </tr>
              ))}
              {pledges?.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-16 text-center text-muted-foreground text-[13px]">Nenhuma oferta registrada.</td></tr>
              )}
              {pledges?.map(p => (
                <tr key={p.id} className="border-b border-border last:border-0 hover:bg-surface-2/40 transition-colors">
                  <td className="px-5 py-3">
                    <span className="text-foreground font-medium">{p.name}</span>
                    {p.email && <span className="block text-[11px] text-text-subtle">{p.email}</span>}
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">
                    <span>{p.project.name}</span>
                    {p.initiative && <span className="block text-[11px]">{p.initiative.name}</span>}
                  </td>
                  <td className="px-5 py-3 font-medium text-foreground">{fmt(p.amount)}</td>
                  <td className="px-5 py-3">
                    <Badge variant={STATUS_BADGE[p.status].variant}>{STATUS_BADGE[p.status].label}</Badge>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground text-[12px]">{formatDate(p.createdAt)}</td>
                  <td className="px-5 py-3">
                    {p.status === "PENDING" && (
                      <div className="flex items-center gap-1">
                        <ConfirmDialog
                          title="Confirmar oferta"
                          description={`Confirmar oferta de ${fmt(p.amount)} de ${p.name}?`}
                          onConfirm={() => updateStatus(p.id, "CONFIRMED")}
                          trigger={
                            <button className="p-1.5 rounded-md hover:bg-success/10 text-success transition-colors cursor-pointer">
                              <Check className="size-3.5" />
                            </button>
                          }
                        />
                        <ConfirmDialog
                          title="Cancelar oferta"
                          description={`Cancelar oferta de ${fmt(p.amount)} de ${p.name}?`}
                          onConfirm={() => updateStatus(p.id, "CANCELLED")}
                          trigger={
                            <button className="p-1.5 rounded-md hover:bg-destructive/10 text-destructive transition-colors cursor-pointer">
                              <X className="size-3.5" />
                            </button>
                          }
                        />
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between text-[12px] text-muted-foreground">
            <span>Página {page} de {totalPages}</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded-md hover:bg-surface-2 disabled:opacity-40 transition-colors"><ChevronLeft className="size-4" /></button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded-md hover:bg-surface-2 disabled:opacity-40 transition-colors"><ChevronRight className="size-4" /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verificar tipos**

```bash
npx tsc --noEmit 2>&1 | grep "ofertas\|sidebar" | head -10
```

Esperado: sem erros.

- [ ] **Step 4: Commit**

```
feat(admin): /ofertas page with pledge management and sidebar item
```

---

## Task 8: Portal público — redesign completo

**Files:**
- Modify: `src/app/(public)/p/[slug]/page.tsx`

**Interfaces:**
- Consumes: `GET /api/v1/public/projects/[slug]` expandida (Task 5); `POST /api/v1/public/projects/[slug]/pledges` (Task 3)
- Produces: portal redesenhado com nav, 4 KPIs globais, cards de iniciativa 4D, timeline vertical, prestação de contas (saídas), seção "Como contribuir" (PIX + WhatsApp + pledge form)

- [ ] **Step 1: Substituir o conteúdo da página pelo redesign**

Substituir **todo o conteúdo** de `src/app/(public)/p/[slug]/page.tsx` pelo código abaixo:

```tsx
"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Calendar, Copy, Check, MessageCircle, Handshake, Flag, Receipt } from "lucide-react"
import { cn } from "@/lib/utils"

/* ── types ── */
type Initiative = {
  id: string; name: string; status: string
  goal: number; pledged: number; raised: number; executed: number
}

type Portal = {
  id: string; name: string; description?: string; status: string; endDate?: string
  organization: string
  pix: { key: string | null; qrCode: string | null; whatsapp: string | null }
  stats: {
    totalGoal: number; totalPledged: number; totalRaised: number; totalExecuted: number
    goalPercent: number; supporters: number
  }
  initiatives: Initiative[]
  timelinePosts: { id: string; content: string; publishedAt: string; author: { name: string } }[]
  financialExits: { id: string; description: string; amount: string; date: string; supplier?: string }[]
}

/* ── helpers ── */
const fmt = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 })

const pct = (v: number, total: number) =>
  total > 0 ? Math.min(100, Math.round((v / total) * 100)) : 0

function barColor(p: number): string {
  if (p >= 100) return "var(--primary)"
  if (p >= 65)  return "#22c55e"
  if (p >= 35)  return "#eab308"
  return "#ef4444"
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("rounded bg-border/40 animate-pulse", className)} />
}

/* ── progress bar ── */
function Bar({ value, color, glow }: { value: number; color: string; glow?: boolean }) {
  return (
    <div className="relative h-3 rounded-full overflow-hidden bg-[#2c2824]">
      <div
        className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
        style={{
          width: `${value}%`,
          background: color,
          boxShadow: glow ? `0 0 10px color-mix(in oklch, ${color} 40%, transparent)` : undefined,
        }}
      />
      <span className="absolute right-0 top-0 bottom-0 w-[2px] bg-[#6b6460]/60 rounded" title="Meta" />
    </div>
  )
}

/* ── 4-metric row ── */
function MetricRow({ label, value, goal }: { label: string; value: number; goal: number }) {
  const p = pct(value, goal)
  const color = barColor(p)
  return (
    <div className="grid grid-cols-[120px_1fr_130px] gap-3 items-center">
      <span className="text-[12px] text-[#9b9390]">{label}</span>
      <Bar value={p} color={color} glow />
      <span className="text-[12px] text-right whitespace-nowrap">
        <strong className="font-medium text-[#f5f0eb]">{fmt(value)}</strong>{" "}
        <span className="text-[#6b6460]">· {p}%</span>
      </span>
    </div>
  )
}

/* ── pledge form ── */
function PledgeForm({ slug, initiatives }: { slug: string; initiatives: Initiative[] }) {
  const [form, setForm] = useState({ name: "", amount: "", initiativeId: "" })
  const [sent, setSent]   = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]    = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      const res = await fetch(`/api/v1/public/projects/${slug}/pledges`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          amount: Number(form.amount.replace(/\D/g, "")),
          initiativeId: form.initiativeId || undefined,
        }),
      })
      if (!res.ok) throw new Error()
      setSent(true)
    } catch {
      setError("Erro ao registrar compromisso. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  const inputCls = "w-full px-3 py-2 text-[13px] bg-[#0c0b0a] border border-[#2c2824] rounded-lg text-[#f5f0eb] outline-none focus:border-[#f59e0b] transition-colors"

  if (sent) {
    return (
      <div className="p-4 rounded-xl bg-[color-mix(in_oklch,#f59e0b_8%,transparent)] border border-[#f59e0b]/30">
        <div className="flex items-center gap-2 font-medium text-[#fcd34d] mb-1">
          <Check className="size-4" /> Compromisso registrado!
        </div>
        <p className="text-[13px] text-[#9b9390] leading-relaxed">
          Obrigado! Nossa equipe confirmará seu compromisso e ele passará a contar no painel da campanha.
        </p>
        <button onClick={() => setSent(false)} className="mt-3 text-[12px] text-[#9b9390] hover:text-[#f5f0eb] transition-colors">
          Registrar outro
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div>
        <label className="block text-[11px] text-[#9b9390] mb-1">Seu nome *</label>
        <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          placeholder="Nome completo" className={inputCls} />
      </div>
      <div>
        <label className="block text-[11px] text-[#9b9390] mb-1">Valor (R$) *</label>
        <input required value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
          placeholder="Ex: 1.200" className={inputCls} />
      </div>
      {initiatives.length > 0 && (
        <div>
          <label className="block text-[11px] text-[#9b9390] mb-1">Iniciativa</label>
          <select value={form.initiativeId} onChange={e => setForm(f => ({ ...f, initiativeId: e.target.value }))} className={inputCls}>
            <option value="">Onde for mais necessário</option>
            {initiatives.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
          </select>
        </div>
      )}
      {error && <p className="text-[12px] text-destructive">{error}</p>}
      <button type="submit" disabled={loading}
        className="self-start px-5 py-2 bg-[#f59e0b] text-[#0c0b0a] rounded-lg text-[13px] font-semibold hover:bg-[#d97706] disabled:opacity-60 transition-colors cursor-pointer">
        {loading ? "Enviando..." : "Enviar compromisso"}
      </button>
    </form>
  )
}

/* ── main page ── */
export default function PublicPortalPage() {
  const { slug } = useParams<{ slug: string }>()
  const [portal, setPortal]     = useState<Portal | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [copied, setCopied]     = useState(false)

  useEffect(() => {
    if (!slug) return
    fetch(`/api/v1/public/projects/${slug}`)
      .then(r => { if (r.status === 404) { setNotFound(true); return null } return r.json() })
      .then(d => { if (d) setPortal(d) })
  }, [slug])

  function copyPix() {
    if (!portal?.pix.key) return
    navigator.clipboard?.writeText(portal.pix.key)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-[#0c0b0a] flex items-center justify-center">
        <div className="text-center">
          <p className="text-2xl font-semibold font-serif mb-2 text-[#f5f0eb]">Portal não encontrado</p>
          <p className="text-[#6b6460] text-sm">Este link pode estar desatualizado ou o projeto não é público.</p>
        </div>
      </div>
    )
  }

  const s    = portal?.stats
  const inits = portal?.initiatives ?? []

  return (
    <div className="min-h-screen bg-[#0c0b0a] text-[#f5f0eb]" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>

      {/* Nav */}
      <nav className="sticky top-0 z-20 backdrop-blur-md border-b border-[#2c2824] bg-[#0c0b0a]/80">
        <div className="max-w-[1040px] mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[14px] font-semibold">
            <span className="text-[#f59e0b]">◆</span>
            {portal ? portal.organization : <Skeleton className="h-4 w-28" />}
          </div>
          <div className="flex items-center gap-3">
            {portal?.endDate && (
              <span className="hidden sm:inline-flex items-center gap-1.5 text-[12px] text-[#9b9390] border border-[#2c2824] rounded-lg px-3 py-1">
                <Calendar className="size-3.5 text-[#f59e0b]" />
                Meta até {formatDate(portal.endDate)}
              </span>
            )}
            <a href="#contribuir" className="px-4 py-1.5 bg-[#f59e0b] text-[#0c0b0a] rounded-lg text-[13px] font-semibold hover:bg-[#d97706] transition-colors">
              Quero contribuir
            </a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <header className="max-w-[1040px] mx-auto px-6 pt-16 pb-10">
        <div className="text-[11px] tracking-[0.14em] uppercase text-[#f59e0b] font-medium mb-3">
          {portal ? portal.organization : <Skeleton className="h-3 w-24" />}
        </div>
        {portal ? (
          <h1 className="font-serif font-medium text-[clamp(28px,4.5vw,44px)] leading-[1.12] max-w-[600px] mb-4">
            {portal.name}
          </h1>
        ) : <Skeleton className="h-12 w-96 mb-4" />}
        {portal?.description && (
          <p className="text-[#9b9390] text-[16px] leading-relaxed max-w-[540px]">{portal.description}</p>
        )}
      </header>

      <main className="max-w-[1040px] mx-auto px-6 pb-20 flex flex-col gap-14">

        {/* Visão global */}
        <section className="bg-[#151413] border border-[#2c2824] rounded-2xl p-7 shadow-lg">
          <div className="flex flex-wrap items-baseline justify-between gap-3 mb-5">
            <div>
              <div className="text-[11px] uppercase tracking-[0.1em] text-[#9b9390] font-medium mb-1">Visão global da campanha</div>
              {s ? (
                <div className="font-serif text-[32px] font-medium">{fmt(s.totalGoal)}</div>
              ) : <Skeleton className="h-9 w-40" />}
            </div>
          </div>

          {/* 4 metric bars */}
          {s ? (
            <div className="flex flex-col gap-3 mb-5">
              <MetricRow label="Meta"          value={s.totalGoal}     goal={s.totalGoal} />
              <MetricRow label="Compromissado" value={s.totalPledged}  goal={s.totalGoal} />
              <MetricRow label="Arrecadado"    value={s.totalRaised}   goal={s.totalGoal} />
              <MetricRow label="Executado"     value={s.totalExecuted} goal={s.totalGoal} />
            </div>
          ) : (
            <div className="flex flex-col gap-3 mb-5">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-6" />)}
            </div>
          )}

          {/* KPI cards */}
          {s && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {[
                { label: "Meta",         value: s.totalGoal,     color: "#6b6460" },
                { label: "Compromissado",value: s.totalPledged,  color: "#9b9390" },
                { label: "Arrecadado",   value: s.totalRaised,   color: "#f59e0b", highlight: true },
                { label: "Executado",    value: s.totalExecuted, color: "#fcd34d" },
              ].map(({ label, value, color, highlight }) => (
                <div key={label} className={cn(
                  "border rounded-xl p-4",
                  highlight ? "border-[#f59e0b]/40 bg-[color-mix(in_oklch,#f59e0b_6%,transparent)]" : "border-[#2c2824] bg-[#0c0b0a]"
                )}>
                  <div className="flex items-center gap-2 text-[11px] text-[#9b9390] mb-2">
                    <span className="w-2 h-2 rounded-full flex-none" style={{ background: color }} />
                    {label}
                  </div>
                  <div className={cn("text-[20px] font-medium font-serif", highlight && "text-[#fcd34d]")}>
                    {fmt(value)}
                  </div>
                  <div className="text-[11px] text-[#6b6460] mt-0.5">{pct(value, s.totalGoal)}% da meta</div>
                </div>
              ))}
            </div>
          )}

          {/* Faltam row */}
          {s && s.totalGoal > s.totalPledged && (
            <div className="flex flex-wrap gap-5 p-4 rounded-xl bg-[#1c1a18] border border-[#2c2824]">
              <div className="flex items-center gap-2 text-[13px] text-[#9b9390]">
                <Flag className="size-4 text-[#f59e0b]" />
                Falta comprometer <strong className="text-[#f5f0eb] font-medium ml-1">{fmt(s.totalGoal - s.totalPledged)}</strong>
              </div>
              {s.totalPledged > s.totalRaised && (
                <div className="flex items-center gap-2 text-[13px] text-[#9b9390]">
                  <Receipt className="size-4 text-[#f59e0b]" />
                  Comprometido a receber <strong className="text-[#f5f0eb] font-medium ml-1">{fmt(s.totalPledged - s.totalRaised)}</strong>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Iniciativas */}
        {inits.length > 0 && (
          <section>
            <div className="mb-5">
              <div className="text-[11px] uppercase tracking-[0.14em] text-[#f59e0b] font-medium mb-2">Iniciativas</div>
              <h2 className="font-serif font-medium text-[26px]">Onde sua oferta atua</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {inits.map((init, idx) => {
                const colors = ["#f59e0b", "#22c55e", "#3b82f6", "#a78bfa"]
                const c = colors[idx % colors.length]
                return (
                  <div key={init.id} className="bg-[#151413] border border-[#2c2824] rounded-2xl p-6" style={{ borderTopColor: c, borderTopWidth: 2 }}>
                    <div className="flex items-center gap-2 mb-4">
                      <span className="w-2.5 h-2.5 rounded-sm flex-none" style={{ background: c }} />
                      <span className="text-[16px] font-medium">{init.name}</span>
                    </div>
                    <div className="font-serif text-[24px] font-medium mb-4">{fmt(init.goal)}<span className="text-[12px] text-[#6b6460] font-sans ml-2">meta</span></div>
                    <div className="flex flex-col gap-2.5 mb-4">
                      <MetricRow label="Compromissado" value={init.pledged}  goal={init.goal} />
                      <MetricRow label="Arrecadado"    value={init.raised}   goal={init.goal} />
                      <MetricRow label="Executado"     value={init.executed} goal={init.goal} />
                    </div>
                    {init.goal > init.pledged && (
                      <div className="flex justify-between text-[12px] pt-3 border-t border-[#2c2824]">
                        <span className="text-[#6b6460]">Falta comprometer</span>
                        <span className="font-medium">{fmt(init.goal - init.pledged)}</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* Timeline */}
        {(portal?.timelinePosts?.length ?? 0) > 0 && (
          <section>
            <div className="mb-6">
              <div className="text-[11px] uppercase tracking-[0.14em] text-[#f59e0b] font-medium mb-2">Timeline</div>
              <h2 className="font-serif font-medium text-[26px]">Atualizações da campanha</h2>
            </div>
            <div className="flex flex-col">
              {portal!.timelinePosts.map((post, i) => (
                <div key={post.id} className="grid grid-cols-[20px_1fr] gap-4">
                  <div className="flex flex-col items-center">
                    <span className="w-3 h-3 rounded-full flex-none mt-1 bg-[#f59e0b] shadow-[0_0_8px_color-mix(in_oklch,#f59e0b_50%,transparent)]" />
                    {i < portal!.timelinePosts.length - 1 && (
                      <span className="flex-1 w-px bg-gradient-to-b from-[#2c2824] to-transparent" />
                    )}
                  </div>
                  <div className="pb-7">
                    <div className="text-[11px] uppercase tracking-[0.06em] text-[#f59e0b] font-medium">{formatDate(post.publishedAt)}</div>
                    <div className="text-[13px] font-medium mt-1">{post.author.name}</div>
                    <div className="text-[13px] text-[#9b9390] mt-1 leading-relaxed max-w-[520px]">{post.content}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Prestação de contas */}
        {(portal?.financialExits?.length ?? 0) > 0 && (
          <section>
            <div className="mb-5 flex flex-wrap justify-between items-end gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-[0.14em] text-[#f59e0b] font-medium mb-2">Prestação de contas</div>
                <h2 className="font-serif font-medium text-[26px]">Cada real, registrado</h2>
              </div>
              {s && <span className="inline-flex items-center gap-1.5 text-[12px] border border-[#f59e0b]/40 text-[#fcd34d] rounded-lg px-3 py-1"><Receipt className="size-3.5" /> Executado: {fmt(s.totalExecuted)}</span>}
            </div>
            <div className="bg-[#151413] border border-[#2c2824] rounded-2xl overflow-auto">
              <table className="w-full text-[13px] min-w-[480px]">
                <thead>
                  <tr className="border-b border-[#2c2824] text-[#6b6460] text-left">
                    <th className="px-5 py-3 font-medium">Data</th>
                    <th className="px-5 py-3 font-medium">Descrição</th>
                    <th className="px-5 py-3 font-medium text-right">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {portal!.financialExits.map(e => (
                    <tr key={e.id} className="border-b border-[#2c2824] last:border-0">
                      <td className="px-5 py-3 text-[#6b6460] whitespace-nowrap">{formatDate(e.date)}</td>
                      <td className="px-5 py-3">
                        {e.description}
                        {e.supplier && <span className="block text-[11px] text-[#6b6460]">{e.supplier}</span>}
                      </td>
                      <td className="px-5 py-3 font-medium text-right whitespace-nowrap">{fmt(Number(e.amount))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Como contribuir */}
        <section id="contribuir" style={{ scrollMarginTop: "80px" }}>
          <div className="mb-5">
            <div className="text-[11px] uppercase tracking-[0.14em] text-[#f59e0b] font-medium mb-2">Como contribuir</div>
            <h2 className="font-serif font-medium text-[26px]">Faça parte desta missão</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-start">

            {/* PIX */}
            {portal?.pix.key && (
              <div className="bg-[#151413] border border-[#2c2824] rounded-2xl p-6 flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-[#f59e0b] text-[20px]">⬡</span>
                  <span className="text-[16px] font-medium">Doe agora via PIX</span>
                </div>
                {portal.pix.qrCode && (
                  <img src={portal.pix.qrCode} alt="QR Code PIX" className="w-32 h-32 object-contain rounded-xl border border-[#2c2824] mx-auto" />
                )}
                <p className="text-[13px] text-[#9b9390] leading-relaxed">
                  Transfira diretamente para a conta da campanha.
                </p>
                <div className="flex gap-2 items-center">
                  <code className="flex-1 px-3 py-2 rounded-lg bg-[#0c0b0a] border border-[#2c2824] text-[13px] overflow-hidden text-ellipsis whitespace-nowrap">
                    {portal.pix.key}
                  </code>
                  <button onClick={copyPix} className="px-3 py-2 rounded-lg border border-[#2c2824] text-[12px] text-[#9b9390] hover:bg-[#1c1a18] transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1">
                    {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
                    {copied ? "Copiado" : "Copiar"}
                  </button>
                </div>
              </div>
            )}

            {/* WhatsApp */}
            {portal?.pix.whatsapp && (
              <div className="bg-[#151413] border border-[#2c2824] rounded-2xl p-6 flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <MessageCircle className="size-5 text-[#f59e0b]" />
                  <span className="text-[16px] font-medium">Comprometa-se pelo WhatsApp</span>
                </div>
                <p className="text-[13px] text-[#9b9390] leading-relaxed">
                  Fale com a equipe da campanha, informe o valor e a iniciativa. Seu compromisso entra no painel em até 24h.
                </p>
                <a
                  href={`https://wa.me/${portal.pix.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent("Olá! Quero registrar um compromisso para a campanha.")}`}
                  target="_blank" rel="noopener"
                  className="self-start inline-flex items-center gap-2 px-4 py-2 bg-[#f59e0b] text-[#0c0b0a] rounded-lg text-[13px] font-semibold hover:bg-[#d97706] transition-colors"
                >
                  <MessageCircle className="size-4" /> Abrir conversa
                </a>
              </div>
            )}

            {/* Pledge form */}
            <div className="bg-[#151413] border border-[#2c2824] rounded-2xl p-6 flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <Handshake className="size-5 text-[#f59e0b]" />
                <span className="text-[16px] font-medium">Registrar compromisso</span>
              </div>
              <PledgeForm slug={slug as string} initiatives={inits} />
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#2c2824] py-7 px-6">
        <div className="max-w-[1040px] mx-auto flex flex-wrap justify-between gap-3 text-[12px] text-[#6b6460]">
          <span>{portal?.organization} · Campanha</span>
          <span>Dados atualizados pelo painel de gestão</span>
        </div>
      </footer>
    </div>
  )
}
```

- [ ] **Step 2: Verificar tipos**

```bash
npx tsc --noEmit 2>&1 | grep "public.*slug\|portal" | head -10
```

Esperado: sem erros.

- [ ] **Step 3: Commit**

```
feat(portal): redesign public portal with 4-metric view, PIX/WhatsApp and pledge form
```

---

## Self-Review

**Spec coverage:**
- ✅ Pledge model com PENDING/CONFIRMED/CANCELLED
- ✅ POST público `/projects/[slug]/pledges`
- ✅ Admin GET/POST/PATCH pledges com `financial:write`
- ✅ PIX key, WhatsApp, QR code upload na org
- ✅ 4 métricas: totalGoal, totalPledged, totalRaised, totalExecuted
- ✅ Portal redesenhado com nav, iniciativas 4D, PIX, WhatsApp, pledge form
- ✅ Página `/ofertas` com confirmação/cancelamento e nova oferta manual
- ✅ Sidebar item /ofertas
- ✅ logAudit nas ações admin (PATCH status, POST manual)

**Gaps identificados e cobertos:**
- Pledge não tem soft delete (intencional — ofertas canceladas ficam visíveis no histórico)
- Portal mostra só `financialExits` na prestação de contas (conforme mockup — entradas são internas)
- `supporters` mantido como count de `financialEntries` (fidelidade ao campo existente)
