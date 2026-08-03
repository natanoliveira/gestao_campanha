"use client"

import { useState } from "react"
import { Check, Copy, Download } from "lucide-react"
import { cn } from "@/lib/utils"
import { CurrencyInput } from "@/components/shared/currency-input"

type Initiative = { id: string; name: string }

type Props = {
  slug: string
  initiatives: Initiative[]
  pixKey: string | null
  projectName: string
}

export function PledgeForm({ slug, initiatives, pixKey, projectName }: Props) {
  const [step, setStep]           = useState<1 | 2>(1)
  const [visible, setVisible]     = useState(true)
  const [form, setForm]           = useState({ name: "", amount: "", initiativeId: "" })
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState("")
  const [confirmedAmount, setConfirmedAmount] = useState<number | null>(null)
  const [confirmedName, setConfirmedName]     = useState("")
  const [pixPayload, setPixPayload]           = useState<string | null>(null)
  const [qrDataUrl, setQrDataUrl]             = useState<string | null>(null)
  const [copiedPix, setCopiedPix]             = useState(false)
  const [downloading, setDownloading]         = useState(false)

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
      const data = await res.json()
      setConfirmedAmount(amount)
      setConfirmedName(form.name)
      if (data.qrCodeData) {
        setPixPayload(data.qrCodeData)
        try {
          const QRCode = await import("qrcode")
          const url = await QRCode.default.toDataURL(data.qrCodeData, { width: 180, margin: 1, color: { dark: "#000000", light: "#ffffff" } })
          setQrDataUrl(url)
        } catch (qrErr) {
          console.error("QR render error:", qrErr)
        }
      }
      transition(() => setStep(2))
    } catch {
      setError("Erro ao registrar oferta. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  async function downloadReceipt() {
    if (!confirmedAmount) return
    setDownloading(true)
    try {
      const { pdf, Document, Page, View, Text, StyleSheet } = await import("@react-pdf/renderer")
      const s = StyleSheet.create({
        page:    { padding: 28, backgroundColor: "#ffffff", fontFamily: "Helvetica" },
        title:   { fontSize: 13, fontWeight: "bold", color: "#1a1a1a", marginBottom: 2 },
        sub:     { fontSize: 8, color: "#999999" },
        divider: { borderBottomWidth: 0.5, borderBottomColor: "#e5e5e5", marginVertical: 10 },
        row:     { flexDirection: "row", justifyContent: "space-between", marginBottom: 5 },
        label:   { fontSize: 8, color: "#888888" },
        value:   { fontSize: 9, color: "#1a1a1a", fontWeight: "bold" },
        amount:  { fontSize: 22, fontWeight: "bold", color: "#b45309", textAlign: "center", marginVertical: 10 },
        status:  { fontSize: 8, color: "#d97706" },
        footer:  { marginTop: 14, paddingTop: 10, borderTopWidth: 0.5, borderTopColor: "#e5e5e5" },
        verse:   { fontSize: 7.5, color: "#aaaaaa", textAlign: "center", fontStyle: "italic", lineHeight: 1.4 },
        ref:     { fontSize: 7, color: "#cccccc", textAlign: "center", marginTop: 3 },
      })
      const dateStr = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
      const amountStr = confirmedAmount.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 })
      const doc = (
        <Document>
          <Page size={[226, 340]} style={s.page}>
            <Text style={s.title}>Comprovante de Oferta</Text>
            <Text style={s.sub}>{projectName}</Text>
            <View style={s.divider} />
            <View style={s.row}><Text style={s.label}>Ofertante</Text><Text style={s.value}>{confirmedName}</Text></View>
            <View style={s.row}><Text style={s.label}>Projeto</Text><Text style={s.value}>{projectName}</Text></View>
            <View style={s.divider} />
            <Text style={s.amount}>{amountStr}</Text>
            <View style={s.divider} />
            <View style={s.row}><Text style={s.label}>Data / Hora</Text><Text style={s.value}>{dateStr}</Text></View>
            <View style={s.row}><Text style={s.label}>Situação</Text><Text style={s.status}>Pendente — aguardando confirmação</Text></View>
            <View style={s.footer}>
              <Text style={s.verse}>
                {"\"Cada um dê conforme determinou em seu coração, não com pesar ou por obrigação,\npois Deus ama quem dá com alegria.\""}
              </Text>
              <Text style={s.ref}>2 Coríntios 9:7</Text>
            </View>
          </Page>
        </Document>
      )
      const blob = await pdf(doc).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `oferta-${confirmedName.toLowerCase().replace(/\s+/g, "-")}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setDownloading(false)
    }
  }

  function reset() {
    transition(() => {
      setForm({ name: "", amount: "", initiativeId: "" })
      setConfirmedAmount(null)
      setConfirmedName("")
      setPixPayload(null)
      setQrDataUrl(null)
      setError("")
      setStep(1)
    })
  }

  const field = "w-full px-3 py-2.5 text-[13px] bg-[#0c0b0a] border border-[#2c2824] rounded-lg text-[#f5f0eb] outline-none focus:border-[#f59e0b]/70 transition-colors placeholder:text-[#3d3a37]"

  return (
    <div className="flex flex-col gap-5">

      {/* Step indicator */}
      <div className="flex items-center gap-0">
        <div className="flex items-center gap-2">
          <div className={cn(
            "size-5 rounded-full text-[10px] font-bold flex items-center justify-center transition-all duration-300",
            step >= 1 ? "bg-[#f59e0b] text-[#0c0b0a]" : "border border-[#2c2824] text-[#3d3a37]"
          )}>1</div>
          <span className={cn("text-[11px] tracking-[0.06em] transition-colors", step === 1 ? "text-[#f5f0eb]" : "text-[#3d3a37]")}>Dados</span>
        </div>
        <div className="flex-1 mx-3 h-px bg-[#2c2824] relative overflow-hidden">
          <div className="absolute inset-y-0 left-0 bg-[#f59e0b] transition-all duration-500" style={{ right: step === 2 ? "0%" : "100%" }} />
        </div>
        <div className="flex items-center gap-2">
          <span className={cn("text-[11px] tracking-[0.06em] transition-colors", step === 2 ? "text-[#f5f0eb]" : "text-[#3d3a37]")}>Pagamento</span>
          <div className={cn(
            "size-5 rounded-full text-[10px] font-bold flex items-center justify-center transition-all duration-300",
            step >= 2 ? "bg-[#f59e0b] text-[#0c0b0a]" : "border border-[#2c2824] text-[#3d3a37]"
          )}>2</div>
        </div>
      </div>

      {/* Content */}
      <div
        className="transition-all duration-[180ms]"
        style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(5px)" }}
      >
        {/* Step 1 */}
        {step === 1 && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-[10px] uppercase tracking-[0.12em] text-[#6b6460] mb-1.5">Seu nome *</label>
              <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
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
                <select value={form.initiativeId} onChange={e => setForm(f => ({ ...f, initiativeId: e.target.value }))} className={field}>
                  <option value="">Onde for mais necessário</option>
                  {initiatives.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                </select>
              </div>
            )}
            {error && <p className="text-[12px] text-red-400">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full py-2.5 bg-[#f59e0b] text-[#0c0b0a] rounded-lg text-[13px] font-semibold hover:bg-[#d97706] disabled:opacity-60 transition-colors cursor-pointer flex items-center justify-center gap-2 mt-1">
              {loading
                ? <><span className="size-3.5 border-2 border-[#0c0b0a]/30 border-t-[#0c0b0a] rounded-full animate-spin" />Registrando...</>
                : <>Gerar cobrança PIX <span className="opacity-60">→</span></>}
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

            {pixPayload && (
              <div className="flex flex-col items-center gap-4 rounded-xl border border-[#2c2824] bg-[#0c0b0a] p-5">
                <div className="text-center">
                  <p className="text-[10px] uppercase tracking-[0.1em] text-[#6b6460] mb-1">Valor a pagar</p>
                  <p className="font-serif text-[26px] font-medium text-[#fcd34d]">
                    {confirmedAmount.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="bg-white p-3 rounded-xl" style={{ boxShadow: "0 0 32px color-mix(in oklch, #f59e0b 22%, transparent)" }}>
                  {qrDataUrl
                    ? <img src={qrDataUrl} width={148} height={148} alt="QR Code PIX" />
                    : <div className="size-[148px] flex items-center justify-center text-[10px] text-[#999]">Gerando...</div>
                  }
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
            )}

            {/* Agradecimento */}
            <div className="text-center space-y-1">
              <p className="text-[13px] text-[#f5f0eb] font-medium">Obrigado pela sua oferta! 🙏</p>
              <p className="text-[11px] text-[#6b6460] italic leading-relaxed max-w-xs mx-auto">
                &quot;Cada um dê conforme determinou em seu coração, não com pesar ou por obrigação, pois Deus ama quem dá com alegria.&quot;
              </p>
              <p className="text-[10px] text-[#3d3a37]">2 Coríntios 9:7</p>
            </div>

            {/* Mini recibo */}
            <div className="rounded-xl border border-[#2c2824] bg-[#0c0b0a] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] uppercase tracking-[0.12em] text-[#6b6460]">Comprovante de oferta</p>
                <button onClick={downloadReceipt} disabled={downloading}
                  className="flex items-center gap-1 text-[10px] text-[#6b6460] hover:text-[#9b9390] transition-colors cursor-pointer disabled:opacity-50">
                  <Download className="size-3" /> {downloading ? "Gerando..." : "Baixar PDF"}
                </button>
              </div>
              <div className="border-t border-dashed border-[#2c2824] pt-3 space-y-2">
                <div className="flex justify-between text-[12px]">
                  <span className="text-[#6b6460]">Ofertante</span>
                  <span className="text-[#f5f0eb] font-medium">{confirmedName}</span>
                </div>
                <div className="flex justify-between text-[12px]">
                  <span className="text-[#6b6460]">Projeto</span>
                  <span className="text-[#f5f0eb]">{projectName}</span>
                </div>
                <div className="flex justify-between text-[12px]">
                  <span className="text-[#6b6460]">Valor</span>
                  <span className="text-[#fcd34d] font-semibold font-serif">
                    {confirmedAmount.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-[12px]">
                  <span className="text-[#6b6460]">Data</span>
                  <span className="text-[#f5f0eb]">{new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                </div>
                <div className="flex justify-between text-[12px]">
                  <span className="text-[#6b6460]">Situação</span>
                  <span className="text-[#f59e0b]">Pendente — aguardando confirmação</span>
                </div>
              </div>
            </div>

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
