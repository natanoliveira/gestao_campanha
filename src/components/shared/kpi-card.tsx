import { cn } from "@/lib/utils"

export function KPICard({
  label,
  value,
  delta,
}: {
  label: string
  value: string | number
  delta?: { label: string; direction: "up" | "down" | "neutral" }
}) {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <p className="text-xs text-muted-foreground mb-1.5">{label}</p>
      <p className="text-[22px] font-semibold leading-none">{value}</p>
      {delta && (
        <p className={cn(
          "text-[11px] mt-1.5",
          delta.direction === "up"      && "text-success",
          delta.direction === "down"    && "text-destructive",
          delta.direction === "neutral" && "text-muted-foreground",
        )}>
          {delta.label}
        </p>
      )}
    </div>
  )
}
