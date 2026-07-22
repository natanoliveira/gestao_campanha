"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { MessageSquare, Heart } from "lucide-react";
import { ProgressBar } from "@/components/shared/progress-bar";
import { FeedItem } from "@/components/shared/feed-item";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/* ── types ── */
type InitiativeStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

type Portal = {
  id: string;
  name: string;
  description?: string;
  status: string;
  organization: string;
  stats: {
    totalRaised: number;
    totalGoal: number;
    goalPercent: number;
    supporters: number;
    balance: number;
  };
  initiatives: {
    id: string; name: string; goal: string; raised: string; status: InitiativeStatus;
  }[];
  timelinePosts: {
    id: string; content: string; publishedAt: string; author: { name: string };
  }[];
  financialEntries: { id: string; description: string; amount: string; date: string }[];
  financialExits:   { id: string; description: string; amount: string; date: string; supplier?: string }[];
};

/* ── helpers ── */
const INIT_STATUS: Record<InitiativeStatus, { variant: BadgeVariant; label: string }> = {
  PENDING:     { variant: "draft",     label: "Pendente"     },
  IN_PROGRESS: { variant: "active",    label: "Em Andamento" },
  COMPLETED:   { variant: "completed", label: "Concluída"    },
  CANCELLED:   { variant: "archived",  label: "Cancelada"    },
};

const fmt = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 });

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 3600)   return `${Math.floor(diff / 60)}min atrás`;
  if (diff < 86400)  return `${Math.floor(diff / 3600)}h atrás`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d atrás`;
  return new Date(iso).toLocaleDateString("pt-BR");
}

const progressVariant = (pct: number): "default" | "success" | "warning" =>
  pct >= 100 ? "success" : pct < 40 ? "warning" : "default";

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("rounded bg-border/40 animate-pulse", className)} />;
}

/* ── page ── */
export default function PublicPortalPage() {
  const { slug } = useParams<{ slug: string }>();
  const [portal, setPortal]   = useState<Portal | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/v1/public/projects/${slug}`)
      .then((r) => {
        if (r.status === 404) { setNotFound(true); return null; }
        return r.json();
      })
      .then((d) => { if (d) setPortal(d); });
  }, [slug]);

  if (notFound) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-2xl font-semibold font-serif mb-2">Portal não encontrado</p>
          <p className="text-muted-foreground text-sm">
            Este link pode estar desatualizado ou o projeto não é público.
          </p>
        </div>
      </div>
    );
  }

  const s = portal?.stats;

  return (
    <div className="min-h-screen bg-background">
      {/* ── Hero ── */}
      <div
        className="border-b border-border pb-9 pt-12 text-center px-6"
        style={{ background: "linear-gradient(135deg,#0f0f1a 0%,#1a1030 100%)" }}
      >
        {/* Org label */}
        {portal ? (
          <p className="text-[12px] uppercase tracking-[.08em] text-text-subtle mb-3">
            {portal.organization}
          </p>
        ) : (
          <Skeleton className="h-3 w-24 mx-auto mb-3" />
        )}

        {/* Title */}
        {portal ? (
          <h1 className="text-[28px] sm:text-[32px] font-semibold max-w-xl mx-auto mb-3 leading-tight">
            {portal.name}
          </h1>
        ) : (
          <Skeleton className="h-9 w-64 mx-auto mb-3" />
        )}

        {/* Description */}
        {portal?.description && (
          <p className="text-[15px] text-muted-foreground max-w-lg mx-auto mb-7 leading-relaxed">
            {portal.description}
          </p>
        )}
        {!portal && <Skeleton className="h-4 w-80 mx-auto mb-7" />}

        {/* Stats row */}
        <div className="inline-flex items-center gap-6 bg-card border border-border rounded-xl px-7 py-4 mb-7">
          {s ? (
            <>
              <div className="text-center">
                <p className="text-[11px] text-text-subtle mb-1">Arrecadado</p>
                <p className="text-[20px] font-bold leading-none">{fmt(s.totalRaised)}</p>
              </div>
              <div className="w-px h-9 bg-border" />
              <div className="text-center">
                <p className="text-[11px] text-text-subtle mb-1">Meta</p>
                <p className="text-[20px] font-bold leading-none">{fmt(s.totalGoal)}</p>
              </div>
              <div className="w-px h-9 bg-border" />
              <div className="text-center">
                <p className="text-[11px] text-text-subtle mb-1">Apoiadores</p>
                <p className="text-[20px] font-bold leading-none">{s.supporters}</p>
              </div>
            </>
          ) : (
            [...Array(3)].map((_, i) => (
              <div key={i} className="text-center space-y-1.5">
                <Skeleton className="h-3 w-16 mx-auto" />
                <Skeleton className="h-6 w-20 mx-auto" />
              </div>
            ))
          )}
        </div>

        {/* Global progress */}
        <div className="max-w-sm mx-auto">
          <div className="flex justify-between text-[12px] text-text-subtle mb-1.5">
            <span>Progresso geral</span>
            <span>{s?.goalPercent ?? 0}%</span>
          </div>
          <div className="h-2 bg-border rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${s?.goalPercent ?? 0}%`,
                background: "linear-gradient(90deg, var(--primary), #d97706)",
              }}
            />
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="max-w-2xl mx-auto px-6 py-9 space-y-10">

        {/* Iniciativas */}
        <section>
          <h2 className="text-[16px] font-semibold mb-4 pb-2.5 border-b border-border">
            Iniciativas
          </h2>
          <div className="space-y-2.5">
            {!portal && [...Array(3)].map((_, i) => <Skeleton key={i} className="h-20" />)}
            {portal?.initiatives.map((init) => {
              const goal   = Number(init.goal);
              const raised = Number(init.raised);
              const pct    = goal > 0 ? Math.round((raised / goal) * 100) : 0;
              const { variant, label } = INIT_STATUS[init.status];
              return (
                <div key={init.id} className="bg-card border border-border rounded-lg px-4 py-3.5">
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
            })}
          </div>
        </section>

        {/* Timeline */}
        <section>
          <h2 className="text-[16px] font-semibold mb-4 pb-2.5 border-b border-border">
            Timeline
          </h2>
          <div className="bg-card border border-border rounded-lg px-5 py-1">
            {!portal && [...Array(3)].map((_, i) => (
              <div key={i} className="flex gap-3 py-3 border-b border-border last:border-0">
                <Skeleton className="size-7 rounded-full shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-24" /><Skeleton className="h-4 w-full" />
                </div>
              </div>
            ))}
            {portal?.timelinePosts.length === 0 && (
              <p className="text-[13px] text-muted-foreground py-8 text-center">Sem atualizações ainda.</p>
            )}
            {portal?.timelinePosts.map((post) => (
              <FeedItem
                key={post.id}
                Icon={MessageSquare}
                author={post.author.name}
                time={timeAgo(post.publishedAt)}
                text={post.content}
              />
            ))}
          </div>
        </section>

        {/* Prestação de contas */}
        <section>
          <h2 className="text-[16px] font-semibold mb-4 pb-2.5 border-b border-border">
            Prestação de Contas
          </h2>
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            {(portal?.financialEntries.length === 0 && portal?.financialExits.length === 0) && (
              <p className="text-[13px] text-muted-foreground py-8 text-center">Sem lançamentos públicos.</p>
            )}
            {portal?.financialEntries.map((e) => (
              <div key={e.id} className="flex justify-between items-center px-5 py-3 border-b border-border text-[13px]">
                <span>{e.description}</span>
                <span className="font-medium text-success">+ {fmt(Number(e.amount))}</span>
              </div>
            ))}
            {portal?.financialExits.map((e) => (
              <div key={e.id} className="flex justify-between items-center px-5 py-3 border-b border-border text-[13px]">
                <div>
                  <p>{e.description}</p>
                  {e.supplier && <p className="text-[11px] text-text-subtle">{e.supplier}</p>}
                </div>
                <span className="font-medium text-destructive">− {fmt(Number(e.amount))}</span>
              </div>
            ))}
            {portal && (s?.totalRaised ?? 0) + (s?.supporters ?? 0) > 0 && (
              <div className="flex justify-between items-center px-5 py-3 border-t border-border text-[13px] font-semibold">
                <span>Saldo atual</span>
                <span className={(s?.balance ?? 0) >= 0 ? "text-success" : "text-destructive"}>
                  {fmt(s?.balance ?? 0)}
                </span>
              </div>
            )}
          </div>
        </section>

        {/* CTA */}
        <div className="text-center pb-4">
          <button className="inline-flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-md text-[14px] font-medium hover:bg-primary/90 transition-colors cursor-pointer">
            <Heart className="size-4" />
            Como contribuir
          </button>
        </div>
      </div>
    </div>
  );
}
