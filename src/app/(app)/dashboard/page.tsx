"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, MessageSquare } from "lucide-react";
import { KPICard } from "@/components/shared/kpi-card";
import { FeedItem } from "@/components/shared/feed-item";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { ProgressBar } from "@/components/shared/progress-bar";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ProjectStatus = "DRAFT" | "ACTIVE" | "COMPLETED" | "ARCHIVED";

type StatsProject = {
  id: string;
  name: string;
  status: ProjectStatus;
  raised: number;
  goal: number;
  raisedPercent: number;
};

type StatsActivity = {
  id: string;
  content: string;
  publishedAt: string;
  authorName: string;
  projectName: string;
};

type Stats = {
  projectsActive: number;
  projectsTotal: number;
  totalRaised: number;
  totalSpent: number;
  balance: number;
  goalPercent: number;
  initiativesTotal: number;
  recentProjects: StatsProject[];
  recentActivity: StatsActivity[];
};

const STATUS_MAP: Record<ProjectStatus, { variant: BadgeVariant; label: string }> = {
  ACTIVE:    { variant: "active",    label: "Ativo"     },
  DRAFT:     { variant: "draft",     label: "Rascunho"  },
  COMPLETED: { variant: "completed", label: "Concluído" },
  ARCHIVED:  { variant: "archived",  label: "Arquivado" },
};

const progressVariant = (pct: number): "default" | "success" | "warning" =>
  pct >= 100 ? "success" : pct < 40 ? "warning" : "default";

const fmt = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 });

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 3600)   return `${Math.floor(diff / 60)}min`;
  if (diff < 86400)  return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return new Date(iso).toLocaleDateString("pt-BR");
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("rounded bg-border/40 animate-pulse", className)} />;
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) { router.replace("/login"); return; }

    fetch("/api/v1/dashboard/stats", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (r) => {
        const data = await r.json();
        if (r.status === 401 || data.code === "UNAUTHORIZED") {
          router.replace("/login");
          return;
        }
        if (!r.ok) throw new Error(data.message ?? "Erro ao carregar dados");
        setStats(data);
      })
      .catch(() => setFetchError("Falha ao carregar dados. Tente novamente."));
  }, [router]);

  if (fetchError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-destructive text-sm">{fetchError}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-7 py-5 border-b border-border">
        <div>
          <h1 className="text-[18px] font-semibold font-sans">Dashboard</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">Visão geral da organização</p>
        </div>
        <Link
          href="/projects/new"
          className={cn(buttonVariants({ size: "sm" }), "gap-1.5")}
        >
          <Plus className="size-3.5" />
          Novo Projeto
        </Link>
      </div>

      <div className="p-7 space-y-6">
        {/* ── KPIs ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {stats ? (
            <>
              <KPICard
                label="Projetos Ativos"
                value={stats.projectsActive}
                delta={{ label: `de ${stats.projectsTotal} total`, direction: "neutral" }}
              />
              <KPICard
                label="Total Arrecadado"
                value={fmt(stats.totalRaised)}
              />
              <KPICard
                label="Meta Global"
                value={`${stats.goalPercent}%`}
                delta={{
                  label: `saldo ${fmt(stats.balance)}`,
                  direction: stats.balance >= 0 ? "up" : "down",
                }}
              />
              <KPICard
                label="Iniciativas"
                value={stats.initiativesTotal}
              />
            </>
          ) : (
            [...Array(4)].map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-lg p-4 space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-7 w-16" />
              </div>
            ))
          )}
        </div>

        {/* ── Grid 2 cols ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Projetos recentes */}
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <span className="text-[14px] font-medium">Projetos Recentes</span>
              <Link
                href="/projects"
                className="text-[12px] text-accent-foreground hover:underline"
              >
                Ver todos →
              </Link>
            </div>

            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-[11px] font-medium text-muted-foreground uppercase tracking-[.05em] px-5 py-3">Projeto</th>
                  <th className="text-left text-[11px] font-medium text-muted-foreground uppercase tracking-[.05em] px-3 py-3">Status</th>
                  <th className="text-left text-[11px] font-medium text-muted-foreground uppercase tracking-[.05em] px-3 py-3 w-24">Meta</th>
                </tr>
              </thead>
              <tbody>
                {!stats && [...Array(3)].map((_, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="px-5 py-3"><Skeleton className="h-4 w-40" /></td>
                    <td className="px-3 py-3"><Skeleton className="h-5 w-16 rounded-full" /></td>
                    <td className="px-3 py-3"><Skeleton className="h-[5px] w-20" /></td>
                  </tr>
                ))}

                {stats?.recentProjects.length === 0 && (
                  <tr>
                    <td colSpan={3} className="text-center text-[13px] text-muted-foreground py-10">
                      Nenhum projeto ainda.
                    </td>
                  </tr>
                )}

                {stats?.recentProjects.map((p) => {
                  const { variant, label } = STATUS_MAP[p.status] ?? { variant: "draft" as BadgeVariant, label: p.status };
                  return (
                    <tr key={p.id} className="border-b border-border last:border-0 hover:bg-surface-2 transition-colors">
                      <td className="px-5 py-3 text-[13px]">
                        <Link href={`/projects/${p.id}`} className="text-accent-foreground hover:underline">
                          {p.name}
                        </Link>
                      </td>
                      <td className="px-3 py-3">
                        <Badge variant={variant}>{label}</Badge>
                      </td>
                      <td className="px-3 py-3">
                        <ProgressBar
                          value={p.raisedPercent}
                          variant={progressVariant(p.raisedPercent)}
                          className="w-20"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Atividades recentes */}
          <div className="bg-card border border-border rounded-lg">
            <div className="px-5 py-4 border-b border-border">
              <span className="text-[14px] font-medium">Atividades Recentes</span>
            </div>
            <div className="px-5 py-1">
              {!stats && (
                <div className="space-y-4 py-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex gap-3 py-2">
                      <Skeleton className="size-7 rounded-full shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-3 w-32" />
                        <Skeleton className="h-4 w-full" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {stats?.recentActivity.length === 0 && (
                <p className="text-[13px] text-muted-foreground py-10 text-center">
                  Sem atividades ainda.
                </p>
              )}

              {stats?.recentActivity.map((a) => (
                <FeedItem
                  key={a.id}
                  Icon={MessageSquare}
                  author={a.authorName}
                  time={timeAgo(a.publishedAt)}
                  text={a.content}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
