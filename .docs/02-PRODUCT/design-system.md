# DESIGN_SYSTEM.md — Versão 1.0

# Design System
## Gestão de Projetos Financiados por Comunidades

---

## Visão Geral

O Design System é o alicerce visual e funcional da aplicação. Define padrões, componentes, tokens e convenções que garantem consistência, acessibilidade e qualidade em toda a interface.

Este documento é referência obrigatória para designers, desenvolvedores frontend e produto.

**Stack:** Next.js 14+ | React 18+ | TypeScript | TailwindCSS | shadcn/ui | Lucide Icons

---

## 1. Princípios de Design

### 1.1 Clareza
- Interface limpa e objetiva
- Hierarquia visual clara
- Informações estruturadas por importância
- Sem poluição visual

### 1.2 Consistência
- Uso repetido de padrões
- Componentes uniformes
- Tokens centralizados
- Comportamentos previsíveis

### 1.3 Acessibilidade
- Conformidade WCAG 2.1 nível AA
- Contraste mínimo 4.5:1 (texto)
- Suporte a navegação por teclado
- Leitura por screen readers
- Labels explícitos em formulários

### 1.4 Performance
- Componentes leves
- Minimal JavaScript
- Server Components quando possível
- Lazy loading para conteúdo pesado
- Sem renderizações desnecessárias

### 1.5 Escalabilidade
- Componentes reutilizáveis
- Arquitetura extensível
- Fácil manutenção
- Suporte a temas futuros

---

## 2. Tokens de Design

### 2.1 Configuração de Cores (Tailwind)

#### Cores Neutras (Primárias)
- **Slate** (Preferida)
  - `slate-50` → `#f8fafc`
  - `slate-100` → `#f1f5f9`
  - `slate-200` → `#e2e8f0`
  - `slate-300` → `#cbd5e1`
  - `slate-400` → `#94a3b8`
  - `slate-500` → `#64748b`
  - `slate-600` → `#475569`
  - `slate-700` → `#334155`
  - `slate-800` → `#1e293b`
  - `slate-900` → `#0f172a`

#### Cor de Acento (Indigo)
Cor primária que transmite confiança, modernidade e profissionalismo.

- `indigo-50` → `#eef2ff`
- `indigo-100` → `#e0e7ff`
- `indigo-200` → `#c7d2fe`
- `indigo-300` → `#a5b4fc`
- `indigo-400` → `#818cf8`
- `indigo-500` → `#6366f1` (primária)
- `indigo-600` → `#4f46e5` (hover)
- `indigo-700` → `#4338ca` (active)
- `indigo-800` → `#3730a3`
- `indigo-900` → `#312e81`

#### Cores Semânticas

**Sucesso (Verde)**
- `green-50` → `#f0fdf4`
- `green-100` → `#dcfce7`
- `green-500` → `#22c55e` (primária)
- `green-600` → `#16a34a` (hover)
- `green-900` → `#15803d`

**Perigo (Vermelho)**
- `red-50` → `#fef2f2`
- `red-100` → `#fee2e2`
- `red-500` → `#ef4444` (primária)
- `red-600` → `#dc2626` (hover)
- `red-900` → `#7f1d1d`

**Aviso (Âmbar)**
- `amber-50` → `#fffbeb`
- `amber-100` → `#fef3c7`
- `amber-500` → `#f59e0b` (primária)
- `amber-600` → `#d97706` (hover)
- `amber-900` → `#78350f`

**Informação (Azul)**
- `blue-50` → `#eff6ff`
- `blue-100` → `#dbeafe`
- `blue-500` → `#3b82f6` (primária)
- `blue-600` → `#2563eb` (hover)
- `blue-900` → `#1e3a8a`

#### Cores de Superfície

| Nome | Light | Dark | Uso |
|------|-------|------|-----|
| Background | `slate-50` | `slate-950` | Fundo principal |
| Surface | `white` | `slate-900` | Cards, containers |
| Border | `slate-200` | `slate-700` | Linhas, divisores |
| Muted | `slate-400` | `slate-500` | Texto desabilitado |

#### Cores de Texto

| Nível | Light | Dark | Contraste |
|-------|-------|------|-----------|
| Primary | `slate-900` | `white` | 4.5:1 |
| Secondary | `slate-600` | `slate-300` | 4.5:1 |
| Muted | `slate-500` | `slate-400` | 3:1 |
| Inverse | `white` | `slate-900` | 4.5:1 |

### 2.2 Tipografia

#### Fonte
- **Font Family:** `Inter` ou `Geist` (via Google Fonts)
- **Font Weight Suportados:** 400 (Regular), 500 (Medium), 600 (Semibold), 700 (Bold)

#### Escala Tipográfica

| Nome | Size | Line Height | Weight | Uso |
|------|------|-------------|--------|-----|
| `xs` | 12px | 16px | 400 | Labels, hints, badges |
| `sm` | 14px | 20px | 400 | Texto corpo pequeno |
| `base` | 16px | 24px | 400 | Corpo principal |
| `lg` | 18px | 28px | 500 | Subtítulos |
| `xl` | 20px | 28px | 600 | Títulos pequenos |
| `2xl` | 24px | 32px | 600 | Títulos médios |
| `3xl` | 30px | 36px | 700 | Títulos grandes |
| `4xl` | 36px | 44px | 700 | Títulos hero |

**TailwindCSS Integration:**
```js
// tailwind.config.ts
module.exports = {
  theme: {
    fontSize: {
      'xs': ['12px', { lineHeight: '16px' }],
      'sm': ['14px', { lineHeight: '20px' }],
      'base': ['16px', { lineHeight: '24px' }],
      'lg': ['18px', { lineHeight: '28px' }],
      'xl': ['20px', { lineHeight: '28px' }],
      '2xl': ['24px', { lineHeight: '32px' }],
      '3xl': ['30px', { lineHeight: '36px' }],
      '4xl': ['36px', { lineHeight: '44px' }],
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
  },
}
```

### 2.3 Espaçamento

#### Escala de Espaçamento (Base 4px)

| Token | Valor | Uso |
|-------|-------|-----|
| `px` | 1px | Bordas |
| `0.5` | 2px | Micro espaçamentos |
| `1` | 4px | Padding de ícones, gaps mínimos |
| `2` | 8px | Padding buttons pequenos |
| `3` | 12px | Padding cards |
| `4` | 16px | Padding padrão |
| `5` | 20px | Espaço entre elementos |
| `6` | 24px | Seções relacionadas |
| `8` | 32px | Espaço entre seções |
| `10` | 40px | Espaço maior |
| `12` | 48px | Gaps seções |
| `16` | 64px | Espaço grande |
| `20` | 80px | Seções principais |
| `24` | 96px | Espaço muito grande |

**Padrões de Uso:**

| Contexto | Padding | Gap | Margin |
|----------|---------|-----|--------|
| Button | `2/3` | — | `2` |
| Card | `4` | `3` | `4` |
| Container | `4/6` | — | `0` |
| Section | — | `6/8` | `6/8` |
| List | — | `2` | — |

### 2.4 Border Radius

| Token | Valor | Uso |
|-------|-------|-----|
| `none` | 0px | Elementos retangulares |
| `sm` | 4px | Pequenos controles |
| `md` | 8px | Padrão (buttons, inputs) |
| `lg` | 12px | Cards, modals |
| `xl` | 16px | Grandes containers |
| `full` | 9999px | Avatars, badges redondas |

**Configuração Tailwind:**
```js
borderRadius: {
  'none': '0px',
  'sm': '4px',
  'md': '8px',
  'lg': '12px',
  'xl': '16px',
  'full': '9999px',
}
```

### 2.5 Sombras

| Token | Valor CSS | Uso |
|-------|-----------|-----|
| `shadow-none` | none | Sem sombra |
| `shadow-sm` | `0 1px 2px 0 rgba(0, 0, 0, 0.05)` | Elementos sutis |
| `shadow-md` | `0 4px 6px -1px rgba(0, 0, 0, 0.1)` | Cards padrão |
| `shadow-lg` | `0 10px 15px -3px rgba(0, 0, 0, 0.1)` | Modals, dropdowns |
| `shadow-xl` | `0 20px 25px -5px rgba(0, 0, 0, 0.1)` | Elementos flotantes |
| `shadow-2xl` | `0 25px 50px -12px rgba(0, 0, 0, 0.25)` | Overlays máximos |

**Dark Mode:** Sombras aparecem com opacidade menor em dark mode.

### 2.6 Borders

| Token | Valor | Uso |
|-------|-------|-----|
| `border-none` | 0px | Sem borda |
| `border` | 1px | Padrão (inputs, cards) |
| `border-2` | 2px | Ênfase, active states |

**Cores de Borda:**
- Default: `border-slate-200` (light), `border-slate-700` (dark)
- Focus: `border-indigo-500`
- Error: `border-red-500`
- Success: `border-green-500`

### 2.7 Grid e Breakpoints

#### Grid System (12 Colunas)

```css
/* Desktop */
.container {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 1.5rem; /* 24px */
  max-width: 1400px;
}

/* Tablet */
@media (max-width: 1024px) {
  .container {
    gap: 1rem;
  }
}

/* Mobile */
@media (max-width: 640px) {
  .container {
    grid-template-columns: repeat(4, 1fr);
    gap: 0.75rem;
    padding: 0 0.75rem;
  }
}
```

#### Breakpoints (Tailwind)

| Breakpoint | Min Width | Uso |
|-----------|-----------|-----|
| `sm` | 640px | Telefones |
| `md` | 768px | Tablets |
| `lg` | 1024px | Laptops |
| `xl` | 1280px | Desktops |
| `2xl` | 1536px | Telas grandes |

**Mobile First (Obrigatório):**
```tsx
// Errado
<div className="hidden md:block">Desktop</div>

// Correto
<div className="block md:hidden">Mobile</div>
```

---

## 3. Dark Mode

### 3.1 Implementação com Next-Themes

**Setup:**
```tsx
// app/layout.tsx
import { ThemeProvider } from "next-themes"

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
```

**Tailwind Config:**
```js
// tailwind.config.ts
export default {
  darkMode: 'class',
  theme: {
    extend: {
      // ... tokens
    },
  },
}
```

### 3.2 Convenções de Cor Dark Mode

```tsx
// Padrão recomendado
<div className="
  bg-white dark:bg-slate-900
  text-slate-900 dark:text-white
  border-slate-200 dark:border-slate-700
">
  Conteúdo
</div>

// Com componentes shadcn/ui, dark mode é automático
<Card>Já aplica tema corretamente</Card>
```

---

## 4. Componentes Oficiais

### 4.1 Button

#### Variantes

| Variante | Uso | Classes |
|----------|-----|---------|
| `default` | Ação primária | `bg-indigo-600 text-white hover:bg-indigo-700` |
| `secondary` | Ação secundária | `bg-slate-200 text-slate-900 hover:bg-slate-300` |
| `outline` | Alternativa | `border border-slate-300 hover:bg-slate-50` |
| `ghost` | Minimalista | `hover:bg-slate-100` |
| `destructive` | Ação perigosa | `bg-red-600 text-white hover:bg-red-700` |

#### Tamanhos

| Size | Padding | Font | Uso |
|------|---------|------|-----|
| `sm` | `px-3 py-1.5` | `text-sm` | Ações inline |
| `md` | `px-4 py-2` | `text-base` | Padrão |
| `lg` | `px-6 py-3` | `text-lg` | CTAs prominentes |

#### Exemplo de Uso

```tsx
import { Button } from "@/components/ui/button"

// Padrão
<Button>Salvar</Button>

// Com variantes
<Button variant="destructive" size="sm">
  Deletar
</Button>

// Com ícone
<Button>
  <CheckCircle className="w-4 h-4 mr-2" />
  Confirmar
</Button>

// Desabilitado
<Button disabled>Indisponível</Button>
```

#### O Que NÃO Fazer

```tsx
// ❌ Cores inline
<button className="bg-red-400">Errado</button>

// ❌ Tamanhos customizados
<Button className="text-2xl px-10">Errado</Button>

// ❌ Múltiplas ações
<Button onClick={fn1} onChange={fn2}>Errado</Button>
```

### 4.2 Card

#### Estrutura

```tsx
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"

<Card>
  <CardHeader>
    <CardTitle>Título</CardTitle>
    <CardDescription>Descrição</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Conteúdo principal */}
  </CardContent>
  <CardFooter>
    {/* Ações */}
  </CardFooter>
</Card>
```

#### Variantes

| Tipo | Uso | Props |
|------|-----|-------|
| Standard | Informações | `className="border"` |
| Elevated | Destaque | `className="shadow-lg"` |
| Flat | Minimalista | `className="bg-slate-50"` |
| Interactive | Interativa | `className="hover:shadow-lg cursor-pointer"` |

#### Exemplo

```tsx
<Card>
  <CardHeader>
    <CardTitle className="text-xl">Projeto XYZ</CardTitle>
    <CardDescription>Meta: R$ 50.000</CardDescription>
  </CardHeader>
  <CardContent>
    <p className="text-sm text-slate-600">Descrição do projeto</p>
  </CardContent>
  <CardFooter className="gap-2">
    <Button>Editar</Button>
    <Button variant="ghost">Mais</Button>
  </CardFooter>
</Card>
```

### 4.3 Badge

#### Variantes

| Variante | Cor | Uso |
|----------|-----|-----|
| `default` | Indigo | Tags genéricas |
| `secondary` | Slate | Secundárias |
| `success` | Verde | Status positivo |
| `warning` | Âmbar | Atenção |
| `danger` | Vermelho | Erro/alerta |
| `info` | Azul | Informação |

#### Exemplo

```tsx
import { Badge } from "@/components/ui/badge"

<div className="flex gap-2">
  <Badge>Ativo</Badge>
  <Badge variant="success">Aprovado</Badge>
  <Badge variant="warning">Pendente</Badge>
  <Badge variant="danger">Rejeitado</Badge>
  <Badge variant="info">Info</Badge>
</div>
```

### 4.4 Avatar

#### Estrutura

```tsx
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"

<Avatar>
  <AvatarImage src="https://..." alt="Usuário" />
  <AvatarFallback>JD</AvatarFallback>
</Avatar>
```

#### Tamanhos

| Size | Width | Uso |
|------|-------|-----|
| `sm` | 32px | Listas, mentions |
| `md` | 40px | Padrão |
| `lg` | 56px | Perfil, cards grandes |

#### Exemplo com Fallback Inteligente

```tsx
function UserAvatar({ name, image }: { name: string; image?: string }) {
  const initials = name
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase()

  return (
    <Avatar>
      {image && <AvatarImage src={image} />}
      <AvatarFallback>{initials}</AvatarFallback>
    </Avatar>
  )
}
```

### 4.5 Tabs

#### Exemplo

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

<Tabs defaultValue="overview">
  <TabsList>
    <TabsTrigger value="overview">Visão Geral</TabsTrigger>
    <TabsTrigger value="timeline">Timeline</TabsTrigger>
    <TabsTrigger value="budget">Orçamento</TabsTrigger>
  </TabsList>
  
  <TabsContent value="overview">
    {/* Conteúdo */}
  </TabsContent>
  <TabsContent value="timeline">
    {/* Timeline */}
  </TabsContent>
  <TabsContent value="budget">
    {/* Orçamento */}
  </TabsContent>
</Tabs>
```

### 4.6 Table

#### Estrutura

```tsx
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Nome</TableHead>
      <TableHead>Status</TableHead>
      <TableHead className="text-right">Valor</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {items.map((item) => (
      <TableRow key={item.id}>
        <TableCell>{item.name}</TableCell>
        <TableCell>
          <Badge variant={item.status}>{item.status}</Badge>
        </TableCell>
        <TableCell className="text-right">
          R$ {item.value.toFixed(2)}
        </TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

#### Com Paginação

```tsx
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination"

<Pagination>
  <PaginationContent>
    <PaginationItem>
      <PaginationPrevious href="#" />
    </PaginationItem>
    <PaginationItem>
      <PaginationLink href="#" isActive>1</PaginationLink>
    </PaginationItem>
    <PaginationItem>
      <PaginationLink href="#">2</PaginationLink>
    </PaginationItem>
    <PaginationItem>
      <PaginationNext href="#" />
    </PaginationItem>
  </PaginationContent>
</Pagination>
```

### 4.7 Dialog

#### Exemplo

```tsx
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

<Dialog>
  <DialogTrigger asChild>
    <Button>Abrir</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Confirmar Ação</DialogTitle>
      <DialogDescription>
        Deseja realmente prosseguir?
      </DialogDescription>
    </DialogHeader>
    <div className="py-4">
      Conteúdo do modal
    </div>
    <div className="flex gap-2 justify-end">
      <Button variant="outline">Cancelar</Button>
      <Button>Confirmar</Button>
    </div>
  </DialogContent>
</Dialog>
```

### 4.8 Sheet (Sidebar de Detalhes)

#### Exemplo

```tsx
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"

<Sheet>
  <SheetTrigger asChild>
    <Button variant="ghost">Mais detalhes</Button>
  </SheetTrigger>
  <SheetContent>
    <SheetHeader>
      <SheetTitle>Detalhes do Projeto</SheetTitle>
      <SheetDescription>
        Informações completas
      </SheetDescription>
    </SheetHeader>
    {/* Conteúdo */}
  </SheetContent>
</Sheet>
```

### 4.9 Toast / Sonner

#### Setup

```bash
npm install sonner
```

```tsx
// app/layout.tsx
import { Toaster } from "sonner"

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  )
}
```

#### Uso

```tsx
import { toast } from "sonner"

// Sucesso
toast.success("Salvo com sucesso!")

// Erro
toast.error("Erro ao salvar")

// Info
toast.info("Operação em andamento")

// Custom
toast.custom((t) => (
  <div className="bg-indigo-600 text-white p-4 rounded-lg">
    Mensagem customizada
  </div>
))
```

### 4.10 Progress (Barra de Progresso de Meta)

#### Exemplo

```tsx
import { Progress } from "@/components/ui/progress"

function ProjectProgress({ current, target }: { current: number; target: number }) {
  const percentage = (current / target) * 100
  
  return (
    <div>
      <div className="flex justify-between mb-2">
        <span className="text-sm font-medium">Progresso da Meta</span>
        <span className="text-sm text-slate-600">
          R$ {current.toLocaleString('pt-BR')} de R$ {target.toLocaleString('pt-BR')}
        </span>
      </div>
      <Progress value={percentage} className="h-2" />
      <p className="text-xs text-slate-500 mt-1">{percentage.toFixed(1)}% concluído</p>
    </div>
  )
}
```

### 4.11 Skeleton (Loading State)

#### Exemplo

```tsx
import { Skeleton } from "@/components/ui/skeleton"

function CardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-40 mb-2" />
        <Skeleton className="h-4 w-60" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-5/6" />
      </CardContent>
    </Card>
  )
}

// Uso
<Suspense fallback={<CardSkeleton />}>
  <ProjectCard projectId={id} />
</Suspense>
```

### 4.12 Input, Textarea, Checkbox, Switch

#### Input

```tsx
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

<div className="space-y-2">
  <Label htmlFor="email">Email</Label>
  <Input
    id="email"
    type="email"
    placeholder="seu@email.com"
    disabled={isLoading}
  />
</div>
```

#### Textarea

```tsx
import { Textarea } from "@/components/ui/textarea"

<div className="space-y-2">
  <Label htmlFor="description">Descrição</Label>
  <Textarea
    id="description"
    placeholder="Descreva o projeto..."
    rows={4}
  />
</div>
```

#### Checkbox

```tsx
import { Checkbox } from "@/components/ui/checkbox"

<div className="flex items-center space-x-2">
  <Checkbox id="terms" />
  <label
    htmlFor="terms"
    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
  >
    Concordo com os termos
  </label>
</div>
```

#### Switch

```tsx
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

<div className="flex items-center justify-between">
  <Label htmlFor="notifications">Notificações</Label>
  <Switch id="notifications" />
</div>
```

### 4.13 Select / Combobox

#### Select Simples

```tsx
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

<Select>
  <SelectTrigger className="w-32">
    <SelectValue placeholder="Escolha um status" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="active">Ativo</SelectItem>
    <SelectItem value="paused">Pausado</SelectItem>
    <SelectItem value="completed">Concluído</SelectItem>
  </SelectContent>
</Select>
```

#### Combobox (Busca)

```tsx
import { Combobox } from "@/components/ui/combobox"

<Combobox
  options={projects}
  placeholder="Buscar projeto..."
  onSelect={(project) => setSelected(project)}
/>
```

### 4.14 Dropdown Menu

#### Exemplo

```tsx
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreHorizontal } from "lucide-react"

<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost" size="sm">
      <MoreHorizontal className="h-4 w-4" />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuItem>Editar</DropdownMenuItem>
    <DropdownMenuItem>Duplicar</DropdownMenuItem>
    <DropdownMenuItem className="text-red-600">Deletar</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

### 4.15 Accordion

#### Exemplo

```tsx
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

<Accordion type="single" collapsible>
  <AccordionItem value="item-1">
    <AccordionTrigger>O que é este projeto?</AccordionTrigger>
    <AccordionContent>
      Descrição detalhada do projeto
    </AccordionContent>
  </AccordionItem>
  
  <AccordionItem value="item-2">
    <AccordionTrigger>Como contribuir?</AccordionTrigger>
    <AccordionContent>
      Instruções de contribuição
    </AccordionContent>
  </AccordionItem>
</Accordion>
```

### 4.16 Breadcrumb

#### Exemplo

```tsx
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"

<Breadcrumb>
  <BreadcrumbList>
    <BreadcrumbItem>
      <BreadcrumbLink href="/projects">Projetos</BreadcrumbLink>
    </BreadcrumbItem>
    <BreadcrumbSeparator />
    <BreadcrumbItem>
      <BreadcrumbLink href="/projects/1">Projeto XYZ</BreadcrumbLink>
    </BreadcrumbItem>
    <BreadcrumbSeparator />
    <BreadcrumbItem>
      <BreadcrumbPage>Editar</BreadcrumbPage>
    </BreadcrumbItem>
  </BreadcrumbList>
</Breadcrumb>
```

### 4.17 Tooltip

#### Exemplo

```tsx
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <Button variant="ghost" size="sm">
        <Info className="h-4 w-4" />
      </Button>
    </TooltipTrigger>
    <TooltipContent>
      <p>Informação adicional</p>
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

### 4.18 Command (Busca Global)

#### Exemplo

```tsx
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Search } from "lucide-react"

<CommandDialog open={open} onOpenChange={setOpen}>
  <CommandInput placeholder="Buscar projetos, usuários..." />
  <CommandList>
    <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
    <CommandGroup heading="Projetos">
      <CommandItem>Projeto XYZ</CommandItem>
      <CommandItem>Projeto ABC</CommandItem>
    </CommandGroup>
    <CommandGroup heading="Usuários">
      <CommandItem>João Silva</CommandItem>
      <CommandItem>Maria Santos</CommandItem>
    </CommandGroup>
  </CommandList>
</CommandDialog>
```

---

## 5. Estados de UI

### 5.1 Loading State

**Padrão:** Use `Skeleton` para placeholder, **não spinner** em tudo.

```tsx
import { Skeleton } from "@/components/ui/skeleton"

// ❌ Errado: spinner enquanto carrega
<Spinner />

// ✅ Correto: skeleton como placeholder
<Skeleton className="h-12 w-full" />
```

### 5.2 Empty State

Quando não há dados, mostre uma ilustração + mensagem + CTA.

```tsx
function EmptyProjectsList() {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="mb-4">
        <FolderOpen className="h-12 w-12 text-slate-400" />
      </div>
      <h3 className="text-lg font-semibold text-slate-900 mb-2">
        Nenhum projeto ainda
      </h3>
      <p className="text-sm text-slate-600 mb-6 max-w-sm text-center">
        Crie seu primeiro projeto comunitário para começar
      </p>
      <Button>Criar Projeto</Button>
    </div>
  )
}
```

### 5.3 Error State

```tsx
function ErrorState({ error, retry }: { error: string; retry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
      <h3 className="text-lg font-semibold text-slate-900 mb-2">
        Erro ao carregar
      </h3>
      <p className="text-sm text-slate-600 mb-6">{error}</p>
      <Button onClick={retry}>Tentar Novamente</Button>
    </div>
  )
}
```

### 5.4 Success State

```tsx
import { CheckCircle } from "lucide-react"
import { toast } from "sonner"

// Opção 1: Toast
toast.success("Projeto criado com sucesso!")

// Opção 2: Inline confirmation
<div className="flex items-center gap-2 p-4 bg-green-50 text-green-900 rounded-lg border border-green-200">
  <CheckCircle className="h-5 w-5" />
  <span>Alterações salvas com sucesso</span>
</div>
```

---

## 6. Padrões de Layout

### 6.1 Margin
```tsx
// Usar apenas para criar espaço vertical entre blocos independentes
<div className="space-y-6">
  <Section />
  <Section />
  <Section />
</div>
```

### 6.2 Padding
```tsx
// Espaço interno
<Card className="p-4">
  Conteúdo
</Card>

// Diferentes lados
<div className="px-4 py-6">Espaço horizontal menor, vertical maior</div>
```

### 6.3 Gap
```tsx
// Espaço entre itens em flexbox/grid
<div className="flex gap-4">
  <div>Item 1</div>
  <div>Item 2</div>
</div>
```

### 6.4 Container
```tsx
// Max-width, centralizado
<div className="max-w-7xl mx-auto px-4 py-8">
  Conteúdo principal
</div>
```

### 6.5 Responsive
```tsx
// Mobile First
<div className="
  px-4 py-6           // Mobile
  md:px-6 md:py-8     // Tablet
  lg:px-8 lg:py-12    // Desktop
">
  Conteúdo responsivo
</div>
```

---

## 7. Convenções de Código

### 7.1 Nomenclatura de Componentes

```tsx
// ✅ PascalCase (sempre)
export function ProjectCard() {}
export function ProjectList() {}
export function UserAvatar() {}

// ❌ Errado
export function project_card() {}
export const projectCard = () => {}
```

### 7.2 Props: camelCase

```tsx
// ✅ Correto
interface ButtonProps {
  isLoading?: boolean
  isDisabled?: boolean
  onClick?: () => void
}

// ❌ Errado
interface ButtonProps {
  is_loading?: boolean
  IsDisabled?: boolean
}
```

### 7.3 Variantes como String Union

```tsx
// ✅ Tipo correto
type ButtonVariant = 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive'

interface ButtonProps {
  variant?: ButtonVariant
  size?: 'sm' | 'md' | 'lg'
}

// ❌ Errado: qualquer string
interface ButtonProps {
  variant?: string
}
```

### 7.4 Imports de Componentes UI

```tsx
// ✅ Sempre de @/components/ui/
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

// ❌ Nunca copie componentes
// ❌ Nunca crie versões duplicadas
```

### 7.5 Organização de Componentes

```
src/
├── components/
│   ├── ui/                 # shadcn/ui (read-only)
│   ├── common/             # Componentes reutilizáveis
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   └── Footer.tsx
│   ├── projects/           # Específicos do domínio
│   │   ├── ProjectCard.tsx
│   │   ├── ProjectList.tsx
│   │   └── ProjectForm.tsx
│   └── layout/             # Layout containers
│       ├── DashboardLayout.tsx
│       └── PublicLayout.tsx
```

---

## 8. Acessibilidade

### 8.1 Checklist WCAG 2.1 AA

- [ ] Contraste texto ≥ 4.5:1 (normal), ≥ 3:1 (grande)
- [ ] Navegação completa com teclado (Tab, Enter, Escape)
- [ ] Labels explícitos: `<label htmlFor="input-id">`
- [ ] Inputs com `aria-label` ou `aria-labelledby`
- [ ] Imagens com `alt` descritivo
- [ ] Buttons com `type="button"` ou `type="submit"`
- [ ] Ordem lógica de tabulação (tabindex raramente necessário)
- [ ] Sem armadilhas de teclado (focus trap apenas em modals)
- [ ] Gerenciar focus em modals/drawers com `autoFocus`

### 8.2 Exemplo Acessível

```tsx
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function AccessibleDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Abrir Formulário</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <h2 className="text-lg font-semibold">Novo Projeto</h2>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="project-name">Nome do Projeto</Label>
            <Input
              id="project-name"
              autoFocus
              placeholder="Digite o nome"
              aria-required="true"
            />
          </div>
          
          <div>
            <Label htmlFor="project-desc">Descrição</Label>
            <textarea
              id="project-desc"
              className="w-full border rounded-md p-2"
              placeholder="Descreva..."
              aria-label="Descrição do projeto"
            />
          </div>
        </div>
        
        <div className="flex gap-2 justify-end">
          <Button variant="outline">Cancelar</Button>
          <Button>Criar</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

### 8.3 Screen Reader Helpers

```tsx
// Hidden but announced
<span className="sr-only">Carregando dados...</span>

// Visually hidden but accessible
<label className="sr-only" htmlFor="search">
  Buscar projetos
</label>
<input id="search" type="text" />
```

---

## 9. Performance

### 9.1 Server Components Padrão

```tsx
// ✅ Server Component (padrão)
// app/projects/page.tsx
export default async function ProjectsPage() {
  const projects = await fetchProjects()
  return <ProjectsList projects={projects} />
}

// ❌ Client Component desnecessário
'use client'
export default function ProjectsPage() {
  // ...
}
```

### 9.2 Client Components Apenas Quando Necessário

```tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

export function ProjectFilter() {
  const [filter, setFilter] = useState('')
  
  return (
    <input
      type="text"
      value={filter}
      onChange={(e) => setFilter(e.target.value)}
      placeholder="Filtrar..."
    />
  )
}
```

### 9.3 Lazy Loading

```tsx
import dynamic from 'next/dynamic'

const HeavyChart = dynamic(() => import('./HeavyChart'), {
  loading: () => <Skeleton className="h-96 w-full" />,
})

export default function Dashboard() {
  return (
    <div>
      <HeavyChart />
    </div>
  )
}
```

### 9.4 Image Optimization

```tsx
import Image from 'next/image'

<Image
  src="/project-hero.png"
  alt="Projeto XYZ"
  width={1200}
  height={600}
  priority
  className="rounded-lg"
/>
```

---

## 10. Animações

### 10.1 Princípios

- Somente animações **leves** (transições ≤ 200ms)
- **Nunca exagerar** em durações ou efeitos
- Usar Framer Motion **apenas** quando necessário
- CSS nativa é preferida

### 10.2 Exemplo: Fade-in com CSS

```tsx
<div className="opacity-0 animate-in fade-in duration-300">
  Conteúdo
</div>
```

Configuração Tailwind:
```js
// tailwind.config.ts
export default {
  theme: {
    extend: {
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        'in': 'fade-in 0.3s ease-out',
      },
    },
  },
}
```

### 10.3 Exemplo: Slide-in com CSS

```tsx
<div className="translate-y-4 opacity-0 animate-in slide-in-from-bottom duration-300">
  Conteúdo
</div>
```

---

## 11. Guia Rápido de Implementação

### 11.1 Criar Novo Componente

```tsx
// components/ProjectCard.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export interface ProjectCardProps {
  id: string
  title: string
  description: string
  status: 'active' | 'paused' | 'completed'
  progress: number
}

export function ProjectCard({
  id,
  title,
  description,
  status,
  progress,
}: ProjectCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <Badge variant={status === 'active' ? 'success' : 'default'}>
            {status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <ProgressBar value={progress} />
        <Button variant="outline" size="sm">
          Visualizar
        </Button>
      </CardContent>
    </Card>
  )
}
```

### 11.2 Usar Componente

```tsx
// app/projects/page.tsx
import { ProjectCard } from '@/components/projects/ProjectCard'

export default async function ProjectsPage() {
  const projects = await fetchProjects()
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {projects.map(project => (
        <ProjectCard
          key={project.id}
          id={project.id}
          title={project.title}
          description={project.description}
          status={project.status}
          progress={project.progress}
        />
      ))}
    </div>
  )
}
```

---

## 12. Troubleshooting

| Problema | Solução |
|----------|---------|
| Componente sem estilo | Verificar se está importando de `@/components/ui/` |
| Dark mode não funciona | Verificar `next-themes` setup em `layout.tsx` |
| Cores incorretas | Usar tokens de `tailwind.config.ts`, nunca cores inline |
| Contraste ruim | Validar com WebAIM contrast checker |
| Layout quebrado mobile | Usar `sm:`, `md:`, etc., mobile-first sempre |
| Animação muito rápida | Usar `duration-300` ou maior, nunca abaixo de 150ms |

---

## 13. Referências

- **Tailwind CSS:** https://tailwindcss.com
- **shadcn/ui:** https://ui.shadcn.com
- **Lucide Icons:** https://lucide.dev
- **WCAG 2.1:** https://www.w3.org/WAI/WCAG21/quickref/
- **Next.js:** https://nextjs.org/docs
- **Framer Motion (quando necessário):** https://www.framer.com/motion/

---

**Versão:** 1.0  
**Última Atualização:** 2026-07-14  
**Mantido por:** Design System Team  
**Status:** Ativo e em evolução
