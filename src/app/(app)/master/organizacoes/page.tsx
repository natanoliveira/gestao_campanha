"use client"

import { useEffect, useState, useCallback } from "react"
import { Plus, Pencil, Building2 } from "lucide-react"
import { Dialog } from "@base-ui/react/dialog"
import { fetchWithAuth } from "@/lib/fetch-with-auth"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { cn } from "@/lib/utils"

type Plan = { id: string; name: string; priceMonthly: string }
type Org = {
  id: string
  name: string
  slug: string
  active: boolean
  deletedAt?: string | null
  plan?: { id: string; name: string; priceMonthly: string } | null
  _count: { users: number; projects: number }
}

const inputCls =
  "w-full h-9 px-3 text-[13px] bg-background border border-border rounded-lg text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 transition-colors"
const selectCls =
  "w-full h-9 px-3 text-[13px] bg-background border border-border rounded-lg text-foreground outline-none focus:border-ring cursor-pointer"

function toSlug(v: string) {
  return v
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-[12px] font-medium text-muted-foreground mb-1">{children}</label>
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("rounded bg-border/40 animate-pulse", className)} />
}

export default function OrganizacoesPage() {
  const [orgs, setOrgs]         = useState<Org[] | null>(null)
  const [plans, setPlans]       = useState<Plan[]>([])
  const [modalOpen, setModal]   = useState(false)
  const [editing, setEditing]   = useState<Org | null>(null)
  const [form, setForm]         = useState({ name: "", slug: "", planId: "" })
  const [slugEdited, setSlugEdited] = useState(false)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState<string | null>(null)

  const load = useCallback(() => {
    setOrgs(null)
    fetchWithAuth("/api/v1/master/organizations")
      .then((r) => r.json())
      .then((d) => setOrgs(d.data ?? []))
  }, [])

  useEffect(() => {
    load()
    fetchWithAuth("/api/v1/master/plans")
      .then((r) => r.json())
      .then((d) => setPlans(d.data ?? []))
  }, [load])

  function openCreate() {
    setEditing(null)
    setForm({ name: "", slug: "", planId: plans[0]?.id ?? "" })
    setSlugEdited(false)
    setError(null)
    setModal(true)
  }

  function openEdit(org: Org) {
    setEditing(org)
    setForm({ name: org.name, slug: org.slug, planId: org.plan?.id ?? "" })
    setSlugEdited(true)
    setError(null)
    setModal(true)
  }

  function handleNameChange(name: string) {
    setForm((f) => ({
      ...f,
      name,
      slug: slugEdited ? f.slug : toSlug(name),
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const body = { name: form.name, slug: form.slug, planId: form.planId || undefined }
      let res: Response
      if (editing) {
        res = await fetchWithAuth(`/api/v1/master/organizations/${editing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
      } else {
        res = await fetchWithAuth("/api/v1/master/organizations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
      }
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error?.message ?? "Erro ao salvar")
      }
      setModal(false)
      load()
      window.dispatchEvent(new Event("orgsUpdated"))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ocorreu um erro")
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(org: Org) {
    const res = await fetchWithAuth(`/api/v1/master/organizations/${org.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !org.active }),
    })
    if (!res.ok) throw new Error("Erro ao atualizar status")
    load()
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between px-7 py-5 border-b border-border">
        <div>
          <h1 className="text-[18px] font-semibold font-sans flex items-center gap-2">
            <Building2 className="size-5 text-muted-foreground" />
            Organizações
          </h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            Gerencie todas as organizações do sistema
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-primary text-white text-[13px] font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="size-3.5" />
          Nova Organização
        </button>
      </div>

      <div className="p-7">
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border text-muted-foreground text-left">
                <th className="px-5 py-3 font-medium">Nome / Slug</th>
                <th className="px-5 py-3 font-medium">Plano</th>
                <th className="px-5 py-3 font-medium">Usuários</th>
                <th className="px-5 py-3 font-medium">Projetos</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {!orgs && [...Array(5)].map((_, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  <td className="px-5 py-3"><Skeleton className="h-4 w-40" /></td>
                  <td className="px-5 py-3"><Skeleton className="h-5 w-20 rounded-full" /></td>
                  <td className="px-5 py-3"><Skeleton className="h-4 w-8" /></td>
                  <td className="px-5 py-3"><Skeleton className="h-4 w-8" /></td>
                  <td className="px-5 py-3"><Skeleton className="h-5 w-16 rounded-full" /></td>
                  <td className="px-5 py-3" />
                </tr>
              ))}

              {orgs?.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center text-muted-foreground">
                    Nenhuma organização encontrada.
                  </td>
                </tr>
              )}

              {orgs?.map((org) => (
                <tr
                  key={org.id}
                  className={cn(
                    "border-b border-border last:border-0 hover:bg-surface-2/40 transition-colors",
                    org.deletedAt && "opacity-60",
                  )}
                >
                  <td className="px-5 py-3">
                    <div className="font-medium text-foreground leading-snug">{org.name}</div>
                    <div className="text-muted-foreground text-[12px]">{org.slug}</div>
                    {org.deletedAt && <Badge variant="danger" dot={false} className="mt-1">Removida</Badge>}
                  </td>
                  <td className="px-5 py-3">
                    {org.plan ? (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                        {org.plan.name}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-[12px]">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">{org._count.users}</td>
                  <td className="px-5 py-3 text-muted-foreground">{org._count.projects}</td>
                  <td className="px-5 py-3">
                    <Badge variant={org.active ? "active" : "danger"}>
                      {org.active ? "Ativo" : "Inativo"}
                    </Badge>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {!org.deletedAt && (
                        <>
                          <button
                            onClick={() => openEdit(org)}
                            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-surface-2 transition-colors"
                            title="Editar"
                          >
                            <Pencil className="size-3.5" />
                          </button>
                          <ConfirmDialog
                            trigger={
                              <button
                                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-surface-2 transition-colors text-[12px] px-2"
                                title={org.active ? "Desativar" : "Ativar"}
                              >
                                {org.active ? "Desativar" : "Ativar"}
                              </button>
                            }
                            title={org.active ? "Desativar organização?" : "Ativar organização?"}
                            description={
                              org.active
                                ? `A organização "${org.name}" será desativada.`
                                : `A organização "${org.name}" será reativada.`
                            }
                            confirmLabel={org.active ? "Desativar" : "Ativar"}
                            variant={org.active ? "destructive" : "default"}
                            onConfirm={() => toggleActive(org)}
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

      {/* Modal criar/editar */}
      <Dialog.Root open={modalOpen} onOpenChange={(v) => { if (!saving) { setModal(v); if (!v) setError(null) } }}>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 bg-black/50 z-40 transition-opacity duration-200 data-[starting-style]:opacity-0 data-[ending-style]:opacity-0" />
          <Dialog.Popup className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-card border border-border rounded-xl shadow-xl w-full max-w-md p-6 outline-none transition-all duration-200 data-[starting-style]:opacity-0 data-[starting-style]:scale-95 data-[ending-style]:opacity-0 data-[ending-style]:scale-95">
            <Dialog.Title className="text-base font-semibold text-foreground mb-1 font-sans">
              {editing ? "Editar Organização" : "Nova Organização"}
            </Dialog.Title>
            <Dialog.Description className="text-sm text-muted-foreground mb-5">
              {editing ? `Editando: ${editing.slug}` : "Preencha os dados da nova organização."}
            </Dialog.Description>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <FieldLabel>Nome</FieldLabel>
                <input
                  required
                  value={form.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <FieldLabel>Slug</FieldLabel>
                <input
                  required
                  value={form.slug}
                  onChange={(e) => { setSlugEdited(true); setForm((f) => ({ ...f, slug: e.target.value })) }}
                  className={inputCls}
                />
              </div>
              <div>
                <FieldLabel>Plano</FieldLabel>
                <select
                  value={form.planId}
                  onChange={(e) => setForm((f) => ({ ...f, planId: e.target.value }))}
                  className={selectCls}
                >
                  <option value="">Sem plano</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {error && (
                <p className="text-xs text-destructive bg-destructive/10 rounded px-3 py-2">{error}</p>
              )}

              <div className="flex gap-2 justify-end pt-1">
                <Dialog.Close render={
                  <button type="button" disabled={saving}
                    className="h-8 px-4 rounded-lg border border-border text-[13px] text-foreground hover:bg-surface-2 transition-colors disabled:opacity-50">
                    Cancelar
                  </button>
                } />
                <button type="submit" disabled={saving}
                  className="h-8 px-4 rounded-lg bg-primary text-white text-[13px] font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 min-w-20 flex items-center justify-center">
                  {saving ? <Spinner size="sm" /> : editing ? "Salvar" : "Criar"}
                </button>
              </div>
            </form>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}
