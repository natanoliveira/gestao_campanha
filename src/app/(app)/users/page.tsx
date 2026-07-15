"use client"

import { useEffect, useState, useCallback } from "react"
import { Eye, Pencil, UserX, UserCheck, Trash2, Plus, Search } from "lucide-react"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { Badge, type BadgeVariant } from "@/components/ui/badge"
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
