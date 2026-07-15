import { Sidebar } from "@/components/layout/sidebar"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      {/* offset main content by sidebar width */}
      <main className="flex-1 min-h-screen overflow-y-auto ml-[220px]">
        {children}
      </main>
    </div>
  )
}
