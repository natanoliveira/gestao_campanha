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
