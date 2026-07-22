"use client"

import { useEffect, useState, useCallback } from "react"
import { Plus, Pencil, CreditCard } from "lucide-react"
import { Dialog } from "@base-ui/react/dialog"
import { fetchWithAuth } from "@/lib/fetch-with-auth"
import { Spinner } from "@/components/ui/spinner"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { cn } from "@/lib/utils"

type Plan = {
  id: string
  name: string
  maxProjects: number
  maxInitiatives: number
  maxUsers: number
  priceMonthly: string
  active: boolean
  _count: { organizations: number }
}

const inputCls =
  "w-full h-9 px-3 text-[13px] bg-background border border-border rounded-lg text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 transition-colors"

const fmt = (v: string | number) =>
  Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

const limitLabel = (v: number) => (v === -1 ? "∞" : String(v))

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-[12px] font-medium text-muted-foreground mb-1">{children}</label>
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("rounded bg-border/40 animate-pulse", className)} />
}

const EMPTY_FORM = { name: "", priceMonthly: "", maxProjects: "3", maxInitiatives: "5", maxUsers: "5" }

export default function PlanosPage() {
  const [plans, setPlans]       = useState<Plan[] | null>(null)
  const [modalOpen, setModal]   = useState(false)
  const [editing, setEditing]   = useState<Plan | null>(null)
  const [form, setForm]         = useState(EMPTY_FORM)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState<string | null>(null)

  const load = useCallback(() => {
    setPlans(null)
    fetchWithAuth("/api/v1/master/plans")
      .then((r) => r.json())
      .then((d) => setPlans(d.data ?? []))
  }, [])

  useEffect(() => { load() }, [load])

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setError(null)
    setModal(true)
  }

  function openEdit(plan: Plan) {
    setEditing(plan)
    setForm({
      name:           plan.name,
      priceMonthly:   String(plan.priceMonthly),
      maxProjects:    String(plan.maxProjects),
      maxInitiatives: String(plan.maxInitiatives),
      maxUsers:       String(plan.maxUsers),
    })
    setError(null)
    setModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const body = {
        name:           form.name,
        priceMonthly:   Number(form.priceMonthly),
        maxProjects:    Number(form.maxProjects),
        maxInitiatives: Number(form.maxInitiatives),
        maxUsers:       Number(form.maxUsers),
      }
      const res = editing
        ? await fetchWithAuth(`/api/v1/master/plans/${editing.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
        : await fetchWithAuth("/api/v1/master/plans", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error?.message ?? "Erro ao salvar")
      }
      setModal(false)
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ocorreu um erro")
    } finally {
      setSaving(false)
    }
  }

  async function deactivatePlan(plan: Plan) {
    const res = await fetchWithAuth(`/api/v1/master/plans/${plan.id}`, { method: "DELETE" })
    if (!res.ok) throw new Error("Erro ao desativar plano")
    load()
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between px-7 py-5 border-b border-border">
        <div>
          <h1 className="text-[18px] font-semibold font-sans flex items-center gap-2">
            <CreditCard className="size-5 text-muted-foreground" />
            Planos
          </h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            Configure os planos de assinatura
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-primary text-white text-[13px] font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="size-3.5" />
          Novo Plano
        </button>
      </div>

      <div className="p-7">
        {/* Cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {!plans && [...Array(3)].map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-lg p-5 space-y-3">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-7 w-24" />
              <div className="space-y-2 pt-2">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </div>
          ))}

          {plans?.length === 0 && (
            <div className="col-span-full py-20 text-center text-muted-foreground text-[13px]">
              Nenhum plano cadastrado.
            </div>
          )}

          {plans?.map((plan) => (
            <div
              key={plan.id}
              className="bg-card border border-border rounded-lg p-5 flex flex-col gap-4"
            >
              {/* Top */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[14px] font-semibold text-foreground">{plan.name}</p>
                  <p className="text-[22px] font-bold text-foreground mt-0.5">
                    {fmt(plan.priceMonthly)}
                    <span className="text-[12px] font-normal text-muted-foreground">/mês</span>
                  </p>
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-surface-2 text-muted-foreground shrink-0">
                  {plan._count.organizations} org{plan._count.organizations !== 1 ? "s" : ""}
                </span>
              </div>

              {/* Limits */}
              <ul className="space-y-1.5 text-[12px] text-muted-foreground flex-1">
                <li className="flex justify-between">
                  <span>Projetos</span>
                  <span className="text-foreground font-medium">{limitLabel(plan.maxProjects)}</span>
                </li>
                <li className="flex justify-between">
                  <span>Iniciativas</span>
                  <span className="text-foreground font-medium">{limitLabel(plan.maxInitiatives)}</span>
                </li>
                <li className="flex justify-between">
                  <span>Usuários</span>
                  <span className="text-foreground font-medium">{limitLabel(plan.maxUsers)}</span>
                </li>
              </ul>

              {/* Actions */}
              <div className="flex gap-2 pt-1 border-t border-border">
                <button
                  onClick={() => openEdit(plan)}
                  className="flex items-center gap-1.5 h-7 px-3 rounded-md text-[12px] text-muted-foreground hover:text-foreground hover:bg-surface-2 transition-colors"
                >
                  <Pencil className="size-3" />
                  Editar
                </button>
                <ConfirmDialog
                  trigger={
                    <button className="flex items-center gap-1.5 h-7 px-3 rounded-md text-[12px] text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                      Desativar
                    </button>
                  }
                  title="Desativar plano?"
                  description={`O plano "${plan.name}" será desativado. As organizações existentes não serão afetadas.`}
                  confirmLabel="Desativar"
                  variant="destructive"
                  onConfirm={() => deactivatePlan(plan)}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal criar/editar */}
      <Dialog.Root open={modalOpen} onOpenChange={(v) => { if (!saving) { setModal(v); if (!v) setError(null) } }}>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 bg-black/50 z-40 transition-opacity duration-200 data-[starting-style]:opacity-0 data-[ending-style]:opacity-0" />
          <Dialog.Popup className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-card border border-border rounded-xl shadow-xl w-full max-w-md p-6 outline-none transition-all duration-200 data-[starting-style]:opacity-0 data-[starting-style]:scale-95 data-[ending-style]:opacity-0 data-[ending-style]:scale-95">
            <Dialog.Title className="text-base font-semibold text-foreground mb-1 font-sans">
              {editing ? "Editar Plano" : "Novo Plano"}
            </Dialog.Title>
            <Dialog.Description className="text-sm text-muted-foreground mb-5">
              Use -1 para ilimitado nos campos de limite.
            </Dialog.Description>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <FieldLabel>Nome</FieldLabel>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className={inputCls}
                />
              </div>
              <div>
                <FieldLabel>Preço mensal (R$)</FieldLabel>
                <input
                  required
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.priceMonthly}
                  onChange={(e) => setForm((f) => ({ ...f, priceMonthly: e.target.value }))}
                  className={inputCls}
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <FieldLabel>Projetos</FieldLabel>
                  <input
                    required
                    type="number"
                    value={form.maxProjects}
                    onChange={(e) => setForm((f) => ({ ...f, maxProjects: e.target.value }))}
                    className={inputCls}
                  />
                </div>
                <div>
                  <FieldLabel>Iniciativas</FieldLabel>
                  <input
                    required
                    type="number"
                    value={form.maxInitiatives}
                    onChange={(e) => setForm((f) => ({ ...f, maxInitiatives: e.target.value }))}
                    className={inputCls}
                  />
                </div>
                <div>
                  <FieldLabel>Usuários</FieldLabel>
                  <input
                    required
                    type="number"
                    value={form.maxUsers}
                    onChange={(e) => setForm((f) => ({ ...f, maxUsers: e.target.value }))}
                    className={inputCls}
                  />
                </div>
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
