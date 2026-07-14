# FRONTEND.md — Versão 1.0

Documentação de desenvolvimento frontend para "Gestão de Projetos Financiados por Comunidades". SaaS multi-tenant com Next.js App Router, shadcn/ui e integração com Stripe/Linear como referência visual.

---

## Stack Tecnológico

- **Next.js 15** com App Router
- **React 19** com Server/Client Components
- **TypeScript** para type safety
- **TailwindCSS** para estilização
- **shadcn/ui** como biblioteca de componentes base
- **TanStack Query** para gerenciamento de estado assíncrono
- **React Hook Form** + **Zod** para formulários e validação
- **Lucide Icons** para ícones
- **Sonner** para toast notifications

---

## Estrutura de Pastas

```
src/
├── app/
│   ├── (auth)/                    # Layout autenticado com barra lateral
│   │   ├── dashboard/
│   │   ├── projects/
│   │   │   └── [id]/
│   │   ├── initiatives/
│   │   ├── timeline/
│   │   ├── financial/
│   │   └── settings/
│   ├── (public)/                  # Portal público sem autenticação
│   │   └── p/[slug]/              # Página pública do projeto
│   ├── api/                        # Route handlers (API)
│   ├── layout.tsx                 # Root layout
│   └── middleware.ts              # Autenticação e proteção de rotas
├── components/
│   ├── ui/                         # shadcn/ui (nunca modificar diretamente)
│   └── shared/                     # Componentes reutilizáveis
│       ├── PageHeader.tsx
│       ├── DataTable.tsx
│       ├── EmptyState.tsx
│       ├── LoadingSkeletons.tsx
│       └── ErrorBoundary.tsx
├── features/                       # Componentes específicos por módulo
│   ├── projects/
│   │   ├── components/
│   │   │   ├── ProjectCard.tsx
│   │   │   ├── ProjectList.tsx
│   │   │   ├── ProjectForm.tsx
│   │   │   └── ProjectStatus.tsx
│   │   ├── hooks/
│   │   │   ├── useProjects.ts
│   │   │   └── useCreateProject.ts
│   │   └── types.ts
│   ├── initiatives/
│   ├── timeline/
│   ├── financial/
│   └── dashboard/
├── hooks/                          # Custom hooks globais
│   ├── useAuth.ts
│   └── useToast.ts
├── lib/                            # Utilitários e cliente API
│   ├── api/
│   │   └── client.ts               # Fetch wrapper com autenticação
│   ├── auth.ts
│   ├── utils.ts
│   └── constants.ts
├── providers/                      # Provedores de contexto
│   ├── QueryProvider.tsx           # TanStack Query
│   ├── ThemeProvider.tsx
│   └── AuthProvider.tsx
├── types/                          # Tipos globais
│   ├── user.ts
│   ├── project.ts
│   ├── initiative.ts
│   └── api.ts
└── styles/
    └── globals.css                 # TailwindCSS + variáveis CSS
```

---

## Padrões de Componente

### Server Component (Padrão)

Componentes Server são o padrão: buscam dados no servidor, renderizam HTML estático, não enviam JavaScript desnecessário para o cliente.

```tsx
// app/(auth)/projects/page.tsx
import { ProjectList } from '@/features/projects/components/ProjectList'
import { getProjects } from '@/lib/api/projects'

export default async function ProjectsPage() {
  const projects = await getProjects()
  
  return (
    <div className="space-y-6">
      <PageHeader title="Projetos" subtitle="Gerencie seus projetos financiados" />
      <ProjectList initialData={projects} />
    </div>
  )
}
```

### Client Component (Interativo)

Use `'use client'` apenas quando necessário: interatividade, estado local, event listeners.

```tsx
'use client'

import { useQuery } from '@tanstack/react-query'
import { fetchProjects } from '@/lib/api/projects'
import { ProjectCard } from './ProjectCard'
import { ProjectListSkeleton } from './ProjectListSkeleton'
import { EmptyState } from '@/components/shared/EmptyState'

export function ProjectList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['projects'],
    queryFn: fetchProjects,
  })

  if (isLoading) return <ProjectListSkeleton />
  
  if (error) {
    return <ErrorAlert message="Erro ao carregar projetos" onRetry={() => {}} />
  }

  if (!data?.length) {
    return (
      <EmptyState
        icon="FolderOpen"
        title="Nenhum projeto"
        subtitle="Comece criando seu primeiro projeto"
        action={{ label: 'Novo Projeto', href: '/projects/new' }}
      />
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {data.map((project) => (
        <ProjectCard key={project.id} project={project} />
      ))}
    </div>
  )
}
```

### Formulário (React Hook Form + Zod)

Todo formulário usa React Hook Form + Zod para validação type-safe.

```tsx
'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

const projectSchema = z.object({
  name: z.string().min(3, 'Mínimo 3 caracteres').max(100),
  description: z.string().min(10),
  targetAmount: z.number().positive('Valor deve ser positivo'),
  deadline: z.date('Data inválida'),
})

type ProjectFormValues = z.infer<typeof projectSchema>

interface ProjectFormProps {
  onSuccess?: () => void
}

export function ProjectForm({ onSuccess }: ProjectFormProps) {
  const queryClient = useQueryClient()
  
  const { mutate, isPending } = useMutation({
    mutationFn: async (data: ProjectFormValues) => {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error('Erro ao criar projeto')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      toast.success('Projeto criado com sucesso')
      onSuccess?.()
    },
    onError: () => {
      toast.error('Erro ao criar projeto. Tente novamente.')
    },
  })

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: '',
      description: '',
      targetAmount: 0,
    },
    mode: 'onBlur', // Validação ao sair do campo
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => mutate(data))} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome do Projeto</FormLabel>
              <FormControl>
                <Input placeholder="Ex: Reforma da Biblioteca" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição</FormLabel>
              <FormControl>
                <Textarea placeholder="Descreva o projeto..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="targetAmount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Valor Alvo (R$)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  {...field}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isPending} className="w-full">
          {isPending ? 'Criando...' : 'Criar Projeto'}
        </Button>
      </form>
    </Form>
  )
}
```

---

## Estrutura de Features

Cada módulo (projects, initiatives, financial, etc.) segue a mesma estrutura:

```
features/projects/
├── components/
│   ├── ProjectCard.tsx
│   ├── ProjectList.tsx
│   ├── ProjectForm.tsx
│   ├── ProjectStatus.tsx
│   └── ProjectFilters.tsx
├── hooks/
│   ├── useProjects.ts           # Query para listar
│   ├── useProject.ts            # Query para detalhe
│   ├── useCreateProject.ts      # Mutation para criar
│   └── useUpdateProject.ts      # Mutation para atualizar
├── types.ts                      # Tipos específicos da feature
└── api.ts                        # Fetch functions (opcional)
```

---

## TanStack Query (React Query)

### Convenções de Query Keys

```ts
// Listar
['projects']
['projects', { status: 'active' }]

// Detalhe
['projects', projectId]
['projects', projectId, 'initiatives']

// Paginado
['projects', { page: 1, limit: 20 }]
```

### Hook de Query

```ts
// hooks/useProjects.ts
import { useQuery } from '@tanstack/react-query'
import { fetchProjects } from '@/lib/api/projects'

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: fetchProjects,
    staleTime: 1000 * 60 * 5, // 5 minutos
  })
}
```

### Hook de Mutation com Invalidação

```ts
// hooks/useCreateProject.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'

export function useCreateProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createProject,
    onSuccess: (newProject) => {
      // Invalidar lista
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      
      // Ou fazer update otimista
      queryClient.setQueryData(['projects'], (old: any[]) => [
        ...old,
        newProject,
      ])
    },
  })
}
```

### Otimistic Updates

```ts
const { mutate } = useMutation({
  mutationFn: updateProjectStatus,
  onMutate: async (newStatus) => {
    // Cancelar queries em voo
    await queryClient.cancelQueries({ queryKey: ['projects', projectId] })

    // Snapshot do estado anterior
    const previous = queryClient.getQueryData(['projects', projectId])

    // Update otimista
    queryClient.setQueryData(['projects', projectId], (old: any) => ({
      ...old,
      status: newStatus,
    }))

    return { previous }
  },
  onError: (err, newStatus, context) => {
    // Rollback
    queryClient.setQueryData(['projects', projectId], context?.previous)
  },
})
```

---

## Autenticação

### Hook useAuth

```ts
// hooks/useAuth.ts
'use client'

import { useContext } from 'react'
import { AuthContext } from '@/providers/AuthProvider'

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider')
  }
  return context
}
```

### Middleware de Proteção

```ts
// middleware.ts
import { NextRequest, NextResponse } from 'next/server'

const publicRoutes = ['/login', '/signup', '/p'] // Portal público

export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth_token')

  if (!token && !publicRoutes.some((route) => request.nextUrl.pathname.startsWith(route))) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next|favicon|public).*)'],
}
```

### JWT em Cookie httpOnly

O servidor deve enviar tokens em cookies `httpOnly` e `secure`:

```ts
// Servidor (API route)
res.setHeader('Set-Cookie', `auth_token=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=3600`)
```

---

## API Client

Fetch wrapper centralizado com autenticação automática:

```ts
// lib/api/client.ts
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

interface ApiErrorResponse {
  message: string
  code?: string
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code?: string,
    message?: string,
  ) {
    super(message || `API Error: ${status}`)
  }
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API_BASE}${endpoint}`
  
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include', // Enviar cookies automaticamente
    ...options,
  })

  if (!response.ok) {
    const error: ApiErrorResponse = await response.json().catch(() => ({
      message: response.statusText,
    }))

    throw new ApiError(response.status, error.code, error.message)
  }

  if (response.status === 204) return undefined as T

  return response.json()
}

// Helpers específicos
export const apiGet = <T,>(endpoint: string) =>
  apiClient<T>(endpoint, { method: 'GET' })

export const apiPost = <T,>(endpoint: string, body: any) =>
  apiClient<T>(endpoint, { method: 'POST', body: JSON.stringify(body) })

export const apiPut = <T,>(endpoint: string, body: any) =>
  apiClient<T>(endpoint, { method: 'PUT', body: JSON.stringify(body) })

export const apiDelete = <T,>(endpoint: string) =>
  apiClient<T>(endpoint, { method: 'DELETE' })
```

Uso:

```ts
// lib/api/projects.ts
import { apiGet, apiPost } from './client'
import type { Project } from '@/types/project'

export async function fetchProjects(): Promise<Project[]> {
  return apiGet<Project[]>('/api/projects')
}

export async function createProject(data: any): Promise<Project> {
  return apiPost<Project>('/api/projects', data)
}
```

---

## Estados de UI Obrigatórios

Toda feature deve tratar: loading, vazio, erro e sucesso.

### Loading State

Use Skeleton que replica o layout real:

```tsx
// features/projects/components/ProjectListSkeleton.tsx
export function ProjectListSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-lg border p-4">
          <Skeleton className="h-6 w-full mb-2" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ))}
    </div>
  )
}
```

### Empty State

```tsx
// components/shared/EmptyState.tsx
import { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface EmptyStateProps {
  icon: keyof typeof import('lucide-react')
  title: string
  subtitle?: string
  action?: { label: string; href?: string; onClick?: () => void }
}

export function EmptyState({ icon: iconName, title, subtitle, action }: EmptyStateProps) {
  const Icon = require('lucide-react')[iconName]

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Icon className="h-12 w-12 text-gray-400 mb-4" />
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
      {action && (
        <Button
          className="mt-4"
          onClick={action.onClick}
          asChild={!!action.href}
        >
          {action.href ? <a href={action.href}>{action.label}</a> : action.label}
        </Button>
      )}
    </div>
  )
}
```

### Error State

```tsx
// components/shared/ErrorAlert.tsx
import { AlertCircle, RotateCcw } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

interface ErrorAlertProps {
  message: string
  onRetry?: () => void
}

export function ErrorAlert({ message, onRetry }: ErrorAlertProps) {
  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Erro</AlertTitle>
      <AlertDescription className="flex items-center justify-between">
        <span>{message}</span>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RotateCcw className="h-3 w-3 mr-1" />
            Tentar Novamente
          </Button>
        )}
      </AlertDescription>
    </Alert>
  )
}
```

### Success Toast

```tsx
import { toast } from 'sonner'

toast.success('Projeto criado com sucesso')
```

---

## Performance

### Server Components por Padrão

Use Server Components para data fetching, reduzindo JavaScript no cliente.

### Next.js Image

Sempre use `next/image` em vez de `<img>`:

```tsx
import Image from 'next/image'

export function ProjectThumbnail({ url }: { url: string }) {
  return (
    <Image
      src={url}
      alt="Thumbnail"
      width={400}
      height={300}
      className="rounded-lg"
      priority={false} // true apenas acima da dobra
    />
  )
}
```

### Dynamic Imports para Modais Pesados

```tsx
import dynamic from 'next/dynamic'

const ProjectFormModal = dynamic(
  () => import('./ProjectFormModal'),
  { loading: () => <ProjectFormSkeleton /> }
)

export function ProjectPage() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setOpen(true)}>Novo Projeto</Button>
      {open && <ProjectFormModal onClose={() => setOpen(false)} />}
    </>
  )
}
```

### Suspense Boundaries

```tsx
import { Suspense } from 'react'
import { ProjectListSkeleton } from './ProjectListSkeleton'

export default async function ProjectsPage() {
  return (
    <Suspense fallback={<ProjectListSkeleton />}>
      <ProjectList />
    </Suspense>
  )
}
```

---

## Acessibilidade

### ARIA Labels

Ícones standalone sempre têm labels:

```tsx
import { Plus } from 'lucide-react'

export function NewProjectButton() {
  return (
    <button aria-label="Criar novo projeto">
      <Plus className="h-5 w-5" />
    </button>
  )
}
```

### Focus Management em Modais

shadcn/ui `Dialog` já implementa focus trap automaticamente:

```tsx
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export function ProjectModal({ open, onOpenChange }: any) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo Projeto</DialogTitle>
          <DialogDescription>Preencha os campos para criar um novo projeto.</DialogDescription>
        </DialogHeader>
        {/* Conteúdo */}
      </DialogContent>
    </Dialog>
  )
}
```

### Semantic HTML

Use `<button>`, `<a>`, `<form>`, `<nav>` apropriadamente:

```tsx
// Correto
<nav aria-label="Navegação principal">
  <a href="/projects">Projetos</a>
</nav>

// Evitar
<div onClick={() => navigate('/projects')}>Projetos</div>
```

---

## Convenções de Código

### Nomenclatura

- **Componentes**: `PascalCase`, um por arquivo
  ```tsx
  // components/ProjectCard.tsx
  export function ProjectCard() { }
  ```

- **Hooks**: `camelCase` começando com `use`
  ```ts
  // hooks/useProjects.ts
  export function useProjects() { }
  ```

- **Tipos**: `PascalCase`
  ```ts
  // types/project.ts
  export interface Project { }
  export type ProjectStatus = 'draft' | 'active' | 'completed'
  ```

- **Constantes**: `SCREAMING_SNAKE_CASE`
  ```ts
  export const MAX_UPLOAD_SIZE = 10 * 1024 * 1024 // 10MB
  ```

### Imports

Organize imports em blocos: stdlib, bibliotecas, projeto:

```tsx
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import type { Project } from '@/types/project'
```

### Sem CSS Inline, Nunca Bootstrap

Use Tailwind + shadcn/ui. Nunca CSS inline:

```tsx
// Correto
<div className="flex items-center gap-4">
  <span>Texto</span>
</div>

// Errado
<div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
  <span>Texto</span>
</div>
```

### Nunca Duplicar shadcn/ui

shadcn/ui componentes já estão em `src/components/ui/`. Nunca recrie:

```tsx
// Usar
import { Button } from '@/components/ui/button'

// Não fazer
function MyCustomButton() { } // se shadcn já tem
```

---

## Estrutura de Pastas Detalhada: Exemplo de Feature Completa

```
features/projects/
│
├── components/
│   ├── ProjectCard.tsx              # Card individual
│   ├── ProjectList.tsx              # Lista com query
│   ├── ProjectListSkeleton.tsx       # Loading skeleton
│   ├── ProjectForm.tsx              # Formulário criar/editar
│   ├── ProjectStatus.tsx            # Badge de status
│   ├── ProjectFilters.tsx           # Filtros e buscas
│   └── index.ts                     # Exports
│
├── hooks/
│   ├── useProjects.ts               # useQuery(['projects'])
│   ├── useProject.ts                # useQuery(['projects', id])
│   ├── useCreateProject.ts          # useMutation criar
│   ├── useUpdateProject.ts          # useMutation atualizar
│   ├── useDeleteProject.ts          # useMutation deletar
│   └── index.ts
│
├── types.ts                          # interface Project, type ProjectStatus
│
├── constants.ts                      # PROJECT_STATUSES, PROJECT_SORT_OPTIONS
│
└── utils.ts                          # formatProjectDate, getStatusColor, etc.
```

---

## Checklist para Nova Feature

- [ ] Criar pasta em `features/`
- [ ] Definir tipos em `types.ts`
- [ ] Criar hooks (queries + mutations) em `hooks/`
- [ ] Criar componentes em `components/`
- [ ] Implementar estados: loading, empty, error, success
- [ ] Adicionar validação com Zod em formulários
- [ ] Usar Suspense/Skeleton para Server Components
- [ ] Testar com role.dev para acessibilidade
- [ ] Passar por lighthouse (Performance > 90)

---

## Recursos e Referências

- **shadcn/ui**: https://ui.shadcn.com/ - copia o comando de instalação
- **TanStack Query**: https://tanstack.com/query/latest
- **React Hook Form**: https://react-hook-form.com/
- **Zod**: https://zod.dev/
- **Tailwind CSS**: https://tailwindcss.com/
- **Next.js Docs**: https://nextjs.org/docs
- **Lucide Icons**: https://lucide.dev/ - busque ícone por nome

---

Documento mantido por: equipe de desenvolvimento
Última atualização: 2026-07-14