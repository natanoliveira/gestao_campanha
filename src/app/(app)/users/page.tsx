"use client"

import { useEffect, useState, useCallback } from "react"
import { Eye, Pencil, UserX, UserCheck, Trash2, Plus, Search } from "lucide-react"
import { Dialog } from "@base-ui/react/dialog"
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
      setLoading(false)
      onClose()
      setForm({ name: "", email: "", password: "", role: "MEMBER" })
      setError(null)
      return
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
      setLoading(false)
      setError(null)
      onClose()
      return
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

function UserDetailDrawer(_: { user: User | null; onClose: () => void }) {
  return null
}
