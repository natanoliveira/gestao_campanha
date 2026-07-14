# BACKEND.md — Versão 1.0

Documentação técnica do backend para o produto "Gestão de Projetos Financiados por Comunidades". SaaS multi-tenant construído em Next.js 15 com arquitetura limpa.

---

## Stack Técnica

| Componente | Tecnologia |
|-----------|-----------|
| **Framework** | Next.js 15 (Route Handlers) |
| **Linguagem** | TypeScript 5+ |
| **ORM** | Prisma |
| **Banco de Dados** | PostgreSQL 15+ |
| **Autenticação** | JWT (HS256) |
| **Cache** | Redis |
| **Validação** | Zod |
| **Storage** | Cloudflare R2 / MinIO |

---

## Arquitetura de Camadas

Toda requisição segue este fluxo **obrigatório**:

```
HTTP Request
    ↓
Next.js Route Handler (/api/v1/...)
    ↓
Service Layer (regras de negócio)
    ↓
Repository Layer (acesso a dados via Prisma)
    ↓
Prisma Client ↔ PostgreSQL
```

### Regras Críticas

- **Nunca** acessar `prisma` diretamente em Route Handlers
- **Toda** regra de negócio fica no Service
- **Todo** acesso a dados fica no Repository
- **Sempre** filtrar por `organizationId` + `deletedAt: null` (multi-tenant + soft delete)

---

## Estrutura de Pastas por Módulo

Cada módulo segue este padrão:

```
src/modules/{modulo}/
├── route.ts              # Next.js Route Handler (GET, POST, PUT, DELETE)
├── service.ts            # Classe Service com lógica de negócio
├── repository.ts         # Classe Repository com queries Prisma
├── dto.ts                # Schemas Zod + tipos TypeScript (DTOs)
├── types.ts              # Tipos adicionais (enums, interfaces)
├── middleware.ts         # [Opcional] Middlewares específicos do módulo
├── utils.ts              # [Opcional] Funções utilitárias
└── __tests__/            # [Opcional] Testes unitários
    └── service.test.ts
    └── repository.test.ts
```

### Convenções de Nomenclatura

- **Arquivos**: `kebab-case` (ex: `user-repository.ts`)
- **Classes**: `PascalCase` (ex: `class UserService {}`)
- **Funções**: `camelCase` (ex: `async listUsers()`)
- **Constantes**: `UPPER_SNAKE_CASE` (ex: `const MAX_UPLOAD_SIZE = ...`)

---

## Módulos Principais

### 1. Auth (`src/modules/auth/`)

Responsável por autenticação, autorização e gestão de sessão.

**Endpoints:**
- `POST /api/v1/auth/login` — Autentica usuário, retorna JWT
- `POST /api/v1/auth/refresh` — Renova token expirado
- `POST /api/v1/auth/logout` — Invalida sessão
- `POST /api/v1/auth/verify` — Valida token

**Padrão JWT:**
```json
{
  "userId": "uuid",
  "organizationId": "uuid",
  "role": "admin|owner|member",
  "iat": 1234567890,
  "exp": 1234571490
}
```

---

### 2. Users (`src/modules/users/`)

CRUD de usuários com RBAC (Role-Based Access Control).

**Endpoints:**
- `GET /api/v1/users` — Lista usuários da organização (paginado)
- `GET /api/v1/users/:id` — Detalhe de um usuário
- `POST /api/v1/users` — Cria novo usuário
- `PUT /api/v1/users/:id` — Atualiza usuário
- `DELETE /api/v1/users/:id` — Soft delete

**Roles:**
- `admin` — Acesso total à organização
- `owner` — Proprietário da organização
- `member` — Membro padrão

---

### 3. Organizations (`src/modules/organizations/`)

Raiz do multi-tenancy. Um usuário pode pertencer a múltiplas organizações.

**Endpoints:**
- `GET /api/v1/organizations` — Lista organizações do usuário
- `GET /api/v1/organizations/:id` — Detalhe da organização
- `POST /api/v1/organizations` — Cria nova organização
- `PUT /api/v1/organizations/:id` — Atualiza organização

**Campos importantes:**
- `id` — UUID único
- `name` — Nome da organização
- `slug` — Identificador único em URL
- `ownerId` — Proprietário
- `createdAt` / `updatedAt` / `deletedAt` — Timestamps

---

### 4. Projects (`src/modules/projects/`)

Gerenciamento de projetos com máquina de estados.

**Endpoints:**
- `GET /api/v1/organizations/:orgId/projects` — Lista projetos
- `POST /api/v1/organizations/:orgId/projects` — Cria projeto
- `PUT /api/v1/organizations/:orgId/projects/:id` — Atualiza projeto
- `PATCH /api/v1/organizations/:orgId/projects/:id/status` — Muda status

**Status Machine:**
```
DRAFT → ACTIVE → PAUSED → COMPLETED
                ↓
             CANCELLED
```

---

### 5. Initiatives (`src/modules/initiatives/`)

Etapas ou marcos dentro de um projeto com cálculo automático de progresso.

**Endpoints:**
- `GET /api/v1/projects/:projectId/initiatives` — Lista iniciativas
- `POST /api/v1/projects/:projectId/initiatives` — Cria iniciativa
- `PUT /api/v1/projects/:projectId/initiatives/:id` — Atualiza

**Cálculo de Progresso:**
```typescript
progress = (completedTasks / totalTasks) * 100
```

---

### 6. Timeline (`src/modules/timeline/`)

Feed de posts, comentários e mídia vinculados a projetos.

**Endpoints:**
- `GET /api/v1/projects/:projectId/timeline` — Lista posts
- `POST /api/v1/projects/:projectId/timeline` — Cria post
- `DELETE /api/v1/projects/:projectId/timeline/:id` — Deleta post

**Tipos de mídia suportados:**
- `text` — Texto puro
- `image` — Imagem via R2
- `video` — Vídeo via R2
- `link` — URL externa com preview

---

### 7. Financial (`src/modules/financial/`)

Rastreamento de entradas, saídas e saldo por projeto.

**Endpoints:**
- `GET /api/v1/projects/:projectId/financial` — Resumo financeiro
- `POST /api/v1/projects/:projectId/financial/entries` — Registra entrada
- `POST /api/v1/projects/:projectId/financial/expenses` — Registra despesa
- `GET /api/v1/projects/:projectId/financial/summary` — Totalizações

**Cálculo de Saldo:**
```typescript
balance = sum(entries) - sum(expenses)
```

---

### 8. Uploads (`src/modules/uploads/`)

Gerenciamento de uploads para Cloudflare R2 ou MinIO com pré-assinação.

**Endpoints:**
- `POST /api/v1/uploads/signed-url` — Gera URL pré-assinada para upload
- `GET /api/v1/uploads/:id` — Metadados do upload

**Fluxo:**
1. Cliente solicita `POST /api/v1/uploads/signed-url` com `{ fileName, fileSize, mimeType }`
2. Backend gera URL pré-assinada via R2 SDK
3. Cliente faz upload direto para R2 usando URL
4. Backend salva referência em `uploads` table com `status: pending`
5. Webhook do R2 marca como `status: completed`

---

### 9. Dashboard (`src/modules/dashboard/`)

Agregações e métricas para dashboards sem filtro de auth (apenas dados da organização).

**Endpoints:**
- `GET /api/v1/organizations/:orgId/dashboard/summary` — Resumo geral
- `GET /api/v1/organizations/:orgId/dashboard/projects-stats` — Estatísticas de projetos
- `GET /api/v1/organizations/:orgId/dashboard/financial-overview` — Visão financeira

**Caching:** TTL de 5 minutos via Redis

---

### 10. Portal (`src/modules/portal/`)

Endpoints públicos **sem autenticação** para visualização de projetos ativos.

**Endpoints:**
- `GET /api/v1/portal/projects` — Lista projetos públicos (status=ACTIVE)
- `GET /api/v1/portal/projects/:slug` — Detalhe do projeto público
- `GET /api/v1/portal/projects/:slug/timeline` — Timeline pública

**Segurança:** Nunca expor `financial` ou `administratorNotes`

---

### 11. Audit (`src/modules/audit/`)

Log automático de todas as ações sensíveis.

**Evento auditado:**
```typescript
interface AuditLog {
  id: string
  organizationId: string
  userId: string
  action: "CREATE" | "UPDATE" | "DELETE" | "RESTORE"
  entity: "Project" | "User" | "Financial" | ...
  entityId: string
  changes: Record<string, { before: any; after: any }>
  ipAddress: string
  userAgent: string
  createdAt: Date
}
```

**Trigger automático:** Ao final de toda operação bem-sucedida, chamar `auditService.log()`

---

## Padrões de Código

### Route Handler Pattern

```typescript
// src/modules/projects/route.ts
import { NextRequest, NextResponse } from "next/server"
import { authenticate, authorize } from "@/middlewares"
import { ProjectService } from "./service"
import { ProjectRepository } from "./repository"
import { ListProjectsDTO } from "./dto"

const projectService = new ProjectService(new ProjectRepository())

export async function GET(req: NextRequest) {
  try {
    const { userId, organizationId } = await authenticate(req)
    
    await authorize(req, ["admin", "member"])
    
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "10")
    
    const result = await projectService.list({
      organizationId,
      page,
      limit,
    })
    
    return NextResponse.json(result)
  } catch (error) {
    return handleError(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const { organizationId } = await authenticate(req)
    
    const body = await req.json()
    const payload = ListProjectsDTO.create().parse(body)
    
    const result = await projectService.create({
      organizationId,
      ...payload,
    })
    
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    return handleError(error)
  }
}
```

### Service Pattern

```typescript
// src/modules/projects/service.ts
import { ProjectRepository } from "./repository"
import { AppError } from "@/utils/errors"

export class ProjectService {
  constructor(private repository: ProjectRepository) {}

  async list(params: { organizationId: string; page: number; limit: number }) {
    const { organizationId, page, limit } = params
    
    // Lógica de negócio: validação, cálculos, orquestração
    if (limit > 100) {
      throw new AppError("Limit máximo é 100", 400)
    }

    const projects = await this.repository.findAll({
      organizationId,
      skip: (page - 1) * limit,
      take: limit,
    })

    const total = await this.repository.count({ organizationId })

    return {
      data: projects,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    }
  }

  async create(params: {
    organizationId: string
    name: string
    description?: string
  }) {
    const { organizationId, name, description } = params

    // Validação de regra de negócio
    const existing = await this.repository.findByName({
      organizationId,
      name,
    })
    if (existing) {
      throw new AppError("Projeto com este nome já existe", 409)
    }

    return this.repository.create({
      organizationId,
      name,
      description,
      status: "DRAFT",
    })
  }

  async updateStatus(params: {
    organizationId: string
    projectId: string
    newStatus: ProjectStatus
  }) {
    const { organizationId, projectId, newStatus } = params

    const project = await this.repository.findById({
      organizationId,
      projectId,
    })
    if (!project) {
      throw new AppError("Projeto não encontrado", 404)
    }

    // Máquina de estados: validar transição permitida
    const validTransitions = this.getValidTransitions(project.status)
    if (!validTransitions.includes(newStatus)) {
      throw new AppError(
        `Transição de ${project.status} → ${newStatus} não permitida`,
        400
      )
    }

    return this.repository.updateStatus({
      projectId,
      status: newStatus,
    })
  }

  private getValidTransitions(currentStatus: ProjectStatus): ProjectStatus[] {
    const transitions: Record<ProjectStatus, ProjectStatus[]> = {
      DRAFT: ["ACTIVE", "CANCELLED"],
      ACTIVE: ["PAUSED", "COMPLETED", "CANCELLED"],
      PAUSED: ["ACTIVE", "CANCELLED"],
      COMPLETED: [],
      CANCELLED: [],
    }
    return transitions[currentStatus] || []
  }
}
```

### Repository Pattern

```typescript
// src/modules/projects/repository.ts
import prisma from "@/lib/prisma"

export class ProjectRepository {
  async findAll(params: {
    organizationId: string
    skip: number
    take: number
  }) {
    const { organizationId, skip, take } = params

    // ponytail: sempre incluir organizationId + deletedAt: null
    return prisma.project.findMany({
      where: {
        organizationId,
        deletedAt: null, // soft delete
      },
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        // nunca usar SELECT *
      },
      skip,
      take,
      orderBy: { createdAt: "desc" },
    })
  }

  async findById(params: {
    organizationId: string
    projectId: string
  }) {
    const { organizationId, projectId } = params

    return prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    })
  }

  async create(params: {
    organizationId: string
    name: string
    description?: string
    status: ProjectStatus
  }) {
    const { organizationId, name, description, status } = params

    return prisma.project.create({
      data: {
        organizationId,
        name,
        description,
        status,
      },
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        createdAt: true,
      },
    })
  }

  async updateStatus(params: {
    projectId: string
    status: ProjectStatus
  }) {
    const { projectId, status } = params

    return prisma.project.update({
      where: { id: projectId },
      data: { status, updatedAt: new Date() },
      select: { id: true, status: true, updatedAt: true },
    })
  }

  async count(params: { organizationId: string }) {
    const { organizationId } = params

    return prisma.project.count({
      where: {
        organizationId,
        deletedAt: null,
      },
    })
  }

  async delete(params: {
    organizationId: string
    projectId: string
  }) {
    const { organizationId, projectId } = params

    // soft delete
    return prisma.project.update({
      where: { id: projectId },
      data: { deletedAt: new Date() },
      select: { id: true },
    })
  }
}
```

### DTO Pattern com Zod

```typescript
// src/modules/projects/dto.ts
import { z } from "zod"

// Schema Zod
export const CreateProjectSchema = z.object({
  name: z
    .string()
    .min(3, "Nome deve ter no mínimo 3 caracteres")
    .max(100, "Nome deve ter no máximo 100 caracteres"),
  description: z
    .string()
    .max(1000, "Descrição deve ter no máximo 1000 caracteres")
    .optional(),
  targetAmount: z
    .number()
    .positive("Valor deve ser positivo")
    .optional(),
})

export const UpdateProjectSchema = CreateProjectSchema.partial()

export const ListProjectsSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(10),
  status: z.enum(["DRAFT", "ACTIVE", "PAUSED", "COMPLETED", "CANCELLED"]).optional(),
  search: z.string().optional(),
})

// Tipos TypeScript (inferidos do Zod)
export type CreateProjectDTO = z.infer<typeof CreateProjectSchema>
export type UpdateProjectDTO = z.infer<typeof UpdateProjectSchema>
export type ListProjectsDTO = z.infer<typeof ListProjectsSchema>

// Classe para facilitar validação
export class ProjectDTOs {
  static create() {
    return CreateProjectSchema
  }

  static update() {
    return UpdateProjectSchema
  }

  static list() {
    return ListProjectsSchema
  }
}
```

---

## Middlewares

Implementar como funções reutilizáveis nos Route Handlers.

### Authenticate Middleware

```typescript
// src/middlewares/authenticate.ts
import { NextRequest } from "next/server"
import { AppError } from "@/utils/errors"
import jwt from "jsonwebtoken"

export interface AuthContext {
  userId: string
  organizationId: string
  role: "admin" | "owner" | "member"
}

export async function authenticate(
  req: NextRequest
): Promise<AuthContext> {
  const authHeader = req.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    throw new AppError("Token não fornecido", 401)
  }

  const token = authHeader.slice(7)

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as AuthContext
    return decoded
  } catch {
    throw new AppError("Token inválido ou expirado", 401)
  }
}
```

### Authorize Middleware (RBAC)

```typescript
// src/middlewares/authorize.ts
import { NextRequest } from "next/server"
import { AppError } from "@/utils/errors"
import { authenticate } from "./authenticate"

export async function authorize(
  req: NextRequest,
  requiredRoles: string[]
): Promise<void> {
  const { role } = await authenticate(req)

  if (!requiredRoles.includes(role)) {
    throw new AppError("Acesso negado", 403)
  }
}
```

### Rate Limiter Middleware

```typescript
// src/middlewares/rate-limiter.ts
import { NextRequest } from "next/server"
import { AppError } from "@/utils/errors"
import redis from "@/lib/redis"

export async function rateLimiter(
  req: NextRequest,
  limit: number = 60,
  window: number = 60
): Promise<void> {
  const ip = req.ip || "unknown"
  const key = `ratelimit:${ip}`

  const current = await redis.incr(key)
  if (current === 1) {
    await redis.expire(key, window)
  }

  if (current > limit) {
    throw new AppError("Rate limit excedido", 429)
  }
}
```

### Audit Logger Middleware

```typescript
// src/middlewares/audit-logger.ts
import { NextRequest } from "next/server"
import { AuditService } from "@/modules/audit/service"

const auditService = new AuditService(new AuditRepository())

export async function auditLogger(
  req: NextRequest,
  context: {
    userId: string
    organizationId: string
    action: "CREATE" | "UPDATE" | "DELETE" | "RESTORE"
    entity: string
    entityId: string
    changes?: Record<string, { before: any; after: any }>
  }
): Promise<void> {
  const ip = req.ip || "unknown"
  const userAgent = req.headers.get("user-agent") || ""

  await auditService.log({
    ...context,
    ipAddress: ip,
    userAgent,
  })
}
```

---

## Validação com Zod

Toda entrada de usuário deve ser validada com Zod **no Route Handler ou Service**, nunca no Repository.

```typescript
// Exemplo: validação em Route Handler
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Validar antes de passar ao Service
    const payload = CreateProjectSchema.parse(body)

    const result = await projectService.create({
      organizationId,
      ...payload,
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Dados inválidos",
            details: error.errors,
          },
        },
        { status: 400 }
      )
    }
    return handleError(error)
  }
}
```

---

## Soft Delete

**Nunca** executar `DELETE` no banco de dados. Sempre manter registro.

```typescript
// ❌ PROIBIDO
await prisma.project.delete({ where: { id } })

// ✅ OBRIGATÓRIO
await prisma.project.update({
  where: { id },
  data: { deletedAt: new Date() },
})

// ✅ OBRIGATÓRIO em toda query
await prisma.project.findMany({
  where: {
    organizationId,
    deletedAt: null, // sempre filtrar
  },
})
```

**Schema Prisma:**
```prisma
model Project {
  id            String   @id @default(cuid())
  organizationId String
  name          String
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  deletedAt     DateTime? // soft delete marker
  
  @@index([organizationId, deletedAt]) // índice crítico
}
```

---

## Multi-Tenant

Toda query **OBRIGATORIAMENTE** inclui `organizationId` no `where`.

```typescript
// ❌ NUNCA FAZER ISSO
prisma.project.findMany() // acesso sem tenant!

// ✅ SEMPRE FAZER ISSO
prisma.project.findMany({
  where: {
    organizationId, // tenant isolamento
    deletedAt: null,
  },
})
```

**Fluxo de extração de organizationId:**

1. JWT contém `organizationId`
2. Middleware `authenticate()` extrai e valida
3. Route Handler passa para Service
4. Service passa para Repository
5. Repository filtra em todas as queries

---

## Cache com Redis

Use Redis para listagens pesadas, dashboards e dados imutáveis por período.

### Quando Usar

- Listagens com muitos registros
- Agregações e dashboards
- Dados que mudam raramente
- Não usar para dados críticos/financeiros

### Padrão: Cache-Aside

```typescript
// src/modules/dashboard/service.ts
import redis from "@/lib/redis"

const CACHE_TTL = 300 // 5 minutos

export class DashboardService {
  constructor(private repository: DashboardRepository) {}

  async getSummary(organizationId: string) {
    const cacheKey = `dashboard:summary:${organizationId}`

    // Tentar cache
    const cached = await redis.get(cacheKey)
    if (cached) {
      return JSON.parse(cached)
    }

    // Cache miss: carregar dados
    const summary = await this.repository.getSummary(organizationId)

    // Salvar no cache
    await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(summary))

    return summary
  }

  // Invalidar cache ao atualizar dados
  async updateProject(projectId: string, organizationId: string) {
    await this.repository.update(projectId, { ... })
    
    // Invalidar cache do dashboard
    await redis.del(`dashboard:summary:${organizationId}`)
  }
}
```

### Invalidação

```typescript
// Após criar, atualizar ou deletar qualquer coisa crítica
await redis.del(`dashboard:summary:${organizationId}`)
await redis.del(`projects:list:${organizationId}`)
```

---

## Upload com R2/MinIO

Fluxo de upload com pré-assinação para melhor performance e segurança.

```typescript
// src/modules/uploads/service.ts
import S3Client from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

export class UploadService {
  private s3Client: S3Client

  constructor() {
    this.s3Client = new S3Client({
      region: "auto",
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY!,
        secretAccessKey: process.env.R2_SECRET_KEY!,
      },
      endpoint: process.env.R2_ENDPOINT!,
    })
  }

  async getSignedUrl(params: {
    organizationId: string
    fileName: string
    fileSize: number
    mimeType: string
  }) {
    const { organizationId, fileName, fileSize, mimeType } = params

    // Validação
    if (fileSize > 50 * 1024 * 1024) {
      throw new AppError("Arquivo exceeds 50MB", 400)
    }

    const allowedMimes = ["image/png", "image/jpeg", "video/mp4"]
    if (!allowedMimes.includes(mimeType)) {
      throw new AppError("Tipo de arquivo não suportado", 400)
    }

    // Gerar key única
    const key = `${organizationId}/${Date.now()}-${fileName}`

    // Gerar URL pré-assinada
    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET!,
      Key: key,
      ContentType: mimeType,
      ContentLength: fileSize,
    })

    const url = await getSignedUrl(this.s3Client, command, {
      expiresIn: 3600, // 1 hora
    })

    // Salvar referência no DB
    const upload = await this.repository.create({
      organizationId,
      fileName,
      fileSize,
      mimeType,
      r2Key: key,
      status: "pending",
    })

    return {
      uploadId: upload.id,
      signedUrl: url,
      expiresIn: 3600,
    }
  }

  async markAsComplete(uploadId: string) {
    return this.repository.update(uploadId, { status: "completed" })
  }
}
```

**Route Handler:**
```typescript
// src/modules/uploads/route.ts
export async function POST(req: NextRequest) {
  try {
    const { organizationId } = await authenticate(req)

    const body = await req.json()
    const { fileName, fileSize, mimeType } = GetSignedUrlSchema.parse(body)

    const result = await uploadService.getSignedUrl({
      organizationId,
      fileName,
      fileSize,
      mimeType,
    })

    return NextResponse.json(result)
  } catch (error) {
    return handleError(error)
  }
}
```

---

## Tratamento de Erros

Centralizar tratamento com classe `AppError` customizada.

```typescript
// src/utils/errors.ts
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code: string = "INTERNAL_ERROR"
  ) {
    super(message)
    this.name = "AppError"
  }
}

// src/utils/error-handler.ts
import { NextResponse } from "next/server"

export function handleError(error: any): NextResponse {
  console.error(error)

  if (error instanceof AppError) {
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
        },
      },
      { status: error.statusCode }
    )
  }

  if (error instanceof z.ZodError) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Dados inválidos",
          details: error.errors,
        },
      },
      { status: 400 }
    )
  }

  // Erro genérico
  return NextResponse.json(
    {
      error: {
        code: "INTERNAL_ERROR",
        message: "Erro interno do servidor",
      },
    },
    { status: 500 }
  )
}
```

**Uso em Route Handler:**
```typescript
export async function GET(req: NextRequest) {
  try {
    // lógica...
  } catch (error) {
    return handleError(error)
  }
}
```

---

## Convenções Críticas

| Convenção | Exemplo | Razão |
|-----------|---------|-------|
| **Nunca SELECT *** | `select: { id: true, name: true }` | Performance, reduz payload |
| **Sempre paginar** | `skip: (page-1)*limit, take: limit` | Memória, performance |
| **Sempre ordernar** | `orderBy: { createdAt: 'desc' }` | Consistência de dados |
| **Sempre filter soft delete** | `where: { deletedAt: null }` | Isolamento de dados |
| **Sempre filter tenant** | `where: { organizationId }` | Segurança multi-tenant |
| **Sempre usar índices** | `@@index([organizationId, deletedAt])` | Query speed |
| **DTO em input** | `parse()` antes de usar | Validação tipada |
| **Sem N+1** | Usar `include` / `select` | Performance |

---

## Exemplo Completo: CRUD de Projeto

**1. DTO (src/modules/projects/dto.ts)**
```typescript
import { z } from "zod"

export const CreateProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
})

export type CreateProjectDTO = z.infer<typeof CreateProjectSchema>
```

**2. Repository (src/modules/projects/repository.ts)**
```typescript
export class ProjectRepository {
  async create(data: {
    organizationId: string
    name: string
    description?: string
  }) {
    return prisma.project.create({
      data: {
        organizationId: data.organizationId,
        name: data.name,
        description: data.description,
        status: "DRAFT",
      },
      select: { id: true, name: true, status: true, createdAt: true },
    })
  }

  async findById(organizationId: string, projectId: string) {
    return prisma.project.findFirst({
      where: { id: projectId, organizationId, deletedAt: null },
      select: { id: true, name: true, description: true, status: true },
    })
  }
}
```

**3. Service (src/modules/projects/service.ts)**
```typescript
export class ProjectService {
  constructor(private repo: ProjectRepository) {}

  async create(params: {
    organizationId: string
    name: string
    description?: string
  }) {
    return this.repo.create(params)
  }

  async findById(organizationId: string, projectId: string) {
    const project = await this.repo.findById(organizationId, projectId)
    if (!project) {
      throw new AppError("Projeto não encontrado", 404)
    }
    return project
  }
}
```

**4. Route (src/modules/projects/route.ts)**
```typescript
const service = new ProjectService(new ProjectRepository())

export async function GET(req: NextRequest) {
  try {
    const { organizationId } = await authenticate(req)
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")

    if (!id) {
      throw new AppError("ID é obrigatório", 400)
    }

    const project = await service.findById(organizationId, id)
    return NextResponse.json(project)
  } catch (error) {
    return handleError(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const { organizationId } = await authenticate(req)
    const body = await req.json()
    
    const payload = CreateProjectSchema.parse(body)

    const project = await service.create({
      organizationId,
      ...payload,
    })

    return NextResponse.json(project, { status: 201 })
  } catch (error) {
    return handleError(error)
  }
}
```

---

## Checklist de Implementação

- [ ] Criar estrutura de pasta do módulo
- [ ] Definir DTOs com Zod
- [ ] Implementar Repository com queries Prisma
- [ ] Implementar Service com lógica de negócio
- [ ] Criar Route Handler com middlewares
- [ ] Adicionar validação de entrada
- [ ] Implementar tratamento de erros
- [ ] Adicionar logs de auditoria se necessário
- [ ] Configurar cache se aplicável
- [ ] Escrever testes (mínimo 80% cobertura)
- [ ] Documentar endpoints em Swagger
- [ ] Revisar segurança (JWT, RBAC, tenant)

---

## Referências

- [Prisma Docs](https://www.prisma.io/docs/)
- [Next.js Route Handlers](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [Zod Documentation](https://zod.dev)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)

---

**Versão:** 1.0  
**Última atualização:** 2026-07-14  
**Mantido por:** Equipe de Backend
