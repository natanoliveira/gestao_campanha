export type Theme = "dark" | "light"

export function getTheme(): Theme {
  if (typeof window === "undefined") return "dark"
  return (localStorage.getItem("theme") as Theme) ?? "dark"
}

export function setTheme(theme: Theme) {
  localStorage.setItem("theme", theme)
  document.documentElement.classList.toggle("dark", theme === "dark")
}

export function toggleTheme() {
  const next = document.documentElement.classList.contains("dark") ? "light" : "dark"
  setTheme(next)
}
