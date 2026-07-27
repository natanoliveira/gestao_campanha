"use client"

import { useEffect, useState, useCallback } from "react"
import { Scale, AlertTriangle } from "lucide-react"
import { fetchWithAuth } from "@/lib/fetch-with-auth"
import { can } from "@/lib/permissions"
import { DecisaoDialog } from "@/components/shared/decisao-dialog"
import { cn } from "@/lib/utils"
import type { Alert } from "@/components/shared/alerts-panel"

function currentRole(): string {
  try { return JSON.parse(localStorage.getItem("user") ?? "{}").role ?? "" }
  catch { return "" }
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("rounded bg-border/40 animate-pulse", className)} />
}

function daysBadge(daysLeft: number) {
  if (daysLeft < 0) return { cls: "text-destructive bg-destructive/10", label: `Vencida há ${Math.abs(daysLeft)}d` }
  if (daysLeft === 0) return { cls: "text-warning bg-warning/10", label: "Vence hoje" }
  if (daysLeft <= 7)  return { cls: "text-warning bg-warning/10", label: `${daysLeft} dias` }
  return { cls: "text-text-subtle bg-border/40", label: `${daysLeft} dias` }
}

export default function DecisoesPage() {
  const [alerts, setAlerts]       = useState<Alert[] | null>(null)
  const [role, setRole]           = useState("")
  const [decidindo, setDecidindo] = useState<Alert | null>(null)

  const load = useCallback(() => {
    setAlerts(null)
    fetchWithAuth("/api/v1/dashboard/alerts")
      .then((r) => r.json())
      .then(setAlerts)
      .catch(() => setAlerts([]))
  }, [])

  useEffect(() => {
    setRole(currentRole())
    load()
  }, [load])

  const canDecide = can(role, "initiative:write")

  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex items-center justify-between px-7 py-5 border-b border-border">
        <div>
          <h1 className="text-[18px] font-semibold font-sans flex items-center gap-2">
            <Scale className="size-5 text-muted-foreground" />
            Decisões
          </h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            Iniciativas críticas que precisam de atenção
          </p>
        </div>
        {alerts && alerts.length > 0 && (
          <span className="text-[11px] font-medium bg-warning/15 text-warning px-2.5 py-1 rounded-full">
            {alerts.length} pendente{alerts.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      <div className="p-7">
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border text-muted-foreground text-left">
                <th className="px-5 py-3 font-medium">Iniciativa</th>
                <th className="px-5 py-3 font-medium">Projeto</th>
                <th className="px-5 py-3 font-medium">Prazo</th>
                {canDecide && <th className="px-5 py-3 font-medium text-right">Ação</th>}
              </tr>
            </thead>
            <tbody>
              {!alerts && [...Array(5)].map((_, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  <td className="px-5 py-3"><Skeleton className="h-4 w-40" /></td>
                  <td className="px-5 py-3"><Skeleton className="h-4 w-28" /></td>
                  <td className="px-5 py-3"><Skeleton className="h-5 w-20 rounded-full" /></td>
                  {canDecide && <td className="px-5 py-3" />}
                </tr>
              ))}

              {alerts?.length === 0 && (
                <tr>
                  <td colSpan={canDecide ? 4 : 3} className="px-5 py-16 text-center text-muted-foreground text-[13px]">
                    <AlertTriangle className="size-5 mx-auto mb-2 opacity-40" />
                    Nenhuma iniciativa crítica no momento.
                  </td>
                </tr>
              )}

              {alerts?.map((a) => {
                const { cls, label } = daysBadge(a.daysLeft)
                return (
                  <tr key={a.id} className="border-b border-border last:border-0 hover:bg-surface-2/40 transition-colors">
                    <td className="px-5 py-3 font-medium text-foreground">{a.name}</td>
                    <td className="px-5 py-3 text-muted-foreground">{a.projectName}</td>
                    <td className="px-5 py-3">
                      <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full", cls)}>
                        {label}
                      </span>
                    </td>
                    {canDecide && (
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => setDecidindo(a)}
                          className="text-[12px] font-medium px-3 py-1.5 rounded-md bg-primary text-white hover:bg-primary/90 transition-colors"
                        >
                          Decidir
                        </button>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {decidindo && (
        <DecisaoDialog
          initiative={decidindo}
          open={!!decidindo}
          onOpenChange={(v) => { if (!v) setDecidindo(null) }}
          onSuccess={() => { setDecidindo(null); load() }}
        />
      )}
    </div>
  )
}
