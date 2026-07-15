"use client"

import { Drawer } from "@base-ui/react/drawer"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface AppDrawerProps {
  trigger?: React.ReactElement
  title: string
  description?: string
  children: React.ReactNode
  width?: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function AppDrawer({
  trigger,
  title,
  description,
  children,
  width = "480px",
  open,
  onOpenChange,
}: AppDrawerProps) {
  return (
    <Drawer.Root swipeDirection="right" open={open} onOpenChange={onOpenChange}>
      {trigger && <Drawer.Trigger render={trigger} />}

      <Drawer.Portal>
        <Drawer.Backdrop
          className={cn(
            "fixed inset-0 bg-black/50 z-40",
            "transition-opacity duration-300",
            "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0",
          )}
        />
        <Drawer.Popup
          style={{ width, maxWidth: "90vw" }}
          className={cn(
            "fixed right-0 top-0 bottom-0 z-50 flex flex-col",
            "bg-card border-l border-border",
            "shadow-[-10px_0_40px_rgba(0,0,0,.4)]",
            "transition-transform duration-300 ease-out",
            "data-[starting-style]:translate-x-full data-[ending-style]:translate-x-full",
          )}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-border shrink-0">
            <div>
              <h2 className="text-base font-semibold text-foreground font-sans">{title}</h2>
              {description && (
                <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
              )}
            </div>
            <Drawer.Close
              render={
                <Button variant="ghost" size="icon" className="shrink-0 -mr-1 -mt-1">
                  <X className="size-4" />
                </Button>
              }
            />
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {children}
          </div>
        </Drawer.Popup>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
