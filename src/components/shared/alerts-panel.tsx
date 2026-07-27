"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { can } from "@/lib/permissions";
import { DecisaoDialog } from "@/components/shared/decisao-dialog";
import { cn } from "@/lib/utils";

export type Alert = {
  id: string;
  name: string;
  endDate: string;
  status: string;
  projectId: string;
  projectName: string;
  daysLeft: number;
};

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("rounded bg-border/40 animate-pulse", className)} />;
}

function daysBadge(daysLeft: number) {
  if (daysLeft < 0) return { cls: "text-destructive bg-destructive/10", label: `Vencida há ${Math.abs(daysLeft)} dia${Math.abs(daysLeft) !== 1 ? "s" : ""}` };
  if (daysLeft === 0) return { cls: "text-warning bg-warning/10", label: "Vence hoje" };
  if (daysLeft <= 7)  return { cls: "text-warning bg-warning/10", label: `${daysLeft} dia${daysLeft !== 1 ? "s" : ""}` };
  return { cls: "text-text-subtle bg-border/40", label: `${daysLeft} dias` };
}

function currentRole(): string {
  try { return JSON.parse(localStorage.getItem("user") ?? "{}").role ?? ""; }
  catch { return ""; }
}

function load(setAlerts: (a: Alert[]) => void) {
  fetchWithAuth("/api/v1/dashboard/alerts")
    .then((r) => r.json())
    .then(setAlerts)
    .catch(() => setAlerts([]));
}

export function AlertsPanel() {
  const [alerts, setAlerts]     = useState<Alert[] | null>(null);
  const [role, setRole]         = useState("");
  const [decidindo, setDecidindo] = useState<Alert | null>(null);

  useEffect(() => {
    setRole(currentRole());
    load(setAlerts);
  }, []);

  if (alerts === null) {
    return (
      <div className="bg-card border border-border rounded-lg p-4 space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-3.5 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  if (alerts.length === 0) return null;

  const canDecide = can(role, "initiative:write");

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
        <AlertTriangle className="size-4 text-warning" />
        <span className="text-[14px] font-medium">Alertas de Prazo</span>
        <span className="ml-2 text-[11px] font-medium bg-warning/15 text-warning px-2 py-0.5 rounded-full">
          {alerts.length}
        </span>
        <Link href="/decisoes" className="ml-auto text-[11px] text-primary hover:underline">
          Ver todas →
        </Link>
      </div>
      <ul className="divide-y divide-border">
        {alerts.map((a) => {
          const { cls, label } = daysBadge(a.daysLeft);
          return (
            <li key={a.id} className="flex items-center justify-between px-5 py-3 hover:bg-surface-2 transition-colors">
              <Link href={`/projects/${a.projectId}`} className="flex-1 min-w-0">
                <p className="text-[13px] truncate">{a.name}</p>
                <p className="text-[11px] text-text-subtle truncate">{a.projectName}</p>
              </Link>
              <span className={cn("ml-4 shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full", cls)}>
                {label}
              </span>
              {canDecide && (
                <button
                  onClick={(e) => { e.preventDefault(); setDecidindo(a); }}
                  className="ml-2 shrink-0 text-[11px] font-medium px-2.5 py-0.5 rounded-md bg-primary text-white hover:bg-primary/90 transition-colors"
                >
                  Decidir
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {decidindo && (
        <DecisaoDialog
          initiative={decidindo}
          open={!!decidindo}
          onOpenChange={(v) => { if (!v) setDecidindo(null); }}
          onSuccess={() => { setDecidindo(null); load(setAlerts); }}
        />
      )}
    </div>
  );
}
