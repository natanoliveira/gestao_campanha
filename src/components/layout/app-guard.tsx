"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"

export function AppGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem("user") ?? "{}")
      const selectedOrgId = localStorage.getItem("selectedOrgId")
      const isMasterRoute = pathname.startsWith("/master")

      if (user?.isMaster && !selectedOrgId && !isMasterRoute) {
        router.replace("/master/organizacoes")
      }
    } catch {}
  }, [pathname, router])

  return <>{children}</>
}
