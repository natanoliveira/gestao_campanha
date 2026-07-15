import { cn } from "@/lib/utils"

const fills = {
  default: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
}

export function ProgressBar({
  value,
  variant = "default",
  className,
}: {
  value: number
  variant?: keyof typeof fills
  className?: string
}) {
  return (
    <div className={cn("h-[5px] rounded-full bg-border overflow-hidden", className)}>
      <div
        className={cn("h-full rounded-full", fills[variant])}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  )
}
