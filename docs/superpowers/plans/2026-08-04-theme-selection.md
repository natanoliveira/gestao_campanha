# Theme Selection (Dark/Light) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar toggle de tema claro/escuro com persistência em localStorage, sem flash no carregamento.

**Architecture:** CSS vars no `:root` definem o tema claro (Slate frio). A classe `.dark` no `<html>` sobrescreve para Charcoal/Amber. Um `<script>` inline no `<head>` aplica a classe antes da hidratação React. O componente `ThemeToggle` lê a classe do DOM e a alterna.

**Tech Stack:** Tailwind v4 (`@custom-variant dark (&:is(.dark *))` já configurado), localStorage, React `useEffect` para leitura client-side.

## Global Constraints

- Tema padrão: escuro (`.dark` aplicado quando não há preferência salva)
- Sem mudança de schema de banco de dados — localStorage only
- `@custom-variant dark (&:is(.dark *))` já existe em `globals.css` linha 4 — não alterar
- Next.js 16 App Router — `"use client"` deve ser a primeira linha de arquivos client
- Nenhum novo pacote — usar apenas Lucide React (já instalado)

---

### Task 1: CSS Variables — `:root` = claro, `.dark` = escuro

**Files:**
- Modify: `src/app/globals.css:62-118`

**Interfaces:**
- Produces: variáveis CSS disponíveis globalmente nos dois temas

- [ ] **Step 1: Substituir o bloco `:root` atual em `globals.css`**

Localizar o bloco `:root { /* ─── DARK THEME ... */` (linhas 62–118) e substituir pelo seguinte (`:root` = Slate claro, `.dark` = Charcoal/Amber atual):

```css
:root {
  /* ─── LIGHT THEME — Slate frio ─── */
  --background:  #f1f5f9;
  --foreground:  #0f172a;

  --card:             #ffffff;
  --card-foreground:  #0f172a;

  --popover:             #ffffff;
  --popover-foreground:  #0f172a;

  --primary:             #f59e0b;
  --primary-foreground:  #0c0b0a;

  --secondary:             #e2e8f0;
  --secondary-foreground:  #0f172a;

  --muted:             #e2e8f0;
  --muted-foreground:  #64748b;

  --accent:             rgba(245, 158, 11, 0.10);
  --accent-foreground:  #d97706;

  --destructive:  #ef4444;

  --border:  #e2e8f0;
  --input:   #e2e8f0;
  --ring:    #f59e0b;

  --radius: 0.5rem;

  --surface-2:     #f8fafc;
  --text-subtle:   #94a3b8;
  --success:       #22c55e;
  --warning:       #fbbf24;
  --accent-hover:  #d97706;

  --sidebar:                    #ffffff;
  --sidebar-foreground:         #64748b;
  --sidebar-primary:            #f59e0b;
  --sidebar-primary-foreground: #0c0b0a;
  --sidebar-accent:             #f1f5f9;
  --sidebar-accent-foreground:  #0f172a;
  --sidebar-border:             #e2e8f0;
  --sidebar-ring:               #f59e0b;

  --chart-1: #f59e0b;
  --chart-2: #e8532a;
  --chart-3: #22c55e;
  --chart-4: #3b82f6;
  --chart-5: #ef4444;
}

.dark {
  /* ─── DARK THEME — Charcoal/Amber ─── */
  --background:  #0c0b0a;
  --foreground:  #f5f0eb;

  --card:             #151413;
  --card-foreground:  #f5f0eb;

  --popover:             #151413;
  --popover-foreground:  #f5f0eb;

  --primary:             #f59e0b;
  --primary-foreground:  #0c0b0a;

  --secondary:             #1c1a18;
  --secondary-foreground:  #f5f0eb;

  --muted:             #1c1a18;
  --muted-foreground:  #8a8078;

  --accent:             rgba(245, 158, 11, 0.08);
  --accent-foreground:  #f59e0b;

  --destructive:  #ef4444;

  --border:  #2c2824;
  --input:   #2c2824;
  --ring:    #f59e0b;

  --radius: 0.5rem;

  --surface-2:     #1c1a18;
  --text-subtle:   #6b6460;
  --success:       #22c55e;
  --warning:       #fbbf24;
  --accent-hover:  #d97706;

  --sidebar:                    #151413;
  --sidebar-foreground:         #8a8078;
  --sidebar-primary:            #f59e0b;
  --sidebar-primary-foreground: #0c0b0a;
  --sidebar-accent:             #1c1a18;
  --sidebar-accent-foreground:  #f5f0eb;
  --sidebar-border:             #2c2824;
  --sidebar-ring:               #f59e0b;

  --chart-1: #f59e0b;
  --chart-2: #e8532a;
  --chart-3: #22c55e;
  --chart-4: #3b82f6;
  --chart-5: #ef4444;
}
```

- [ ] **Step 2: Verificar que `@custom-variant dark` continua na linha 4**

```bash
grep -n "custom-variant dark" src/app/globals.css
```
Esperado: `4:@custom-variant dark (&:is(.dark *));`

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "style: separate CSS vars into :root (light) and .dark (dark) for theme switching"
```

---

### Task 2: `src/lib/theme.ts` — utilitários de tema

**Files:**
- Create: `src/lib/theme.ts`

**Interfaces:**
- Produces:
  - `type Theme = "dark" | "light"`
  - `getTheme(): Theme` — lê localStorage (SSR-safe, default "dark")
  - `setTheme(theme: Theme): void` — salva localStorage + alterna classe `.dark` no `<html>`
  - `toggleTheme(): void` — inverte tema atual

- [ ] **Step 1: Criar o arquivo**

```ts
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
```

- [ ] **Step 2: Verificar que não há erro de tipo**

```bash
npx tsc --noEmit 2>&1 | grep theme
```
Esperado: sem saída (sem erros).

- [ ] **Step 3: Commit**

```bash
git add src/lib/theme.ts
git commit -m "feat: add theme utility (getTheme, setTheme, toggleTheme)"
```

---

### Task 3: `src/components/layout/theme-toggle.tsx` — botão Sun/Moon

**Files:**
- Create: `src/components/layout/theme-toggle.tsx`

**Interfaces:**
- Consumes: `toggleTheme` de `@/lib/theme`
- Produces: `<ThemeToggle />` — client component exportado por nome

- [ ] **Step 1: Criar o componente**

```tsx
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
```

- [ ] **Step 2: Verificar que não há erro de tipo**

```bash
npx tsc --noEmit 2>&1 | grep theme-toggle
```
Esperado: sem saída.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/theme-toggle.tsx
git commit -m "feat: add ThemeToggle component (Sun/Moon button)"
```

---

### Task 4: `src/app/layout.tsx` — script anti-flash + classe `dark` inicial

**Files:**
- Modify: `src/app/layout.tsx`

**Interfaces:**
- Consumes: nada (script inline, sem imports)
- Produces: `<html>` com classe `dark` inicial + `<script>` que lê localStorage antes da hidratação

**Por que:** Sem o script, ao carregar a página em tema claro o `:root` seria aplicado primeiro, causando flash branco antes da hidratação do React. O script inline roda síncrono, antes de qualquer CSS ser pintado.

- [ ] **Step 1: Modificar `layout.tsx`**

Localizar a tag `<html>` (linha 29) e adicionar:
1. A classe `dark` à lista de classes existentes (padrão escuro)
2. O `<script>` anti-flash como primeiro filho do `<html>` (antes de `<body>`)

O arquivo completo após a alteração:

```tsx
import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Serif } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const ibmPlexSerif = IBM_Plex_Serif({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400", "600"],
});

export const metadata: Metadata = {
  title: "Gestão de Campanha",
  description: "Sistema de gestão de campanhas internas",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${ibmPlexSans.variable} ${ibmPlexSerif.variable} dark h-full antialiased`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(){var t=localStorage.getItem("theme");document.documentElement.classList.toggle("dark",t!=="light");})();` }} />
      </head>
      <body className="min-h-full flex flex-col font-sans">
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Verificar que não há erro de tipo**

```bash
npx tsc --noEmit 2>&1 | grep layout
```
Esperado: sem saída.

- [ ] **Step 3: Commit**

```bash
git add src/app/layout.tsx
git commit -m "feat: add anti-flash script and dark class to html for theme persistence"
```

---

### Task 5: `src/components/layout/sidebar.tsx` — adicionar `<ThemeToggle />`

**Files:**
- Modify: `src/components/layout/sidebar.tsx`

**Interfaces:**
- Consumes: `ThemeToggle` de `@/components/layout/theme-toggle`

O toggle vai no bloco do Logo (linha 162–170), convertendo o `div` atual em um `flex justify-between`:

**Antes:**
```tsx
<div className="flex items-center gap-2 px-3 h-14 border-b border-border overflow-hidden">
  <div className="size-[26px] bg-primary rounded-[6px] grid place-items-center shrink-0">
    <svg viewBox="0 0 24 24" className="size-3.5 fill-white">
      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
    </svg>
  </div>
  <span className="hidden md:block text-[13px] font-semibold tracking-tight whitespace-nowrap">GestãoCampanhas</span>
  <span className="md:hidden text-[13px] font-bold tracking-tight text-primary">GC</span>
</div>
```

**Depois:**
```tsx
<div className="flex items-center justify-between px-3 h-14 border-b border-border overflow-hidden">
  <div className="flex items-center gap-2">
    <div className="size-[26px] bg-primary rounded-[6px] grid place-items-center shrink-0">
      <svg viewBox="0 0 24 24" className="size-3.5 fill-white">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
      </svg>
    </div>
    <span className="hidden md:block text-[13px] font-semibold tracking-tight whitespace-nowrap">GestãoCampanhas</span>
    <span className="md:hidden text-[13px] font-bold tracking-tight text-primary">GC</span>
  </div>
  <ThemeToggle />
</div>
```

- [ ] **Step 1: Adicionar o import de `ThemeToggle`**

Após a linha `import { toast } from "sonner"`, adicionar:

```ts
import { ThemeToggle } from "@/components/layout/theme-toggle"
```

- [ ] **Step 2: Substituir o bloco do Logo**

Aplicar a mudança descrita acima no `div` do Logo.

- [ ] **Step 3: Verificar que não há erro de tipo**

```bash
npx tsc --noEmit 2>&1 | grep sidebar
```
Esperado: sem saída.

- [ ] **Step 4: Testar no browser**

```bash
npm run dev
```

Acessar `http://localhost:3005`. Verificar:
1. Tema escuro carrega por padrão (sem flash claro)
2. Ícone Sol/Lua aparece no topo do sidebar, alinhado à direita da marca
3. Clicar alterna o tema imediatamente (sem reload)
4. Recarregar a página preserva o tema escolhido
5. Ciclo escuro → claro → escuro → reload funciona sem flash

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/sidebar.tsx
git commit -m "feat: add ThemeToggle to sidebar header for dark/light switching"
```

---

## Self-Review

**Spec coverage:**
- [x] `:root` = light (Slate frio), `.dark` = dark (Charcoal/Amber) → Task 1
- [x] `src/lib/theme.ts` com `getTheme`, `setTheme`, `toggleTheme` → Task 2
- [x] `ThemeToggle` com Sun/Moon, lê classList → Task 3
- [x] Script anti-flash no `<head>`, classe `dark` inicial no `<html>` → Task 4
- [x] `ThemeToggle` no sidebar, bloco do logo → Task 5
- [x] Persistência localStorage, padrão escuro, sem DB → Tasks 2+4

**Placeholder scan:** Nenhum TBD ou TODO encontrado.

**Type consistency:** `Theme = "dark" | "light"` definido em Task 2, consumido apenas em `theme.ts` internamente. `ThemeToggle` não exporta tipos — componente simples.
