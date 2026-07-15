import { cn } from "@/lib/utils"

export type BadgeVariant = "active" | "draft" | "completed" | "archived" | "warning" | "danger"

const styles: Record<BadgeVariant, string> = {
  active:    "bg-success/10 text-success",
  completed: "bg-blue-500/10 text-blue-400",
  draft:     "bg-muted text-muted-foreground",
  archived:  "bg-warning/10 text-warning",
  warning:   "bg-warning/10 text-warning",
  danger:    "bg-destructive/10 text-destructive",
}

export function Badge({
  variant = "draft",
  dot = true,
  className,
  children,
}: {
  variant?: BadgeVariant
  dot?: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium",
      styles[variant],
      className
    )}>
      {dot && <span className="size-1.5 rounded-full bg-current shrink-0" />}
      {children}
    </span>
  )
}
