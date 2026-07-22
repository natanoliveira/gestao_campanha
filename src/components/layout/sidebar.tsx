"use client"

import { useEffect, useState, useRef } from "react"
import { usePathname } from "next/navigation"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  LayoutGrid,
  FolderKanban,
  Settings,
  LogOut,
  ChevronDown,
  Building2,
  CreditCard,
} from "lucide-react"
import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { fetchWithAuth } from "@/lib/fetch-with-auth"

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
      { href: "/configuracoes", label: "Configurações", Icon: Settings },
    ],
  },
  {
    section: "Sistema",
    isMasterOnly: true,
    items: [
      { href: "/master/organizacoes", label: "Organizações", Icon: Building2 },
      { href: "/master/planos",       label: "Planos",       Icon: CreditCard },
    ],
  },
]

type StoredUser = { name: string; email: string; role: string; isMaster?: boolean }
type Org = { id: string; name: string; slug: string; plan: { name: string } }

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<StoredUser | null>(null)
  const [isMaster, setIsMaster] = useState(false)
  const [selectedOrgId, setSelectedOrgId]   = useState<string | null>(null)
  const [selectedOrgName, setSelectedOrgName] = useState<string | null>(null)
  const [orgs, setOrgs]           = useState<Org[]>([])
  const [orgSearch, setOrgSearch] = useState("")
  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem("user")
      if (raw) {
        const u = JSON.parse(raw)
        setUser(u)
        if (u.isMaster) {
          setIsMaster(true)
          setSelectedOrgId(localStorage.getItem("selectedOrgId"))
          setSelectedOrgName(localStorage.getItem("selectedOrgName"))
          fetchWithAuth("/api/v1/master/organizations")
            .then((r) => r.json())
            .then((d) => setOrgs(d.data ?? []))
        }
      }
    } catch {}
  }, [])

  // re-read selectedOrg when it changes from outside
  useEffect(() => {
    function onOrgChanged() {
      setSelectedOrgId(localStorage.getItem("selectedOrgId"))
      setSelectedOrgName(localStorage.getItem("selectedOrgName"))
    }
    window.addEventListener("orgChanged", onOrgChanged)
    return () => window.removeEventListener("orgChanged", onOrgChanged)
  }, [])

  // reload org list when a new org is created
  useEffect(() => {
    if (!isMaster) return
    function onOrgsUpdated() {
      fetchWithAuth("/api/v1/master/organizations")
        .then((r) => r.json())
        .then((d) => setOrgs(d.data ?? []))
    }
    window.addEventListener("orgsUpdated", onOrgsUpdated)
    return () => window.removeEventListener("orgsUpdated", onOrgsUpdated)
  }, [isMaster])

  // close dropdown on outside click
  useEffect(() => {
    if (!orgDropdownOpen) return
    function onMouseDown(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOrgDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", onMouseDown)
    return () => document.removeEventListener("mousedown", onMouseDown)
  }, [orgDropdownOpen])

  function selectOrg(org: Org) {
    localStorage.setItem("selectedOrgId", org.id)
    localStorage.setItem("selectedOrgName", org.name)
    localStorage.setItem("selectedOrgPlan", org.plan?.name ?? "")
    setSelectedOrgId(org.id)
    setSelectedOrgName(org.name)
    setOrgDropdownOpen(false)
    window.dispatchEvent(new Event("orgChanged"))
  }

  async function logout() {
    await fetch("/api/v1/auth/logout", { method: "POST" })
    localStorage.removeItem("access_token")
    localStorage.removeItem("user")
    localStorage.removeItem("selectedOrgId")
    localStorage.removeItem("selectedOrgName")
    localStorage.removeItem("selectedOrgPlan")
    router.push("/login")
  }

  const initials = user?.name
    ? user.name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()
    : "?"

  const orgInitials = selectedOrgName
    ? selectedOrgName.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()
    : "?"

  const filteredOrgs = orgs.filter((o) =>
    o.name.toLowerCase().includes(orgSearch.toLowerCase())
  )

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

      {/* Org Switcher — master only */}
      {isMaster && (
        <div className="pt-3 pb-1 relative" ref={dropdownRef}>
          <button
            onClick={() => setOrgDropdownOpen((v) => !v)}
            className="w-full flex items-center gap-2 px-3 py-2 mx-3 rounded-lg bg-surface-2 hover:bg-border transition-colors text-[12px]"
            style={{ width: "calc(100% - 24px)" }}
          >
            <span className="size-6 rounded-md bg-surface-2 border border-border grid place-items-center text-[10px] font-semibold text-foreground shrink-0">
              {selectedOrgName ? orgInitials : "—"}
            </span>
            <span className="flex-1 text-left truncate text-foreground">
              {selectedOrgName ?? "Selecionar organização"}
            </span>
            <ChevronDown className="size-3.5 text-muted-foreground shrink-0" />
          </button>

          {selectedOrgId && selectedOrgName && (
            <div className="mx-3 mb-1 mt-1.5 px-2.5 py-1.5 rounded-md bg-warning/10 border border-warning/20 text-[11px] text-warning">
              Visualizando como org: <span className="font-medium">{selectedOrgName.split(" ")[0]}</span>
            </div>
          )}

          {orgDropdownOpen && (
            <div className="absolute left-3 right-3 top-full mt-1 bg-card border border-border rounded-lg shadow-xl z-50 p-1.5">
              <input
                autoFocus
                value={orgSearch}
                onChange={(e) => setOrgSearch(e.target.value)}
                placeholder="Buscar organização..."
                className="w-full h-7 px-2 mb-1 text-[12px] bg-background border border-border rounded-md text-foreground outline-none focus:border-ring"
              />
              <div className="max-h-48 overflow-y-auto space-y-0.5">
                {filteredOrgs.length === 0 && (
                  <p className="px-2 py-3 text-[12px] text-muted-foreground text-center">Nenhuma org encontrada</p>
                )}
                {filteredOrgs.map((org) => (
                  <button
                    key={org.id}
                    onClick={() => selectOrg(org)}
                    className={cn(
                      "w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-[12px] hover:bg-surface-2 text-left",
                      selectedOrgId === org.id && "bg-surface-2"
                    )}
                  >
                    <span className="size-5 rounded bg-primary/20 grid place-items-center text-[9px] font-semibold text-primary shrink-0">
                      {org.name[0]?.toUpperCase()}
                    </span>
                    <span className="flex-1 truncate text-foreground">{org.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary shrink-0">
                      {org.plan?.name ?? "—"}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {NAV.filter((s) => !s.isMasterOnly || isMaster).map(({ section, items }) => (
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
                {isMaster ? "Master" : user.role.charAt(0) + user.role.slice(1).toLowerCase()}
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
