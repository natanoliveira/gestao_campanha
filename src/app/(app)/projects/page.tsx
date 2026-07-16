"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { ProgressBar } from "@/components/shared/progress-bar";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ProjectStatus = "DRAFT" | "ACTIVE" | "COMPLETED" | "ARCHIVED";

type Project = {
  id: string;
  name: string;
  status: ProjectStatus;
  description?: string;
  initiatives: { goal: string; raised: string }[];
};

const STATUS_MAP: Record<ProjectStatus, { variant: BadgeVariant; label: string }> = {
  ACTIVE:    { variant: "active",    label: "Ativo"     },
  DRAFT:     { variant: "draft",     label: "Rascunho"  },
  COMPLETED: { variant: "completed", label: "Concluído" },
  ARCHIVED:  { variant: "archived",  label: "Arquivado" },
};

const GRADIENTS = [
  "linear-gradient(135deg,#312e81,#4c1d95)",
  "linear-gradient(135deg,#065f46,#064e3b)",
  "linear-gradient(135deg,#1e3a5f,#1e2a4a)",
  "linear-gradient(135deg,#7c2d12,#450a0a)",
  "linear-gradient(135deg,#164e63,#0c4a6e)",
  "linear-gradient(135deg,#3b0764,#581c87)",
];

function projectStats(initiatives: { goal: string; raised: string }[]) {
  const goal   = initiatives.reduce((s, i) => s + Number(i.goal),   0);
  const raised = initiatives.reduce((s, i) => s + Number(i.raised), 0);
  return { goal, raised, pct: goal > 0 ? Math.round((raised / goal) * 100) : 0 };
}

const fmt = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 });

const progressVariant = (pct: number): "default" | "success" | "warning" =>
  pct >= 100 ? "success" : pct < 40 ? "warning" : "default";

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("rounded bg-border/40 animate-pulse", className)} />;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");

  const load = useCallback((query: string, statusFilter: string) => {
    const params = new URLSearchParams();
    if (query)        params.set("q", query);
    if (statusFilter) params.set("status", statusFilter);
    setProjects(null);
    fetchWithAuth(`/api/v1/projects?${params}`)
      .then((r) => r.json())
      .then((d) => setProjects(d.data ?? []));
  }, []);

  useEffect(() => { load(q, status); }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    load(q, status);
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between px-7 py-5 border-b border-border">
        <div>
          <h1 className="text-[18px] font-semibold font-sans">Projetos</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            {projects ? `${projects.length} projeto${projects.length !== 1 ? "s" : ""} encontrado${projects.length !== 1 ? "s" : ""}` : "Carregando..."}
          </p>
        </div>
        <Link href="/projects/new" className={cn(buttonVariants({ size: "sm" }), "gap-1.5")}>
          <Plus className="size-3.5" />
          Novo Projeto
        </Link>
      </div>

      <div className="p-7 space-y-5">
        {/* Filtros */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar projetos..."
              className="w-full h-8 pl-8 pr-3 text-[13px] bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 transition-colors"
            />
          </div>
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); load(q, e.target.value); }}
            className="h-8 px-3 text-[13px] bg-card border border-border rounded-lg text-foreground outline-none focus:border-ring cursor-pointer"
          >
            <option value="">Todos os status</option>
            <option value="ACTIVE">Ativo</option>
            <option value="DRAFT">Rascunho</option>
            <option value="COMPLETED">Concluído</option>
            <option value="ARCHIVED">Arquivado</option>
          </select>
        </form>

        {/* Grid de cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {!projects && [...Array(6)].map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-lg overflow-hidden">
              <Skeleton className="h-[100px] rounded-none" />
              <div className="p-5 space-y-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-[5px] w-full" />
              </div>
            </div>
          ))}

          {projects?.length === 0 && (
            <div className="col-span-full text-center py-20 text-muted-foreground text-[13px]">
              Nenhum projeto encontrado.
            </div>
          )}

          {projects?.map((p, idx) => {
            const { goal, raised, pct } = projectStats(p.initiatives);
            const { variant, label } = STATUS_MAP[p.status];
            const gradient = GRADIENTS[idx % GRADIENTS.length];
            return (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="bg-card border border-border rounded-lg overflow-hidden hover:border-border-hover transition-colors group cursor-pointer"
              >
                {/* Banner */}
                <div
                  className="h-[100px]"
                  style={{ background: gradient }}
                />

                <div className="p-5">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-[13px] font-medium leading-snug group-hover:text-accent-foreground transition-colors">
                      {p.name}
                    </span>
                    <Badge variant={variant} className="shrink-0">{label}</Badge>
                  </div>

                  {p.description && (
                    <p className="text-[12px] text-muted-foreground leading-snug mb-3 line-clamp-2">
                      {p.description}
                    </p>
                  )}

                  <ProgressBar value={pct} variant={progressVariant(pct)} className="mb-1.5" />

                  <div className="flex justify-between text-[12px] text-muted-foreground">
                    <span>{fmt(raised)} arrecadados</span>
                    <span>{pct}%</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
