"use client"

import { CheckCircle2, Clock, Circle, Lightbulb, BookOpen, Zap, Users, Globe, Bell, Download, Search, MessageSquare } from "lucide-react"
import { cn } from "@/lib/utils"

type ItemStatus = "done" | "next" | "planned"

type RoadmapItem = {
  label: string
  detail?: string
  status: ItemStatus
  icon: React.ElementType
}

const STATUS_CONFIG: Record<ItemStatus, { icon: React.ElementType; color: string; label: string }> = {
  done:    { icon: CheckCircle2, color: "text-success",     label: "Concluído"  },
  next:    { icon: Clock,        color: "text-[#f59e0b]",   label: "Próximo"    },
  planned: { icon: Circle,       color: "text-text-subtle", label: "Planejado"  },
}

const MODULES: { label: string; detail: string }[] = [
  { label: "Autenticação",           detail: "Login, logout, refresh de sessão e tela de sessão expirada" },
  { label: "Dashboard",              detail: "KPIs, gráficos (financeiro, iniciativas, categorias) e alertas de prazo" },
  { label: "Projetos",               detail: "CRUD completo, portal público, download de relatório PDF" },
  { label: "Iniciativas",            detail: "CRUD, meta, prioridade, responsável, total de ofertas por iniciativa" },
  { label: "Lançamentos",            detail: "Entradas e despesas por iniciativa com categorias financeiras" },
  { label: "Ofertas (Pledges)",      detail: "Formulário público com QR PIX, PDF mini-recibo, gestão interna com filtros" },
  { label: "Timeline",               detail: "Posts por projeto (texto, foto, vídeo, PDF, link) com upload para R2" },
  { label: "Usuários",               detail: "CRUD, papéis (RBAC), soft delete" },
  { label: "Configurações",          detail: "Organização, usuários, categorias financeiras, plano" },
  { label: "Painel de Decisões",     detail: "Alertas de prazo e ações rápidas por projeto" },
  { label: "Auditoria",              detail: "Histórico de ações com diff visual (before/after) — somente master" },
  { label: "Email digest semanal",   detail: "Resumo automático toda segunda-feira para admins de orgs ativas" },
]

const ROADMAP: RoadmapItem[] = [
  {
    label:  "Confirmação automática de oferta via Pix",
    detail: "Webhook Pix confirma pledge e cria lançamento financeiro automaticamente",
    status: "next",
    icon:   Zap,
  },
  {
    label:  "Comentários no portal público",
    detail: "Apoiadores comentam nos posts da timeline sem precisar de conta",
    status: "next",
    icon:   MessageSquare,
  },
  {
    label:  "Exportação CSV",
    detail: "Baixar lançamentos financeiros e ofertas em planilha",
    status: "next",
    icon:   Download,
  },
  {
    label:  "Notificações em tempo real",
    detail: "SSE para alertas de prazo, novos posts na timeline e metas atingidas",
    status: "planned",
    icon:   Bell,
  },
  {
    label:  "Busca global",
    detail: "Pesquisa unificada de projetos, iniciativas, ofertas e usuários",
    status: "planned",
    icon:   Search,
  },
  {
    label:  "Portal público — múltiplos projetos",
    detail: "Página pública da organização listando todos os projetos ativos",
    status: "planned",
    icon:   Globe,
  },
  {
    label:  "Painel de decisão avançado",
    detail: "Indicadores de risco, simulações de cenário e recomendações automáticas",
    status: "planned",
    icon:   Lightbulb,
  },
  {
    label:  "Gestão de apoiadores",
    detail: "Histórico de ofertas por ofertante, comunicação direta e segmentação",
    status: "planned",
    icon:   Users,
  },
]

function StatusBadge({ status }: { status: ItemStatus }) {
  const { icon: Icon, color, label } = STATUS_CONFIG[status]
  return (
    <span className={cn("flex items-center gap-1 text-[11px] font-medium", color)}>
      <Icon className="size-3.5" />
      {label}
    </span>
  )
}

export default function GuiaPage() {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-6 py-10 space-y-10">

        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-[#f59e0b]/10 flex items-center justify-center">
              <BookOpen className="size-5 text-[#f59e0b]" />
            </div>
            <div>
              <h1 className="text-[22px] font-semibold tracking-tight">Guia do Sistema</h1>
              <p className="text-[13px] text-text-subtle">Módulos disponíveis e próximos passos</p>
            </div>
          </div>
        </div>

        {/* Módulos ativos */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 text-success" />
            <h2 className="text-[14px] font-semibold uppercase tracking-widest text-text-subtle">Módulos ativos</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {MODULES.map(m => (
              <div key={m.label} className="bg-card border border-border rounded-lg px-4 py-3 space-y-0.5">
                <p className="text-[13px] font-medium text-foreground">{m.label}</p>
                <p className="text-[11px] text-text-subtle leading-relaxed">{m.detail}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Roadmap */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="size-4 text-[#f59e0b]" />
            <h2 className="text-[14px] font-semibold uppercase tracking-widest text-text-subtle">Roadmap de usabilidade</h2>
          </div>
          <div className="space-y-2">
            {ROADMAP.map(item => {
              const Icon = item.icon
              return (
                <div key={item.label}
                  className={cn(
                    "bg-card border rounded-lg px-4 py-3 flex items-start gap-3",
                    item.status === "next" ? "border-[#f59e0b]/30" : "border-border",
                  )}>
                  <div className={cn(
                    "size-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                    item.status === "next"    ? "bg-[#f59e0b]/10" :
                    item.status === "done"    ? "bg-success/10"   : "bg-surface-2",
                  )}>
                    <Icon className={cn("size-4", STATUS_CONFIG[item.status].color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <p className="text-[13px] font-medium text-foreground">{item.label}</p>
                      <StatusBadge status={item.status} />
                    </div>
                    {item.detail && (
                      <p className="text-[11px] text-text-subtle mt-0.5 leading-relaxed">{item.detail}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Legenda */}
        <section className="border-t border-border pt-6">
          <div className="flex items-center gap-6 text-[12px] text-text-subtle">
            {(Object.entries(STATUS_CONFIG) as [ItemStatus, typeof STATUS_CONFIG[ItemStatus]][]).map(([key, { icon: Icon, color, label }]) => (
              <div key={key} className="flex items-center gap-1.5">
                <Icon className={cn("size-3.5", color)} />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  )
}
