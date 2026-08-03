"use client"

import { useCallback, useEffect, useState } from "react"
import { HandCoins, Check, X, Plus, ChevronLeft, ChevronRight } from "lucide-react"
import { toast } from "sonner"
import { fetchWithAuth } from "@/lib/fetch-with-auth"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Dialog } from "@base-ui/react/dialog"
import { CurrencyInput } from "@/components/shared/currency-input"

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
  Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 })

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
        amount:       Number(form.amount),
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
                    <CurrencyInput required value={form.amount} onChange={v => setForm(f => ({ ...f, amount: v }))} />
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
