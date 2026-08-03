"use client"

import { useState, useMemo } from "react"
import { Copy, Check } from "lucide-react"
import QRCode from "react-qr-code"
import { buildPixPayload } from "@/lib/pix"

const MOCK_INITIATIVES = [
  { id: "1", name: "Campanha de Mídia Digital" },
  { id: "2", name: "Eventos e Mobilização" },
  { id: "3", name: "Material Gráfico" },
]

export default function PreviewPage() {
  const [pixKey, setPixKey]           = useState("contato@campanha.com.br")
  const [projectName, setProjectName] = useState("Campanha 2026")

  const [form, setForm]               = useState({ name: "", amount: "", initiativeId: "" })
  const [loading, setLoading]         = useState(false)
  const [confirmedAmount, setConfirmedAmount] = useState<number | null>(null)
  const [copiedPayload, setCopiedPayload]     = useState(false)

  const parsedAmount = Number(form.amount.replace(/\D/g, ""))
  const pixPayload   = useMemo(
    () => pixKey && confirmedAmount ? buildPixPayload(pixKey, projectName, confirmedAmount) : null,
    [pixKey, confirmedAmount, projectName],
  )

  function simulate(e: React.FormEvent) {
    e.preventDefault()
    if (!parsedAmount) return
    setLoading(true)
    setTimeout(() => { setLoading(false); setConfirmedAmount(parsedAmount) }, 800)
  }

  function reset() {
    setForm({ name: "", amount: "", initiativeId: "" })
    setConfirmedAmount(null)
  }

  const inputCls = "w-full px-3 py-2 text-[13px] bg-[#0c0b0a] border border-[#2c2824] rounded-lg text-[#f5f0eb] outline-none focus:border-[#f59e0b] transition-colors"

  return (
    <div className="min-h-screen bg-[#0c0b0a] text-[#f5f0eb] p-6 md:p-10">
      <div className="max-w-[900px] mx-auto space-y-8">

        <div>
          <div className="text-[11px] uppercase tracking-[0.14em] text-[#f59e0b] font-medium mb-1">Preview</div>
          <h1 className="text-[26px] font-semibold">Formulário de Oferta + QR Code PIX</h1>
          <p className="text-[13px] text-[#9b9390] mt-1">
            Fluxo: preenche formulário → sistema registra oferta como pendente → exibe QR para pagamento.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

          {/* Config */}
          <div className="bg-[#151413] border border-[#2c2824] rounded-2xl p-6 space-y-4">
            <h2 className="text-[15px] font-medium">Configuração da Organização</h2>
            <div>
              <label className="block text-[11px] text-[#9b9390] mb-1">Chave PIX</label>
              <input value={pixKey} onChange={e => { setPixKey(e.target.value); reset() }}
                placeholder="e-mail, CPF, CNPJ ou telefone" className={inputCls} />
            </div>
            <div>
              <label className="block text-[11px] text-[#9b9390] mb-1">Nome do Projeto</label>
              <input value={projectName} onChange={e => { setProjectName(e.target.value); reset() }}
                placeholder="Nome da campanha" className={inputCls} />
            </div>

            {pixPayload && (
              <div className="border-t border-[#2c2824] pt-4 space-y-2">
                <p className="text-[11px] text-[#9b9390] font-medium uppercase tracking-[0.1em]">Payload gerado</p>
                <div className="relative">
                  <code className="block text-[10px] text-[#6b6460] leading-relaxed break-all font-mono bg-[#0c0b0a] border border-[#2c2824] rounded-lg p-3 pr-10">
                    {pixPayload}
                  </code>
                  <button onClick={() => { navigator.clipboard?.writeText(pixPayload!); setCopiedPayload(true); setTimeout(() => setCopiedPayload(false), 2000) }}
                    className="absolute top-2 right-2 p-1.5 rounded border border-[#2c2824] text-[#6b6460] hover:bg-[#1c1a18] transition-colors">
                    {copiedPayload ? <Check className="size-3 text-[#22c55e]" /> : <Copy className="size-3" />}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Formulário — replica exato do portal público */}
          <div className="bg-[#151413] border border-[#2c2824] rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-[#f59e0b] text-[18px]">⬡</span>
              <span className="text-[16px] font-medium">Registrar oferta</span>
            </div>

            {/* Step 2 — QR gerado */}
            {confirmedAmount && pixPayload ? (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 text-[#22c55e]">
                  <Check className="size-4" />
                  <span className="text-[13px] font-medium">Oferta registrada — agora efetue o pagamento</span>
                </div>
                <div className="rounded-xl border border-[#2c2824] bg-[#0c0b0a] p-5 flex flex-col items-center gap-4">
                  <p className="text-[12px] text-[#9b9390] text-center">
                    Escaneie o QR Code no seu banco para pagar{" "}
                    <strong className="text-[#f5f0eb]">
                      {confirmedAmount.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 })}
                    </strong>
                  </p>
                  <div className="bg-white p-3 rounded-xl shadow-lg">
                    <QRCode value={pixPayload} size={160} />
                  </div>
                  <div className="w-full space-y-2">
                    <p className="text-[11px] text-[#6b6460] uppercase tracking-[0.08em]">Ou use copia e cola</p>
                    <div className="flex gap-2 items-stretch">
                      <code className="flex-1 px-3 py-2 rounded-lg bg-[#151413] border border-[#2c2824] text-[11px] break-all text-[#9b9390] leading-relaxed">
                        {pixPayload}
                      </code>
                      <button type="button" onClick={() => { navigator.clipboard?.writeText(pixPayload!); setCopiedPayload(true); setTimeout(() => setCopiedPayload(false), 2000) }}
                        className="px-3 rounded-lg border border-[#2c2824] text-[#9b9390] hover:bg-[#1c1a18] transition-colors flex flex-col items-center justify-center gap-1 cursor-pointer shrink-0">
                        {copiedPayload ? <Check className="size-3.5 text-[#22c55e]" /> : <Copy className="size-3.5" />}
                        <span className="text-[10px]">{copiedPayload ? "Copiado" : "Copiar"}</span>
                      </button>
                    </div>
                    <p className="text-[11px] text-[#6b6460]">Chave PIX: <span className="text-[#9b9390]">{pixKey}</span></p>
                  </div>
                </div>
                <p className="text-[12px] text-[#6b6460] leading-relaxed">
                  Oferta salva como <strong className="text-[#f5f0eb]">pendente</strong>. Após pagamento, o admin confirma em <strong className="text-[#f5f0eb]">/ofertas</strong>.
                </p>
                <button onClick={reset} className="self-start text-[12px] text-[#9b9390] hover:text-[#f5f0eb] transition-colors">
                  Registrar outra oferta
                </button>
              </div>
            ) : (
              /* Step 1 — formulário */
              <form onSubmit={simulate} className="flex flex-col gap-3">
                <div>
                  <label className="block text-[11px] text-[#9b9390] mb-1">Seu nome *</label>
                  <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Nome completo" className={inputCls} />
                </div>
                <div>
                  <label className="block text-[11px] text-[#9b9390] mb-1">Valor (R$) *</label>
                  <input required value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                    placeholder="Ex: 1200" className={inputCls} />
                  {parsedAmount > 0 && (
                    <p className="text-[11px] text-[#f59e0b] mt-0.5">
                      {parsedAmount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-[11px] text-[#9b9390] mb-1">Iniciativa</label>
                  <select value={form.initiativeId} onChange={e => setForm(f => ({ ...f, initiativeId: e.target.value }))} className={inputCls}>
                    <option value="">Onde for mais necessário</option>
                    {MOCK_INITIATIVES.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                  </select>
                </div>
                <button type="submit" disabled={loading || !parsedAmount}
                  className="self-start px-5 py-2 bg-[#f59e0b] text-[#0c0b0a] rounded-lg text-[13px] font-semibold hover:bg-[#d97706] disabled:opacity-60 transition-colors cursor-pointer">
                  {loading ? "Gerando..." : "Gerar cobrança PIX"}
                </button>
              </form>
            )}
          </div>
        </div>

        <p className="text-[11px] text-[#6b6460] text-center">
          Preview — o submit simula um delay de 800ms sem chamar a API. Remova após validação.
        </p>
      </div>
    </div>
  )
}
