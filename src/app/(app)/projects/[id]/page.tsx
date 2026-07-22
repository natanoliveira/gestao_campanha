import { can } from "@/lib/permissions";
"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import Link from "next/link";
import { MessageSquare, ExternalLink, Plus, Trash2, BarChart2, Pencil } from "lucide-react";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Dialog } from "@base-ui/react/dialog";
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
  endDate?: string;
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

function currentRole(): string { try { return JSON.parse(localStorage.getItem("user") ?? "{}").role ?? "" } catch { return "" } }

const textareaCls = "w-full px-3 py-2 text-[13px] bg-background border border-border rounded-lg text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20 transition-colors resize-none"
const inputCls = "w-full h-8 px-3 text-[13px] bg-background border border-border rounded-lg text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20 transition-colors";
const dialogPopupCls = "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-card border border-border rounded-xl shadow-xl w-full max-w-md p-5 outline-none";
const overlayBackdropCls = "fixed inset-0 z-40 bg-black/40 backdrop-blur-sm";

function toSlug(v: string) {
  return v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
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
function InitiativeCard({ init, onEdit, onDelete }: {
  init: Initiative;
  onEdit?: () => void;
  onDelete?: () => Promise<void>;
}) {
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
          {onEdit && (
            <button onClick={onEdit} aria-label="Editar iniciativa" className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-surface-2 cursor-pointer">
              <Pencil className="size-3" aria-hidden="true" />
            </button>
          )}
          {onDelete && (
            <ConfirmDialog
              trigger={<button aria-label="Excluir iniciativa" className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-surface-2 cursor-pointer"><Trash2 className="size-3" aria-hidden="true" /></button>}
              title="Excluir iniciativa?"
              description="Esta ação não pode ser desfeita."
              confirmLabel="Excluir"
              variant="destructive"
              onConfirm={onDelete}
            />
          )}
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
  const [editOpen, setEditOpen]   = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editName, setEditName]   = useState("");
  const [editDesc, setEditDesc]   = useState("");
  const [editStatus, setEditStatus] = useState<ProjectStatus>("DRAFT");
  const [editIsPublic, setEditIsPublic] = useState(false);
  const [editSlug, setEditSlug]       = useState("");
  const [editSlugEdited, setEditSlugEdited] = useState(false);
  const [editStart, setEditStart]     = useState("");
  const [editEnd, setEditEnd]         = useState("");

  function openEdit() {
    if (!project) return;
    setEditName(project.name);
    setEditDesc(project.description ?? "");
    setEditStatus(project.status);
    setEditIsPublic(project.isPublic);
    setEditSlug(project.publicSlug ?? "");
    setEditSlugEdited(!!project.publicSlug);
    setEditStart(project.startDate ? project.startDate.slice(0, 10) : "");
    setEditEnd(project.endDate ? project.endDate.slice(0, 10) : "");
    setEditOpen(true);
  }

  async function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    setEditSaving(true);
    await fetchWithAuth(`/api/v1/projects/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editName,
        description: editDesc || undefined,
        status: editStatus,
        isPublic: editIsPublic,
        publicSlug: editSlug || undefined,
        startDate: editStart ? new Date(editStart).toISOString() : undefined,
        endDate: editEnd ? new Date(editEnd).toISOString() : undefined,
      }),
    });
    setEditSaving(false);
    setEditOpen(false);
    load();
  }

  const load = useCallback(() => {
    if (!id) return;
    fetchWithAuth(`/api/v1/projects/${id}`)
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
                <ExternalLink className="size-3" aria-hidden="true" />
                Portal Público
              </Link>
            )}
            {project && <Badge variant={statusVariant}>{statusLabel}</Badge>}
            {project && (currentRole() === "ADMIN" || currentRole() === "MANAGER") && (
              <button
                onClick={openEdit}
                className="flex items-center gap-1.5 text-[12px] text-white/80 border border-white/20 rounded-md px-3 py-1.5 hover:bg-white/10 transition-colors cursor-pointer"
              >
                <Pencil className="size-3" aria-hidden="true" />
                Editar
              </button>
            )}
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
          <InitiativasTab projectId={id} initiatives={project?.initiatives ?? []} onMutate={load} />
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
            initiatives={project?.initiatives ?? []}
            onMutate={load}
          />
        )}
      </div>

      {/* ── Edit Project Modal ── */}
      <Dialog.Root open={editOpen} onOpenChange={setEditOpen}>
        <Dialog.Portal>
          <Dialog.Backdrop className={overlayBackdropCls} />
          <Dialog.Popup className={dialogPopupCls}>
            <h2 className="text-[15px] font-semibold mb-4">Editar Projeto</h2>
            <form onSubmit={submitEdit} className="space-y-3">
              <div>
                <label htmlFor="edit-name" className="block text-[12px] text-muted-foreground mb-1">Nome</label>
                <input id="edit-name" name="name" autoComplete="off" value={editName} onChange={(e) => { setEditName(e.target.value); if (!editSlugEdited) setEditSlug(toSlug(e.target.value)); }} required className={inputCls} />
                {toSlug(editName) && (
                  <p className="text-[11px] text-muted-foreground mt-1">Slug: <span className="font-mono">{toSlug(editName)}</span></p>
                )}
              </div>
              <div>
                <label htmlFor="edit-desc" className="block text-[12px] text-muted-foreground mb-1">Descrição</label>
                <textarea id="edit-desc" name="description" value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={3} className={textareaCls} />
              </div>
              <div>
                <label htmlFor="edit-status" className="block text-[12px] text-muted-foreground mb-1">Status</label>
                <select id="edit-status" name="status" value={editStatus} onChange={(e) => setEditStatus(e.target.value as ProjectStatus)}
                  className={cn(inputCls, "cursor-pointer")}>
                  <option value="DRAFT">Rascunho</option>
                  <option value="ACTIVE">Ativo</option>
                  <option value="COMPLETED">Concluído</option>
                  <option value="ARCHIVED">Arquivado</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="editIsPublic" checked={editIsPublic} onChange={(e) => setEditIsPublic(e.target.checked)} className="size-4 cursor-pointer" />
                <label htmlFor="editIsPublic" className="text-[13px] cursor-pointer">Portal público</label>
              </div>
              {editIsPublic && (
                <div>
                  <label htmlFor="edit-slug" className="block text-[12px] text-muted-foreground mb-1">Slug público</label>
                  <input id="edit-slug" name="publicSlug" autoComplete="off" spellCheck={false} value={editSlug} onChange={(e) => { setEditSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-")); setEditSlugEdited(true); }} placeholder="minha-campanha…" className={inputCls} />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="edit-start" className="block text-[12px] text-muted-foreground mb-1">Início</label>
                  <input id="edit-start" name="startDate" type="date" autoComplete="off" value={editStart} onChange={(e) => setEditStart(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label htmlFor="edit-end" className="block text-[12px] text-muted-foreground mb-1">Fim</label>
                  <input id="edit-end" name="endDate" type="date" autoComplete="off" value={editEnd} onChange={(e) => setEditEnd(e.target.value)} className={inputCls} />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button type="submit" disabled={editSaving}
                  className="flex-1 h-8 text-[13px] bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer">
                  {editSaving ? "Salvando…" : "Salvar"}
                </button>
                <Dialog.Close render={<button type="button" className="flex-1 h-8 text-[13px] border border-border rounded-lg hover:bg-surface-2 transition-colors cursor-pointer" />}>
                  Cancelar
                </Dialog.Close>
              </div>
            </form>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
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
  const canPost = can(role, "timeline:write");

  async function submit(e: React.SyntheticEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setSaving(true);
    await fetchWithAuth(`/api/v1/projects/${projectId}/timeline`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    setContent("");
    setSaving(false);
    onMutate();
  }

  async function del(postId: string) {
    await fetchWithAuth(`/api/v1/projects/${projectId}/timeline/${postId}`, { method: "DELETE" });
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
              <MessageSquare className="size-3.5 text-primary" aria-hidden="true" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-text-subtle">{post.author.name} · {timeAgo(post.publishedAt)}</span>
                {can(role, "org:manage") && (
                  <button onClick={() => del(post.id)} aria-label="Remover post" className="text-destructive hover:opacity-80 cursor-pointer">
                    <Trash2 className="size-3.5" aria-hidden="true" />
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
    const res = await fetchWithAuth(url);
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

/* ── InitiativasTab ── */
const selectCls = "w-full h-9 px-3 text-[13px] bg-background border border-border rounded-lg text-foreground outline-none focus:border-ring cursor-pointer";

type InitForm = {
  name: string; description: string; goal: string; minGoal: string;
  priority: string; status: InitiativeStatus; endDate: string;
};
const INIT_FORM_EMPTY: InitForm = { name: "", description: "", goal: "", minGoal: "", priority: "0", status: "PENDING", endDate: "" };

function InitiativasTab({ projectId, initiatives, onMutate }: {
  projectId: string; initiatives: Initiative[]; onMutate: () => void;
}) {
  const role = currentRole();
  const canManage = can(role, "project:write");
  const isAdmin = can(role, "org:manage");

  const [open, setOpen] = useState(false);
  const [editingInit, setEditingInit] = useState<Initiative | null>(null);
  const [form, setForm] = useState<InitForm>(INIT_FORM_EMPTY);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function openCreate() { setEditingInit(null); setForm(INIT_FORM_EMPTY); setErr(null); setOpen(true); }
  function openEdit(init: Initiative) {
    setEditingInit(init);
    setForm({
      name: init.name, description: init.description ?? "",
      goal: init.goal, minGoal: "", priority: String(init.priority),
      status: init.status,
      endDate: init.endDate ? init.endDate.slice(0, 10) : "",
    });
    setErr(null);
    setOpen(true);
  }

  function set(k: keyof InitForm) { return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm(f => ({ ...f, [k]: e.target.value })); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setErr(null);
    const body: Record<string, unknown> = {
      name: form.name,
      description: form.description || undefined,
      goal: Number(form.goal),
      minGoal: form.minGoal ? Number(form.minGoal) : undefined,
      priority: Number(form.priority),
      status: form.status,
      endDate: form.endDate ? new Date(form.endDate).toISOString() : undefined,
    };
    const url = editingInit
      ? `/api/v1/projects/${projectId}/initiatives/${editingInit.id}`
      : `/api/v1/projects/${projectId}/initiatives`;
    const res = await fetchWithAuth(url, {
      method: editingInit ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (!res.ok) { setErr("Erro ao salvar. Verifique os campos e tente novamente."); return; }
    setOpen(false);
    onMutate();
  }

  async function removeInit(initId: string) {
    await fetchWithAuth(`/api/v1/projects/${projectId}/initiatives/${initId}`, { method: "DELETE" });
    onMutate();
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between mb-1">
        <Link href={`/projects/${projectId}/initiatives`} className="text-[12px] text-primary hover:underline">
          Gerenciar Iniciativas →
        </Link>
        {canManage && (
          <button onClick={openCreate} className="flex items-center gap-1.5 h-8 px-3 text-[12px] bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors cursor-pointer">
            <Plus className="size-3" aria-hidden="true" /> Nova Iniciativa
          </button>
        )}
      </div>

      {initiatives.length === 0 && (
        <p className="text-[13px] text-muted-foreground">Nenhuma iniciativa cadastrada.</p>
      )}
      {initiatives.map((init) => (
        <InitiativeCard
          key={init.id}
          init={init}
          onEdit={canManage ? () => openEdit(init) : undefined}
          onDelete={isAdmin ? () => removeInit(init.id) : undefined}
        />
      ))}

      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Backdrop className={overlayBackdropCls} />
          <Dialog.Popup className={dialogPopupCls}>
            <h2 className="text-[15px] font-semibold mb-4">{editingInit ? "Editar Iniciativa" : "Nova Iniciativa"}</h2>
            <form onSubmit={submit} className="space-y-3">
              <div>
                <label htmlFor="init-name" className="block text-[12px] text-muted-foreground mb-1">Nome *</label>
                <input id="init-name" required value={form.name} onChange={set("name")} className={inputCls} autoComplete="off" />
              </div>
              <div>
                <label htmlFor="init-desc" className="block text-[12px] text-muted-foreground mb-1">Descrição</label>
                <textarea id="init-desc" value={form.description} onChange={set("description")} rows={2} className={textareaCls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="init-goal" className="block text-[12px] text-muted-foreground mb-1">Meta (R$) *</label>
                  <input id="init-goal" required type="number" min="0" step="0.01" value={form.goal} onChange={set("goal")} className={inputCls} />
                </div>
                <div>
                  <label htmlFor="init-mingoal" className="block text-[12px] text-muted-foreground mb-1">Meta Mínima (R$)</label>
                  <input id="init-mingoal" type="number" min="0" step="0.01" value={form.minGoal} onChange={set("minGoal")} className={inputCls} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="init-priority" className="block text-[12px] text-muted-foreground mb-1">Prioridade</label>
                  <input id="init-priority" type="number" value={form.priority} onChange={set("priority")} className={inputCls} />
                </div>
                <div>
                  <label htmlFor="init-status" className="block text-[12px] text-muted-foreground mb-1">Status</label>
                  <select id="init-status" value={form.status} onChange={set("status")} className={selectCls}>
                    <option value="PENDING">Pendente</option>
                    <option value="IN_PROGRESS">Em andamento</option>
                    <option value="COMPLETED">Concluído</option>
                    <option value="CANCELLED">Cancelado</option>
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor="init-enddate" className="block text-[12px] text-muted-foreground mb-1">Data de Encerramento</label>
                <input id="init-enddate" type="date" value={form.endDate} onChange={set("endDate")} className={inputCls} />
              </div>
              {err && <p className="text-[12px] text-destructive bg-destructive/10 rounded px-3 py-2">{err}</p>}
              <div className="flex gap-2 pt-1">
                <button type="submit" disabled={saving} className="flex-1 h-8 text-[13px] bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5">
                  {saving ? <Spinner className="size-3" /> : null}
                  {editingInit ? "Salvar" : "Criar"}
                </button>
                <Dialog.Close render={<button type="button" className="flex-1 h-8 text-[13px] border border-border rounded-lg hover:bg-surface-2 transition-colors cursor-pointer" />}>
                  Cancelar
                </Dialog.Close>
              </div>
            </form>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

/* ── ContasTab ── */
type FinCategory = { id: string; name: string };
type LancForm = {
  type: "ENTRY" | "EXIT"; initId: string; description: string;
  amount: string; date: string; categoryId: string; supplier: string;
};
const LANC_FORM_EMPTY: LancForm = { type: "ENTRY", initId: "", description: "", amount: "", date: "", categoryId: "", supplier: "" };

function ContasTab({ projectId, entries, exits, totalIn, totalOut, initiatives, onMutate }: {
  projectId: string; entries: FinancialRow[]; exits: FinancialRow[]; totalIn: number; totalOut: number;
  initiatives: Initiative[]; onMutate: () => void;
}) {
  const role = currentRole();
  const canManage = can(role, "project:write");

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<LancForm>(LANC_FORM_EMPTY);
  const [categories, setCategories] = useState<FinCategory[]>([]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // reload categories when type changes or modal opens
  useEffect(() => {
    if (!open) return;
    fetchWithAuth(`/api/v1/financial-categories?type=${form.type}`)
      .then(r => r.json())
      .then(setCategories)
      .catch(() => setCategories([]));
  }, [open, form.type]);

  function set(k: keyof LancForm) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }));
  }

  function openModal() { setForm(LANC_FORM_EMPTY); setErr(null); setOpen(true); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.initId) { setErr("Selecione uma iniciativa."); return; }
    setSaving(true); setErr(null);
    const base = { description: form.description, amount: Number(form.amount), date: new Date(form.date).toISOString(), categoryId: form.categoryId || undefined };
    const body = form.type === "EXIT" ? { ...base, supplier: form.supplier || undefined } : base;
    const endpoint = form.type === "ENTRY" ? "entries" : "exits";
    const res = await fetchWithAuth(`/api/v1/projects/${projectId}/initiatives/${form.initId}/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (!res.ok) { setErr("Erro ao salvar. Verifique os campos e tente novamente."); return; }
    setOpen(false);
    onMutate();
  }

  const balance = totalIn - totalOut;
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="grid grid-cols-3 gap-3 flex-1">
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
      </div>

      {canManage && (
        <div className="flex justify-end">
          <button onClick={openModal} className="flex items-center gap-1.5 h-8 px-3 text-[12px] bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors cursor-pointer">
            <Plus className="size-3" aria-hidden="true" /> Novo Lançamento
          </button>
        </div>
      )}

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

      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Backdrop className={overlayBackdropCls} />
          <Dialog.Popup className={dialogPopupCls}>
            <h2 className="text-[15px] font-semibold mb-4">Novo Lançamento</h2>
            <form onSubmit={submit} className="space-y-3">
              <div>
                <label htmlFor="lanc-type" className="block text-[12px] text-muted-foreground mb-1">Tipo *</label>
                <select id="lanc-type" value={form.type} onChange={set("type")} className={selectCls}>
                  <option value="ENTRY">Entrada</option>
                  <option value="EXIT">Saída</option>
                </select>
              </div>
              <div>
                <label htmlFor="lanc-init" className="block text-[12px] text-muted-foreground mb-1">Iniciativa *</label>
                <select id="lanc-init" value={form.initId} onChange={set("initId")} className={selectCls}>
                  <option value="">Selecione...</option>
                  {initiatives.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="lanc-desc" className="block text-[12px] text-muted-foreground mb-1">Descrição *</label>
                <input id="lanc-desc" required value={form.description} onChange={set("description")} className={inputCls} autoComplete="off" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="lanc-amount" className="block text-[12px] text-muted-foreground mb-1">Valor (R$) *</label>
                  <input id="lanc-amount" required type="number" min="0" step="0.01" value={form.amount} onChange={set("amount")} className={inputCls} />
                </div>
                <div>
                  <label htmlFor="lanc-date" className="block text-[12px] text-muted-foreground mb-1">Data *</label>
                  <input id="lanc-date" required type="date" value={form.date} onChange={set("date")} className={inputCls} />
                </div>
              </div>
              <div>
                <label htmlFor="lanc-cat" className="block text-[12px] text-muted-foreground mb-1">Categoria</label>
                <select id="lanc-cat" value={form.categoryId} onChange={set("categoryId")} className={selectCls}>
                  <option value="">Sem categoria</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              {form.type === "EXIT" && (
                <div>
                  <label htmlFor="lanc-supplier" className="block text-[12px] text-muted-foreground mb-1">Fornecedor</label>
                  <input id="lanc-supplier" value={form.supplier} onChange={set("supplier")} className={inputCls} autoComplete="off" />
                </div>
              )}
              {err && <p className="text-[12px] text-destructive bg-destructive/10 rounded px-3 py-2">{err}</p>}
              <div className="flex gap-2 pt-1">
                <button type="submit" disabled={saving} className="flex-1 h-8 text-[13px] bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5">
                  {saving ? <Spinner className="size-3" /> : null}
                  Salvar
                </button>
                <Dialog.Close render={<button type="button" className="flex-1 h-8 text-[13px] border border-border rounded-lg hover:bg-surface-2 transition-colors cursor-pointer" />}>
                  Cancelar
                </Dialog.Close>
              </div>
            </form>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
