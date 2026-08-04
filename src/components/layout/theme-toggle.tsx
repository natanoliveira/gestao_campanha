"use client"

import { useState, useEffect } from "react"
import { Sun, Moon } from "lucide-react"
import { toggleTheme } from "@/lib/theme"

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(true)

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"))
  }, [])

  function handleToggle() {
    toggleTheme()
    setIsDark((d) => !d)
  }

  return (
    <button
      onClick={handleToggle}
      className="p-1.5 rounded-md text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
      title={isDark ? "Mudar para tema claro" : "Mudar para tema escuro"}
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  )
}
