import { Sidebar } from "@/components/layout/sidebar"
import { AppGuard } from "@/components/layout/app-guard"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 min-h-screen overflow-y-auto ml-[220px]">
        <AppGuard>{children}</AppGuard>
      </main>
    </div>
  )
}
