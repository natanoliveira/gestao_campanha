# Gestão Campanha

Sistema de gestão de campanhas e projetos com portal público de transparência financeira.

---

## Visão Geral

Plataforma multi-tenant para organizações gerenciarem projetos, iniciativas, arrecadação e prestação de contas públicas. Cada organização possui usuários com papéis diferenciados, projetos com metas e iniciativas, timeline de comunicação, e um portal público (sem autenticação) para transparência financeira.

### Funcionalidades

- Autenticação JWT com refresh token (HttpOnly cookie)
- RBAC: ADMIN · MANAGER · TREASURER · COMMUNICATION · AUDITOR · MEMBER
- Projetos com status, metas e progresso por iniciativa
- Timeline de posts (atualizações públicas ou internas)
- Prestação de contas: entradas e saídas financeiras
- Portal público por slug (`/p/:slug`) — sem login
- Soft delete em todas entidades

---

## Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                        Next.js 15 App Router                     │
│                                                                   │
│   ┌─────────────┐   ┌──────────────┐   ┌──────────────────────┐ │
│   │  (auth)     │   │    (app)     │   │      (public)        │ │
│   │  /login     │   │  /dashboard  │   │     /p/[slug]        │ │
│   │             │   │  /projects   │   │                      │ │
│   │             │   │  /users      │   │  Portal de           │ │
│   │             │   │  /settings   │   │  Transparência       │ │
│   └─────────────┘   └──────────────┘   └──────────────────────┘ │
│                              │                                    │
│   ┌──────────────────────────▼──────────────────────────────┐   │
│   │                    API Routes /api/v1/                   │   │
│   │  auth/login · auth/logout · auth/refresh                 │   │
│   │  projects · projects/[id]                                │   │
│   │  users · users/[id]                                      │   │
│   │  organizations · organizations/[id]                      │   │
│   │  dashboard/stats                                         │   │
│   │  public/projects/[slug]  (sem autenticação)              │   │
│   └──────────────────────────┬──────────────────────────────┘   │
│                              │                                    │
│   ┌──────────────────────────▼──────────────────────────────┐   │
│   │                     Service Layer                        │   │
│   │   src/modules/{auth,projects,users,organizations}/       │   │
│   │   service.ts · repository.ts · dto.ts                   │   │
│   └──────────────────────────┬──────────────────────────────┘   │
│                              │                                    │
│   ┌──────────────────────────▼──────────────────────────────┐   │
│   │           Prisma v7 + @prisma/adapter-neon               │   │
│   │           @neondatabase/serverless (Neon Postgres)       │   │
│   └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Fluxo de Autenticação

```mermaid
sequenceDiagram
    participant C as Cliente (Browser)
    participant MW as Middleware Next.js
    participant API as /api/v1/auth
    participant DB as Neon Postgres

    C->>API: POST /login {email, senha}
    API->>DB: findUser + verifyPassword
    DB-->>API: User
    API-->>C: { accessToken } + Set-Cookie: refresh_token (HttpOnly)
    C->>C: localStorage.setItem("access_token", ...)

    Note over C,MW: Navegação subsequente
    C->>MW: GET /dashboard
    MW->>MW: verifica cookie refresh_token
    alt cookie ausente
        MW-->>C: redirect /login
    else cookie presente
        MW-->>C: passa para a página
    end

    Note over C,API: Chamadas de API
    C->>API: GET /projects Authorization: Bearer <accessToken>
    API->>API: authenticate(req) → verifica JWT
    API->>DB: query
    DB-->>API: dados
    API-->>C: JSON

    Note over C,API: Renovação de token
    C->>API: POST /refresh (cookie HttpOnly automático)
    API->>DB: verifica Session ativa
    DB-->>API: Session
    API-->>C: { accessToken } novo
```

---

## Modelo de Dados

```mermaid
erDiagram
    Organization ||--o{ User : "tem"
    Organization ||--o{ Project : "tem"

    User ||--o{ Session : "tem"
    User ||--o{ TimelinePost : "cria"
    User ||--o{ AuditLog : "gera"

    Project ||--o{ Initiative : "tem"
    Project ||--o{ TimelinePost : "tem"
    Project ||--o{ FinancialEntry : "tem"
    Project ||--o{ FinancialExit : "tem"
    Project ||--o{ File : "tem"

    Organization {
        string id PK
        string name
        string slug UK
        string cnpj
        datetime createdAt
        datetime deletedAt
    }

    User {
        string id PK
        string name
        string email UK
        string passwordHash
        enum role
        string organizationId FK
        datetime createdAt
        datetime deletedAt
    }

    Session {
        string id PK
        string token UK
        string userId FK
        datetime expiresAt
        datetime createdAt
    }

    Project {
        string id PK
        string name
        string description
        enum status
        boolean isPublic
        string publicSlug UK
        datetime startDate
        datetime endDate
        string organizationId FK
        datetime createdAt
        datetime deletedAt
    }

    Initiative {
        string id PK
        string name
        string description
        decimal goal
        decimal raised
        enum status
        int priority
        string projectId FK
        datetime createdAt
        datetime deletedAt
    }

    TimelinePost {
        string id PK
        string content
        enum type
        boolean isPublic
        datetime publishedAt
        string projectId FK
        string authorId FK
        datetime deletedAt
    }

    FinancialEntry {
        string id PK
        string description
        decimal amount
        string category
        date date
        string projectId FK
        datetime createdAt
        datetime deletedAt
    }

    FinancialExit {
        string id PK
        string description
        decimal amount
        string supplier
        date date
        string projectId FK
        datetime createdAt
        datetime deletedAt
    }

    File {
        string id PK
        string name
        string url
        string mimeType
        int size
        string projectId FK
        datetime createdAt
        datetime deletedAt
    }

    AuditLog {
        string id PK
        string action
        string entity
        string entityId
        json changes
        string userId FK
        datetime createdAt
    }
```

---

## API Reference

### Autenticação

| Método | Rota | Acesso | Descrição |
|--------|------|--------|-----------|
| POST | `/api/v1/auth/login` | Público | Retorna `accessToken` + seta cookie `refresh_token` |
| POST | `/api/v1/auth/logout` | Autenticado | Invalida Session + limpa cookie |
| POST | `/api/v1/auth/refresh` | Cookie | Renova `accessToken` usando refresh token |

**POST /api/v1/auth/login**
```json
// Request
{ "email": "admin@demo.com", "password": "senha123" }

// Response 200
{
  "accessToken": "eyJ...",
  "user": { "id": "...", "name": "Admin", "email": "admin@demo.com", "role": "ADMIN" }
}
```

---

### Projetos

| Método | Rota | Papéis | Descrição |
|--------|------|--------|-----------|
| GET | `/api/v1/projects` | Todos | Lista projetos com filtro e paginação |
| POST | `/api/v1/projects` | ADMIN, MANAGER | Cria projeto |
| GET | `/api/v1/projects/:id` | Todos | Detalhe completo com iniciativas, timeline e financeiro |
| PUT | `/api/v1/projects/:id` | ADMIN, MANAGER | Atualiza projeto |
| DELETE | `/api/v1/projects/:id` | ADMIN | Soft delete |

**GET /api/v1/projects — Query params**
| Param | Tipo | Descrição |
|-------|------|-----------|
| `q` | string | Busca por nome |
| `status` | DRAFT \| ACTIVE \| COMPLETED \| ARCHIVED | Filtro de status |
| `page` | number | Página (padrão: 1) |
| `limit` | number | Itens por página (padrão: 20) |

**Resposta paginada padrão**
```json
{
  "data": [...],
  "meta": { "total": 42, "page": 1, "limit": 20, "totalPages": 3 }
}
```

---

### Usuários

| Método | Rota | Papéis | Descrição |
|--------|------|--------|-----------|
| GET | `/api/v1/users` | ADMIN, MANAGER | Lista usuários da organização |
| POST | `/api/v1/users` | ADMIN | Cria usuário |
| GET | `/api/v1/users/:id` | ADMIN, MANAGER | Detalhe do usuário |
| PUT | `/api/v1/users/:id` | ADMIN | Atualiza usuário |
| DELETE | `/api/v1/users/:id` | ADMIN | Soft delete |

---

### Organizações

| Método | Rota | Papéis | Descrição |
|--------|------|--------|-----------|
| GET | `/api/v1/organizations` | ADMIN | Lista organizações |
| POST | `/api/v1/organizations` | ADMIN | Cria organização |
| GET | `/api/v1/organizations/:id` | ADMIN | Detalhe |
| PUT | `/api/v1/organizations/:id` | ADMIN | Atualiza |

---

### Dashboard

| Método | Rota | Acesso | Descrição |
|--------|------|--------|-----------|
| GET | `/api/v1/dashboard/stats` | Todos | KPIs: projetos ativos, arrecadação, progresso, atividade recente |

---

### Portal Público

| Método | Rota | Acesso | Descrição |
|--------|------|--------|-----------|
| GET | `/api/v1/public/projects/:slug` | Público | Dados públicos do projeto pelo slug |

**Resposta**
```json
{
  "id": "...", "name": "Campanha X", "description": "...",
  "organization": "Nome da Org",
  "stats": {
    "totalRaised": 15000, "totalGoal": 20000,
    "goalPercent": 75, "supporters": 42, "balance": 3500
  },
  "initiatives": [...],
  "timelinePosts": [...],
  "financialEntries": [...],
  "financialExits": [...]
}
```

---

## Estrutura de Diretórios

```
src/
├── app/
│   ├── (app)/                    # Layout autenticado (sidebar)
│   │   ├── layout.tsx            # AppShell: Sidebar + main
│   │   ├── dashboard/page.tsx    # KPIs + projetos + atividade
│   │   ├── projects/
│   │   │   ├── page.tsx          # Grid de cards com busca e filtro
│   │   │   └── [id]/page.tsx     # Detalhe em abas (resumo/iniciativas/timeline/contas)
│   │   ├── users/                # (em desenvolvimento)
│   │   └── settings/             # (em desenvolvimento)
│   ├── (auth)/
│   │   └── login/page.tsx        # Split-screen: informativo + formulário
│   ├── (public)/
│   │   └── p/[slug]/page.tsx     # Portal público de transparência
│   ├── api/v1/
│   │   ├── auth/
│   │   │   ├── login/route.ts
│   │   │   ├── logout/route.ts
│   │   │   └── refresh/route.ts
│   │   ├── dashboard/stats/route.ts
│   │   ├── projects/
│   │   │   ├── route.ts          # GET (list) + POST (create)
│   │   │   └── [id]/route.ts     # GET + PUT + DELETE
│   │   ├── users/route.ts · users/[id]/route.ts
│   │   ├── organizations/route.ts · organizations/[id]/route.ts
│   │   └── public/projects/[slug]/route.ts
│   ├── globals.css               # Design system (CSS vars, Tailwind @theme)
│   ├── layout.tsx                # Root: IBM Plex Sans + IBM Plex Serif
│   └── page.tsx                  # Redirect → /dashboard
├── components/
│   ├── layout/
│   │   └── sidebar.tsx           # Nav + logout com ConfirmDialog
│   ├── shared/
│   │   ├── app-drawer.tsx        # Painel lateral (base-ui Drawer)
│   │   ├── confirm-dialog.tsx    # Modal com spinner + error state
│   │   ├── feed-item.tsx         # Item de timeline
│   │   ├── kpi-card.tsx          # Card de métrica com delta
│   │   └── progress-bar.tsx      # Barra de progresso variante
│   └── ui/
│       ├── badge.tsx             # Pills de status
│       ├── button.tsx            # Variantes de botão
│       ├── spinner.tsx           # SVG spinner sm/md/lg
│       ├── input.tsx
│       ├── label.tsx
│       └── card.tsx
├── lib/
│   ├── prisma.ts                 # Singleton PrismaClient com Neon adapter
│   ├── jwt.ts                    # sign + verify JWT
│   ├── errors.ts                 # AppError + errorResponse handler
│   ├── pagination.ts             # paginatedResponse helper
│   ├── redis.ts                  # Upstash Redis client
│   ├── s3.ts                     # AWS S3 / R2 client
│   └── utils.ts                  # cn() + helpers
├── middlewares/
│   ├── authenticate.ts           # Extrai e verifica Bearer JWT
│   └── authorize.ts              # Verifica role RBAC
├── middleware.ts                 # Edge: redireciona /login se sem cookie
└── modules/
    ├── auth/dto.ts · repository.ts · service.ts
    ├── projects/dto.ts · repository.ts · service.ts
    ├── users/dto.ts · repository.ts · service.ts
    └── organizations/dto.ts · repository.ts · service.ts
```

---

## Setup

### Pré-requisitos

- Node.js 20+
- Conta [Neon](https://neon.tech) (Postgres serverless)
- Conta [Upstash](https://upstash.com) (Redis — opcional em dev)

### Variáveis de Ambiente

Crie `.env.local` na raiz:

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `DATABASE_URL` | URL do Neon Postgres | `postgresql://user:pass@host/db?sslmode=require` |
| `JWT_SECRET` | Chave secreta JWT (min 32 chars) | `super-secret-key-change-in-prod` |
| `JWT_REFRESH_SECRET` | Chave do refresh token | `another-secret-key` |
| `UPSTASH_REDIS_REST_URL` | URL REST do Upstash Redis | `https://...upstash.io` |
| `UPSTASH_REDIS_REST_TOKEN` | Token do Upstash Redis | `AX...` |
| `AWS_ACCESS_KEY_ID` | Chave S3/R2 (upload de arquivos) | `AKIA...` |
| `AWS_SECRET_ACCESS_KEY` | Secret S3/R2 | `...` |
| `AWS_REGION` | Região S3 | `us-east-1` |
| `AWS_BUCKET_NAME` | Nome do bucket | `gestao-campanha` |

### Instalação e Execução

```bash
# instalar dependências
npm install

# gerar cliente Prisma
npx prisma generate

# aplicar schema no banco
npx prisma db push

# popular com dados de teste
npx prisma db seed

# servidor de desenvolvimento
npm run dev
```

Acesse `http://localhost:3000`.

### Usuários de Teste (seed)

| Email | Senha | Papel |
|-------|-------|-------|
| `admin@demo.com` | `senha123` | ADMIN |
| `manager@demo.com` | `senha123` | MANAGER |
| `treasurer@demo.com` | `senha123` | TREASURER |
| `auditor@demo.com` | `senha123` | AUDITOR |

---

## Padrões de Desenvolvimento

### ConfirmDialog — todo botão destrutivo

```tsx
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

<ConfirmDialog
  trigger={<button>Excluir</button>}
  title="Excluir projeto?"
  description="Esta ação não pode ser desfeita."
  confirmLabel="Excluir"
  variant="destructive"
  onConfirm={async () => {
    await fetch(`/api/v1/projects/${id}`, { method: "DELETE", ... });
    router.push("/projects");
  }}
/>
```

O `ConfirmDialog` gerencia: abertura do modal, spinner durante `onConfirm`, exibição de erro caso a promise rejeite, e fechamento automático em caso de sucesso.

### Soft Delete

Todas as entidades possuem `deletedAt: DateTime?`. Nenhuma query retorna registros com `deletedAt` preenchido. Para deletar, setar `deletedAt: new Date()` via `repository.softDelete()`. Nunca usar `deleteMany` ou `delete` diretamente.

### Resposta Paginada

```ts
// lib/pagination.ts
paginatedResponse(data, total, page, limit)
// → { data: T[], meta: { total, page, limit, totalPages } }
```

### Roles RBAC

```
ADMIN       → acesso total (criar/editar/deletar usuários, projetos, org)
MANAGER     → criar/editar projetos e iniciativas
TREASURER   → lançamentos financeiros
COMMUNICATION → posts na timeline
AUDITOR     → somente leitura
MEMBER      → somente leitura
```

### Token JWT

- **Access token**: 1 hora, armazenado em `localStorage` como `access_token`
- **Refresh token**: 7 dias, HttpOnly cookie `refresh_token`, renovado via `POST /api/v1/auth/refresh`
- **Middleware edge**: verifica presença do cookie `refresh_token`; ausente → redirect `/login`

---

## Roadmap

- [ ] CRUD de Iniciativas (UI)
- [ ] CRUD de Usuários (UI)
- [ ] Posts de Timeline (UI)
- [ ] Lançamentos Financeiros (UI)
- [ ] Upload de Arquivos (S3/R2)
- [ ] Rate limiting com Upstash Redis
- [ ] Testes de integração (Vitest + Supertest)
- [ ] Deploy (Vercel + Neon)
- [ ] Internacionalização (i18n)
