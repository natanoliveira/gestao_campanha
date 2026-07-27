# Painel de Decisão — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar ações de decisão (Concluir, Prorrogar, Cancelar) sobre iniciativas críticas no AlertsPanel do dashboard e em uma nova página `/decisoes`.

**Architecture:** `DecisaoDialog` é um componente Dialog compartilhado que recebe uma iniciativa como prop e chama `PUT /api/v1/projects/[id]/initiatives/[initId]`. O `AlertsPanel` ganha o botão "Decidir" e link "Ver todas →". A página `/decisoes` reutiliza o mesmo endpoint de alertas e o mesmo dialog.

**Tech Stack:** Next.js 16 App Router, base-ui Dialog, React Hook Form não necessário (formulário simples com `<input type="date">`), `fetchWithAuth`, `can()` de `@/lib/permissions`.

## Global Constraints

- `"use client"` DEVE ser a primeira linha de qualquer arquivo de componente client
- Permissão de escrita: `can(role, "initiative:write")` — ADMIN e MANAGER
- Role lido do localStorage: `JSON.parse(localStorage.getItem("user") ?? "{}").role ?? ""`
- Dialog: usar `Dialog` do `@base-ui/react/dialog` (padrão do projeto)
- API calls: usar `fetchWithAuth` de `@/lib/fetch-with-auth`
- Spinner: `import { Spinner } from "@/components/ui/spinner"`
- Ícones: `lucide-react`
- CSS vars disponíveis: `--success`, `--warning`, `--destructive`, `--primary`, `--border`, `--card`, `--surface-2`, `--text-subtle`, `--foreground`

---

## File Map

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `src/components/shared/alerts-panel.tsx` | Modificar | Exportar tipo `Alert`; adicionar role check, botão "Decidir", link "Ver todas →", integrar `DecisaoDialog` |
| `src/components/shared/decisao-dialog.tsx` | Criar | Dialog com 3 ações e expansão de data inline para Prorrogar |
| `src/app/(app)/decisoes/page.tsx` | Criar | Página com tabela de iniciativas críticas + `DecisaoDialog` |
| `src/components/layout/sidebar.tsx` | Modificar | Adicionar link "Decisões" com ícone `Scale`, visível apenas para `initiative:write` |

---

### Task 1: Exportar tipo `Alert` do AlertsPanel

**Files:**
- Modify: `src/components/shared/alerts-panel.tsx`

**Interfaces:**
- Produces: `export type Alert` com campos `{ id, name, endDate, status, projectId, projectName, daysLeft }`

- [ ] **Step 1: Exportar o tipo `Alert`**

Em `src/components/shared/alerts-panel.tsx`, mude a linha do tipo de:

```ts
type Alert = {
```

para:

```ts
export type Alert = {
```

- [ ] **Step 2: Verificar que o build não quebra**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: sem erros relacionados a `Alert`.

- [ ] **Step 3: Commit**

```bash
git add src/components/shared/alerts-panel.tsx
git commit -m "refactor: exportar tipo Alert do AlertsPanel"
```

---

### Task 2: Criar `DecisaoDialog`

**Files:**
- Create: `src/components/shared/decisao-dialog.tsx`

**Interfaces:**
- Consumes: `Alert` de `@/components/shared/alerts-panel` — `{ id, name, projectId, projectName, daysLeft, status }`
- Produces: `<DecisaoDialog initiative={Alert} open={boolean} onOpenChange={fn} onSuccess={fn} />`

- [ ] **Step 1: Criar o arquivo**

```tsx
"use client"

import { useState } from "react"
import { Dialog } from "@base-ui/react/dialog"
import { CheckCircle2, RotateCcw, XCircle } from "lucide-react"
import { fetchWithAuth } from "@/lib/fetch-with-auth"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"
import type { Alert } from "@/components/shared/alerts-panel"

type Props = {
  initiative: Alert
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

function daysBadgeText(daysLeft: number) {
  if (daysLeft < 0) return `Vencida há ${Math.abs(daysLeft)} dia${Math.abs(daysLeft) !== 1 ? "s" : ""}`
  if (daysLeft === 0) return "Vence hoje"
  return `Vence em ${daysLeft} dia${daysLeft !== 1 ? "s" : ""}`
}

export function DecisaoDialog({ initiative, open, onOpenChange, onSuccess }: Props) {
  const [loading, setLoading] = useState<"complete" | "extend" | "cancel" | null>(null)
  const [extendOpen, setExtendOpen] = useState(false)
  const [newDate, setNewDate] = useState("")
  const [error, setError] = useState<string | null>(null)

  const isUrgent = initiative.daysLeft < 0

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const minDate = tomorrow.toISOString().split("T")[0]

  async function act(action: "complete" | "extend" | "cancel") {
    setError(null)
    setLoading(action)
    try {
      const body =
        action === "complete" ? { status: "COMPLETED" } :
        action === "cancel"   ? { status: "CANCELLED" } :
        { endDate: newDate }

      const res = await fetchWithAuth(
        `/api/v1/projects/${initiative.projectId}/initiatives/${initiative.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      )
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error?.message ?? "Erro ao salvar")
      }
      onOpenChange(false)
      onSuccess()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ocorreu um erro")
    } finally {
      setLoading(null)
    }
  }

  function handleClose() {
    if (loading) return
    setExtendOpen(false)
    setNewDate("")
    setError(null)
    onOpenChange(false)
  }

  return (
    <Dialog.Root open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-black/50 z-40 transition-opacity duration-200 data-[starting-style]:opacity-0 data-[ending-style]:opacity-0" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-card border border-border rounded-xl shadow-xl w-full max-w-sm p-5 outline-none transition-all duration-200 data-[starting-style]:opacity-0 data-[starting-style]:scale-95 data-[ending-style]:opacity-0 data-[ending-style]:scale-95">

          {/* Header */}
          <div className="mb-4 p-3.5 bg-surface-2 rounded-lg border border-border">
            <p className="text-[14px] font-semibold text-foreground leading-snug">{initiative.name}</p>
            <p className={cn("text-[11px] mt-1", isUrgent ? "text-destructive" : "text-text-subtle")}>
              {daysBadgeText(initiative.daysLeft)} · {initiative.projectName}
            </p>
          </div>

          <p className="text-[12px] text-text-subtle mb-3">O que deseja fazer com esta iniciativa?</p>

          <div className="flex flex-col gap-2">

            {/* Concluir */}
            <button
              disabled={!!loading}
              onClick={() => act("complete")}
              className="flex items-center gap-3 px-4 py-3 rounded-lg bg-success/10 border border-success/20 text-success text-[12px] text-left hover:bg-success/15 transition-colors disabled:opacity-50"
            >
              {loading === "complete" ? <Spinner size="sm" /> : <CheckCircle2 className="size-4 shrink-0" />}
              <div>
                <span className="font-medium">Marcar como concluída</span>
                <span className="block text-[11px] opacity-70">Iniciativa finalizada com sucesso</span>
              </div>
            </button>

            {/* Prorrogar */}
            <div className={cn("rounded-lg border transition-colors", extendOpen ? "border-warning/40 bg-warning/5" : "border-border")}>
              <button
                disabled={!!loading && loading !== "extend"}
                onClick={() => { if (!extendOpen) { setExtendOpen(true) } else { if (newDate) act("extend") } }}
                className="flex items-center gap-3 px-4 py-3 w-full text-warning text-[12px] text-left hover:bg-warning/10 transition-colors disabled:opacity-50 rounded-lg"
              >
                {loading === "extend" ? <Spinner size="sm" /> : <RotateCcw className="size-4 shrink-0" />}
                <div>
                  <span className="font-medium">Prorrogar prazo</span>
                  <span className="block text-[11px] opacity-70">Definir nova data de encerramento</span>
                </div>
                {extendOpen && newDate && <span className="ml-auto text-[11px] font-medium">Confirmar →</span>}
              </button>
              {extendOpen && (
                <div className="px-4 pb-3 flex items-center gap-2">
                  <input
                    type="date"
                    min={minDate}
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="flex-1 h-8 px-3 text-[12px] bg-background border border-border rounded-lg text-foreground outline-none focus:border-warning"
                  />
                  <button
                    onClick={() => { setExtendOpen(false); setNewDate("") }}
                    className="text-[11px] text-text-subtle hover:text-foreground px-2"
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </div>

            {/* Cancelar */}
            <button
              disabled={!!loading}
              onClick={() => act("cancel")}
              className="flex items-center gap-3 px-4 py-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-[12px] text-left hover:bg-destructive/15 transition-colors disabled:opacity-50"
            >
              {loading === "cancel" ? <Spinner size="sm" /> : <XCircle className="size-4 shrink-0" />}
              <div>
                <span className="font-medium">Cancelar iniciativa</span>
                <span className="block text-[11px] opacity-70">Encerrar sem conclusão</span>
              </div>
            </button>
          </div>

          {error && (
            <p className="mt-3 text-[12px] text-destructive bg-destructive/10 rounded px-3 py-2">{error}</p>
          )}

          <div className="mt-4 flex justify-end">
            <Dialog.Close render={
              <button
                disabled={!!loading}
                className="h-8 px-4 rounded-lg border border-border text-[12px] text-foreground hover:bg-surface-2 transition-colors disabled:opacity-50"
              >
                Fechar
              </button>
            } />
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
```

- [ ] **Step 2: Verificar tipos**

```bash
npx tsc --noEmit 2>&1 | grep decisao
```

Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/components/shared/decisao-dialog.tsx
git commit -m "feat: criar DecisaoDialog com ações Concluir, Prorrogar, Cancelar"
```

---

### Task 3: Atualizar AlertsPanel

**Files:**
- Modify: `src/components/shared/alerts-panel.tsx`

**Interfaces:**
- Consumes: `DecisaoDialog` de `@/components/shared/decisao-dialog`
- Consumes: `can` de `@/lib/permissions`

- [ ] **Step 1: Adicionar imports**

No topo de `src/components/shared/alerts-panel.tsx`, adicionar após os imports existentes:

```tsx
import { can } from "@/lib/permissions"
import { DecisaoDialog } from "@/components/shared/decisao-dialog"
```

- [ ] **Step 2: Adicionar helper de role e estado**

Após as definições de tipo, adicionar:

```tsx
function currentRole(): string {
  try { return JSON.parse(localStorage.getItem("user") ?? "{}").role ?? "" }
  catch { return "" }
}
```

No componente `AlertsPanel`, adicionar estados:

```tsx
const [role, setRole] = useState("")
const [decidindo, setDecidindo] = useState<Alert | null>(null)

useEffect(() => { setRole(currentRole()) }, [])
```

- [ ] **Step 3: Adicionar link "Ver todas →" no header**

Substituir:

```tsx
<div className="flex items-center gap-2 px-5 py-4 border-b border-border">
  <AlertTriangle className="size-4 text-warning" />
  <span className="text-[14px] font-medium">Alertas de Prazo</span>
  <span className="ml-auto text-[11px] font-medium bg-warning/15 text-warning px-2 py-0.5 rounded-full">
    {alerts.length}
  </span>
</div>
```

por:

```tsx
<div className="flex items-center gap-2 px-5 py-4 border-b border-border">
  <AlertTriangle className="size-4 text-warning" />
  <span className="text-[14px] font-medium">Alertas de Prazo</span>
  <span className="ml-2 text-[11px] font-medium bg-warning/15 text-warning px-2 py-0.5 rounded-full">
    {alerts.length}
  </span>
  <Link href="/decisoes" className="ml-auto text-[11px] text-primary hover:underline">
    Ver todas →
  </Link>
</div>
```

- [ ] **Step 4: Adicionar botão "Decidir" em cada linha**

Dentro do `<li>` de cada alerta, após o badge de dias, adicionar o botão condicional:

```tsx
{can(role, "initiative:write") && (
  <button
    onClick={(e) => { e.preventDefault(); setDecidindo(a) }}
    className="ml-2 shrink-0 text-[11px] font-medium px-2.5 py-0.5 rounded-md bg-primary text-white hover:bg-primary/90 transition-colors"
  >
    Decidir
  </button>
)}
```

- [ ] **Step 5: Adicionar `DecisaoDialog` no final do componente**

Antes do `</div>` final do componente `AlertsPanel`, adicionar:

```tsx
{decidindo && (
  <DecisaoDialog
    initiative={decidindo}
    open={!!decidindo}
    onOpenChange={(v) => { if (!v) setDecidindo(null) }}
    onSuccess={() => {
      setDecidindo(null)
      fetchWithAuth("/api/v1/dashboard/alerts")
        .then((r) => r.json())
        .then(setAlerts)
        .catch(() => setAlerts([]))
    }}
  />
)}
```

- [ ] **Step 6: Verificar tipos e build**

```bash
npx tsc --noEmit 2>&1 | grep -i alert
```

Expected: sem erros.

- [ ] **Step 7: Commit**

```bash
git add src/components/shared/alerts-panel.tsx
git commit -m "feat: adicionar botão Decidir e link Ver todas no AlertsPanel"
```

---

### Task 4: Criar página `/decisoes`

**Files:**
- Create: `src/app/(app)/decisoes/page.tsx`

**Interfaces:**
- Consumes: `Alert` de `@/components/shared/alerts-panel`
- Consumes: `DecisaoDialog` de `@/components/shared/decisao-dialog`
- Consumes: `can` de `@/lib/permissions`
- Consumes: `GET /api/v1/dashboard/alerts`

- [ ] **Step 1: Criar o arquivo**

```tsx
"use client"

import { useEffect, useState, useCallback } from "react"
import { Scale, AlertTriangle } from "lucide-react"
import { fetchWithAuth } from "@/lib/fetch-with-auth"
import { can } from "@/lib/permissions"
import { DecisaoDialog } from "@/components/shared/decisao-dialog"
import { cn } from "@/lib/utils"
import type { Alert } from "@/components/shared/alerts-panel"

function currentRole(): string {
  try { return JSON.parse(localStorage.getItem("user") ?? "{}").role ?? "" }
  catch { return "" }
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("rounded bg-border/40 animate-pulse", className)} />
}

function daysBadge(daysLeft: number) {
  if (daysLeft < 0) return { cls: "text-destructive bg-destructive/10", label: `Vencida há ${Math.abs(daysLeft)}d` }
  if (daysLeft === 0) return { cls: "text-warning bg-warning/10", label: "Vence hoje" }
  if (daysLeft <= 7)  return { cls: "text-warning bg-warning/10", label: `${daysLeft} dias` }
  return { cls: "text-text-subtle bg-border/40", label: `${daysLeft} dias` }
}

export default function DecisoesPage() {
  const [alerts, setAlerts] = useState<Alert[] | null>(null)
  const [role, setRole]     = useState("")
  const [decidindo, setDecidindo] = useState<Alert | null>(null)

  const load = useCallback(() => {
    setAlerts(null)
    fetchWithAuth("/api/v1/dashboard/alerts")
      .then((r) => r.json())
      .then(setAlerts)
      .catch(() => setAlerts([]))
  }, [])

  useEffect(() => {
    setRole(currentRole())
    load()
  }, [load])

  const canDecide = can(role, "initiative:write")

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between px-7 py-5 border-b border-border">
        <div>
          <h1 className="text-[18px] font-semibold font-sans flex items-center gap-2">
            <Scale className="size-5 text-muted-foreground" />
            Decisões
          </h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            Iniciativas críticas que precisam de atenção
          </p>
        </div>
        {alerts && alerts.length > 0 && (
          <span className="text-[11px] font-medium bg-warning/15 text-warning px-2.5 py-1 rounded-full">
            {alerts.length} pendente{alerts.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      <div className="p-7">
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border text-muted-foreground text-left">
                <th className="px-5 py-3 font-medium">Iniciativa</th>
                <th className="px-5 py-3 font-medium">Projeto</th>
                <th className="px-5 py-3 font-medium">Prazo</th>
                {canDecide && <th className="px-5 py-3 font-medium text-right">Ação</th>}
              </tr>
            </thead>
            <tbody>
              {/* Skeleton */}
              {!alerts && [...Array(5)].map((_, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  <td className="px-5 py-3"><Skeleton className="h-4 w-40" /></td>
                  <td className="px-5 py-3"><Skeleton className="h-4 w-28" /></td>
                  <td className="px-5 py-3"><Skeleton className="h-5 w-20 rounded-full" /></td>
                  {canDecide && <td className="px-5 py-3" />}
                </tr>
              ))}

              {/* Empty */}
              {alerts?.length === 0 && (
                <tr>
                  <td colSpan={canDecide ? 4 : 3} className="px-5 py-16 text-center text-muted-foreground text-[13px]">
                    <AlertTriangle className="size-5 mx-auto mb-2 opacity-40" />
                    Nenhuma iniciativa crítica no momento.
                  </td>
                </tr>
              )}

              {/* Rows */}
              {alerts?.map((a) => {
                const { cls, label } = daysBadge(a.daysLeft)
                return (
                  <tr key={a.id} className="border-b border-border last:border-0 hover:bg-surface-2/40 transition-colors">
                    <td className="px-5 py-3 font-medium text-foreground">{a.name}</td>
                    <td className="px-5 py-3 text-muted-foreground">{a.projectName}</td>
                    <td className="px-5 py-3">
                      <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full", cls)}>
                        {label}
                      </span>
                    </td>
                    {canDecide && (
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => setDecidindo(a)}
                          className="text-[12px] font-medium px-3 py-1.5 rounded-md bg-primary text-white hover:bg-primary/90 transition-colors"
                        >
                          Decidir
                        </button>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {decidindo && (
        <DecisaoDialog
          initiative={decidindo}
          open={!!decidindo}
          onOpenChange={(v) => { if (!v) setDecidindo(null) }}
          onSuccess={() => { setDecidindo(null); load() }}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verificar tipos**

```bash
npx tsc --noEmit 2>&1 | grep decisoes
```

Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(app\)/decisoes/page.tsx
git commit -m "feat: criar página /decisoes com tabela de iniciativas críticas"
```

---

### Task 5: Atualizar Sidebar

**Files:**
- Modify: `src/components/layout/sidebar.tsx`

**Interfaces:**
- Consumes: `can` já importado indiretamente via estado `isMaster`; adicionar import de `can` e `Scale`

- [ ] **Step 1: Adicionar import do ícone `Scale`**

Em `src/components/layout/sidebar.tsx`, adicionar `Scale` nos imports do lucide-react:

```ts
import {
  LayoutGrid,
  FolderKanban,
  Settings,
  LogOut,
  ChevronDown,
  Building2,
  CreditCard,
  ShieldCheck,
  Scale,        // ← adicionar
} from "lucide-react"
```

- [ ] **Step 2: Adicionar import de `can`**

Adicionar após os imports existentes:

```ts
import { can } from "@/lib/permissions"
```

- [ ] **Step 3: Adicionar item "Decisões" no NAV**

Na seção "Principal" do array `NAV`, adicionar o item condicional. Como o NAV é estático, a visibilidade será controlada no render. Adicionar o item no array:

```ts
const NAV = [
  {
    section: "Principal",
    items: [
      { href: "/dashboard",  label: "Dashboard",  Icon: LayoutGrid   },
      { href: "/projects",   label: "Projetos",   Icon: FolderKanban },
      { href: "/decisoes",   label: "Decisões",   Icon: Scale        },
    ],
  },
  // ... resto igual
]
```

- [ ] **Step 4: Filtrar "Decisões" pelo role no render**

No render dos itens de navegação, onde os links são renderizados, adicionar condição para o item "Decisões". Localizar o trecho que renderiza cada item (procurar por `items.map`) e envolver o item de Decisões:

```tsx
{items
  .filter((item) => item.href !== "/decisoes" || can(user?.role ?? "", "initiative:write"))
  .map(({ href, label, Icon }) => (
    // ... render existente
  ))
}
```

- [ ] **Step 5: Verificar tipos e build**

```bash
npx tsc --noEmit 2>&1 | grep sidebar
```

Expected: sem erros.

- [ ] **Step 6: Commit**

```bash
git add src/components/layout/sidebar.tsx
git commit -m "feat: adicionar link Decisões na sidebar para ADMIN e MANAGER"
```

---

## Self-Review

**Cobertura do spec:**
- ✅ AlertsPanel: botão "Decidir" + link "Ver todas →" (Task 3)
- ✅ DecisaoDialog: 3 ações, Prorrogar com data inline, loading, erro (Task 2)
- ✅ Página `/decisoes`: tabela, skeleton, vazio, ação por linha (Task 4)
- ✅ Sidebar: link "Decisões" condicional por permission (Task 5)
- ✅ Permissão `initiative:write` verificada em todos os pontos de acesso
- ✅ Nenhuma API nova — reutiliza endpoints existentes

**Sem placeholders:** todas as etapas contêm código completo.

**Consistência de tipos:** `Alert` exportado na Task 1, consumido nas Tasks 2, 3 e 4 com o mesmo nome e caminho `@/components/shared/alerts-panel`.
