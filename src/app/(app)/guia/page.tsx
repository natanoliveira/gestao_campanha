"use client"

import { useState } from "react"
import {
  LayoutGrid, FolderKanban, HandCoins, Activity,
  BookOpen, CircleHelp, ArrowRight, CheckCircle2, GitBranch,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ── Guia de uso ─────────────────────────────────────────────────────────────

const SECTIONS = [
  {
    icon: LayoutGrid,
    title: "Dashboard — visão geral",
    steps: [
      "Ao entrar no sistema, você cai direto no Dashboard. Aqui ficam os números mais importantes da organização: projetos ativos, total arrecadado e metas.",
      "Os cartões no topo (KPIs) resumem a saúde financeira. Passe o olho neles ao começar o dia.",
      "Logo abaixo aparecem os alertas de prazo — iniciativas próximas do vencimento ficam destacadas. Se algo estiver vermelho, precisa de atenção.",
      "Os gráficos mostram a evolução financeira dos últimos meses e o progresso de cada iniciativa.",
    ],
  },
  {
    icon: FolderKanban,
    title: "Projetos — onde tudo começa",
    steps: [
      "Clique em Projetos no menu lateral para ver todos os projetos da organização.",
      "Cada projeto tem um status: Ativo, Rascunho, Concluído ou Arquivado. Projetos ativos são os que estão recebendo ofertas e movimentações.",
      "Clique no nome de um projeto para abrir os detalhes: iniciativas, lançamentos financeiros e posts da timeline.",
      "Dentro de um projeto, use as abas para navegar entre Iniciativas, Lançamentos, Timeline e Ofertas daquele projeto.",
    ],
  },
  {
    icon: HandCoins,
    title: "Ofertas — registrar e acompanhar",
    steps: [
      "Clique em Ofertas no menu lateral para ver todas as ofertas recebidas pela organização.",
      "Cada oferta tem um status: Pendente, Confirmada ou Cancelada. Ofertas pendentes ainda não foram confirmadas no banco.",
      "Para confirmar uma oferta, abra-a e clique em Confirmar. Para cancelar, clique em Cancelar.",
      "Use os filtros no topo (projeto, iniciativa, status, data) para encontrar uma oferta específica.",
      "Ao confirmar uma oferta, um lançamento financeiro é gerado automaticamente no projeto.",
    ],
  },
  {
    icon: Activity,
    title: "Timeline — acompanhar atualizações",
    steps: [
      "A Timeline fica dentro de cada projeto. Acesse Projetos → escolha um projeto → aba Timeline.",
      "Aqui você vê todos os posts publicados pela equipe: textos, fotos, vídeos, documentos e links.",
      "Os posts mais recentes ficam no topo. Role para baixo para ver publicações anteriores.",
      "Se você tiver permissão de comunicação, verá o botão Novo Post para publicar atualizações.",
    ],
  },
]

const TIPS = [
  "Use o menu lateral esquerdo para navegar entre as seções.",
  "Se aparecer a mensagem 'Sessao expirada', basta clicar em Fazer login novamente.",
  "Campos com asterisco (*) sao obrigatorios. Se o formulario nao salvar, procure o campo em vermelho.",
  "Itens removidos somem da listagem para a maioria dos usuarios. Fale com o administrador se precisar recuperar um registro.",
  "Duvidas sobre permissoes ou acesso? Fale com o administrador da organizacao.",
]

// ── Fluxograma ───────────────────────────────────────────────────────────────

type NodeVariant = "start" | "action" | "decision" | "end"

type FlowNode = {
  label: string
  sub?: string
  variant?: NodeVariant
}

type Flow = {
  title: string
  description: string
  nodes: FlowNode[]
}

const FLOWS: Flow[] = [
  {
    title: "Ciclo de vida de um projeto",
    description: "Do cadastro ao acompanhamento financeiro no dashboard.",
    nodes: [
      { label: "Criar Projeto",       sub: "Menu Projetos",         variant: "start"    },
      { label: "Criar Iniciativas",   sub: "Dentro do projeto"                          },
      { label: "Publicar na Timeline",sub: "Fotos, videos, texto"                       },
      { label: "Receber Ofertas",     sub: "Portal publico",        variant: "decision" },
      { label: "Confirmar Oferta",    sub: "Menu Ofertas"                               },
      { label: "Lancamento criado",   sub: "Automaticamente",       variant: "end"      },
    ],
  },
  {
    title: "Jornada do apoiador",
    description: "Como um apoiador externo faz uma oferta pelo portal publico.",
    nodes: [
      { label: "Acessa o portal",     sub: "Link publico",          variant: "start"    },
      { label: "Escolhe o projeto",   sub: "Ou iniciativa"                              },
      { label: "Preenche formulario", sub: "Nome, valor, contato"                       },
      { label: "Gera QR PIX",         sub: "Recibe em PDF",         variant: "decision" },
      { label: "Realiza pagamento",   sub: "Pelo app do banco"                          },
      { label: "Admin confirma",      sub: "No sistema interno",    variant: "end"      },
    ],
  },
  {
    title: "Gestao financeira",
    description: "Como entradas e despesas alimentam os indicadores.",
    nodes: [
      { label: "Oferta confirmada",   sub: "Ou lancamento manual",  variant: "start"    },
      { label: "Entrada registrada",  sub: "Com categoria"                              },
      { label: "Despesa registrada",  sub: "Saida do projeto"                           },
      { label: "Dashboard atualiza",  sub: "KPIs e graficos",       variant: "end"      },
    ],
  },
]

const NODE_STYLES: Record<NodeVariant, string> = {
  start:    "bg-primary/10 border-primary/40 text-primary",
  action:   "bg-card border-border text-foreground",
  decision: "bg-[#3b82f6]/10 border-[#3b82f6]/30 text-[#93c5fd]",
  end:      "bg-success/10 border-success/30 text-success",
}

const LEGEND: { variant: NodeVariant; label: string }[] = [
  { variant: "start",    label: "Inicio / entrada" },
  { variant: "action",   label: "Acao do usuario"  },
  { variant: "decision", label: "Ponto de atencao" },
  { variant: "end",      label: "Resultado final"  },
]

function Node({ label, sub, variant = "action" }: FlowNode) {
  return (
    <div className={cn(
      "rounded-lg border px-3 py-2 text-center min-w-[96px] max-w-[120px]",
      NODE_STYLES[variant],
    )}>
      <p className="text-[12px] font-medium leading-tight">{label}</p>
      {sub && <p className="text-[10px] opacity-70 mt-0.5 leading-tight">{sub}</p>}
    </div>
  )
}

function FlowDiagram({ flow }: { flow: Flow }) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-border bg-surface-2">
        <p className="text-[13px] font-semibold">{flow.title}</p>
        <p className="text-[11px] text-text-subtle mt-0.5">{flow.description}</p>
      </div>
      <div className="px-5 py-5">
        <div className="flex flex-wrap items-center gap-2">
          {flow.nodes.map((node, i) => (
            <div key={i} className="flex items-center gap-2">
              <Node {...node} />
              {i < flow.nodes.length - 1 && (
                <ArrowRight className="size-4 text-text-subtle shrink-0" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Página ───────────────────────────────────────────────────────────────────

const TABS = [
  { id: "guia",        label: "Como usar",  Icon: BookOpen   },
  { id: "fluxograma",  label: "Fluxograma", Icon: GitBranch  },
] as const

type TabId = typeof TABS[number]["id"]

export default function GuiaPage() {
  const [tab, setTab] = useState<TabId>("guia")

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto px-6 py-10 space-y-8">

        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="size-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <BookOpen className="size-5 text-primary" />
          </div>
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight">Guia do sistema</h1>
            <p className="text-[13px] text-text-subtle mt-0.5">
              Aprenda a usar o sistema passo a passo.
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-surface-2 border border-border rounded-lg p-1">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-[13px] font-medium transition-colors",
                tab === id
                  ? "bg-card text-foreground shadow-sm"
                  : "text-text-subtle hover:text-foreground",
              )}
            >
              <Icon className="size-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Conteudo: Como usar */}
        {tab === "guia" && (
          <>
            <div className="space-y-6">
              {SECTIONS.map(({ icon: Icon, title, steps }) => (
                <div key={title} className="bg-card border border-border rounded-xl overflow-hidden">
                  <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-surface-2">
                    <div className="size-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="size-4 text-primary" />
                    </div>
                    <h2 className="text-[14px] font-semibold">{title}</h2>
                  </div>
                  <ol className="px-5 py-4 space-y-3">
                    {steps.map((step, i) => (
                      <li key={i} className="flex gap-3 text-[13px] leading-relaxed">
                        <span className="flex items-center justify-center size-5 rounded-full bg-surface-2 text-[11px] font-semibold text-text-subtle shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <span className="text-foreground/80">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CircleHelp className="size-4 text-text-subtle" />
                <h2 className="text-[13px] font-semibold uppercase tracking-widest text-text-subtle">Dicas rapidas</h2>
              </div>
              <div className="space-y-2">
                {TIPS.map((tip, i) => (
                  <div key={i} className="flex gap-3 bg-card border border-border rounded-lg px-4 py-3">
                    <CheckCircle2 className="size-4 text-success shrink-0 mt-0.5" />
                    <p className="text-[13px] text-foreground/80 leading-relaxed">{tip}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Conteudo: Fluxograma */}
        {tab === "fluxograma" && (
          <div className="space-y-6">
            {FLOWS.map((flow) => (
              <FlowDiagram key={flow.title} flow={flow} />
            ))}

            {/* Legenda */}
            <div className="border border-border rounded-lg px-5 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-text-subtle mb-3">Legenda</p>
              <div className="flex flex-wrap gap-3">
                {LEGEND.map(({ variant, label }) => (
                  <div key={variant} className="flex items-center gap-2">
                    <div className={cn("size-3 rounded-sm border", NODE_STYLES[variant])} />
                    <span className="text-[12px] text-text-subtle">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Rodape */}
        <div className="border-t border-border pt-4 flex items-center gap-2 text-[12px] text-text-subtle">
          <ArrowRight className="size-3.5" />
          <span>Ainda com duvidas? Fale com o administrador da organizacao.</span>
        </div>

      </div>
    </div>
  )
}
