"use client"

import { useEffect, useState, useCallback } from "react"
import {
  ShieldCheck, LogIn, LogOut, Plus, Pencil, Trash2,
  Clock, Globe, User, Building2, Tag, ChevronLeft, ChevronRight,
} from "lucide-react"
import { fetchWithAuth } from "@/lib/fetch-with-auth"
import { AppDrawer } from "@/components/shared/app-drawer"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type AuditEntry = {
  id: string
  action: string
  entity: string
  entityId: string
  ip: string | null
  createdAt: string
  user: { id: string; name: string; email: string } | null
  organization: { id: string; name: string } | null
}

// ── human-readable helpers ───────────────────────────────────────────────────

const ENTITY_LABEL: Record<string, string> = {
  project: "Projeto",
  initiative: "Iniciativa",
  user: "Usuário",
  "financial-entry": "Entrada financeira",
  "financial-exit": "Saída financeira",
  "financial-category": "Categoria financeira",
  "timeline-post": "Post na timeline",
  organization: "Organização",
  session: "Sessão",
}

const ACTION_LABEL: Record<string, string> = {
  create: "Criou",
  update: "Atualizou",
  delete: "Removeu",
  login: "Entrou no sistema",
  logout: "Saiu do sistema",
}

function describe(log: AuditEntry): string {
  if (log.entity === "session") {
    return log.action === "login" ? "Entrou no sistema" : "Saiu do sistema"
  }
  const verb   = ACTION_LABEL[log.action] ?? log.action
  const entity = ENTITY_LABEL[log.entity] ?? log.entity
  return `${verb} ${entity.toLowerCase()}`
}

function ActionIcon({ action }: { action: string }) {
  const cls = "size-3.5 shrink-0"
  if (action === "login")  return <LogIn  className={cn(cls, "text-success")} />
  if (action === "logout") return <LogOut className={cn(cls, "text-text-subtle")} />
  if (action === "create") return <Plus   className={cn(cls, "text-primary")} />
  if (action === "update") return <Pencil className={cn(cls, "text-warning")} />
  if (action === "delete") return <Trash2 className={cn(cls, "text-destructive")} />
  return <Tag className={cn(cls, "text-text-subtle")} />
}

function actionBadgeVariant(action: string): "active" | "danger" | "warning" | "neutral" {
  if (action === "login")  return "active"
  if (action === "delete") return "danger"
  if (action === "update") return "warning"
  return "neutral"
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  })
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("rounded bg-border/40 animate-pulse", className)} />
}

// ── drawer detail ────────────────────────────────────────────────────────────

function AuditDetail({ log }: { log: AuditEntry }) {
  const rows = [
    { Icon: User,      label: "Usuário",       value: log.user ? `${log.user.name} (${log.user.email})` : "Sistema" },
    { Icon: Building2, label: "Organização",   value: log.organization?.name ?? "—" },
    { Icon: Tag,       label: "Entidade",       value: ENTITY_LABEL[log.entity] ?? log.entity },
    { Icon: Globe,     label: "IP de origem",  value: log.ip ?? "Não registrado" },
    { Icon: Clock,     label: "Data e hora",   value: formatDate(log.createdAt) },
  ]

  return (
    <div className="space-y-6">
      {/* Action summary */}
      <div className="flex items-center gap-3 p-4 bg-surface-2 rounded-xl border border-border">
        <div className={cn(
          "size-10 rounded-lg flex items-center justify-center shrink-0",
          log.action === "login"  && "bg-success/10",
          log.action === "logout" && "bg-border/40",
          log.action === "create" && "bg-primary/10",
          log.action === "update" && "bg-warning/10",
          log.action === "delete" && "bg-destructive/10",
        )}>
          <ActionIcon action={log.action} />
        </div>
        <div>
          <p className="text-[14px] font-semibold text-foreground leading-snug">{describe(log)}</p>
          <p className="text-[12px] text-text-subtle mt-0.5">{formatDate(log.createdAt)}</p>
        </div>
      </div>

      {/* Details grid */}
      <div className="space-y-0 divide-y divide-border border border-border rounded-xl overflow-hidden">
        {rows.map(({ Icon, label, value }) => (
          <div key={label} className="flex items-start gap-3 px-4 py-3 bg-card">
            <Icon className="size-3.5 text-text-subtle mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-[11px] text-text-subtle uppercase tracking-wide font-medium">{label}</p>
              <p className="text-[13px] text-foreground mt-0.5 break-all">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Technical ID */}
      <div className="rounded-lg border border-border bg-surface-2 px-4 py-3">
        <p className="text-[11px] text-text-subtle uppercase tracking-wide font-medium mb-1">ID do registro afetado</p>
        <p className="text-[12px] font-mono text-text-subtle break-all">{log.entityId}</p>
      </div>
    </div>
  )
}

// ── main page ────────────────────────────────────────────────────────────────

const ENTITY_OPTIONS = [
  { value: "",                    label: "Todas as entidades" },
  { value: "session",             label: "Sessão (login/logout)" },
  { value: "project",             label: "Projeto" },
  { value: "initiative",          label: "Iniciativa" },
  { value: "user",                label: "Usuário" },
  { value: "financial-entry",     label: "Entrada financeira" },
  { value: "financial-exit",      label: "Saída financeira" },
  { value: "financial-category",  label: "Categoria financeira" },
  { value: "timeline-post",       label: "Post na timeline" },
  { value: "organization",        label: "Organização" },
]

const ACTION_OPTIONS = [
  { value: "",       label: "Todas as ações" },
  { value: "login",  label: "Login" },
  { value: "logout", label: "Logout" },
  { value: "create", label: "Criação" },
  { value: "update", label: "Atualização" },
  { value: "delete", label: "Remoção" },
]

const selectCls =
  "h-8 px-3 text-[12px] bg-background border border-border rounded-lg text-foreground outline-none focus:border-ring transition-colors cursor-pointer"

export default function AuditoriaPage() {
  const [logs, setLogs]         = useState<AuditEntry[] | null>(null)
  const [total, setTotal]       = useState(0)
  const [page, setPage]         = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [entity, setEntity]     = useState("")
  const [action, setAction]     = useState("")
  const [selected, setSelected] = useState<AuditEntry | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const load = useCallback(() => {
    setLogs(null)
    const params = new URLSearchParams({ page: String(page), limit: "20" })
    if (entity) params.set("entity", entity)
    if (action) params.set("action", action)
    fetchWithAuth(`/api/v1/master/audit-logs?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setLogs(d.data ?? [])
        setTotal(d.total ?? 0)
        setTotalPages(d.totalPages ?? 1)
      })
  }, [page, entity, action])

  useEffect(() => { load() }, [load])

  function openDetail(log: AuditEntry) {
    setSelected(log)
    setDrawerOpen(true)
  }

  function handleFilterChange(newEntity: string, newAction: string) {
    setPage(1)
    setEntity(newEntity)
    setAction(newAction)
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between px-7 py-5 border-b border-border">
        <div>
          <h1 className="text-[18px] font-semibold font-sans flex items-center gap-2">
            <ShieldCheck className="size-5 text-muted-foreground" />
            Auditoria
          </h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            Registro de todas as ações realizadas no sistema
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <select
            value={entity}
            onChange={(e) => handleFilterChange(e.target.value, action)}
            className={selectCls}
          >
            {ENTITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <select
            value={action}
            onChange={(e) => handleFilterChange(entity, e.target.value)}
            className={selectCls}
          >
            {ACTION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="p-7 flex-1 flex flex-col gap-4">
        {/* Stats strip */}
        {total > 0 && (
          <p className="text-[12px] text-text-subtle">
            {total.toLocaleString("pt-BR")} {total === 1 ? "registro" : "registros"} encontrados
          </p>
        )}

        {/* Table */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border text-muted-foreground text-left">
                <th className="px-5 py-3 font-medium">Ação</th>
                <th className="px-5 py-3 font-medium">Quem</th>
                <th className="px-5 py-3 font-medium">Organização</th>
                <th className="px-5 py-3 font-medium">IP</th>
                <th className="px-5 py-3 font-medium">Quando</th>
              </tr>
            </thead>
            <tbody>
              {/* Skeleton */}
              {!logs && [...Array(8)].map((_, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  <td className="px-5 py-3"><Skeleton className="h-4 w-44" /></td>
                  <td className="px-5 py-3"><Skeleton className="h-4 w-32" /></td>
                  <td className="px-5 py-3"><Skeleton className="h-4 w-28" /></td>
                  <td className="px-5 py-3"><Skeleton className="h-4 w-24" /></td>
                  <td className="px-5 py-3"><Skeleton className="h-4 w-32" /></td>
                </tr>
              ))}

              {/* Empty */}
              {logs?.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-16 text-center text-muted-foreground text-[13px]">
                    Nenhum registro encontrado.
                  </td>
                </tr>
              )}

              {/* Rows */}
              {logs?.map((log) => (
                <tr
                  key={log.id}
                  onClick={() => openDetail(log)}
                  className="border-b border-border last:border-0 hover:bg-surface-2/40 transition-colors cursor-pointer"
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <ActionIcon action={log.action} />
                      <span className="text-foreground font-medium">{describe(log)}</span>
                      <Badge variant={actionBadgeVariant(log.action)} dot={false} className="text-[10px] px-1.5 py-0 ml-1">
                        {ENTITY_LABEL[log.entity] ?? log.entity}
                      </Badge>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    {log.user ? (
                      <div>
                        <span className="text-foreground">{log.user.name}</span>
                        <span className="text-text-subtle text-[11px] block">{log.user.email}</span>
                      </div>
                    ) : (
                      <span className="text-text-subtle">Sistema</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">
                    {log.organization?.name ?? "—"}
                  </td>
                  <td className="px-5 py-3 text-muted-foreground font-mono text-[11px]">
                    {log.ip ?? "—"}
                  </td>
                  <td className="px-5 py-3 text-muted-foreground text-[12px] whitespace-nowrap">
                    {formatDate(log.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between text-[12px] text-muted-foreground">
            <span>Página {page} de {totalPages}</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-md hover:bg-surface-2 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-md hover:bg-surface-2 disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail drawer */}
      <AppDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        title={selected ? describe(selected) : "Detalhe"}
        description={selected ? formatDate(selected.createdAt) : undefined}
        width="440px"
      >
        {selected && <AuditDetail log={selected} />}
      </AppDrawer>
    </div>
  )
}
