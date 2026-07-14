# ARCHITECTURE.md — Versão 1.0

## Gestão de Projetos Financiados por Comunidades

**Data:** 14 de Julho de 2026  
**Escopo:** Arquitetura Técnica do SaaS Multi-Tenant  
**Stack:** Next.js 15+, React 19, TypeScript, PostgreSQL, Prisma, Redis, Cloudflare R2/MinIO

---

## 1. Visão Geral da Arquitetura

### 1.1 Contexto do Sistema

O sistema "Gestão de Projetos Financiados por Comunidades" é uma plataforma **SaaS Multi-Tenant** que permite organizações gerenciar projetos, iniciativas, timelines e prestação de contas com transparência pública. A arquitetura foi projetada para:

- **Isolamento de Dados:** Cada tenant tem seus dados isolados (tenant-scoped queries)
- **Alta Escalabilidade:** Suporta crescimento exponencial de usuários e dados
- **Segurança:** JWT, LGPD compliance, rate limiting, auditoria completa
- **Performance:** Server Components, cache Redis, query optimization
- **DevOps:** Docker, CI/CD com GitHub Actions, zero-downtime deployments

### 1.2 Diagrama Arquitetural Geral

```mermaid
graph TB
    subgraph "Client Layer"
        WEB["🌐 Next.js Web<br/>React 19<br/>TypeScript"]
        MOBILE["📱 Mobile Web<br/>PWA/Responsive"]
    end

    subgraph "CDN & Static"
        CDN["🚀 Cloudflare CDN<br/>Static Assets<br/>Images, CSS, JS"]
    end

    subgraph "API Gateway"
        NGINX["⚙️ Nginx Reverse Proxy<br/>SSL/TLS<br/>Load Balancing"]
    end

    subgraph "Application Layer"
        HANDLER["📨 Route Handlers<br/>Next.js API Routes<br/>Middleware Stack"]
        AUTH["🔐 Auth Service<br/>JWT<br/>Session Mgmt"]
        TENANT["👥 Tenant Middleware<br/>Tenant Resolution<br/>Isolation"]
    end

    subgraph "Business Logic"
        SERVICE["🎯 Services<br/>Organizations<br/>Projects<br/>Initiatives<br/>Timeline<br/>Accounts<br/>Portal<br/>Dashboard"]
    end

    subgraph "Data Access"
        REPO["🗄️ Repositories<br/>Query Builder<br/>Type-Safe"]
        PRISMA["🔗 Prisma ORM<br/>Migrations<br/>Type Generation"]
    end

    subgraph "Infrastructure"
        DB["🗄️ PostgreSQL<br/>Multi-Tenant<br/>Indexes<br/>Replication"]
        REDIS["⚡ Redis Cache<br/>Sessions<br/>Rate Limits<br/>Queue"]
        STORAGE["📦 Cloudflare R2<br/>MinIO Fallback<br/>File Upload<br/>Streaming"]
        LOG["📊 Logs<br/>Audit Trail<br/>Monitoring"]
    end

    subgraph "External Services"
        EMAIL["📧 Email Service<br/>Notifications<br/>Reports"]
        ANALYTICS["📈 Analytics<br/>Tracking<br/>Metrics"]
    end

    WEB --> CDN
    MOBILE --> CDN
    CDN --> NGINX
    NGINX --> HANDLER
    
    HANDLER --> AUTH
    HANDLER --> TENANT
    AUTH --> SERVICE
    TENANT --> SERVICE
    
    SERVICE --> REPO
    REPO --> PRISMA
    PRISMA --> DB
    
    SERVICE --> REDIS
    SERVICE --> STORAGE
    SERVICE --> LOG
    
    SERVICE --> EMAIL
    SERVICE --> ANALYTICS
```

---

## 2. Fluxo de Requisição (Request Lifecycle)

### 2.1 Arquitetura em Camadas

Cada requisição segue um fluxo determinístico através de 6 camadas:

```
Cliente (Browser/App)
       ↓
[1] Middleware Stack (JWT, Tenant, Rate Limit, Audit)
       ↓
[2] Route Handler (Next.js API Route)
       ↓
[3] Service Layer (Business Logic)
       ↓
[4] Repository Layer (Data Access)
       ↓
[5] Prisma ORM (Query Building)
       ↓
[6] PostgreSQL (Persistence)
       ↓
       Response
```

### 2.2 Exemplo Prático: Criar Projeto

```mermaid
sequenceDiagram
    participant Client as 👤 Client
    participant NH as 📨 Next.js Handler
    participant MW as 🔒 Middleware Stack
    participant SVC as 🎯 Service
    participant REPO as 🗄️ Repository
    participant PRISMA as 🔗 Prisma
    participant DB as 🗄️ PostgreSQL

    Client->>NH: POST /api/projects<br/>{name, description}
    NH->>MW: verificarJWT()<br/>resolverTenant()
    MW->>MW: validarToken()<br/>extrairTenantId()
    MW-->>NH: {userId, tenantId}

    NH->>SVC: createProject({...payload})
    SVC->>SVC: validarComZod()<br/>verificarPermissões()
    SVC->>REPO: salvarProjeto({...dados})
    
    REPO->>PRISMA: prisma.project.create({<br/>data: {...},<br/>where: {tenantId}<br/>})
    PRISMA->>DB: INSERT INTO projects...
    DB-->>PRISMA: {id, ...}
    PRISMA-->>REPO: Project Object
    
    REPO-->>SVC: Project Object
    SVC->>SVC: registrarAuditoria()<br/>cache.invalidar()
    SVC-->>NH: {id, status: 'created'}
    
    NH-->>Client: 201 Created<br/>{project}
```

### 2.3 Fluxo de Tratamento de Erros

```mermaid
graph TD
    REQ["📨 Requisição Chega"]
    TRY["🔄 Try Block"]
    CATCH["❌ Catch Erro"]
    TYPE{Tipo de Erro?}
    
    ZVAL["📋 Validação Zod"]
    AUTH["🔐 Autorização JWT"]
    DB["🗄️ Database"]
    EXT["🌐 Externo"]
    UNKNOWN["❓ Desconhecido"]
    
    LOG["📊 Log Erro"]
    HANDLER["🎯 Handler Error"]
    RESPONSE["📤 JSON Response"]
    
    REQ --> TRY
    TRY --> CATCH
    CATCH --> TYPE
    
    TYPE -->|Zod| ZVAL
    TYPE -->|JWT/Auth| AUTH
    TYPE -->|Prisma| DB
    TYPE -->|External API| EXT
    TYPE -->|Outro| UNKNOWN
    
    ZVAL --> LOG
    AUTH --> LOG
    DB --> LOG
    EXT --> LOG
    UNKNOWN --> LOG
    
    LOG --> HANDLER
    HANDLER --> RESPONSE
    
    RESPONSE -->|400| Client["❌ Bad Request"]
    RESPONSE -->|401| Client2["🔐 Unauthorized"]
    RESPONSE -->|403| Client3["🚫 Forbidden"]
    RESPONSE -->|409| Client4["⚠️ Conflict"]
    RESPONSE -->|500| Client5["💥 Server Error"]
```

---

## 3. Multi-Tenancy

### 3.1 Estratégia de Isolamento

O sistema implementa **Row-Level Security (RLS)** de duas formas:

#### 3.1.1 Nível Application

```typescript
// Todas as queries incluem verificação de tenant
interface QueryContext {
  tenantId: string;
  userId: string;
  role: 'admin' | 'member' | 'viewer';
}

// Repository Pattern com segurança integrada
class ProjectRepository {
  async findById(id: string, ctx: QueryContext) {
    // OBRIGATÓRIO: validar tenantId
    return prisma.project.findUnique({
      where: {
        id_tenantId: { // Unique constraint
          id,
          tenantId: ctx.tenantId
        }
      }
    });
  }

  async listByTenant(ctx: QueryContext) {
    // OBRIGATÓRIO: filtrar por tenantId
    return prisma.project.findMany({
      where: { tenantId: ctx.tenantId }
    });
  }
}
```

#### 3.1.2 Nível Database

```sql
-- Schema Multi-Tenant
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(id, tenant_id) -- Compound unique
);

-- Índices para performance
CREATE INDEX idx_projects_tenant ON projects(tenant_id);
CREATE INDEX idx_projects_tenant_id ON projects(tenant_id, id);
CREATE INDEX idx_projects_created ON projects(tenant_id, created_at DESC);

-- Row-Level Security (PostgreSQL)
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY projects_tenant_isolation ON projects
  FOR ALL USING (tenant_id = current_setting('app.tenant_id')::uuid);
```

### 3.2 Tenant Resolution Middleware

```typescript
// middleware/tenantMiddleware.ts
import { NextRequest, NextResponse } from 'next/server';

export async function tenantMiddleware(request: NextRequest) {
  // 1. Extrair tenant do JWT token
  const token = request.headers.get('Authorization')?.split(' ')[1];
  const decoded = await verifyJWT(token);
  const tenantId = decoded.tenantId;

  // 2. Validar tenant (opcional: banco de dados)
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId }
  });

  if (!tenant) {
    return NextResponse.json(
      { error: 'Tenant not found' },
      { status: 403 }
    );
  }

  // 3. Adicionar ao contexto da requisição
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-tenant-id', tenantId);
  requestHeaders.set('x-user-id', decoded.userId);

  return NextResponse.next({
    request: {
      headers: requestHeaders
    }
  });
}
```

### 3.3 Isolamento por URL (Subdomínio Opcional)

```typescript
// Suporte opcional para subdomínios (org.platform.com vs platform.com/org)
function extractTenantFromRequest(req: NextRequest): string {
  // 1. Verificar subdomain
  const host = req.headers.get('host');
  const subdomain = host?.split('.')[0];

  if (subdomain && subdomain !== 'www') {
    return subdomain; // tenant.platform.com
  }

  // 2. Verificar path
  const pathname = req.nextUrl.pathname;
  const match = pathname.match(/^\/orgs\/([^\/]+)\//);
  if (match) {
    return match[1]; // /orgs/:slug/...
  }

  // 3. Verificar JWT
  const token = req.headers.get('Authorization');
  return extractTenantFromJWT(token);
}
```

---

## 4. Estrutura de Pastas

```
src/
├── app/                          # Next.js App Router
│   ├── layout.tsx               # Root layout
│   ├── error.tsx                # Global error boundary
│   ├── not-found.tsx            # 404
│   │
│   ├── (auth)/                  # Authenticated routes (protected)
│   │   ├── layout.tsx           # Auth layout
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── projects/
│   │   │   ├── page.tsx
│   │   │   ├── [id]/page.tsx
│   │   │   └── new/page.tsx
│   │   ├── initiatives/
│   │   ├── timeline/
│   │   ├── accounts/            # Prestação de Contas
│   │   └── settings/
│   │
│   ├── (public)/                # Public routes (sem autenticação)
│   │   ├── layout.tsx
│   │   ├── page.tsx             # Homepage
│   │   ├── auth/
│   │   │   ├── login/page.tsx
│   │   │   ├── signup/page.tsx
│   │   │   └── forgot-password/page.tsx
│   │   └── [slug]/              # Portal público por projeto
│   │       ├── page.tsx
│   │       └── initiatives/page.tsx
│   │
│   └── api/                     # Route Handlers
│       ├── auth/
│       │   ├── login/route.ts
│       │   ├── signup/route.ts
│       │   ├── refresh/route.ts
│       │   └── logout/route.ts
│       │
│       ├── projects/
│       │   ├── route.ts         # GET, POST
│       │   └── [id]/
│       │       ├── route.ts     # GET, PUT, DELETE
│       │       ├── initiatives/route.ts
│       │       └── timeline/route.ts
│       │
│       ├── initiatives/
│       │   ├── route.ts
│       │   └── [id]/route.ts
│       │
│       ├── accounts/            # Prestação de Contas
│       │   ├── route.ts
│       │   └── [id]/route.ts
│       │
│       ├── uploads/
│       │   └── route.ts         # Multipart form-data
│       │
│       ├── organizations/
│       │   └── route.ts
│       │
│       ├── portal/
│       │   └── [slug]/
│       │       ├── projects/route.ts
│       │       └── initiatives/route.ts
│       │
│       └── health/
│           └── route.ts         # Healthcheck
│
├── components/                   # UI Components (reutilizáveis)
│   ├── ui/                      # shadcn/ui + customizados
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── form.tsx
│   │   ├── input.tsx
│   │   ├── table.tsx
│   │   └── ...
│   │
│   ├── common/                  # Componentes globais
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   ├── Footer.tsx
│   │   └── Navigation.tsx
│   │
│   ├── layouts/
│   │   ├── AuthLayout.tsx
│   │   ├── PublicLayout.tsx
│   │   └── DashboardLayout.tsx
│   │
│   └── modules/                 # Componentes específicos por domínio
│       ├── projects/
│       │   ├── ProjectCard.tsx
│       │   ├── ProjectForm.tsx
│       │   ├── ProjectList.tsx
│       │   └── ProjectDetail.tsx
│       ├── initiatives/
│       ├── timeline/
│       ├── accounts/
│       └── dashboard/
│
├── modules/                     # Lógica de negócio por domínio
│   ├── organizations/
│   │   ├── service.ts
│   │   ├── repository.ts
│   │   ├── types.ts
│   │   ├── validator.ts
│   │   └── constants.ts
│   │
│   ├── projects/
│   │   ├── service.ts           # Orquestração de negócio
│   │   ├── repository.ts        # Acesso a dados
│   │   ├── types.ts             # Tipos/Interfaces
│   │   ├── validator.ts         # Schemas Zod
│   │   └── constants.ts
│   │
│   ├── initiatives/
│   ├── timeline/
│   ├── accounts/                # Prestação de Contas
│   ├── portal/                  # Portal Público
│   └── dashboard/
│
├── lib/                         # Utilidades compartilhadas
│   ├── prisma.ts               # Prisma Client singleton
│   ├── jwt.ts                  # JWT verify/sign
│   ├── redis.ts                # Redis client
│   ├── storage.ts              # R2/MinIO client
│   ├── errors.ts               # Custom errors
│   ├── utils.ts                # Helpers gerais
│   └── constants.ts            # Constantes globais
│
├── middlewares/                 # Express-like middlewares
│   ├── authMiddleware.ts       # JWT verification
│   ├── tenantMiddleware.ts     # Tenant resolution
│   ├── rateLimitMiddleware.ts  # Rate limiting
│   ├── auditMiddleware.ts      # Audit logging
│   └── errorMiddleware.ts      # Error handling
│
├── repositories/                # Data Access Objects
│   ├── projectRepository.ts
│   ├── initiativeRepository.ts
│   ├── userRepository.ts
│   └── ...
│
├── services/                    # Business Logic Services
│   ├── projectService.ts
│   ├── initiativeService.ts
│   ├── authService.ts
│   └── ...
│
├── validators/                  # Zod Schemas
│   ├── projectValidator.ts
│   ├── initiativeValidator.ts
│   ├── userValidator.ts
│   └── ...
│
├── types/                       # TypeScript Type Definitions
│   ├── api.ts                  # API request/response types
│   ├── domain.ts               # Domain models
│   ├── db.ts                   # Database types
│   └── index.ts
│
├── hooks/                       # React Hooks
│   ├── useAuth.ts              # Auth context
│   ├── useProject.ts           # Project queries
│   ├── useTenant.ts            # Tenant context
│   └── ...
│
├── styles/
│   ├── globals.css
│   └── variables.css
│
├── env.ts                       # Environment variables (type-safe)
├── constants.ts                 # Constantes globais
└── config.ts                    # Configurações

prisma/
├── schema.prisma               # Database schema
├── migrations/                 # Migration history
└── seed.ts                     # Seed data

public/
├── images/
├── icons/
└── fonts/

.github/
└── workflows/                  # CI/CD pipelines
    ├── test.yml
    ├── deploy.yml
    └── lint.yml

docker/
├── Dockerfile
├── docker-compose.yml
└── nginx.conf
```

---

## 5. Camadas Arquiteturais

### 5.1 Route Handler Layer

**Responsabilidade:** Receber requisição HTTP, delegar para service, retornar resposta.

```typescript
// src/app/api/projects/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { projectService } from '@/services/projectService';
import { projectValidator } from '@/validators/projectValidator';
import { getContext } from '@/middlewares/authMiddleware';
import { handleError } from '@/lib/errors';

export async function GET(request: NextRequest) {
  try {
    const context = await getContext(request);
    const projects = await projectService.listByTenant(context);
    
    return NextResponse.json(projects, { status: 200 });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getContext(request);
    const body = await request.json();
    
    // Validar input com Zod
    const data = projectValidator.createSchema.parse(body);
    
    const project = await projectService.create(context, data);
    
    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
```

### 5.2 Service Layer

**Responsabilidade:** Orquestar lógica de negócio, validações, transações, cache, auditoria.

```typescript
// src/services/projectService.ts
import { prisma } from '@/lib/prisma';
import { ProjectRepository } from '@/repositories/projectRepository';
import { AuditService } from '@/services/auditService';
import { CacheService } from '@/services/cacheService';
import { NotificationService } from '@/services/notificationService';
import type { QueryContext } from '@/types/api';
import type { CreateProjectInput } from '@/validators/projectValidator';

export class ProjectService {
  private repository = new ProjectRepository();
  private auditService = new AuditService();
  private cacheService = new CacheService();
  private notificationService = new NotificationService();

  async create(context: QueryContext, input: CreateProjectInput) {
    // 1. Validar permissões
    if (context.role !== 'admin') {
      throw new ForbiddenError('Apenas admins podem criar projetos');
    }

    // 2. Verificar quota/limite
    const count = await this.repository.countByTenant(context.tenantId);
    if (count >= MAX_PROJECTS_PER_TENANT) {
      throw new QuotaExceededError('Limite de projetos atingido');
    }

    // 3. Usar transação Prisma
    const project = await prisma.$transaction(async (tx) => {
      // 3a. Salvar projeto
      const saved = await this.repository.create(
        {
          ...input,
          tenantId: context.tenantId,
          createdBy: context.userId
        },
        tx
      );

      // 3b. Registrar auditoria
      await this.auditService.log({
        tenantId: context.tenantId,
        userId: context.userId,
        action: 'PROJECT_CREATED',
        resourceId: saved.id,
        changes: input
      }, tx);

      return saved;
    });

    // 4. Invalidar cache
    this.cacheService.invalidate(`projects:${context.tenantId}`);

    // 5. Notificar stakeholders
    await this.notificationService.notify({
      type: 'PROJECT_CREATED',
      tenantId: context.tenantId,
      projectId: project.id
    });

    return project;
  }

  async listByTenant(context: QueryContext) {
    // 1. Tentar cache
    const cacheKey = `projects:${context.tenantId}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    // 2. Query no banco
    const projects = await this.repository.listByTenant(context.tenantId);

    // 3. Cachear resultado
    await this.cacheService.set(cacheKey, projects, 3600); // 1 hora

    return projects;
  }
}

export const projectService = new ProjectService();
```

### 5.3 Repository Layer

**Responsabilidade:** Abstrair acesso a dados, construir queries, garantir isolamento multi-tenant.

```typescript
// src/repositories/projectRepository.ts
import { prisma } from '@/lib/prisma';
import type { Project, Prisma } from '@prisma/client';

export class ProjectRepository {
  // CREATE
  async create(
    data: Prisma.ProjectCreateInput,
    tx?: Prisma.TransactionClient
  ): Promise<Project> {
    const client = tx || prisma;
    return client.project.create({ data });
  }

  // READ - Isolado por tenant
  async findById(id: string, tenantId: string): Promise<Project | null> {
    return prisma.project.findUnique({
      where: {
        id_tenantId: { id, tenantId } // Compound key
      }
    });
  }

  // READ LIST - Isolado por tenant
  async listByTenant(
    tenantId: string,
    options?: {
      skip?: number;
      take?: number;
      orderBy?: Prisma.ProjectOrderByWithRelationInput;
      where?: Prisma.ProjectWhereInput;
    }
  ): Promise<Project[]> {
    return prisma.project.findMany({
      where: {
        tenantId,
        ...options?.where
      },
      skip: options?.skip,
      take: options?.take,
      orderBy: options?.orderBy || { createdAt: 'desc' }
    });
  }

  // COUNT
  async countByTenant(tenantId: string): Promise<number> {
    return prisma.project.count({
      where: { tenantId }
    });
  }

  // UPDATE - Isolado por tenant
  async update(
    id: string,
    tenantId: string,
    data: Prisma.ProjectUpdateInput,
    tx?: Prisma.TransactionClient
  ): Promise<Project> {
    const client = tx || prisma;
    return client.project.update({
      where: {
        id_tenantId: { id, tenantId }
      },
      data
    });
  }

  // DELETE - Isolado por tenant
  async delete(id: string, tenantId: string): Promise<Project> {
    return prisma.project.delete({
      where: {
        id_tenantId: { id, tenantId }
      }
    });
  }
}
```

---

## 6. DTOs e Validação com Zod

### 6.1 Input Validation (Request)

```typescript
// src/validators/projectValidator.ts
import { z } from 'zod';

// Schema para criação
export const createProjectSchema = z.object({
  name: z.string()
    .min(3, 'Nome deve ter pelo menos 3 caracteres')
    .max(255, 'Nome não pode exceder 255 caracteres'),
  
  description: z.string()
    .min(10, 'Descrição deve ter pelo menos 10 caracteres')
    .max(5000, 'Descrição muito longa'),
  
  status: z.enum(['draft', 'active', 'completed', 'archived'])
    .default('draft'),
  
  budget: z.number()
    .positive('Orçamento deve ser positivo')
    .max(999999999, 'Orçamento inválido'),
  
  startDate: z.date()
    .min(new Date(), 'Data deve ser no futuro'),
  
  endDate: z.date()
    .optional(),

  tags: z.array(z.string()).max(10).optional(),
  
  isPublic: z.boolean().default(false)
});

export const updateProjectSchema = createProjectSchema.partial();

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

export const projectValidator = {
  createSchema: createProjectSchema,
  updateSchema: updateProjectSchema
};
```

### 6.2 Output Validation (Response)

```typescript
// DTOs para resposta padronizada
export const projectResponseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  name: z.string(),
  description: z.string(),
  status: z.enum(['draft', 'active', 'completed', 'archived']),
  budget: z.number(),
  startDate: z.date(),
  endDate: z.date().nullable(),
  createdBy: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date()
});

export type ProjectResponse = z.infer<typeof projectResponseSchema>;

// Converter entity para DTO
function toProjectResponse(project: Project): ProjectResponse {
  return {
    id: project.id,
    tenantId: project.tenantId,
    name: project.name,
    description: project.description,
    status: project.status as any,
    budget: project.budget.toNumber(),
    startDate: project.startDate,
    endDate: project.endDate,
    createdBy: project.createdBy,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt
  };
}
```

---

## 7. Middlewares

### 7.1 Auth Middleware (JWT Verification)

```typescript
// src/middlewares/authMiddleware.ts
import { jwtVerify } from '@/lib/jwt';
import { NextRequest, NextResponse } from 'next/server';

export interface QueryContext {
  userId: string;
  tenantId: string;
  role: 'admin' | 'member' | 'viewer';
  email: string;
}

export async function getContext(request: NextRequest): Promise<QueryContext> {
  const authHeader = request.headers.get('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('Authorization header inválido');
  }

  const token = authHeader.slice(7);
  
  try {
    const decoded = await jwtVerify(token);
    
    return {
      userId: decoded.sub,
      tenantId: decoded.tenantId,
      role: decoded.role,
      email: decoded.email
    };
  } catch (error) {
    throw new UnauthorizedError('Token inválido ou expirado');
  }
}

export function requireRole(...roles: string[]) {
  return (context: QueryContext) => {
    if (!roles.includes(context.role)) {
      throw new ForbiddenError(
        `Acesso negado. Papéis permitidos: ${roles.join(', ')}`
      );
    }
  };
}
```

### 7.2 Tenant Middleware

```typescript
// middleware.ts (root level)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Rotas públicas (sem necessidade de tenant)
  const publicRoutes = ['/auth/login', '/auth/signup', '/'];
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next();
  }

  // Extrair tenant do JWT
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.split(' ')[1];

  if (!token) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  // Validações do tenant são feitas no getContext() dos handlers
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next|public|api/auth/login|api/auth/signup).*)'
  ]
};
```

### 7.3 Rate Limit Middleware

```typescript
// src/middlewares/rateLimitMiddleware.ts
import { redis } from '@/lib/redis';
import { TooManyRequestsError } from '@/lib/errors';

export async function rateLimitMiddleware(
  request: NextRequest,
  options = { maxRequests: 100, windowSeconds: 60 }
) {
  const context = await getContext(request);
  const key = `rate-limit:${context.userId}:${request.method}:${request.nextUrl.pathname}`;

  const current = await redis.incr(key);
  
  if (current === 1) {
    await redis.expire(key, options.windowSeconds);
  }

  if (current > options.maxRequests) {
    throw new TooManyRequestsError('Rate limit excedido');
  }

  return { remaining: options.maxRequests - current };
}
```

### 7.4 Audit Middleware

```typescript
// src/middlewares/auditMiddleware.ts
import { AuditLog } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export async function auditMiddleware(
  request: NextRequest,
  context: QueryContext
) {
  const startTime = Date.now();
  
  // Log será criado após resposta
  return {
    async logAction(
      action: string,
      resourceId?: string,
      changes?: any
    ) {
      const duration = Date.now() - startTime;

      await prisma.auditLog.create({
        data: {
          tenantId: context.tenantId,
          userId: context.userId,
          action,
          resourceId,
          method: request.method,
          path: request.nextUrl.pathname,
          statusCode: 200,
          duration,
          changes: changes ? JSON.stringify(changes) : null,
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown'
        }
      });
    }
  };
}
```

---

## 8. Tratamento Global de Erros

### 8.1 Custom Error Classes

```typescript
// src/lib/errors.ts
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public details?: any) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Não autenticado') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Acesso negado') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Recurso não encontrado') {
    super(message, 404, 'NOT_FOUND');
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message: string = 'Rate limit excedido') {
    super(message, 429, 'RATE_LIMIT');
  }
}

export class InternalServerError extends AppError {
  constructor(message: string = 'Erro interno do servidor') {
    super(message, 500, 'INTERNAL_SERVER_ERROR');
  }
}
```

### 8.2 Error Handler

```typescript
// src/lib/errors.ts
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

export function handleError(error: any): NextResponse {
  console.error('[ERROR]', error);

  // Zod Validation Error
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: 'Validação falhou',
        code: 'VALIDATION_ERROR',
        details: error.errors.map(e => ({
          path: e.path.join('.'),
          message: e.message
        }))
      },
      { status: 400 }
    );
  }

  // Prisma Errors
  if (error instanceof PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        {
          error: 'Registro duplicado',
          code: 'DUPLICATE_ENTRY'
        },
        { status: 409 }
      );
    }
    if (error.code === 'P2025') {
      return NextResponse.json(
        {
          error: 'Recurso não encontrado',
          code: 'NOT_FOUND'
        },
        { status: 404 }
      );
    }
  }

  // Custom App Errors
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code
      },
      { status: error.statusCode }
    );
  }

  // Unknown errors
  return NextResponse.json(
    {
      error: 'Erro interno do servidor',
      code: 'INTERNAL_SERVER_ERROR'
    },
    { status: 500 }
  );
}
```

---

## 9. Upload de Arquivos

### 9.1 Fluxo de Upload

```mermaid
sequenceDiagram
    participant Client as 👤 Browser
    participant Handler as 📨 Route Handler
    participant Validate as ✓ Validação
    participant R2 as 📦 Cloudflare R2
    participant DB as 🗄️ PostgreSQL

    Client->>Handler: POST /api/uploads<br/>multipart/form-data<br/>[file, metadata]
    
    Handler->>Validate: validarTipo()<br/>validarTamanho()
    Validate-->>Handler: ✓ OK ou ❌ Erro
    
    Handler->>R2: putObject({<br/>key: s3-key,<br/>body: stream,<br/>metadata<br/>})
    R2-->>Handler: {url, etag}
    
    Handler->>DB: prisma.file.create({<br/>tenantId,<br/>url,<br/>size,<br/>type<br/>})
    DB-->>Handler: File record
    
    Handler-->>Client: 201 Created<br/>{id, url, size}
```

### 9.2 Route Handler Upload

```typescript
// src/app/api/uploads/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { writeFile, unlink } from 'fs/promises';
import path from 'path';
import { storageService } from '@/services/storageService';
import { getContext } from '@/middlewares/authMiddleware';
import { handleError } from '@/lib/errors';

const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
];

const MAX_SIZE = 50 * 1024 * 1024; // 50MB

export async function POST(request: NextRequest) {
  try {
    const context = await getContext(request);
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'Nenhum arquivo fornecido' },
        { status: 400 }
      );
    }

    // Validar tipo
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Tipo de arquivo não permitido' },
        { status: 400 }
      );
    }

    // Validar tamanho
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'Arquivo muito grande' },
        { status: 400 }
      );
    }

    // Upload para R2/MinIO
    const fileKey = `${context.tenantId}/${context.userId}/${Date.now()}-${file.name}`;
    const buffer = await file.arrayBuffer();

    const uploadResult = await storageService.uploadFile({
      key: fileKey,
      body: Buffer.from(buffer),
      contentType: file.type,
      metadata: {
        tenantId: context.tenantId,
        userId: context.userId,
        originalName: file.name
      }
    });

    // Salvar metadata no banco
    const fileRecord = await prisma.file.create({
      data: {
        tenantId: context.tenantId,
        userId: context.userId,
        key: fileKey,
        url: uploadResult.url,
        size: file.size,
        type: file.type,
        originalName: file.name
      }
    });

    return NextResponse.json(
      {
        id: fileRecord.id,
        url: fileRecord.url,
        size: fileRecord.size,
        type: fileRecord.type
      },
      { status: 201 }
    );
  } catch (error) {
    return handleError(error);
  }
}
```

### 9.3 Storage Service (R2/MinIO)

```typescript
// src/services/storageService.ts
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export class StorageService {
  private client: S3Client;

  constructor() {
    this.client = new S3Client({
      region: process.env.AWS_REGION || 'auto',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
      },
      endpoint: process.env.R2_ENDPOINT || process.env.MINIO_ENDPOINT
    });
  }

  async uploadFile(params: {
    key: string;
    body: Buffer;
    contentType: string;
    metadata?: Record<string, string>;
  }) {
    const command = new PutObjectCommand({
      Bucket: process.env.STORAGE_BUCKET!,
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType,
      Metadata: params.metadata
    });

    await this.client.send(command);

    return {
      url: `${process.env.STORAGE_PUBLIC_URL}/${params.key}`,
      key: params.key
    };
  }

  async getSignedUrl(key: string, expiresIn = 3600) {
    const command = new GetObjectCommand({
      Bucket: process.env.STORAGE_BUCKET!,
      Key: key
    });

    return getSignedUrl(this.client, command, { expiresIn });
  }

  async deleteFile(key: string) {
    const command = new DeleteObjectCommand({
      Bucket: process.env.STORAGE_BUCKET!,
      Key: key
    });

    await this.client.send(command);
  }
}

export const storageService = new StorageService();
```

---

## 10. Cache com Redis

### 10.1 Cache Strategy

```typescript
// src/lib/redis.ts
import { createClient } from 'redis';

const client = createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: 0
});

client.connect();

export const redis = client;

// Health check
export async function checkRedis() {
  try {
    await redis.ping();
    return true;
  } catch (error) {
    console.error('Redis connection failed:', error);
    return false;
  }
}
```

### 10.2 Cache Service

```typescript
// src/services/cacheService.ts
import { redis } from '@/lib/redis';

export class CacheService {
  /**
   * Get from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set in cache with TTL
   */
  async set<T>(
    key: string,
    value: T,
    ttl: number = 3600 // 1 hour default
  ): Promise<void> {
    try {
      await redis.setEx(key, ttl, JSON.stringify(value));
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
    }
  }

  /**
   * Delete from cache
   */
  async delete(key: string): Promise<void> {
    try {
      await redis.del(key);
    } catch (error) {
      console.error(`Cache delete error for key ${key}:`, error);
    }
  }

  /**
   * Clear pattern
   */
  async deletePattern(pattern: string): Promise<void> {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(keys);
      }
    } catch (error) {
      console.error(`Cache pattern delete error for ${pattern}:`, error);
    }
  }

  /**
   * Get or set (cache-aside pattern)
   */
  async getOrSet<T>(
    key: string,
    fn: () => Promise<T>,
    ttl: number = 3600
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached) return cached;

    const value = await fn();
    await this.set(key, value, ttl);
    return value;
  }
}

export const cacheService = new CacheService();
```

### 10.3 Cache Invalidation

```typescript
// Cache invalidation strategies
export async function invalidateProjectCache(tenantId: string, projectId?: string) {
  if (projectId) {
    // Invalidar projeto específico
    await cacheService.delete(`project:${projectId}`);
    await cacheService.delete(`project:${projectId}:initiatives`);
  }
  
  // Invalidar lista de projetos do tenant
  await cacheService.delete(`projects:${tenantId}`);
}

export async function invalidateTenantCache(tenantId: string) {
  // Invalidar todo cache do tenant (operação cara)
  await cacheService.deletePattern(`*:${tenantId}:*`);
}
```

---

## 11. Logs e Auditoria

### 11.1 Logging Structure

```typescript
// src/lib/logger.ts
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname'
    }
  }
});

export { logger };

// Exemplo de uso
logger.info({ tenantId, userId }, 'Project created');
logger.error({ error: err.message, stack: err.stack }, 'Upload failed');
```

### 11.2 Audit Trail

```typescript
// src/services/auditService.ts
import { prisma } from '@/lib/prisma';

export interface AuditLogEntry {
  tenantId: string;
  userId: string;
  action: string;
  resourceId?: string;
  resourceType?: string;
  changes?: Record<string, any>;
  status: 'success' | 'failure';
  errorMessage?: string;
  ipAddress?: string;
  userAgent?: string;
}

export class AuditService {
  async log(entry: AuditLogEntry) {
    await prisma.auditLog.create({
      data: {
        tenantId: entry.tenantId,
        userId: entry.userId,
        action: entry.action,
        resourceId: entry.resourceId,
        resourceType: entry.resourceType,
        changes: entry.changes ? JSON.stringify(entry.changes) : null,
        status: entry.status,
        errorMessage: entry.errorMessage,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
        timestamp: new Date()
      }
    });
  }

  async getHistory(
    tenantId: string,
    resourceId: string,
    limit: number = 50
  ) {
    return prisma.auditLog.findMany({
      where: {
        tenantId,
        resourceId
      },
      orderBy: { timestamp: 'desc' },
      take: limit
    });
  }
}

export const auditService = new AuditService();
```

---

## 12. Performance

### 12.1 Server Components & Streaming

```typescript
// Usar Server Components por padrão
// app/(auth)/dashboard/page.tsx
import { Suspense } from 'react';
import { ProjectsList } from '@/components/modules/projects/ProjectsList';
import { ProjectsListSkeleton } from '@/components/modules/projects/ProjectsListSkeleton';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1>Dashboard</h1>
      
      {/* Streaming com Suspense */}
      <Suspense fallback={<ProjectsListSkeleton />}>
        <ProjectsList />
      </Suspense>
    </div>
  );
}

// Componente Server que faz query ao banco
async function ProjectsList() {
  const projects = await projectService.listByTenant(context);
  
  return (
    <div className="grid gap-4">
      {projects.map(project => (
        <ProjectCard key={project.id} project={project} />
      ))}
    </div>
  );
}
```

### 12.2 TanStack Query (Client-side)

```typescript
// hooks/useProjects.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectService } from '@/services/projectService';

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: () => fetch('/api/projects').then(r => r.json()),
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000 // 10 minutos
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: CreateProjectInput) =>
      fetch('/api/projects', {
        method: 'POST',
        body: JSON.stringify(data)
      }).then(r => r.json()),
    
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    }
  });
}
```

### 12.3 Database Indexes

```sql
-- Projects
CREATE INDEX idx_projects_tenant ON projects(tenant_id);
CREATE INDEX idx_projects_tenant_status ON projects(tenant_id, status);
CREATE INDEX idx_projects_created ON projects(tenant_id, created_at DESC);

-- Initiatives
CREATE INDEX idx_initiatives_project ON initiatives(project_id);
CREATE INDEX idx_initiatives_tenant ON initiatives(tenant_id);
CREATE INDEX idx_initiatives_status ON initiatives(tenant_id, status);

-- Timeline Events
CREATE INDEX idx_timeline_events_project ON timeline_events(project_id);
CREATE INDEX idx_timeline_events_date ON timeline_events(project_id, date DESC);

-- Audit Logs
CREATE INDEX idx_audit_logs_tenant ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(tenant_id, user_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(tenant_id, timestamp DESC);

-- Files
CREATE INDEX idx_files_tenant ON files(tenant_id);
CREATE INDEX idx_files_user ON files(tenant_id, user_id);

-- Users
CREATE UNIQUE INDEX idx_users_email_tenant ON users(tenant_id, email);
CREATE INDEX idx_users_tenant ON users(tenant_id);
```

### 12.4 Query Optimization

```typescript
// ❌ N+1 Problem
const projects = await prisma.project.findMany({
  where: { tenantId }
});
const initiatives = await Promise.all(
  projects.map(p => prisma.initiative.findMany({ where: { projectId: p.id } }))
);

// ✅ Eager Loading
const projects = await prisma.project.findMany({
  where: { tenantId },
  include: {
    initiatives: true, // Eager load
    timeline: true,
    accountsReport: true
  }
});
```

---

## 13. Escalabilidade

### 13.1 Horizontal Scaling

```yaml
# docker-compose.yml
version: '3.8'

services:
  # API replicas (load balanced by nginx)
  api-1:
    build:
      context: .
      dockerfile: docker/Dockerfile
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://user:pass@postgres:5432/db
      REDIS_URL: redis://redis:6379
    ports:
      - "3001:3000"
    depends_on:
      - postgres
      - redis

  api-2:
    build:
      context: .
      dockerfile: docker/Dockerfile
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://user:pass@postgres:5432/db
      REDIS_URL: redis://redis:6379
    ports:
      - "3002:3000"
    depends_on:
      - postgres
      - redis

  # Nginx load balancer
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./docker/nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - api-1
      - api-2

  # Database
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: gestao_campanha
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
    volumes:
      - postgres_data:/var/lib/postgresql/data

  # Cache
  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

### 13.2 Connection Pooling

```typescript
// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    errorFormat: 'pretty',
    log: [
      { level: 'query', emit: 'event' },
      { level: 'error', emit: 'stdout' },
      { level: 'warn', emit: 'stdout' }
    ]
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// prisma/.env
DATABASE_URL="postgresql://user:pass@localhost:5432/db?schema=public&connection_limit=10&pool_timeout=180"
```

---

## 14. Diagramas de Fluxo

### 14.1 Fluxo de Login (JWT)

```mermaid
sequenceDiagram
    participant User as 👤 Usuário
    participant Browser as 🌐 Browser
    participant Handler as 📨 Login Handler
    participant Auth as 🔐 Auth Service
    participant DB as 🗄️ PostgreSQL
    participant JWT as 🎫 JWT Signer

    User->>Browser: Entra login/senha
    Browser->>Handler: POST /api/auth/login
    
    Handler->>Handler: Validar input com Zod
    Handler->>Auth: authenticate(email, password)
    
    Auth->>DB: Buscar usuário por email
    DB-->>Auth: User record
    
    Auth->>Auth: Verificar password hash<br/>bcryptjs.compare()
    Auth->>DB: Verificar tenant ativo
    DB-->>Auth: Tenant record
    
    Auth->>JWT: Gerar JWT token<br/>{sub, tenantId, role}
    JWT-->>Auth: Signed token
    
    Auth-->>Handler: {token, user, tenant}
    Handler->>Handler: Salvar token em cookie<br/>httpOnly, Secure
    
    Handler-->>Browser: 200 OK<br/>Set-Cookie: token=...
    Browser->>Browser: Armazenar sessão
    Browser-->>User: Redireciona para /dashboard
```

### 14.2 Fluxo do Portal Público

```mermaid
graph TD
    A["👤 Visitante<br/>Sem Autenticação"] -->|Acessa| B["🌐 /portal/[slug]"]
    
    B -->|Resolve slug| C{Projeto<br/>Público?}
    
    C -->|Não| D["❌ 404<br/>Projeto privado"]
    C -->|Sim| E["✓ Carrega dados<br/>públicos"]
    
    E -->|Server Component| F["🗄️ QueryPublicProject<br/>where: public=true"]
    F -->|Retorna| G["📄 Renderiza Portal"]
    
    G -->|Mostra| H["📊 Informações<br/>Projeto<br/>Descrição<br/>Budget<br/>Timeline"]
    
    G -->|Mostra| I["📈 Iniciativas<br/>Publicitárias"]
    
    G -->|Mostra| J["📋 Prestação<br/>de Contas<br/>Públicos"]
    
    H -->|Cache| K["⚡ Redis<br/>TTL: 1 hora"]
    I -->|Cache| K
    J -->|Cache| K
```

### 14.3 Fluxo de Timeline

```mermaid
graph LR
    A["📅 Create Timeline Event<br/>POST /api/timeline"]
    
    B["🔐 Auth + Tenant<br/>Validate"]
    C["✓ Zod Validation<br/>Date, Title, Status"]
    D["🗄️ Save to DB<br/>Prisma Transaction"]
    E["📊 Audit Log"]
    F["⚡ Invalidate Cache"]
    G["📧 Notify Stakeholders"]
    
    H["✓ 201 Created"]
    
    A --> B
    B --> C
    C --> D
    D --> E
    E --> F
    F --> G
    G --> H
    
    I["📖 List Timeline<br/>GET /api/projects/:id/timeline"]
    J["🔐 Auth + Tenant"]
    K["⚡ Check Cache"]
    L{Cache<br/>Hit?}
    M["🗄️ Query DB<br/>Ordered by date"]
    N["💾 Store in Cache<br/>TTL: 30min"]
    O["📤 Return sorted events"]
    
    I --> J
    J --> K
    K --> L
    L -->|Yes| O
    L -->|No| M
    M --> N
    N --> O
```

### 14.4 Fluxo de Upload de Arquivo

```mermaid
sequenceDiagram
    participant Client as 👤 Browser
    participant Handler as 📨 Upload Handler
    participant Validate as ✓ Validação
    participant Compress as 🗜️ Compressão
    participant R2 as 📦 Cloudflare R2
    participant DB as 🗄️ PostgreSQL
    participant Cache as ⚡ Redis

    Client->>Handler: POST /api/uploads<br/>multipart/form-data
    Handler->>Handler: Parse form data
    
    Handler->>Validate: Verificar tipo
    Validate-->>Handler: ✓/❌
    
    Handler->>Validate: Verificar tamanho
    Validate-->>Handler: ✓ ou ❌
    
    Handler->>Compress: Se imagem, otimizar
    Compress-->>Handler: Buffer otimizado
    
    Handler->>R2: S3.putObject({<br/>key, body,<br/>metadata})
    R2-->>Handler: {url, etag}
    
    Handler->>DB: prisma.file.create
    DB-->>Handler: File record
    
    Handler->>Cache: Invalidar listagem
    Cache-->>Handler: OK
    
    Handler-->>Client: 201 Created<br/>{id, url, size}
```

---

## 15. Padrões Arquiteturais

### 15.1 Repository Pattern

**Benefício:** Abstração de dados, facilita testes, mudanças de ORM.

```typescript
interface IProjectRepository {
  create(data: CreateProjectInput): Promise<Project>;
  findById(id: string, tenantId: string): Promise<Project | null>;
  listByTenant(tenantId: string): Promise<Project[]>;
  update(id: string, tenantId: string, data: UpdateProjectInput): Promise<Project>;
  delete(id: string, tenantId: string): Promise<void>;
}

class ProjectRepository implements IProjectRepository {
  // Implementação com Prisma
}
```

### 15.2 Service Layer Pattern

**Benefício:** Centraliza lógica, transações, cache, auditoria.

```typescript
class ProjectService {
  constructor(
    private repository: ProjectRepository,
    private auditService: AuditService,
    private cacheService: CacheService
  ) {}

  async create(context: QueryContext, input: CreateProjectInput) {
    // 1. Validação
    // 2. Permissões
    // 3. Lógica de negócio
    // 4. Persistência (transação)
    // 5. Auditoria
    // 6. Invalidação de cache
    // 7. Eventos/Notificações
  }
}
```

### 15.3 Dependency Injection (IoC)

```typescript
// Simples: usar singletons
export const projectService = new ProjectService(
  new ProjectRepository(),
  auditService,
  cacheService
);

// Avançado: usar container (ex: Inversify)
const container = new Container();
container.bind<IProjectRepository>(TYPES.ProjectRepository).to(ProjectRepository);
container.bind<ProjectService>(TYPES.ProjectService).to(ProjectService);
```

### 15.4 Middleware Chain Pattern

```typescript
// src/middlewares/chainMiddleware.ts
type Middleware = (req: NextRequest, next: () => Promise<any>) => Promise<any>;

export function createMiddlewareChain(...middlewares: Middleware[]) {
  return async (req: NextRequest) => {
    let index = -1;

    const dispatch = async (i: number): Promise<any> => {
      if (i <= index) return;
      index = i;

      const middleware = middlewares[i];
      if (!middleware) return;

      return middleware(req, () => dispatch(i + 1));
    };

    return dispatch(0);
  };
}

// Uso
const chain = createMiddlewareChain(
  authMiddleware,
  tenantMiddleware,
  rateLimitMiddleware,
  auditMiddleware
);
```

---

## 16. Convenções

### 16.1 Nomenclatura

```
✓ Correto:
- Diretórios: snake_case (projects/, user_settings/)
- Arquivos: kebab-case (project-card.tsx, api-utils.ts)
- Variáveis: camelCase (projectId, userName)
- Constantes: UPPER_SNAKE_CASE (MAX_FILE_SIZE, API_TIMEOUT)
- Tipos: PascalCase (Project, CreateProjectInput)
- Interfaces: PascalCase com prefixo I (IProjectRepository)

✗ Evitar:
- Nomes genéricos (data, result, value)
- Abreviações confusas (usr, prj)
- Mistura de casos
```

### 16.2 Estrutura de Arquivo

```typescript
// Ordem de imports
import { external libraries }
import { internal modules }
import { types }

// Ordem de exports
export interface/type
export class
export function
export const

// Exemplo
import { NextRequest, NextResponse } from 'next/server';
import { projectService } from '@/services/projectService';
import type { QueryContext } from '@/types/api';

export interface CreateProjectRequest {
  name: string;
}

export class ProjectController {
  async create(req: NextRequest) {}
}

export const handleError = () => {};
```

### 16.3 Comentários

```typescript
// ✓ Bom: explica o "porquê"
// ponytail: usar cache agressivo aqui pois listagem é frequente
const projects = await cacheService.getOrSet(
  `projects:${tenantId}`,
  () => repository.listByTenant(tenantId),
  3600 // 1 hora
);

// ✓ Bom: documenta complexidade
/**
 * Resolve tenant ID de múltiplas fontes em ordem:
 * 1. JWT token
 * 2. Subdomain (tenant.platform.com)
 * 3. Path (/orgs/:slug/)
 */
function extractTenantId(req: NextRequest): string {}

// ✗ Ruim: óbvio
const id = v4(); // gera UUID
```

---

## 17. Anti-Patterns

### 17.1 Não Fazer

```typescript
// ❌ N+1 Query Problem
const projects = await db.project.findMany();
for (const project of projects) {
  project.initiatives = await db.initiative.findMany({
    where: { projectId: project.id }
  });
}

// ✓ Use eager loading
const projects = await db.project.findMany({
  include: { initiatives: true }
});

---

// ❌ Bloqueando operações síncronas em handlers
export async function POST(request: NextRequest) {
  const largeList = getAllProjects().sort(); // BLOCKING
}

// ✓ Use streaming/chunking
export async function POST(request: NextRequest) {
  const projects = await db.project.findMany({ take: 100 });
}

---

// ❌ Confiar em contexto HTTP sem validação
const tenantId = request.headers.get('x-tenant-id'); // Inseguro!

// ✓ Validar via JWT
const context = await getContext(request); // Extrai do token
const tenantId = context.tenantId;

---

// ❌ Tratamento genérico de erros
try {
  await operation();
} catch (error) {
  res.json({ error: 'Algo deu errado' }); // Esconde info
}

// ✓ Discriminar por tipo
try {
  await operation();
} catch (error) {
  if (error instanceof ValidationError) {
    res.json({ error: error.message }, { status: 400 });
  } else if (error instanceof NotFoundError) {
    res.json({ error: error.message }, { status: 404 });
  }
}

---

// ❌ Sem limits em queries públicas
const projects = await db.project.findMany();

// ✓ Implementar pagination
const projects = await db.project.findMany({
  skip: (page - 1) * limit,
  take: limit
});

---

// ❌ Armazenar secrets em código/env local
const apiKey = 'sk_live_abc123'; // Committed!

// ✓ Usar environment variables e .gitignore
process.env.STRIPE_API_KEY // Via .env.local
```

---

## 18. Boas Práticas

### 18.1 Security

```typescript
// 1. Always validate tenant ID
// ❌ Bad
const project = await db.project.findUnique({ where: { id } });

// ✓ Good
const project = await repository.findById(id, context.tenantId);

// 2. Hash passwords
import bcrypt from 'bcryptjs';
const hashed = await bcrypt.hash(password, 12);
const match = await bcrypt.compare(input, hashed);

// 3. Sanitize file uploads
const sanitized = file.name
  .replace(/[^a-z0-9.-]/gi, '_')
  .slice(0, 255);

// 4. Rate limit API endpoints
@RateLimit({ window: '1m', max: 100 })
export async function POST(request: NextRequest) {}

// 5. CORS for public APIs
export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.CORS_ORIGIN,
  'Access-Control-Allow-Methods': 'GET, POST',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};
```

### 18.2 Database

```typescript
// 1. Transactions para múltiplas operações
const result = await prisma.$transaction(async (tx) => {
  const project = await tx.project.create({ data });
  await tx.auditLog.create({ data: audit });
  return project;
});

// 2. Use indexes para queries frequentes
// Adicionar em migration
db.raw(`CREATE INDEX idx_projects_tenant ON projects(tenant_id)`);

// 3. Soft delete, não hard delete
await db.project.update({
  where: { id },
  data: { deletedAt: new Date() }
});

// 4. Migrations versionadas
// 20240714_create_projects.sql
```

### 18.3 Testing

```typescript
// 1. Testes unitários para services
describe('ProjectService', () => {
  it('should create project with valid input', async () => {
    const result = await service.create(mockContext, mockInput);
    expect(result.id).toBeDefined();
  });
});

// 2. Testes de integração para handlers
describe('POST /api/projects', () => {
  it('should return 201 on success', async () => {
    const res = await fetch('/api/projects', {
      method: 'POST',
      body: JSON.stringify(mockInput)
    });
    expect(res.status).toBe(201);
  });
});

// 3. Mocks para dependências externas
jest.mock('@/lib/redis', () => ({
  redis: {
    get: jest.fn(),
    set: jest.fn()
  }
}));
```

### 18.4 Monitoring

```typescript
// 1. Log estruturado
logger.info({
  tenantId,
  userId,
  action: 'PROJECT_CREATED',
  projectId: project.id,
  duration: Date.now() - start
});

// 2. Error tracking
import * as Sentry from '@sentry/nextjs';
Sentry.captureException(error, { tags: { tenantId } });

// 3. Performance monitoring
const start = Date.now();
const result = await operation();
logger.debug({ duration: Date.now() - start });

// 4. Health checks
export async function GET(request: NextRequest) {
  const dbOk = await checkDatabase();
  const redisOk = await checkRedis();
  
  if (!dbOk || !redisOk) {
    return NextResponse.json(
      { status: 'unhealthy' },
      { status: 503 }
    );
  }
  
  return NextResponse.json({ status: 'healthy' });
}
```

---

## 19. Deployment

### 19.1 GitHub Actions CI/CD

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run lint
      - run: npm run test

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: docker build -t app:${{ github.sha }} .
      - run: docker push app:${{ github.sha }}
      - run: kubectl set image deployment/app app=app:${{ github.sha }}
```

### 19.2 Docker

```dockerfile
# docker/Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --production

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000
CMD ["npm", "start"]
```

---

## 20. Referência Rápida

### Fluxo Padrão de Desenvolvimento

```
1. Feature branch (git checkout -b feature/nova-funcionalidade)
2. Implementar no módulo apropriado (modules/*)
3. Criar validators com Zod
4. Implementar repository
5. Implementar service
6. Criar route handler
7. Testes unitários
8. PR review
9. Merge para main
10. Deploy automático
```

### Checklist de Nova Feature

- [ ] Validação com Zod
- [ ] Tenant isolation (filtro tenantId em todas queries)
- [ ] Auditoria (AuditLog entry)
- [ ] Cache invalidation
- [ ] Testes unitários (90%+ cobertura)
- [ ] Testes E2E
- [ ] Documentação (JSDoc)
- [ ] Migrations Prisma (se banco mudou)
- [ ] Performance (índices)
- [ ] Security review

---

## Conclusão

Esta arquitetura foi projetada para suportar crescimento, manutenibilidade e segurança. Cada camada tem responsabilidade clara, isolamento multi-tenant é obrigatório, e patterns são consistentes.

**Pontos-chave:**
- Multi-tenant isolado por `tenantId`
- Camadas bem definidas (Handler → Service → Repository)
- Type-safety com TypeScript + Zod
- Cache com Redis e invalidação inteligente
- Auditoria completa de operações
- Performance via indexes, eager loading, streaming
- Security via JWT, tenant validation, rate limiting

**Evolução Futura:**
- GraphQL (se complexidade cresce)
- CQRS (se read/write patterns divergem)
- Event sourcing (se auditoria torna-se crítica)
- Microservices (se escalabilidade exigir)

---

**Documento válido a partir de:** 14 de Julho de 2026  
**Versão:** 1.0  
**Autor:** Software Architecture Team  
**Última atualização:** 14 de Julho de 2026
