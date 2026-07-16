"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Spinner } from "@/components/ui/spinner"
import { fetchWithAuth } from "@/lib/fetch-with-auth"

type Status = "DRAFT" | "ACTIVE" | "COMPLETED" | "ARCHIVED"

const inputCls    = "w-full h-9 px-3 text-[13px] bg-background border border-border rounded-lg text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20 transition-colors"
const selectCls   = "w-full h-9 px-3 text-[13px] bg-background border border-border rounded-lg text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20 cursor-pointer"
const textareaCls = "w-full px-3 py-2 text-[13px] bg-background border border-border rounded-lg text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20 transition-colors resize-none"

function FieldLabel({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return <label htmlFor={htmlFor} className="block text-[12px] font-medium text-muted-foreground mb-1">{children}</label>
}

function toSlug(v: string) {
  return v
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

export default function NewProjectPage() {
  const router = useRouter()
  const [name, setName]             = useState("")
  const [description, setDesc]      = useState("")
  const [status, setStatus]         = useState<Status>("DRAFT")
  const [isPublic, setIsPublic]     = useState(false)
  const [publicSlug, setSlug]       = useState("")
  const [slugEdited, setSlugEdited] = useState(false)
  const [startDate, setStartDate]   = useState("")
  const [endDate, setEndDate]       = useState("")
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError(null)
    try {
      const body: Record<string, unknown> = { name, status, isPublic }
      if (description)          body.description = description
      if (isPublic && publicSlug) body.publicSlug = publicSlug
      if (startDate)            body.startDate = new Date(startDate).toISOString()
      if (endDate)              body.endDate   = new Date(endDate).toISOString()

      const res   = await fetchWithAuth("/api/v1/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message ?? "Erro ao criar projeto")
      router.push(`/projects/${data.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocorreu um erro")
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex items-center justify-between px-7 py-5 border-b border-border">
        <div>
          <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground mb-1">
            <Link href="/projects" className="hover:text-foreground transition-colors">Projetos</Link>
            <span>/</span>
            <span className="text-foreground">Novo</span>
          </div>
          <h1 className="text-[18px] font-semibold font-sans">Novo Projeto</h1>
        </div>
      </div>

      <div className="p-7 max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <FieldLabel htmlFor="proj-name">Nome *</FieldLabel>
            <input
              id="proj-name" name="name"
              required minLength={3} maxLength={120}
              autoComplete="off"
              value={name}
              onChange={e => { setName(e.target.value); if (!slugEdited) setSlug(toSlug(e.target.value)); }}
              placeholder="Nome do projeto…"
              className={inputCls}
            />
            {toSlug(name) && (
              <p className="text-[11px] text-muted-foreground mt-1">
                Slug: <span className="font-mono">{toSlug(name)}</span>
              </p>
            )}
          </div>

          <div>
            <FieldLabel htmlFor="proj-desc">Descrição</FieldLabel>
            <textarea
              id="proj-desc" name="description"
              rows={3} maxLength={500}
              value={description} onChange={e => setDesc(e.target.value)}
              placeholder="Descreva o projeto…"
              className={textareaCls}
            />
          </div>

          <div>
            <FieldLabel htmlFor="proj-status">Status</FieldLabel>
            <select id="proj-status" name="status" value={status} onChange={e => setStatus(e.target.value as Status)} className={selectCls}>
              <option value="DRAFT">Rascunho</option>
              <option value="ACTIVE">Ativo</option>
              <option value="COMPLETED">Concluído</option>
              <option value="ARCHIVED">Arquivado</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel htmlFor="proj-start">Data de início</FieldLabel>
              <input id="proj-start" name="startDate" type="date" autoComplete="off" value={startDate} onChange={e => setStartDate(e.target.value)} className={inputCls} />
            </div>
            <div>
              <FieldLabel htmlFor="proj-end">Data de fim</FieldLabel>
              <input id="proj-end" name="endDate" type="date" autoComplete="off" value={endDate} onChange={e => setEndDate(e.target.value)} className={inputCls} />
            </div>
          </div>

          <label className="flex items-center gap-2 text-[13px] text-muted-foreground cursor-pointer select-none">
            <input
              type="checkbox" checked={isPublic}
              onChange={e => { setIsPublic(e.target.checked); if (e.target.checked && !slugEdited) setSlug(toSlug(name)); }}
              className="accent-primary"
            />
            Portal público
          </label>

          {isPublic && (
            <div>
              <FieldLabel>Slug público</FieldLabel>
              <input
                id="proj-slug" name="publicSlug"
                value={publicSlug}
                onChange={e => { setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-")); setSlugEdited(true); }}
                placeholder="ex: campanha-2025…"
                pattern="^[a-z0-9-]+$"
                autoComplete="off"
                spellCheck={false}
                required
                className={inputCls}
              />
              <p className="text-[11px] text-muted-foreground mt-1">Apenas letras minúsculas, números e hífens.</p>
            </div>
          )}

          {error && (
            <p className="text-xs text-destructive bg-destructive/10 rounded px-3 py-2">{error}</p>
          )}

          <div className="flex gap-2 pt-1">
            <Link
              href="/projects"
              className="h-8 px-4 rounded-lg border border-border text-[13px] text-foreground hover:bg-surface-2 transition-colors flex items-center"
            >
              Cancelar
            </Link>
            <button
              type="submit" disabled={loading}
              className="h-8 px-4 rounded-lg bg-primary text-white text-[13px] font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 min-w-20 flex items-center justify-center"
            >
              {loading ? <Spinner size="sm" /> : "Criar Projeto"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
