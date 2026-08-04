# Seleção de Tema — Design Spec

**Data:** 2026-08-04
**Status:** Aprovado

---

## Contexto

O sistema é atualmente dark-only, com todas as variáveis CSS fixas em `:root`. O objetivo é permitir que o usuário escolha entre tema escuro (Charcoal/Amber, atual) e tema claro (Slate frio).

---

## Decisões

| Decisão | Escolha | Motivo |
|---|---|---|
| Persistência | `localStorage` | Simples, sem custo de infra, sem schema change |
| Tema padrão | Escuro | Comportamento atual — familiar para usuários existentes |
| Toggle | Topo do sidebar (junto à marca) | Único componente de layout compartilhado na `(app)` |
| Paleta clara | Slate frio | Contrasta bem com o amber, visual limpo |
| Implementação | CSS class `.dark` no `<html>` | Tailwind v4 já configurado com `@custom-variant dark` |

---

## Paletas

### Tema claro — Slate frio (novo `:root`)

```css
:root {
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
```

### Tema escuro — Charcoal/Amber (`.dark`, valores atuais)

```css
.dark {
  --background:  #0c0b0a;
  --foreground:  #f5f0eb;
  /* ... todos os valores atuais do :root, sem alteração ... */
}
```

---

## Arquitetura

### Arquivos novos

```
src/
  lib/
    theme.ts                  # getTheme(): "dark"|"light", setTheme(t), toggleTheme()
  components/
    layout/
      theme-toggle.tsx        # botão Sun/Moon, client component
```

### Arquivos modificados

```
src/app/globals.css           # :root = light, .dark = dark (move valores)
src/app/layout.tsx            # <script> anti-flash no <head>, classe "dark" inicial no <html>
src/components/layout/sidebar.tsx  # adiciona <ThemeToggle /> no topo
```

---

## Componentes

### `src/lib/theme.ts`

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

### `src/components/layout/theme-toggle.tsx`

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

### Script anti-flash em `layout.tsx`

Inserido no `<head>` antes de qualquer JS, roda síncrono:

```html
<script dangerouslySetInnerHTML={{ __html: `
  (function(){
    var t = localStorage.getItem("theme");
    document.documentElement.classList.toggle("dark", t !== "light");
  })();
` }} />
```

Lógica: se não há preferência salva, aplica `.dark` (padrão escuro).

### Posição no sidebar

`ThemeToggle` vai no bloco superior do sidebar, no mesmo flex container da marca, alinhado à direita:

```tsx
<div className="flex items-center justify-between px-3 py-3 border-b border-sidebar-border">
  {/* logo/marca existente */}
  <ThemeToggle />
</div>
```

---

## Fluxo de funcionamento

```
1. Browser carrega a página
2. <script> no <head> lê localStorage → aplica/remove .dark no <html> imediatamente
3. React hidrata — ThemeToggle lê classList para inicializar estado local
4. Usuário clica no toggle → toggleTheme() → alterna .dark + salva localStorage
5. Todas as variáveis CSS reagem automaticamente (sem re-render, sem API call)
```

---

## O que NÃO está no escopo

- Opção "seguir o sistema" (`prefers-color-scheme`) — pode ser adicionada depois
- Persistência no banco de dados — localStorage é suficiente
- Tema por organização — preferência individual do usuário
- Temas adicionais além de escuro/claro

---

## Checklist de implementação

- [ ] Mover variáveis do `:root` atual para `.dark` em `globals.css`
- [ ] Definir variáveis Slate no `:root` para tema claro
- [ ] Criar `src/lib/theme.ts`
- [ ] Criar `src/components/layout/theme-toggle.tsx`
- [ ] Adicionar `<script>` anti-flash em `layout.tsx`
- [ ] Adicionar classe `dark` inicial no `<html>` em `layout.tsx`
- [ ] Adicionar `<ThemeToggle />` no sidebar
- [ ] Testar transição escuro → claro → escuro sem flash
- [ ] Testar reload preserva preferência
