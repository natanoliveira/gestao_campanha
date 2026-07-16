"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Dialog } from "@base-ui/react/dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { fetchWithAuth } from "@/lib/fetch-with-auth";

type CategoryType = "ENTRY" | "EXIT";
type Category = { id: string; name: string; type: CategoryType; createdAt: string };

const inputCls = "w-full h-8 px-3 text-[13px] bg-background border border-border rounded-lg text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 transition-colors";
const dialogPopupCls = "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-card border border-border rounded-xl shadow-xl w-full max-w-sm p-5 outline-none";
const overlayBackdropCls = "fixed inset-0 z-40 bg-black/40 backdrop-blur-sm";

function currentRole(): string { try { return JSON.parse(localStorage.getItem("user") ?? "{}").role ?? ""; } catch { return ""; } }

const TABS: { id: CategoryType; label: string }[] = [
  { id: "ENTRY", label: "Entradas" },
  { id: "EXIT",  label: "Despesas" },
];

export default function FinancialCategoriesPage() {
  const [tab, setTab]           = useState<CategoryType>("ENTRY");
  const [cats, setCats]         = useState<Category[]>([]);
  const [loading, setLoading]   = useState(true);
  const [modalOpen, setModal]   = useState(false);
  const [editing, setEditing]   = useState<Category | null>(null);
  const [name, setName]         = useState("");
  const [saving, setSaving]     = useState(false);
  const role                    = currentRole();
  const canManage               = role === "ADMIN" || role === "MANAGER";

  const load = useCallback(() => {
    setLoading(true);
    fetchWithAuth(`/api/v1/financial-categories?type=${tab}`)
      .then((r) => r.json())
      .then((d) => { setCats(Array.isArray(d) ? d : []); setLoading(false); });
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  function openCreate() { setEditing(null); setName(""); setModal(true); }
  function openEdit(cat: Category) { setEditing(cat); setName(cat.name); setModal(true); }

  async function submit(e: React.SyntheticEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    if (editing) {
      await fetchWithAuth(`/api/v1/financial-categories/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
    } else {
      await fetchWithAuth("/api/v1/financial-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, type: tab }),
      });
    }
    setSaving(false);
    setModal(false);
    load();
  }

  async function deleteCategory(cat: Category) {
    await fetchWithAuth(`/api/v1/financial-categories/${cat.id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="px-7 py-6">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-[18px] font-semibold">Categorias Financeiras</h1>
        {canManage && (
          <button onClick={openCreate} className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] bg-primary text-primary-foreground rounded-lg cursor-pointer">
            <Plus className="size-3.5" /> Nova Categoria
          </button>
        )}
      </div>

      <div className="flex gap-0 border-b border-border mb-5">
        {TABS.map(({ id, label }) => (
          <button key={id} onClick={() => setTab(id)}
            className={cn("px-4 py-2.5 text-[13px] border-b-2 -mb-px transition-colors cursor-pointer",
              tab === id ? "text-foreground border-primary" : "text-muted-foreground border-transparent hover:text-foreground")}>
            {label}
          </button>
        ))}
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-border bg-surface-2">
              <th className="text-left px-4 py-2.5 text-text-subtle font-medium">Nome</th>
              <th className="text-left px-4 py-2.5 text-text-subtle font-medium">Criado em</th>
              {canManage && <th className="px-4 py-2.5 w-20" />}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={canManage ? 3 : 2} className="px-4 py-6 text-center"><Spinner className="size-4 mx-auto" /></td></tr>
            )}
            {!loading && cats.length === 0 && (
              <tr><td colSpan={canManage ? 3 : 2} className="px-4 py-6 text-center text-muted-foreground">Nenhuma categoria cadastrada.</td></tr>
            )}
            {cats.map((cat) => (
              <tr key={cat.id} className="border-b border-border last:border-0 hover:bg-surface-2/50">
                <td className="px-4 py-3 font-medium">{cat.name}</td>
                <td className="px-4 py-3 text-text-subtle">{new Date(cat.createdAt).toLocaleDateString("pt-BR")}</td>
                {canManage && (
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(cat)} className="text-muted-foreground hover:text-foreground cursor-pointer"><Pencil className="size-3.5" /></button>
                      {role === "ADMIN" && (
                        <ConfirmDialog
                          trigger={
                            <button className="text-destructive hover:opacity-80 cursor-pointer">
                              <Trash2 className="size-3.5" />
                            </button>
                          }
                          title="Excluir categoria"
                          description={`Deseja excluir "${cat.name}"? Lançamentos vinculados ficarão sem categoria.`}
                          confirmLabel="Excluir"
                          variant="destructive"
                          onConfirm={() => deleteCategory(cat)}
                        />
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog.Root open={modalOpen} onOpenChange={setModal}>
        <Dialog.Portal>
          <Dialog.Backdrop className={overlayBackdropCls} />
          <Dialog.Popup className={dialogPopupCls}>
            <Dialog.Title className="text-[15px] font-semibold mb-4">
              {editing ? "Editar Categoria" : `Nova Categoria de ${tab === "ENTRY" ? "Entrada" : "Despesa"}`}
            </Dialog.Title>
            <form onSubmit={submit} className="space-y-3">
              <div>
                <label className="text-[11px] text-text-subtle mb-1 block">Nome *</label>
                <input className={inputCls} placeholder="Ex: Dízimo, Oferta, Material..." value={name}
                  onChange={(e) => setName(e.target.value)} required autoFocus />
              </div>
              <div className="flex gap-2 pt-1">
                <button type="submit" disabled={saving || !name.trim()}
                  className="px-3 py-1.5 text-[12px] bg-primary text-primary-foreground rounded-lg disabled:opacity-50 cursor-pointer">
                  {saving ? <Spinner className="size-3.5" /> : editing ? "Salvar" : "Criar"}
                </button>
                <Dialog.Close render={
                  <button type="button" className="px-3 py-1.5 text-[12px] border border-border rounded-lg cursor-pointer">Cancelar</button>
                } />
              </div>
            </form>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
