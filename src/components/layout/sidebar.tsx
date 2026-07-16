"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  LayoutGrid,
  FolderKanban,
  Users,
  Settings,
  LogOut,
  Tag,
} from "lucide-react"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const NAV = [
  {
    section: "Principal",
    items: [
      { href: "/dashboard", label: "Dashboard",  Icon: LayoutGrid    },
      { href: "/projects",  label: "Projetos",   Icon: FolderKanban  },
    ],
  },
  {
    section: "Organização",
    items: [
      { href: "/users",                label: "Usuários",            Icon: Users    },
      { href: "/financial-categories", label: "Cat. Financeiras",    Icon: Tag      },
      { href: "/settings",             label: "Configurações",       Icon: Settings },
    ],
  },
]

type StoredUser = { name: string; email: string; role: string }

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<StoredUser | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem("user")
      if (raw) setUser(JSON.parse(raw))
    } catch {}
  }, [])

  async function logout() {
    await fetch("/api/v1/auth/logout", { method: "POST" })
    localStorage.removeItem("access_token")
    localStorage.removeItem("user")
    router.push("/login")
  }

  const initials = user?.name
    ? user.name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()
    : "?"

  return (
    <aside className="w-[220px] shrink-0 fixed top-0 left-0 bottom-0 z-30 flex flex-col bg-card border-r border-border">
      {/* Logo */}
      <div className="flex items-center gap-2 px-3 h-14 border-b border-border">
        <div className="size-[26px] bg-primary rounded-[6px] grid place-items-center shrink-0">
          <svg viewBox="0 0 24 24" className="size-3.5 fill-white">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
        </div>
        <span className="text-[13px] font-semibold tracking-tight">GestãoProjetos</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {NAV.map(({ section, items }) => (
          <div key={section}>
            <p className="text-[10px] font-medium uppercase tracking-[.08em] text-text-subtle px-2.5 mb-1.5">
              {section}
            </p>
            <div className="space-y-0.5">
              {items.map(({ href, label, Icon }) => {
                const active = pathname === href || pathname.startsWith(href + "/")
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "flex items-center gap-2.5 px-2.5 py-[7px] rounded-md text-[13px] transition-colors duration-150 cursor-pointer",
                      active
                        ? "bg-accent text-accent-foreground font-medium"
                        : "text-muted-foreground hover:bg-surface-2 hover:text-foreground",
                    )}
                  >
                    <Icon className="size-[15px] shrink-0" />
                    {label}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User block */}
      <div className="border-t border-border p-3 space-y-1">
        {user && (
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-md">
            <div className="size-7 rounded-full bg-primary grid place-items-center text-[11px] font-semibold text-white shrink-0">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-medium truncate leading-tight">{user.name}</p>
              <p className="text-[11px] text-text-subtle capitalize leading-tight">
                {user.role.charAt(0) + user.role.slice(1).toLowerCase()}
              </p>
            </div>
          </div>
        )}

        <ConfirmDialog
          trigger={
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
            >
              <LogOut className="size-4" />
              Sair
            </Button>
          }
          title="Sair da conta?"
          description="Você será redirecionado para a página de login."
          confirmLabel="Sair"
          onConfirm={logout}
        />
      </div>
    </aside>
  )
}
