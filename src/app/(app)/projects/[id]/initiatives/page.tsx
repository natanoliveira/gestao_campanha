import { can } from "@/lib/permissions";
"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams } from "next/navigation"
import { fetchWithAuth } from "@/lib/fetch-with-auth"
import Link from "next/link"
import { Eye, Pencil, Trash2, Plus, Search } from "lucide-react"
import { Dialog } from "@base-ui/react/dialog"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { Badge, type BadgeVariant } from "@/components/ui/badge"
import { ProgressBar } from "@/components/shared/progress-bar"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"
import { CurrencyInput } from "@/components/shared/currency-input"

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

type FinancialCategory = { id: string; name: string }
type FinancialRow = {
  id: string; description: string; amount: string; date: string;
  category?: FinancialCategory | null; supplier?: string;
}
type InitiativeTab = "detalhes" | "entradas" | "despesas"

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_MAP: Record<InitStatus, { variant: BadgeVariant; label: string }> = {
  PENDING:     { variant: "draft",     label: "Pendente"     },
  IN_PROGRESS: { variant: "active",    label: "Em Andamento" },
  COMPLETED:   { variant: "completed", label: "Concluída"    },
  CANCELLED:   { variant: "archived",  label: "Cancelada"    },
}

const STATUSES: InitStatus[] = ["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"]

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
  const isAdmin          = can(role, "org:manage")
  const isAdminOrManager = can(role, "initiative:write")

  const load = useCallback(() => {
    const params = new URLSearchParams()
    if (q)            params.set("q", q)
    if (statusFilter) params.set("status", statusFilter)
    if (showDeleted && isAdmin) params.set("showDeleted", "true")
    setInitiatives(null)
    fetchWithAuth(`/api/v1/projects/${projectId}/initiatives?${params}`)
      .then(r => r.json())
      .then(d => setInitiatives(d.data ?? []))
  }, [projectId, q, statusFilter, showDeleted, isAdmin])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    fetchWithAuth(`/api/v1/projects/${projectId}`)
      .then(r => r.json()).then(d => setProjectName(d.name ?? ""))
    fetchWithAuth(`/api/v1/users?limit=100`)
      .then(r => r.json()).then(d => setUsers(d.data ?? []))
  }, [projectId])

  async function removeInit(initId: string) {
    const res = await fetchWithAuth(`/api/v1/projects/${projectId}/initiatives/${initId}`, {
      method: "DELETE",
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
      {/* Modal de detalhe da iniciativa */}
      <Dialog.Root open={!!detailInit} onOpenChange={(o) => { if (!o) setDetailInit(null); }}>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" />
          <Dialog.Popup className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-card border border-border rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col outline-none">
            {detailInit && <InitiativeModal init={detailInit} projectId={projectId} onClose={() => setDetailInit(null)} onMutate={load} />}
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}

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
    <div className="space-y-2.5">
      {/* Row 1: Nome */}
      <div>
        <FieldLabel>Nome *</FieldLabel>
        <input required minLength={2} maxLength={150} value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          className={inputCls} />
      </div>
      {/* Row 2: valores monetários + prioridade */}
      <div className="grid grid-cols-4 gap-2">
        <div>
          <FieldLabel>Meta (R$) *</FieldLabel>
          <CurrencyInput required value={form.goal}
            onChange={v => setForm(f => ({ ...f, goal: v }))} />
        </div>
        <div>
          <FieldLabel>Meta mín. (R$)</FieldLabel>
          <CurrencyInput value={form.minGoal}
            onChange={v => setForm(f => ({ ...f, minGoal: v }))} />
        </div>
        <div>
          <FieldLabel>Arrecadado (R$)</FieldLabel>
          <CurrencyInput value={form.raised}
            onChange={v => setForm(f => ({ ...f, raised: v }))} />
        </div>
        <div>
          <FieldLabel>Prioridade</FieldLabel>
          <input type="number" step="1" value={form.priority}
            onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
            className={inputCls} />
        </div>
      </div>
      {/* Row 3: status + responsável + depende de */}
      <div className="grid grid-cols-3 gap-2">
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
      {/* Row 4: descrição */}
      <div>
        <FieldLabel>Descrição</FieldLabel>
        <textarea rows={1} value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          className={textareaCls} />
      </div>
    </div>
  )
}

const dialogPopupCls = "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-2xl bg-card border border-border rounded-lg p-5 shadow-[0_10px_40px_rgba(0,0,0,.5)] transition-all duration-200 data-[starting-style]:opacity-0 data-[starting-style]:scale-95 data-[ending-style]:opacity-0 data-[ending-style]:scale-95 max-h-[85vh] overflow-y-auto"
const dialogBdCls   = "fixed inset-0 bg-black/50 z-40 transition-opacity duration-200 data-[starting-style]:opacity-0 data-[ending-style]:opacity-0"
const cancelBtnCls  = "h-8 px-4 rounded-lg border border-border text-[13px] text-foreground hover:bg-surface-2 transition-colors disabled:opacity-50"
const submitBtnCls  = "h-8 px-4 rounded-lg bg-primary text-white text-[13px] font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 min-w-20 flex items-center justify-center"

// ─── Stubs ────────────────────────────────────────────────────────────────────

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

      const res = await fetchWithAuth(`/api/v1/projects/${projectId}/initiatives`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error?.message ?? "Erro ao criar") }
      setLoading(false); onCreated(); onClose()
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
        raised: form.raised, priority: Number(form.priority) || 0,
      }
      if (form.description)   body.description   = form.description
      if (form.minGoal)       body.minGoal       = form.minGoal
      body.responsibleId = form.responsibleId || null
      body.dependsOnId   = form.dependsOnId   || null

      const res = await fetchWithAuth(`/api/v1/projects/${projectId}/initiatives/${init.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
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

function InitiativeModal({ init, projectId, onClose, onMutate }: {
  init: Initiative; projectId: string; onClose: () => void; onMutate: () => void;
}) {
  const [tab, setTab]         = useState<InitiativeTab>("detalhes");
  const [entries, setEntries] = useState<FinancialRow[]>([]);
  const [exits, setExits]     = useState<FinancialRow[]>([]);
  const [cats, setCats]       = useState<FinancialCategory[]>([]);
  const role                  = currentRole();
  const canAdd                = can(role, "initiative:write");

  const loadEntries = useCallback(() => {
    fetchWithAuth(`/api/v1/projects/${projectId}/initiatives/${init.id}/entries`)
      .then((r) => r.json()).then((d) => setEntries(Array.isArray(d) ? d : []));
  }, [projectId, init.id]);

  const loadExits = useCallback(() => {
    fetchWithAuth(`/api/v1/projects/${projectId}/initiatives/${init.id}/exits`)
      .then((r) => r.json()).then((d) => setExits(Array.isArray(d) ? d : []));
  }, [projectId, init.id]);

  function loadCats(type: "ENTRY" | "EXIT") {
    fetchWithAuth(`/api/v1/financial-categories?type=${type}`)
      .then((r) => r.json()).then((d) => setCats(Array.isArray(d) ? d : []));
  }

  useEffect(() => { if (tab === "entradas") { loadEntries(); loadCats("ENTRY"); } }, [tab]); // eslint-disable-line
  useEffect(() => { if (tab === "despesas") { loadExits();   loadCats("EXIT");  } }, [tab]); // eslint-disable-line

  const raised = entries.reduce((s, e) => s + Number(e.amount), 0);
  const spent  = exits.reduce((s, e) => s + Number(e.amount), 0);

  const MODAL_TABS: { id: InitiativeTab; label: string }[] = [
    { id: "detalhes", label: "Detalhes" },
    { id: "entradas", label: "Entradas" },
    { id: "despesas", label: "Despesas" },
  ];

  // ponytail: onMutate available for future use (e.g. after inline edits)
  void onMutate;

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
            <FinancialInlineTable rows={entries} onDelete={async (rowId) => {
              await fetchWithAuth(`/api/v1/projects/${projectId}/initiatives/${init.id}/entries/${rowId}`, { method: "DELETE" });
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
            <FinancialInlineTable rows={exits} isExit onDelete={async (rowId) => {
              await fetchWithAuth(`/api/v1/projects/${projectId}/initiatives/${init.id}/exits/${rowId}`, { method: "DELETE" });
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
  const [open, setOpen]         = useState(false);
  const [desc, setDesc]         = useState("");
  const [amount, setAmount]     = useState("");
  const [date, setDate]         = useState("");
  const [catId, setCatId]       = useState("");
  const [supplier, setSupplier] = useState("");
  const [saving, setSaving]     = useState(false);

  const inCls = "w-full h-8 px-3 text-[13px] bg-background border border-border rounded-lg text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 transition-colors";

  async function submit(e: React.SyntheticEvent) {
    e.preventDefault();
    setSaving(true);
    const dateIso = new Date(date + "T12:00:00.000Z").toISOString();
    await fetchWithAuth(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
            <input className={inCls} placeholder="Descrição" value={desc} onChange={(e) => setDesc(e.target.value)} required />
            <CurrencyInput value={amount} onChange={setAmount} placeholder="Valor (R$)" required />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input className={inCls} type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            <select className={inCls} value={catId} onChange={(e) => setCatId(e.target.value)}>
              <option value="">Sem categoria</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          {isExit && (
            <input className={inCls} placeholder="Fornecedor" value={supplier} onChange={(e) => setSupplier(e.target.value)} />
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
            {can(role, "org:manage") && <th className="px-3 py-2 w-8" />}
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
              {can(role, "org:manage") && (
                <td className="px-3 py-2 text-right">
                  <ConfirmDialog
                    trigger={
                      <button className="text-destructive hover:opacity-80 cursor-pointer">
                        <Trash2 className="size-3.5" />
                      </button>
                    }
                    title="Remover lançamento?"
                    description="Deseja remover este lançamento? Esta ação não pode ser desfeita."
                    confirmLabel="Remover"
                    variant="destructive"
                    onConfirm={() => Promise.resolve(onDelete(row.id))}
                  />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

