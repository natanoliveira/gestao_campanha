"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { MessageSquare, ExternalLink } from "lucide-react";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { ProgressBar } from "@/components/shared/progress-bar";
import { KPICard } from "@/components/shared/kpi-card";
import { FeedItem } from "@/components/shared/feed-item";
import { cn } from "@/lib/utils";

/* ── types ── */
type ProjectStatus    = "DRAFT" | "ACTIVE" | "COMPLETED" | "ARCHIVED";
type InitiativeStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

type Initiative = {
  id: string; name: string; description?: string;
  goal: string; raised: string; status: InitiativeStatus; priority: number;
};
type TimelinePost = {
  id: string; content: string; type: string; publishedAt: string;
  author: { name: string };
};
type FinancialRow = {
  id: string; description: string; amount: string; date: string;
  category?: string; supplier?: string;
};
type Project = {
  id: string; name: string; description?: string;
  status: ProjectStatus; isPublic: boolean; publicSlug?: string;
  startDate?: string; endDate?: string;
  initiatives: Initiative[];
  timelinePosts: TimelinePost[];
  financialEntries: FinancialRow[];
  financialExits: FinancialRow[];
};

/* ── helpers ── */
const STATUS_MAP: Record<ProjectStatus, { variant: BadgeVariant; label: string }> = {
  ACTIVE:    { variant: "active",    label: "Ativo"     },
  DRAFT:     { variant: "draft",     label: "Rascunho"  },
  COMPLETED: { variant: "completed", label: "Concluído" },
  ARCHIVED:  { variant: "archived",  label: "Arquivado" },
};

const INIT_STATUS: Record<InitiativeStatus, { variant: BadgeVariant; label: string }> = {
  PENDING:     { variant: "draft",     label: "Pendente"      },
  IN_PROGRESS: { variant: "active",    label: "Em Andamento"  },
  COMPLETED:   { variant: "completed", label: "Concluída"     },
  CANCELLED:   { variant: "archived",  label: "Cancelada"     },
};

const fmt = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 });

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 3600)   return `${Math.floor(diff / 60)}min`;
  if (diff < 86400)  return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return new Date(iso).toLocaleDateString("pt-BR");
}

const progressVariant = (pct: number): "default" | "success" | "warning" =>
  pct >= 100 ? "success" : pct < 40 ? "warning" : "default";

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("rounded bg-border/40 animate-pulse", className)} />;
}

/* ── tab types ── */
type Tab = "resumo" | "iniciativas" | "timeline" | "contas";
const TABS: { id: Tab; label: string }[] = [
  { id: "resumo",      label: "Resumo"             },
  { id: "iniciativas", label: "Iniciativas"         },
  { id: "timeline",    label: "Timeline"            },
  { id: "contas",      label: "Prestação de Contas" },
];

/* ── sub-components ── */
function InitiativeCard({ init }: { init: Initiative }) {
  const goal   = Number(init.goal);
  const raised = Number(init.raised);
  const pct    = goal > 0 ? Math.round((raised / goal) * 100) : 0;
  const { variant, label } = INIT_STATUS[init.status];
  return (
    <div className="bg-surface-2 border border-border rounded-lg px-4 py-3.5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[13px] font-medium">{init.name}</span>
        <div className="flex items-center gap-2">
          <Badge variant={variant}>{label}</Badge>
          <span className={cn("text-[13px] font-semibold", pct >= 100 ? "text-success" : "text-accent-foreground")}>
            {pct}%
          </span>
        </div>
      </div>
      <ProgressBar value={pct} variant={progressVariant(pct)} />
      <p className="text-[11px] text-text-subtle mt-1.5">
        {fmt(raised)} de {fmt(goal)}
      </p>
    </div>
  );
}

/* ── page ── */
export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [tab, setTab] = useState<Tab>("resumo");

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token || !id) return;
    fetch(`/api/v1/projects/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then(setProject);
  }, [id]);

  /* derived stats */
  const totalGoal   = project?.initiatives?.reduce((s, i) => s + Number(i.goal),   0) ?? 0;
  const totalRaised = project?.initiatives?.reduce((s, i) => s + Number(i.raised), 0) ?? 0;
  const goalPct     = totalGoal > 0 ? Math.round((totalRaised / totalGoal) * 100) : 0;
  const totalIn     = project?.financialEntries?.reduce((s, e) => s + Number(e.amount), 0) ?? 0;
  const totalOut    = project?.financialExits?.reduce((s, e)   => s + Number(e.amount), 0) ?? 0;
  const { variant: statusVariant, label: statusLabel } =
    STATUS_MAP[project?.status ?? "DRAFT"];

  return (
    <div className="flex flex-col min-h-screen">
      {/* ── Hero banner ── */}
      <div
        className="relative h-[140px] overflow-hidden"
        style={{ background: "linear-gradient(135deg,#312e81,#4c1d95)" }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/60" />
        <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between px-7 pb-4">
          <div>
            <p className="text-[11px] text-white/60 mb-1">
              <Link href="/projects" className="hover:text-white/80 transition-colors">Projetos</Link>
              {" / "}
              <span className="text-white/80">{project?.name ?? "..."}</span>
            </p>
            <h1 className="text-[20px] font-semibold text-white font-sans">
              {project?.name ?? <Skeleton className="h-6 w-48 bg-white/20" />}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {project?.isPublic && project.publicSlug && (
              <Link
                href={`/p/${project.publicSlug}`}
                target="_blank"
                className="flex items-center gap-1.5 text-[12px] text-white/80 border border-white/20 rounded-md px-3 py-1.5 hover:bg-white/10 transition-colors"
              >
                <ExternalLink className="size-3" />
                Portal Público
              </Link>
            )}
            {project && <Badge variant={statusVariant}>{statusLabel}</Badge>}
          </div>
        </div>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 px-7 pt-5">
        {!project ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-lg p-4 space-y-2">
              <Skeleton className="h-3 w-20" /><Skeleton className="h-6 w-24" />
            </div>
          ))
        ) : (
          <>
            <KPICard label="Arrecadado"  value={fmt(totalIn)} />
            <KPICard label="Meta Total"  value={fmt(totalGoal)} />
            <KPICard label="Progresso"   value={`${goalPct}%`} />
            <KPICard label="Iniciativas" value={project?.initiatives?.length} />
          </>
        )}
      </div>

      {/* ── Tabs ── */}
      <div className="px-7 mt-5">
        <div className="flex gap-0 border-b border-border">
          {TABS.map(({ id: tabId, label }) => (
            <button
              key={tabId}
              onClick={() => setTab(tabId)}
              className={cn(
                "px-4 py-2.5 text-[13px] border-b-2 -mb-px transition-colors cursor-pointer",
                tab === tabId
                  ? "text-foreground border-primary"
                  : "text-muted-foreground border-transparent hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab content ── */}
      <div className="px-7 py-5 flex-1">

        {/* RESUMO */}
        {tab === "resumo" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div>
              <p className="text-[13px] font-medium mb-3">Iniciativas</p>
              <div className="space-y-2.5">
                {!project && [...Array(3)].map((_, i) => <Skeleton key={i} className="h-20" />)}
                {project?.initiatives?.slice(0, 3).map((init) => (
                  <InitiativeCard key={init.id} init={init} />
                ))}
                {project?.initiatives?.length === 0 && (
                  <p className="text-[13px] text-muted-foreground">Nenhuma iniciativa ainda.</p>
                )}
              </div>
            </div>
            <div>
              <p className="text-[13px] font-medium mb-3">Timeline Recente</p>
              <div className="bg-card border border-border rounded-lg px-4 py-1">
                {!project && [...Array(3)].map((_, i) => (
                  <div key={i} className="flex gap-3 py-3 border-b border-border last:border-0">
                    <Skeleton className="size-7 rounded-full shrink-0" />
                    <div className="flex-1 space-y-1.5"><Skeleton className="h-3 w-24" /><Skeleton className="h-4 w-full" /></div>
                  </div>
                ))}
                {project?.timelinePosts?.slice(0, 3).map((post) => (
                  <FeedItem key={post.id} Icon={MessageSquare} author={post.author.name} time={timeAgo(post.publishedAt)} text={post.content} />
                ))}
                {project?.timelinePosts?.length === 0 && (
                  <p className="text-[13px] text-muted-foreground py-6 text-center">Sem posts ainda.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* INICIATIVAS */}
        {tab === "iniciativas" && (
          <div className="space-y-2.5">
            {/* Link para gestão completa */}
            <div className="flex justify-end mb-1">
              <Link
                href={`/projects/${project?.id}/initiatives`}
                className="text-[12px] text-primary hover:underline"
              >
                Gerenciar Iniciativas →
              </Link>
            </div>

            {project?.initiatives?.length === 0 && (
              <p className="text-[13px] text-muted-foreground">Nenhuma iniciativa cadastrada.</p>
            )}
            {project?.initiatives?.map((init) => <InitiativeCard key={init.id} init={init} />)}
          </div>
        )}

        {/* TIMELINE */}
        {tab === "timeline" && (
          <div className="bg-card border border-border rounded-lg px-5 py-1 max-w-2xl">
            {project?.timelinePosts?.length === 0 && (
              <p className="text-[13px] text-muted-foreground py-8 text-center">Sem posts na timeline.</p>
            )}
            {project?.timelinePosts?.map((post) => (
              <FeedItem key={post.id} Icon={MessageSquare} author={post.author.name} time={timeAgo(post.publishedAt)} text={post.content} />
            ))}
          </div>
        )}

        {/* PRESTAÇÃO DE CONTAS */}
        {tab === "contas" && (
          <div className="max-w-2xl space-y-4">
            {/* Resumo financeiro */}
            <div className="grid grid-cols-3 gap-3">
              <KPICard label="Entradas" value={fmt(totalIn)} />
              <KPICard label="Saídas"   value={fmt(totalOut)} />
              <KPICard
                label="Saldo"
                value={fmt(totalIn - totalOut)}
                delta={{ label: totalIn - totalOut >= 0 ? "positivo" : "negativo", direction: totalIn - totalOut >= 0 ? "up" : "down" }}
              />
            </div>

            {/* Tabela unificada */}
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              {(project?.financialEntries?.length === 0 && project?.financialExits?.length === 0) && (
                <p className="text-[13px] text-muted-foreground py-8 text-center">Sem lançamentos financeiros.</p>
              )}
              {(project?.financialEntries?.length ?? 0) > 0 || (project?.financialExits?.length ?? 0) > 0 ? (
                <>
                  {project?.financialEntries?.map((e) => (
                    <div key={e.id} className="flex justify-between items-center px-5 py-3 border-b border-border last:border-0 text-[13px]">
                      <div>
                        <p>{e.description}</p>
                        {e.category && <p className="text-[11px] text-text-subtle">{e.category}</p>}
                      </div>
                      <span className="font-medium text-success">+ {fmt(Number(e.amount))}</span>
                    </div>
                  ))}
                  {project?.financialExits?.map((e) => (
                    <div key={e.id} className="flex justify-between items-center px-5 py-3 border-b border-border last:border-0 text-[13px]">
                      <div>
                        <p>{e.description}</p>
                        {e.supplier && <p className="text-[11px] text-text-subtle">{e.supplier}</p>}
                      </div>
                      <span className="font-medium text-destructive">− {fmt(Number(e.amount))}</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center px-5 py-3 border-t border-border text-[13px] font-semibold">
                    <span>Saldo atual</span>
                    <span className={totalIn - totalOut >= 0 ? "text-success" : "text-destructive"}>
                      {fmt(totalIn - totalOut)}
                    </span>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
