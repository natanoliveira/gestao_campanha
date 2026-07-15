import { type LucideIcon } from "lucide-react"

export function FeedItem({
  Icon,
  author,
  time,
  text,
}: {
  Icon: LucideIcon
  author?: string
  time: string
  text: string
}) {
  return (
    <div className="flex gap-3 py-3.5 border-b border-border last:border-0">
      <div className="size-7 rounded-full bg-surface-2 border border-border grid place-items-center shrink-0 mt-0.5">
        <Icon className="size-[13px] text-muted-foreground" />
      </div>
      <div>
        <p className="text-[11px] text-text-subtle mb-0.5">
          {author && <span className="text-muted-foreground">{author}</span>}
          {author && " · "}
          {time}
        </p>
        <p className="text-[13px] text-foreground">{text}</p>
      </div>
    </div>
  )
}
