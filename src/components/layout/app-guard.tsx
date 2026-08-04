"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { touchActivity } from "@/lib/fetch-with-auth"

const IDLE_MS = 30 * 60 * 1000;

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

  useEffect(() => {
    if (!localStorage.getItem("lastActivity")) touchActivity();

    const EVENTS = ["click", "keydown", "touchstart", "scroll"] as const;
    EVENTS.forEach(e => window.addEventListener(e, touchActivity, { passive: true }));

    const interval = setInterval(() => {
      const last = Number(localStorage.getItem("lastActivity") ?? 0);
      if (last > 0 && Date.now() - last > IDLE_MS) {
        window.location.replace("/session-expired");
      }
    }, 60_000);

    return () => {
      EVENTS.forEach(e => window.removeEventListener(e, touchActivity));
      clearInterval(interval);
    };
  }, []);

  return <>{children}</>
}
