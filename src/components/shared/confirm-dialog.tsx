"use client"

import { useState } from "react"
import { Dialog } from "@base-ui/react/dialog"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

export interface ConfirmDialogProps {
  trigger: React.ReactElement
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: "default" | "destructive"
  onConfirm: () => Promise<void>
}

export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  variant = "default",
  onConfirm,
}: ConfirmDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleConfirm() {
    setLoading(true)
    setError(null)
    try {
      await onConfirm()
      setOpen(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ocorreu um erro. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  function handleOpenChange(next: boolean) {
    if (loading) return
    if (!next) setError(null)
    setOpen(next)
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Trigger render={trigger} />

      <Dialog.Portal>
        <Dialog.Backdrop
          className={cn(
            "fixed inset-0 bg-black/50 z-40",
            "transition-opacity duration-200",
            "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0",
          )}
        />
        <Dialog.Popup
          className={cn(
            "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50",
            "w-full max-w-sm bg-card border border-border rounded-lg p-6",
            "shadow-[0_10px_40px_rgba(0,0,0,.5)]",
            "transition-all duration-200",
            "data-[starting-style]:opacity-0 data-[starting-style]:scale-95",
            "data-[ending-style]:opacity-0 data-[ending-style]:scale-95",
          )}
        >
          <Dialog.Title className="text-base font-semibold text-foreground mb-1 font-sans">
            {title}
          </Dialog.Title>

          {description && (
            <Dialog.Description className="text-sm text-muted-foreground mb-5">
              {description}
            </Dialog.Description>
          )}

          {error && (
            <p className="text-xs text-destructive mb-4 bg-destructive/10 rounded px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-2 justify-end mt-5">
            <Dialog.Close
              render={
                <Button variant="outline" size="sm" disabled={loading}>
                  {cancelLabel}
                </Button>
              }
            />
            <Button
              variant={variant === "destructive" ? "destructive" : "default"}
              size="sm"
              disabled={loading}
              onClick={handleConfirm}
              className="min-w-20"
            >
              {loading ? <Spinner size="sm" /> : confirmLabel}
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
