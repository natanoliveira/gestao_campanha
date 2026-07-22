import { can } from "@/lib/permissions";
"use client"

import { useEffect, useState, useCallback } from "react"
import { fetchWithAuth } from "@/lib/fetch-with-auth"
import { Dialog } from "@base-ui/react/dialog"
import { AppDrawer } from "@/components/shared/app-drawer"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { ProgressBar } from "@/components/shared/progress-bar"
import { Badge, type BadgeVariant } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"
import { Eye, Pencil, UserX, UserCheck, Trash2, Plus, Search } from "lucide-react"

// ─── Helpers ─────────────────────────────────────────────────────────────────

function currentRole(): string { try { return JSON.parse(localStorage.getItem("user") ?? "{}").role ?? ""; } catch { return ""; } }
function currentUser() { try { return JSON.parse(localStorage.getItem("user") ?? "{}"); } catch { return {}; } }

const inputCls = "w-full h-9 px-3 text-[13px] bg-background border border-border rounded-lg text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 transition-colors"
const selectCls = "w-full h-9 px-3 text-[13px] bg-background border border-border rounded-lg text-foreground outline-none focus:border-ring cursor-pointer"
const dialogPopupCls = "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-card border border-border rounded-xl shadow-xl w-full max-w-md p-6 outline-none"
const overlayBackdropCls = "fixed inset-0 z-40 bg-black/40"

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("rounded bg-border/40 animate-pulse", className)} />
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = "organizacao" | "usuarios" | "categorias" | "plano"

type OrgData = {
  id: string
  name: string
  slug: string
  active: boolean
  createdAt: string
  plan: { id: string; name: string; priceMonthly: number } | null
}

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

type CategoryType = "ENTRY" | "EXIT"
type Category = { id: string; name: string; type: CategoryType; createdAt: string }

type DashboardStats = {
  projectsActive: number
  projectsTotal: number
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string }[] = [
  { id: "organizacao", label: "Organização" },
  { id: "usuarios",    label: "Usuários"     },
  { id: "categorias",  label: "Categorias"   },
  { id: "plano",       label: "Plano"        },
]

const ROLE_MAP: Record<Role, { variant: BadgeVariant; label: string }> = {
  ADMIN:         { variant: "danger",    label: "Admin"       },
  MANAGER:       { variant: "active",    label: "Gerente"     },
  TREASURER:     { variant: "completed", label: "Tesoureiro"  },
  COMMUNICATION: { variant: "archived",  label: "Comunicação" },
  AUDITOR:       { variant: "warning",   label: "Auditor"     },
  MEMBER:        { variant: "draft",     label: "Membro"      },
}
const ROLES: Role[] = ["ADMIN", "MANAGER", "TREASURER", "COMMUNICATION", "AUDITOR", "MEMBER"]

const CAT_TABS: { id: CategoryType; label: string }[] = [
  { id: "ENTRY", label: "Entradas" },
  { id: "EXIT",  label: "Despesas" },
]

// ─── Sub-components (Users) ───────────────────────────────────────────────────

function Avatar({ name }: { name: string }) {
  return (
    <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-white text-[12px] font-semibold">
      {name[0]?.toUpperCase()}
    </span>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-[12px] font-medium text-muted-foreground mb-1">{children}</label>
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <span className="text-[13px] text-muted-foreground">{label}</span>
      {children}
    </div>
  )
}

// ─── Aba: Organização ─────────────────────────────────────────────────────────

function OrgTab() {
  const [org, setOrg]         = useState<OrgData | null>(null)
  const [name, setName]       = useState("")
  const [slug, setSlug]       = useState("")
  const [saving, setSaving]   = useState(false)
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null)
  const isAdmin = can(currentRole(), "org:manage")

  useEffect(() => {
    fetchWithAuth("/api/v1/organizations/me")
      .then((r) => r.json())
      .then((d: OrgData) => {
        setOrg(d)
        setName(d.name)
        setSlug(d.slug)
      })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!org) return
    setSaving(true)
    setFeedback(null)
    try {
      const res = await fetchWithAuth(`/api/v1/organizations/${org.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error?.message ?? "Erro ao salvar")
      }
      setFeedback({ type: "success", msg: "Alterações salvas com sucesso." })
    } catch (e) {
      setFeedback({ type: "error", msg: e instanceof Error ? e.message : "Ocorreu um erro" })
    } finally {
      setSaving(false)
    }
  }

  if (!org) return (
    <div className="space-y-4 max-w-md">
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-9 w-full" />
    </div>
  )

  return (
    <form onSubmit={handleSubmit} className="max-w-md space-y-4">
      <div>
        <label htmlFor="org-name" className="block text-[12px] font-medium text-muted-foreground mb-1">Nome</label>
        <input
          id="org-name"
          autoComplete="off"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          readOnly={!isAdmin}
          className={cn(inputCls, !isAdmin && "opacity-60 cursor-default")}
        />
      </div>
      <div>
        <label htmlFor="org-slug" className="block text-[12px] font-medium text-muted-foreground mb-1">Slug</label>
        <input
          id="org-slug"
          autoComplete="off"
          spellCheck={false}
          value={slug}
          onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
          required
          readOnly={!isAdmin}
          className={cn(inputCls, !isAdmin && "opacity-60 cursor-default")}
        />
        <p className="text-[11px] text-muted-foreground mt-1">Altera a URL pública da organização</p>
      </div>

      {feedback && (
        <p className={cn(
          "text-[12px] px-3 py-2 rounded-lg",
          feedback.type === "success" ? "text-success bg-success/10" : "text-destructive bg-destructive/10"
        )}>
          {feedback.msg}
        </p>
      )}

      {isAdmin && (
        <button
          type="submit"
          disabled={saving}
          className="h-9 px-4 rounded-lg bg-primary text-white text-[13px] font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {saving ? <Spinner size="sm" /> : "Salvar alterações"}
        </button>
      )}
    </form>
  )
}

// ─── Aba: Usuários ────────────────────────────────────────────────────────────

function UsersTab() {
  const [users, setUsers]               = useState<User[] | null>(null)
  const [q, setQ]                       = useState("")
  const [roleFilter, setRoleFilter]     = useState("")
  const [activeFilter, setActiveFilter] = useState("")
  const [showDeleted, setShowDeleted]   = useState(false)
  const [createOpen, setCreateOpen]     = useState(false)
  const [editUser, setEditUser]         = useState<User | null>(null)
  const [detailUser, setDetailUser]     = useState<User | null>(null)
  const isAdmin = can(currentRole(), "org:manage")

  const load = useCallback(() => {
    const params = new URLSearchParams()
    if (q)            params.set("q", q)
    if (roleFilter)   params.set("role", roleFilter)
    if (activeFilter) params.set("active", activeFilter)
    if (showDeleted && isAdmin) params.set("showDeleted", "true")
    setUsers(null)
    fetchWithAuth(`/api/v1/users?${params}`)
      .then((r) => r.json())
      .then((d) => setUsers(d.data ?? []))
  }, [q, roleFilter, activeFilter, showDeleted, isAdmin])

  useEffect(() => { load() }, [load])

  async function toggleActive(u: User) {
    await fetchWithAuth(`/api/v1/users/${u.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !u.active }),
    })
    load()
  }

  async function removeUser(id: string) {
    await fetchWithAuth(`/api/v1/users/${id}`, { method: "DELETE" })
    load()
  }

  return (
    <div className="space-y-5">
      {/* Filtros + botão */}
      <div className="flex flex-wrap gap-2 items-center justify-between">
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
            {ROLES.map((r) => <option key={r} value={r}>{ROLE_MAP[r].label}</option>)}
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
            {users?.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-16 text-center text-muted-foreground">
                  Nenhum usuário encontrado.
                </td>
              </tr>
            )}
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
                    {u.deletedAt && <Badge variant="danger" dot={false}>Removido</Badge>}
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
                    <button
                      onClick={() => setDetailUser(u)}
                      className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-surface-2 transition-colors"
                      title="Ver detalhes"
                    >
                      <Eye className="size-3.5" />
                    </button>
                    {isAdmin && !u.deletedAt && (
                      <>
                        <button
                          onClick={() => setEditUser(u)}
                          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-surface-2 transition-colors"
                          title="Editar"
                        >
                          <Pencil className="size-3.5" />
                        </button>
                        <ConfirmDialog
                          trigger={
                            <button
                              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-surface-2 transition-colors"
                              title={u.active ? "Desativar" : "Reativar"}
                            >
                              {u.active ? <UserX className="size-3.5" /> : <UserCheck className="size-3.5" />}
                            </button>
                          }
                          title={u.active ? "Desativar usuário?" : "Reativar usuário?"}
                          description={u.active ? `${u.name} não poderá mais acessar o sistema.` : `${u.name} voltará a ter acesso ao sistema.`}
                          confirmLabel={u.active ? "Desativar" : "Reativar"}
                          variant={u.active ? "destructive" : "default"}
                          onConfirm={() => toggleActive(u)}
                        />
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

      <CreateUserModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={load} />
      <EditUserModal user={editUser} onClose={() => setEditUser(null)} onUpdated={load} />
      <UserDetailDrawer user={detailUser} onClose={() => setDetailUser(null)} />
    </div>
  )
}

function CreateUserModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [form, setForm]     = useState({ name: "", email: "", password: "", role: "MEMBER" as Role })
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  function handleOpenChange(next: boolean) {
    if (loading) return
    if (!next) { setError(null); setForm({ name: "", email: "", password: "", role: "MEMBER" }); onClose() }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError(null)
    try {
      const res = await fetchWithAuth("/api/v1/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (!res.ok) { const err = await res.json(); throw new Error(err.message ?? "Erro ao criar usuário") }
      onCreated(); onClose()
      setForm({ name: "", email: "", password: "", role: "MEMBER" }); setError(null)
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
          <Dialog.Description className="text-sm text-muted-foreground mb-5">Preencha os dados para criar um novo usuário.</Dialog.Description>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <FieldLabel>Nome</FieldLabel>
              <input required minLength={2} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} />
            </div>
            <div>
              <FieldLabel>Email</FieldLabel>
              <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls} />
            </div>
            <div>
              <FieldLabel>Senha</FieldLabel>
              <input required type="password" minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={inputCls} />
            </div>
            <div>
              <FieldLabel>Role</FieldLabel>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })} className={selectCls}>
                {ROLES.map((r) => <option key={r} value={r}>{ROLE_MAP[r].label}</option>)}
              </select>
            </div>
            {error && <p className="text-xs text-destructive bg-destructive/10 rounded px-3 py-2">{error}</p>}
            <div className="flex gap-2 justify-end pt-1">
              <Dialog.Close render={
                <button type="button" disabled={loading} className="h-8 px-4 rounded-lg border border-border text-[13px] text-foreground hover:bg-surface-2 transition-colors disabled:opacity-50">Cancelar</button>
              } />
              <button type="submit" disabled={loading} className="h-8 px-4 rounded-lg bg-primary text-white text-[13px] font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 min-w-20 flex items-center justify-center">
                {loading ? <Spinner size="sm" /> : "Criar"}
              </button>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function EditUserModal({ user, onClose, onUpdated }: { user: User | null; onClose: () => void; onUpdated: () => void }) {
  const [form, setForm]       = useState({ name: "", role: "MEMBER" as Role })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => { if (user) setForm({ name: user.name, role: user.role }) }, [user])

  function handleOpenChange(next: boolean) {
    if (loading) return
    if (!next) { setError(null); onClose() }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setLoading(true); setError(null)
    try {
      const res = await fetchWithAuth(`/api/v1/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (!res.ok) { const err = await res.json(); throw new Error(err.message ?? "Erro ao atualizar usuário") }
      onUpdated(); onClose()
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
              <input required minLength={2} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} />
            </div>
            <div>
              <FieldLabel>Role</FieldLabel>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })} className={selectCls}>
                {ROLES.map((r) => <option key={r} value={r}>{ROLE_MAP[r].label}</option>)}
              </select>
            </div>
            {error && <p className="text-xs text-destructive bg-destructive/10 rounded px-3 py-2">{error}</p>}
            <div className="flex gap-2 justify-end pt-1">
              <Dialog.Close render={
                <button type="button" disabled={loading} className="h-8 px-4 rounded-lg border border-border text-[13px] text-foreground hover:bg-surface-2 transition-colors disabled:opacity-50">Cancelar</button>
              } />
              <button type="submit" disabled={loading} className="h-8 px-4 rounded-lg bg-primary text-white text-[13px] font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 min-w-20 flex items-center justify-center">
                {loading ? <Spinner size="sm" /> : "Salvar"}
              </button>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function UserDetailDrawer({ user, onClose }: { user: User | null; onClose: () => void }) {
  const fmt = (d: string) => new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
  return (
    <AppDrawer
      open={!!user}
      onOpenChange={(next) => { if (!next) onClose() }}
      title="Detalhes do Usuário"
      description={user?.email}
    >
      {user && (
        <div className="space-y-6">
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
            <DetailRow label="Role"><Badge variant={ROLE_MAP[user.role].variant}>{ROLE_MAP[user.role].label}</Badge></DetailRow>
            <DetailRow label="Status"><Badge variant={user.active ? "active" : "danger"}>{user.active ? "Ativo" : "Inativo"}</Badge></DetailRow>
            {user.deletedAt && <DetailRow label="Situação"><Badge variant="danger">Removido</Badge></DetailRow>}
            <DetailRow label="Criado em"><span className="text-[13px] text-foreground">{fmt(user.createdAt)}</span></DetailRow>
          </div>
        </div>
      )}
    </AppDrawer>
  )
}

// ─── Aba: Categorias ──────────────────────────────────────────────────────────

function CategoriasTab() {
  const [catTab, setCatTab]   = useState<CategoryType>("ENTRY")
  const [cats, setCats]       = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModal] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [name, setName]       = useState("")
  const [saving, setSaving]   = useState(false)
  const role      = currentRole()
  const canManage = can(role, "category:write")

  const catInputCls = "w-full h-8 px-3 text-[13px] bg-background border border-border rounded-lg text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 transition-colors"
  const catDialogCls = "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-card border border-border rounded-xl shadow-xl w-full max-w-sm p-5 outline-none"

  const load = useCallback(() => {
    setLoading(true)
    fetchWithAuth(`/api/v1/financial-categories?type=${catTab}`)
      .then((r) => r.json())
      .then((d) => { setCats(Array.isArray(d) ? d : []); setLoading(false) })
  }, [catTab])

  useEffect(() => { load() }, [load])

  function openCreate() { setEditing(null); setName(""); setModal(true) }
  function openEdit(cat: Category) { setEditing(cat); setName(cat.name); setModal(true) }

  async function submit(e: React.SyntheticEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    if (editing) {
      await fetchWithAuth(`/api/v1/financial-categories/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      })
    } else {
      await fetchWithAuth("/api/v1/financial-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, type: catTab }),
      })
    }
    setSaving(false); setModal(false); load()
  }

  async function deleteCategory(cat: Category) {
    await fetchWithAuth(`/api/v1/financial-categories/${cat.id}`, { method: "DELETE" })
    load()
  }

  return (
    <div className="space-y-5">
      {/* Sub-tabs + botão */}
      <div className="flex items-center justify-between">
        <div className="flex gap-0 border-b border-border">
          {CAT_TABS.map(({ id, label }) => (
            <button key={id} onClick={() => setCatTab(id)}
              className={cn("px-4 py-2.5 text-[13px] border-b-2 -mb-px transition-colors cursor-pointer",
                catTab === id ? "text-foreground border-primary" : "text-muted-foreground border-transparent hover:text-foreground")}>
              {label}
            </button>
          ))}
        </div>
        {canManage && (
          <button onClick={openCreate} className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] bg-primary text-primary-foreground rounded-lg cursor-pointer">
            <Plus className="size-3.5" /> Nova Categoria
          </button>
        )}
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
                      {can(role, "org:manage") && (
                        <ConfirmDialog
                          trigger={<button className="text-destructive hover:opacity-80 cursor-pointer"><Trash2 className="size-3.5" /></button>}
                          title="Excluir categoria"
                          description={`Deseja excluir "${cat.name}"? Lançamentos vinculados ficarão sem categoria.`}
                          confirmLabel="Excluir"
                          variant="destructive"
                          onConfirm={() => deleteCategory(cat)}
                        />
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
          <Dialog.Popup className={catDialogCls}>
            <Dialog.Title className="text-[15px] font-semibold mb-4">
              {editing ? "Editar Categoria" : `Nova Categoria de ${catTab === "ENTRY" ? "Entrada" : "Despesa"}`}
            </Dialog.Title>
            <form onSubmit={submit} className="space-y-3">
              <div>
                <label className="text-[11px] text-text-subtle mb-1 block">Nome *</label>
                <input className={catInputCls} placeholder="Ex: Dízimo, Oferta, Material..." value={name}
                  onChange={(e) => setName(e.target.value)} required autoFocus />
              </div>
              <div className="flex gap-2 pt-1">
                <button type="submit" disabled={saving || !name.trim()}
                  className="px-3 py-1.5 text-[12px] bg-primary text-primary-foreground rounded-lg disabled:opacity-50 cursor-pointer">
                  {saving ? <Spinner className="size-3.5" /> : editing ? "Salvar" : "Criar"}
                </button>
                <Dialog.Close render={
                  <button type="button" className="px-3 py-1.5 text-[12px] border border-border rounded-lg cursor-pointer">Cancelar</button>
                } />
              </div>
            </form>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}

// ─── Aba: Plano ───────────────────────────────────────────────────────────────

function PlanoTab() {
  const [org, setOrg]             = useState<OrgData | null>(null)
  const [stats, setStats]         = useState<DashboardStats | null>(null)
  const [upgrading, setUpgrading] = useState(false)
  const [contactOpen, setContactOpen] = useState(false)
  const isAdmin = can(currentRole(), "org:manage")

  useEffect(() => {
    fetchWithAuth("/api/v1/organizations/me").then((r) => r.json()).then(setOrg)
    fetchWithAuth("/api/v1/dashboard/stats").then((r) => r.json()).then(setStats)
  }, [])

  async function handleUpgrade() {
    if (!org) return
    setUpgrading(true)
    try {
      const res = await fetchWithAuth(`/api/v1/organizations/${org.id}/upgrade`, { method: "POST" })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setContactOpen(true)
      }
    } catch {
      setContactOpen(true)
    } finally {
      setUpgrading(false)
    }
  }

  const plan = org?.plan
  const isBasic = !plan || plan.name.toUpperCase().includes("BASIC")
  const maxProjects = (plan as { maxProjects?: number })?.maxProjects ?? 3
  const maxUsers    = (plan as { maxUsers?: number })?.maxUsers ?? 5
  const priceFormatted = plan
    ? Number(plan.priceMonthly).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
    : "R$ 99,90"

  if (!org) return (
    <div className="space-y-4">
      <Skeleton className="h-24 w-full max-w-sm" />
      <Skeleton className="h-16 w-full max-w-sm" />
    </div>
  )

  return (
    <div className="space-y-6 max-w-xl">
      {/* Card plano atual */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[13px] text-muted-foreground">Plano atual</p>
          <Badge variant={isBasic ? "draft" : "active"}>{isBasic ? "BASIC" : "PREMIUM"}</Badge>
        </div>
        <p className="text-[20px] font-semibold">{plan?.name ?? "Basic"}</p>
        <p className="text-[13px] text-muted-foreground mt-1">{priceFormatted}/mês</p>
      </div>

      {/* Medidor de uso */}
      {plan && stats && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <p className="text-[13px] font-medium">Uso atual</p>
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[12px] text-muted-foreground">Projetos ativos</span>
                <span className="text-[12px] text-foreground">
                  {stats.projectsActive} de {maxProjects === -1 ? "Ilimitado" : maxProjects}
                </span>
              </div>
              {maxProjects !== -1 && (
                <ProgressBar
                  value={maxProjects > 0 ? Math.min(Math.round((stats.projectsActive / maxProjects) * 100), 100) : 0}
                  variant={stats.projectsActive >= maxProjects ? "warning" : "default"}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tabela comparativa */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-border bg-surface-2">
              <th className="text-left px-4 py-2.5 text-text-subtle font-medium">Recurso</th>
              <th className="text-center px-4 py-2.5 text-text-subtle font-medium">Basic</th>
              <th className="text-center px-4 py-2.5 text-text-subtle font-medium">Premium</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["Projetos",                    "3",          "Ilimitado"],
              ["Iniciativas por projeto",     "5",          "Ilimitado"],
              ["Usuários",                    "5",          "Ilimitado"],
              ["Preço",                       "R$ 99,90",   "R$ 159,90"],
            ].map(([recurso, basic, premium]) => (
              <tr key={recurso} className="border-b border-border last:border-0">
                <td className="px-4 py-3 text-foreground">{recurso}</td>
                <td className="px-4 py-3 text-center text-muted-foreground">{basic}</td>
                <td className="px-4 py-3 text-center text-muted-foreground">{premium}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* CTA upgrade */}
      {isAdmin && isBasic && (
        <button
          onClick={handleUpgrade}
          disabled={upgrading}
          className="w-full h-10 rounded-lg bg-primary text-white text-[13px] font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {upgrading ? <Spinner size="sm" /> : "Fazer upgrade para Premium — R$ 159,90/mês"}
        </button>
      )}

      {/* Modal de contato */}
      <Dialog.Root open={contactOpen} onOpenChange={setContactOpen}>
        <Dialog.Portal>
          <Dialog.Backdrop className={overlayBackdropCls} />
          <Dialog.Popup className={dialogPopupCls}>
            <Dialog.Title className="text-[15px] font-semibold mb-2">Entre em contato</Dialog.Title>
            <Dialog.Description className="text-[13px] text-muted-foreground mb-4">
              Para fazer upgrade do seu plano, entre em contato com nossa equipe:
            </Dialog.Description>
            <p className="text-[14px] font-medium text-primary">contato@gestao.app</p>
            <div className="mt-5 flex justify-end">
              <Dialog.Close render={
                <button className="h-8 px-4 rounded-lg border border-border text-[13px] text-foreground hover:bg-surface-2 transition-colors cursor-pointer">Fechar</button>
              } />
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function ConfiguracoesPage() {
  const [tab, setTab] = useState<Tab>("organizacao")

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="px-7 py-5 border-b border-border">
        <h1 className="text-[18px] font-semibold font-sans">Configurações</h1>
        <p className="text-[13px] text-muted-foreground mt-0.5">Administre sua organização</p>
      </div>

      {/* Tabs */}
      <div className="px-7 mt-5">
        <div className="flex gap-0 border-b border-border">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                "px-4 py-2.5 text-[13px] border-b-2 -mb-px transition-colors cursor-pointer",
                tab === id
                  ? "text-foreground border-primary"
                  : "text-muted-foreground border-transparent hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Conteúdo */}
      <div className="px-7 py-5 flex-1">
        {tab === "organizacao" && <OrgTab />}
        {tab === "usuarios"    && <UsersTab />}
        {tab === "categorias"  && <CategoriasTab />}
        {tab === "plano"       && <PlanoTab />}
      </div>
    </div>
  )
}
