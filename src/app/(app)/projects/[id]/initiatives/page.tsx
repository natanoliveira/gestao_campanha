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

