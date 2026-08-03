"use client"

import { useEffect, useState, useMemo } from "react"
import { useParams } from "next/navigation"
import { Calendar, Copy, Check, MessageCircle, Handshake, Flag, Receipt } from "lucide-react"
import { cn } from "@/lib/utils"
import QRCode from "react-qr-code"
import { buildPixPayload } from "@/lib/pix"
import { CurrencyInput } from "@/components/shared/currency-input"

/* ── types ── */
type Initiative = {
  id: string; name: string; status: string
  goal: number; pledged: number; raised: number; executed: number
}

type Portal = {
  id: string; name: string; description?: string; status: string; endDate?: string
  organization: string
  pix: { key: string | null; qrCode: string | null; whatsapp: string | null }
  stats: {
    totalGoal: number; totalPledged: number; totalRaised: number; totalExecuted: number
    goalPercent: number; supporters: number
  }
  initiatives: Initiative[]
  timelinePosts: { id: string; content: string; publishedAt: string; author: { name: string } }[]
  financialExits: { id: string; description: string; amount: string; date: string; supplier?: string }[]
}

/* ── helpers ── */
const fmt = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 })

const pct = (v: number, total: number) =>
  total > 0 ? Math.min(100, Math.round((v / total) * 100)) : 0

function barColor(p: number): string {
  if (p >= 100) return "var(--primary)"
  if (p >= 65)  return "#22c55e"
  if (p >= 35)  return "#eab308"
  return "#ef4444"
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("rounded bg-border/40 animate-pulse", className)} />
}

/* ── progress bar ── */
function Bar({ value, color, glow }: { value: number; color: string; glow?: boolean }) {
  return (
    <div className="relative h-3 rounded-full overflow-hidden bg-[#2c2824]">
      <div
        className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
        style={{
          width: `${value}%`,
          background: color,
          boxShadow: glow ? `0 0 10px color-mix(in oklch, ${color} 40%, transparent)` : undefined,
        }}
      />
      <span className="absolute right-0 top-0 bottom-0 w-[2px] bg-[#6b6460]/60 rounded" title="Meta" />
    </div>
  )
}

/* ── 4-metric row ── */
function MetricRow({ label, value, goal }: { label: string; value: number; goal: number }) {
  const p = pct(value, goal)
  const color = barColor(p)
  return (
    <div className="grid grid-cols-[120px_1fr_130px] gap-3 items-center">
      <span className="text-[12px] text-[#9b9390]">{label}</span>
      <Bar value={p} color={color} glow />
      <span className="text-[12px] text-right whitespace-nowrap">
        <strong className="font-medium text-[#f5f0eb]">{fmt(value)}</strong>{" "}
        <span className="text-[#6b6460]">· {p}%</span>
      </span>
    </div>
  )
}

/* ── pledge form ── */
function PledgeForm({ slug, initiatives, pixKey, projectName }: {
  slug: string; initiatives: Initiative[]
  pixKey: string | null; projectName: string
}) {
  const [step, setStep]           = useState<1 | 2>(1)
  const [visible, setVisible]     = useState(true)
  const [form, setForm]           = useState({ name: "", amount: "", initiativeId: "" })
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState("")
  const [confirmedAmount, setConfirmedAmount] = useState<number | null>(null)
  const [copiedPix, setCopiedPix] = useState(false)

  const pixPayload = useMemo(
    () => pixKey && confirmedAmount ? buildPixPayload(pixKey, projectName, confirmedAmount) : null,
    [pixKey, confirmedAmount, projectName],
  )

  function transition(fn: () => void) {
    setVisible(false)
    setTimeout(() => { fn(); setVisible(true) }, 180)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const amount = Number(form.amount)
    if (!amount || amount <= 0) { setError("Informe um valor válido."); return }
    setLoading(true); setError("")
    try {
      const res = await fetch(`/api/v1/public/projects/${slug}/pledges`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, amount, initiativeId: form.initiativeId || undefined }),
      })
      if (!res.ok) throw new Error()
      setConfirmedAmount(amount)
      transition(() => setStep(2))
    } catch {
      setError("Erro ao registrar oferta. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  function reset() {
    transition(() => {
      setForm({ name: "", amount: "", initiativeId: "" })
      setConfirmedAmount(null)
      setError("")
      setStep(1)
    })
  }

  const field = "w-full px-3 py-2.5 text-[13px] bg-[#0c0b0a] border border-[#2c2824] rounded-lg text-[#f5f0eb] outline-none focus:border-[#f59e0b]/70 transition-colors placeholder:text-[#3d3a37]"

  return (
    <div className="flex flex-col gap-5">

      {/* ── Step indicator ── */}
      <div className="flex items-center gap-0">
        <div className="flex items-center gap-2">
          <div className={cn(
            "size-5 rounded-full text-[10px] font-bold flex items-center justify-center transition-all duration-300",
            step >= 1 ? "bg-[#f59e0b] text-[#0c0b0a]" : "border border-[#2c2824] text-[#3d3a37]"
          )}>1</div>
          <span className={cn("text-[11px] tracking-[0.06em] transition-colors", step === 1 ? "text-[#f5f0eb]" : "text-[#3d3a37]")}>
            Dados
          </span>
        </div>

        <div className="flex-1 mx-3 h-px bg-[#2c2824] relative overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-[#f59e0b] transition-all duration-500"
            style={{ right: step === 2 ? "0%" : "100%" }}
          />
        </div>

        <div className="flex items-center gap-2">
          <span className={cn("text-[11px] tracking-[0.06em] transition-colors", step === 2 ? "text-[#f5f0eb]" : "text-[#3d3a37]")}>
            Pagamento
          </span>
          <div className={cn(
            "size-5 rounded-full text-[10px] font-bold flex items-center justify-center transition-all duration-300",
            step >= 2 ? "bg-[#f59e0b] text-[#0c0b0a]" : "border border-[#2c2824] text-[#3d3a37]"
          )}>2</div>
        </div>
      </div>

      {/* ── Content ── */}
      <div
        className="transition-all duration-[180ms]"
        style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(5px)" }}
      >

        {/* Step 1 */}
        {step === 1 && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-[10px] uppercase tracking-[0.12em] text-[#6b6460] mb-1.5">Seu nome *</label>
              <input required value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Nome completo" className={field} />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-[0.12em] text-[#6b6460] mb-1.5">Valor *</label>
              <CurrencyInput
                required
                value={form.amount}
                onChange={v => setForm(f => ({ ...f, amount: v }))}
                placeholder="R$ 0,00"
                className="w-full px-3 py-2.5 text-[13px] bg-[#0c0b0a] border border-[#2c2824] rounded-lg text-[#f5f0eb] outline-none focus:border-[#f59e0b]/70 transition-colors h-auto placeholder:text-[#3d3a37]"
              />
            </div>
            {initiatives.length > 0 && (
              <div>
                <label className="block text-[10px] uppercase tracking-[0.12em] text-[#6b6460] mb-1.5">Iniciativa</label>
                <select value={form.initiativeId}
                  onChange={e => setForm(f => ({ ...f, initiativeId: e.target.value }))}
                  className={field}>
                  <option value="">Onde for mais necessário</option>
                  {initiatives.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                </select>
              </div>
            )}
            {error && <p className="text-[12px] text-red-400">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full py-2.5 bg-[#f59e0b] text-[#0c0b0a] rounded-lg text-[13px] font-semibold hover:bg-[#d97706] disabled:opacity-60 transition-colors cursor-pointer flex items-center justify-center gap-2 mt-1">
              {loading ? (
                <><span className="size-3.5 border-2 border-[#0c0b0a]/30 border-t-[#0c0b0a] rounded-full animate-spin" />Registrando...</>
              ) : <>Gerar cobrança PIX <span className="opacity-60">→</span></>}
            </button>
          </form>
        )}

        {/* Step 2 */}
        {step === 2 && confirmedAmount !== null && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <div className="size-5 rounded-full bg-[#22c55e]/15 flex items-center justify-center shrink-0">
                <Check className="size-3 text-[#22c55e]" />
              </div>
              <span className="text-[12px] text-[#22c55e] font-medium">Oferta registrada com sucesso</span>
            </div>

            {pixPayload ? (
              <div className="flex flex-col items-center gap-4 rounded-xl border border-[#2c2824] bg-[#0c0b0a] p-5">
                <div className="text-center">
                  <p className="text-[10px] uppercase tracking-[0.1em] text-[#6b6460] mb-1">Valor a pagar</p>
                  <p className="font-serif text-[26px] font-medium text-[#fcd34d]">
                    {confirmedAmount.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="bg-white p-3 rounded-xl" style={{ boxShadow: "0 0 32px color-mix(in oklch, #f59e0b 22%, transparent)" }}>
                  <QRCode value={pixPayload} size={148} />
                </div>
                <div className="w-full space-y-2">
                  <p className="text-[10px] uppercase tracking-[0.1em] text-[#6b6460] text-center">Copia e cola PIX</p>
                  <div className="flex gap-2 items-stretch">
                    <code className="flex-1 px-3 py-2 rounded-lg bg-[#151413] border border-[#2c2824] text-[10px] break-all text-[#9b9390] leading-relaxed">
                      {pixPayload}
                    </code>
                    <button type="button"
                      onClick={() => { navigator.clipboard?.writeText(pixPayload!); setCopiedPix(true); setTimeout(() => setCopiedPix(false), 2000) }}
                      className="px-3 rounded-lg border border-[#2c2824] hover:bg-[#1c1a18] transition-colors flex flex-col items-center justify-center gap-1 cursor-pointer shrink-0">
                      {copiedPix ? <Check className="size-3.5 text-[#22c55e]" /> : <Copy className="size-3.5 text-[#9b9390]" />}
                      <span className="text-[10px] text-[#6b6460]">{copiedPix ? "Copiado" : "Copiar"}</span>
                    </button>
                  </div>
                  <p className="text-[10px] text-[#6b6460] text-center">Chave: <span className="text-[#9b9390]">{pixKey}</span></p>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-[#2c2824] bg-[#0c0b0a] p-5 space-y-1">
                <p className="text-[10px] uppercase tracking-[0.1em] text-[#6b6460]">Valor comprometido</p>
                <p className="font-serif text-[22px] font-medium text-[#fcd34d]">
                  {confirmedAmount.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 })}
                </p>
                <p className="text-[12px] text-[#9b9390] pt-1">Entre em contato com a equipe para confirmar o pagamento.</p>
              </div>
            )}

            <p className="text-[11px] text-[#6b6460] leading-relaxed text-center">
              Após confirmação do pagamento pela equipe, o valor entrará no painel da campanha.
            </p>
            <button onClick={reset}
              className="self-center text-[11px] text-[#6b6460] hover:text-[#9b9390] transition-colors underline underline-offset-2">
              Registrar outra oferta
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── main page ── */
export default function PublicPortalPage() {
  const { slug } = useParams<{ slug: string }>()
  const [portal, setPortal]     = useState<Portal | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [copied, setCopied]     = useState(false)

  useEffect(() => {
    if (!slug) return
    fetch(`/api/v1/public/projects/${slug}`)
      .then(r => { if (r.status === 404) { setNotFound(true); return null } return r.json() })
      .then(d => { if (d) setPortal(d) })
  }, [slug])

  function copyPix() {
    if (!portal?.pix.key) return
    navigator.clipboard?.writeText(portal.pix.key)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-[#0c0b0a] flex items-center justify-center">
        <div className="text-center">
          <p className="text-2xl font-semibold font-serif mb-2 text-[#f5f0eb]">Portal não encontrado</p>
          <p className="text-[#6b6460] text-sm">Este link pode estar desatualizado ou o projeto não é público.</p>
        </div>
      </div>
    )
  }

  const s    = portal?.stats
  const inits = portal?.initiatives ?? []

  return (
    <div className="min-h-screen bg-[#0c0b0a] text-[#f5f0eb]" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>

      {/* Nav */}
      <nav className="sticky top-0 z-20 backdrop-blur-md border-b border-[#2c2824] bg-[#0c0b0a]/80">
        <div className="max-w-[1040px] mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[14px] font-semibold">
            <span className="text-[#f59e0b]">◆</span>
            {portal ? portal.organization : <Skeleton className="h-4 w-28" />}
          </div>
          <div className="flex items-center gap-3">
            {portal?.endDate && (
              <span className="hidden sm:inline-flex items-center gap-1.5 text-[12px] text-[#9b9390] border border-[#2c2824] rounded-lg px-3 py-1">
                <Calendar className="size-3.5 text-[#f59e0b]" />
                Meta até {formatDate(portal.endDate)}
              </span>
            )}
            <a href="#contribuir" className="px-4 py-1.5 bg-[#f59e0b] text-[#0c0b0a] rounded-lg text-[13px] font-semibold hover:bg-[#d97706] transition-colors">
              Quero contribuir
            </a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <header className="max-w-[1040px] mx-auto px-6 pt-16 pb-10">
        <div className="text-[11px] tracking-[0.14em] uppercase text-[#f59e0b] font-medium mb-3">
          {portal ? portal.organization : <Skeleton className="h-3 w-24" />}
        </div>
        {portal ? (
          <h1 className="font-serif font-medium text-[clamp(28px,4.5vw,44px)] leading-[1.12] max-w-[600px] mb-4">
            {portal.name}
          </h1>
        ) : <Skeleton className="h-12 w-96 mb-4" />}
        {portal?.description && (
          <p className="text-[#9b9390] text-[16px] leading-relaxed max-w-[540px]">{portal.description}</p>
        )}
      </header>

      <main className="max-w-[1040px] mx-auto px-6 pb-20 flex flex-col gap-14">

        {/* Visão global */}
        <section className="bg-[#151413] border border-[#2c2824] rounded-2xl p-7 shadow-lg">
          <div className="flex flex-wrap items-baseline justify-between gap-3 mb-5">
            <div>
              <div className="text-[11px] uppercase tracking-[0.1em] text-[#9b9390] font-medium mb-1">Visão global da campanha</div>
              {s ? (
                <div className="font-serif text-[32px] font-medium">{fmt(s.totalGoal)}</div>
              ) : <Skeleton className="h-9 w-40" />}
            </div>
          </div>

          {/* 4 metric bars */}
          {s ? (
            <div className="flex flex-col gap-3 mb-5">
              <MetricRow label="Meta"          value={s.totalGoal}     goal={s.totalGoal} />
              <MetricRow label="Compromissado" value={s.totalPledged}  goal={s.totalGoal} />
              <MetricRow label="Arrecadado"    value={s.totalRaised}   goal={s.totalGoal} />
              <MetricRow label="Executado"     value={s.totalExecuted} goal={s.totalGoal} />
            </div>
          ) : (
            <div className="flex flex-col gap-3 mb-5">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-6" />)}
            </div>
          )}

          {/* KPI cards */}
          {s && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {[
                { label: "Meta",         value: s.totalGoal,     color: "#6b6460" },
                { label: "Compromissado",value: s.totalPledged,  color: "#9b9390" },
                { label: "Arrecadado",   value: s.totalRaised,   color: "#f59e0b", highlight: true },
                { label: "Executado",    value: s.totalExecuted, color: "#fcd34d" },
              ].map(({ label, value, color, highlight }) => (
                <div key={label} className={cn(
                  "border rounded-xl p-4",
                  highlight ? "border-[#f59e0b]/40 bg-[color-mix(in_oklch,#f59e0b_6%,transparent)]" : "border-[#2c2824] bg-[#0c0b0a]"
                )}>
                  <div className="flex items-center gap-2 text-[11px] text-[#9b9390] mb-2">
                    <span className="w-2 h-2 rounded-full flex-none" style={{ background: color }} />
                    {label}
                  </div>
                  <div className={cn("text-[20px] font-medium font-serif", highlight && "text-[#fcd34d]")}>
                    {fmt(value)}
                  </div>
                  <div className="text-[11px] text-[#6b6460] mt-0.5">{pct(value, s.totalGoal)}% da meta</div>
                </div>
              ))}
            </div>
          )}

          {/* Faltam row */}
          {s && s.totalGoal > s.totalPledged && (
            <div className="flex flex-wrap gap-5 p-4 rounded-xl bg-[#1c1a18] border border-[#2c2824]">
              <div className="flex items-center gap-2 text-[13px] text-[#9b9390]">
                <Flag className="size-4 text-[#f59e0b]" />
                Falta comprometer <strong className="text-[#f5f0eb] font-medium ml-1">{fmt(s.totalGoal - s.totalPledged)}</strong>
              </div>
              {s.totalPledged > s.totalRaised && (
                <div className="flex items-center gap-2 text-[13px] text-[#9b9390]">
                  <Receipt className="size-4 text-[#f59e0b]" />
                  Comprometido a receber <strong className="text-[#f5f0eb] font-medium ml-1">{fmt(s.totalPledged - s.totalRaised)}</strong>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Iniciativas */}
        {inits.length > 0 && (
          <section>
            <div className="mb-5">
              <div className="text-[11px] uppercase tracking-[0.14em] text-[#f59e0b] font-medium mb-2">Iniciativas</div>
              <h2 className="font-serif font-medium text-[26px]">Onde sua oferta atua</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {inits.map((init, idx) => {
                const colors = ["#f59e0b", "#22c55e", "#3b82f6", "#a78bfa"]
                const c = colors[idx % colors.length]
                return (
                  <div key={init.id} className="bg-[#151413] border border-[#2c2824] rounded-2xl p-6" style={{ borderTopColor: c, borderTopWidth: 2 }}>
                    <div className="flex items-center gap-2 mb-4">
                      <span className="w-2.5 h-2.5 rounded-sm flex-none" style={{ background: c }} />
                      <span className="text-[16px] font-medium">{init.name}</span>
                    </div>
                    <div className="font-serif text-[24px] font-medium mb-4">{fmt(init.goal)}<span className="text-[12px] text-[#6b6460] font-sans ml-2">meta</span></div>
                    <div className="flex flex-col gap-2.5 mb-4">
                      <MetricRow label="Compromissado" value={init.pledged}  goal={init.goal} />
                      <MetricRow label="Arrecadado"    value={init.raised}   goal={init.goal} />
                      <MetricRow label="Executado"     value={init.executed} goal={init.goal} />
                    </div>
                    {init.goal > init.pledged && (
                      <div className="flex justify-between text-[12px] pt-3 border-t border-[#2c2824]">
                        <span className="text-[#6b6460]">Falta comprometer</span>
                        <span className="font-medium">{fmt(init.goal - init.pledged)}</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* Timeline */}
        {(portal?.timelinePosts?.length ?? 0) > 0 && (
          <section>
            <div className="mb-6">
              <div className="text-[11px] uppercase tracking-[0.14em] text-[#f59e0b] font-medium mb-2">Timeline</div>
              <h2 className="font-serif font-medium text-[26px]">Atualizações da campanha</h2>
            </div>
            <div className="flex flex-col">
              {portal!.timelinePosts.map((post, i) => (
                <div key={post.id} className="grid grid-cols-[20px_1fr] gap-4">
                  <div className="flex flex-col items-center">
                    <span className="w-3 h-3 rounded-full flex-none mt-1 bg-[#f59e0b] shadow-[0_0_8px_color-mix(in_oklch,#f59e0b_50%,transparent)]" />
                    {i < portal!.timelinePosts.length - 1 && (
                      <span className="flex-1 w-px bg-gradient-to-b from-[#2c2824] to-transparent" />
                    )}
                  </div>
                  <div className="pb-7">
                    <div className="text-[11px] uppercase tracking-[0.06em] text-[#f59e0b] font-medium">{formatDate(post.publishedAt)}</div>
                    <div className="text-[13px] font-medium mt-1">{post.author.name}</div>
                    <div className="text-[13px] text-[#9b9390] mt-1 leading-relaxed max-w-[520px]">{post.content}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Prestação de contas */}
        {(portal?.financialExits?.length ?? 0) > 0 && (
          <section>
            <div className="mb-5 flex flex-wrap justify-between items-end gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-[0.14em] text-[#f59e0b] font-medium mb-2">Prestação de contas</div>
                <h2 className="font-serif font-medium text-[26px]">Cada real, registrado</h2>
              </div>
              {s && <span className="inline-flex items-center gap-1.5 text-[12px] border border-[#f59e0b]/40 text-[#fcd34d] rounded-lg px-3 py-1"><Receipt className="size-3.5" /> Executado: {fmt(s.totalExecuted)}</span>}
            </div>
            <div className="bg-[#151413] border border-[#2c2824] rounded-2xl overflow-auto">
              <table className="w-full text-[13px] min-w-[480px]">
                <thead>
                  <tr className="border-b border-[#2c2824] text-[#6b6460] text-left">
                    <th className="px-5 py-3 font-medium">Data</th>
                    <th className="px-5 py-3 font-medium">Descrição</th>
                    <th className="px-5 py-3 font-medium text-right">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {portal!.financialExits.map(e => (
                    <tr key={e.id} className="border-b border-[#2c2824] last:border-0">
                      <td className="px-5 py-3 text-[#6b6460] whitespace-nowrap">{formatDate(e.date)}</td>
                      <td className="px-5 py-3">
                        {e.description}
                        {e.supplier && <span className="block text-[11px] text-[#6b6460]">{e.supplier}</span>}
                      </td>
                      <td className="px-5 py-3 font-medium text-right whitespace-nowrap">{fmt(Number(e.amount))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Como contribuir */}
        <section id="contribuir" style={{ scrollMarginTop: "80px" }}>
          <div className="mb-5">
            <div className="text-[11px] uppercase tracking-[0.14em] text-[#f59e0b] font-medium mb-2">Como contribuir</div>
            <h2 className="font-serif font-medium text-[26px]">Faça parte desta missão</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-start">

            {/* PIX — chave estática para transferência manual */}
            {portal?.pix.key && (
              <div className="bg-[#151413] border border-[#2c2824] rounded-2xl p-6 flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-[#f59e0b] text-[20px]">⬡</span>
                  <span className="text-[16px] font-medium">Chave PIX</span>
                </div>
                <p className="text-[13px] text-[#9b9390] leading-relaxed">
                  Copie a chave abaixo ou use o QR Code gerado ao digitar o valor no formulário.
                </p>
                <div className="flex gap-2 items-center">
                  <code className="flex-1 px-3 py-2 rounded-lg bg-[#0c0b0a] border border-[#2c2824] text-[13px] overflow-hidden text-ellipsis whitespace-nowrap">
                    {portal.pix.key}
                  </code>
                  <button onClick={copyPix} className="px-3 py-2 rounded-lg border border-[#2c2824] text-[12px] text-[#9b9390] hover:bg-[#1c1a18] transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1">
                    {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
                    {copied ? "Copiado" : "Copiar"}
                  </button>
                </div>
              </div>
            )}

            {/* WhatsApp */}
            {portal?.pix.whatsapp && (
              <div className="bg-[#151413] border border-[#2c2824] rounded-2xl p-6 flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <MessageCircle className="size-5 text-[#f59e0b]" />
                  <span className="text-[16px] font-medium">Comprometa-se pelo WhatsApp</span>
                </div>
                <p className="text-[13px] text-[#9b9390] leading-relaxed">
                  Fale com a equipe da campanha, informe o valor e a iniciativa. Seu compromisso entra no painel em até 24h.
                </p>
                <a
                  href={`https://wa.me/${portal.pix.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent("Olá! Quero registrar um compromisso para a campanha.")}`}
                  target="_blank" rel="noopener"
                  className="self-start inline-flex items-center gap-2 px-4 py-2 bg-[#f59e0b] text-[#0c0b0a] rounded-lg text-[13px] font-semibold hover:bg-[#d97706] transition-colors"
                >
                  <MessageCircle className="size-4" /> Abrir conversa
                </a>
              </div>
            )}

            {/* Pledge form */}
            <div className="bg-[#151413] border border-[#2c2824] rounded-2xl p-6 flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <Handshake className="size-5 text-[#f59e0b]" />
                <span className="text-[16px] font-medium">Registrar compromisso</span>
              </div>
              <PledgeForm
                slug={slug as string}
                initiatives={inits}
                pixKey={portal?.pix.key ?? null}
                projectName={portal?.name ?? ""}
              />
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#2c2824] py-7 px-6">
        <div className="max-w-[1040px] mx-auto flex flex-wrap justify-between gap-3 text-[12px] text-[#6b6460]">
          <span>{portal?.organization} · Campanha</span>
          <span>Dados atualizados pelo painel de gestão</span>
        </div>
      </footer>
    </div>
  )
}
