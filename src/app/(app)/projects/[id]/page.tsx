"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { MessageSquare, ExternalLink, Plus, Trash2, BarChart2 } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
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
  category?: { id: string; name: string } | null;
  initiative?: { id: string; name: string } | null;
  supplier?: string;
};
type ReportRow = { categoryId: string | null; categoryName: string | null; total: number; count: number };
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

function getToken() { return localStorage.getItem("access_token") ?? "" }
function currentRole(): string { try { return JSON.parse(localStorage.getItem("user") ?? "{}").role ?? "" } catch { return "" } }

const textareaCls = "w-full px-3 py-2 text-[13px] bg-background border border-border rounded-lg text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 transition-colors resize-none"

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

  const load = useCallback(() => {
    if (!id) return;
    fetch(`/api/v1/projects/${id}`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then((r) => r.json())
      .then(setProject);
  }, [id]);

  useEffect(() => { load(); }, [load]);

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
          <TimelineTab projectId={id} posts={project?.timelinePosts ?? []} onMutate={load} />
        )}

        {/* PRESTAÇÃO DE CONTAS */}
        {tab === "contas" && (
          <ContasTab
            projectId={id}
            entries={project?.financialEntries ?? []}
            exits={project?.financialExits ?? []}
            totalIn={totalIn} totalOut={totalOut}
          />
        )}
      </div>
    </div>
  );
}

/* ── TimelineTab ── */
function TimelineTab({ projectId, posts, onMutate }: {
  projectId: string;
  posts: TimelinePost[];
  onMutate: () => void;
}) {
  const [content, setContent] = useState("");
  const [saving, setSaving]   = useState(false);
  const role = currentRole();
  const canPost = role === "ADMIN" || role === "MANAGER";

  async function submit(e: React.SyntheticEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setSaving(true);
    await fetch(`/api/v1/projects/${projectId}/timeline`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ content }),
    });
    setContent("");
    setSaving(false);
    onMutate();
  }

  async function del(postId: string) {
    await fetch(`/api/v1/projects/${projectId}/timeline/${postId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    onMutate();
  }

  return (
    <div className="max-w-2xl space-y-4">
      {canPost && (
        <form onSubmit={submit} className="space-y-2">
          <textarea
            className={textareaCls}
            rows={3}
            placeholder="Escreva uma atualização..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <button
            type="submit"
            disabled={saving || !content.trim()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] bg-primary text-primary-foreground rounded-lg disabled:opacity-50 cursor-pointer"
          >
            {saving ? <Spinner className="size-3" /> : <Plus className="size-3" />}
            Publicar
          </button>
        </form>
      )}
      <div className="bg-card border border-border rounded-lg px-4 py-1">
        {posts.length === 0 && (
          <p className="text-[13px] text-muted-foreground py-6 text-center">Sem posts ainda.</p>
        )}
        {posts.map((post) => (
          <div key={post.id} className="flex gap-3 py-3 border-b border-border last:border-0">
            <div className="size-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <MessageSquare className="size-3.5 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-text-subtle">{post.author.name} · {timeAgo(post.publishedAt)}</span>
                {role === "ADMIN" && (
                  <button onClick={() => del(post.id)} className="text-destructive hover:opacity-80 cursor-pointer">
                    <Trash2 className="size-3.5" />
                  </button>
                )}
              </div>
              <p className="text-[13px] mt-0.5">{post.content}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── FinancialTable — somente leitura ── */
function FinancialTable({ rows, showCategory }: {
  rows: FinancialRow[]; showCategory?: boolean;
}) {
  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b border-border bg-surface-2">
            <th className="text-left px-3 py-2 text-text-subtle font-medium">Descrição</th>
            <th className="text-left px-3 py-2 text-text-subtle font-medium">Iniciativa</th>
            <th className="text-left px-3 py-2 text-text-subtle font-medium">Data</th>
            {showCategory && <th className="text-left px-3 py-2 text-text-subtle font-medium">Categoria</th>}
            <th className="text-right px-3 py-2 text-text-subtle font-medium">Valor</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={showCategory ? 5 : 4} className="px-3 py-6 text-center text-muted-foreground">Nenhum lançamento.</td></tr>
          )}
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-border last:border-0 hover:bg-surface-2/50">
              <td className="px-3 py-2">{row.description}</td>
              <td className="px-3 py-2 text-text-subtle">{row.initiative?.name ?? "—"}</td>
              <td className="px-3 py-2 text-text-subtle">{new Date(row.date).toLocaleDateString("pt-BR")}</td>
              {showCategory && <td className="px-3 py-2 text-text-subtle">{row.category?.name ?? "—"}</td>}
              <td className="px-3 py-2 text-right font-medium">{fmt(Number(row.amount))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── CategoryReport — lazy por clique ── */
function CategoryReport({ title, url }: { title: string; url: string }) {
  const [rows, setRows]       = useState<ReportRow[]>([]);
  const [open, setOpen]       = useState(false);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch(url, { headers: { Authorization: `Bearer ${getToken()}` } });
    setRows(await res.json());
    setLoading(false);
  }

  useEffect(() => { if (open) load(); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <button onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-[12px] text-primary hover:underline cursor-pointer mb-2">
        <BarChart2 className="size-3" /> {title}
      </button>
      {open && (
        <div className="bg-card border border-border rounded-lg overflow-hidden mb-4">
          {loading ? (
            <p className="text-[13px] text-muted-foreground py-6 text-center">Carregando...</p>
          ) : (
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-border bg-surface-2">
                  <th className="text-left px-3 py-2 text-text-subtle font-medium">Categoria</th>
                  <th className="text-right px-3 py-2 text-text-subtle font-medium">Qtd.</th>
                  <th className="text-right px-3 py-2 text-text-subtle font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr><td colSpan={3} className="px-3 py-6 text-center text-muted-foreground">Sem lançamentos.</td></tr>
                )}
                {rows.map((r, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="px-3 py-2">{r.categoryName ?? <span className="text-text-subtle italic">Sem categoria</span>}</td>
                    <td className="px-3 py-2 text-right text-text-subtle">{r.count}</td>
                    <td className="px-3 py-2 text-right font-medium">{fmt(r.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

/* ── ContasTab — rollup somente leitura ── */
function ContasTab({ projectId, entries, exits, totalIn, totalOut }: {
  projectId: string; entries: FinancialRow[]; exits: FinancialRow[]; totalIn: number; totalOut: number;
}) {
  const balance = totalIn - totalOut;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-[11px] text-text-subtle mb-1">Total Entradas</p>
          <p className="text-[18px] font-semibold text-success">{fmt(totalIn)}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-[11px] text-text-subtle mb-1">Total Despesas</p>
          <p className="text-[18px] font-semibold text-destructive">{fmt(totalOut)}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-[11px] text-text-subtle mb-1">Saldo</p>
          <p className={cn("text-[18px] font-semibold", balance >= 0 ? "text-success" : "text-destructive")}>{fmt(balance)}</p>
        </div>
      </div>

      <div>
        <p className="text-[13px] font-medium mb-3">Entradas por Categoria</p>
        <CategoryReport title="Ver relatório de entradas" url={`/api/v1/projects/${projectId}/financial-entries/report`} />
        <FinancialTable rows={entries} showCategory />
      </div>

      <div>
        <p className="text-[13px] font-medium mb-3">Despesas por Categoria</p>
        <CategoryReport title="Ver relatório de despesas" url={`/api/v1/projects/${projectId}/financial-exits/report`} />
        <FinancialTable rows={exits} showCategory />
      </div>
    </div>
  );
}
