# DATABASE.md — Versão 1.0

Documentação da arquitetura de banco de dados para o sistema **Gestão de Projetos Financiados por Comunidades**.

---

## 1. Modelo Conceitual

### Visão Geral de Entidades

O sistema é organizado em torno de **Organizações** (tenant root) que gerenciam múltiplos **Projetos**. Cada projeto possui **Iniciativas** (objetivos menores), **Timeline** (comunicação com comunidade), **Entradas/Saídas Financeiras** (prestação de contas) e artefatos como **Arquivos** e **Sessões de Usuário**.

### Relacionamentos Principais

```
Organização (1:N) Usuários
Organização (1:N) Projetos
Organização (1:N) Iniciativas (via Projeto)
Organização (1:N) Timeline Posts
Organização (1:N) Entradas/Saídas Financeiras
Organização (1:N) Arquivos
Organização (1:N) Audit Logs

Projeto (1:N) Iniciativas
Projeto (1:N) Timeline Posts
Projeto (1:N) Entradas/Saídas Financeiras
Projeto (1:N) Arquivos

Iniciativa (1:N) Entradas/Saídas Financeiras
Iniciativa (1:N) Dependências (Iniciativa 1:N Iniciativa)

Usuário (1:N) Timeline Posts (como autor)
Usuário (1:N) Entradas Financeiras (como criador)
Usuário (1:N) Sessões
Usuário (1:N) Audit Logs

Iniciativa (1:1) Usuário Responsável
```

---

## 2. Diagrama ERD (Mermaid)

```mermaid
erDiagram
    ORGANIZATIONS ||--o{ USERS : contains
    ORGANIZATIONS ||--o{ PROJECTS : manages
    ORGANIZATIONS ||--o{ INITIATIVES : tracks
    ORGANIZATIONS ||--o{ TIMELINE_POSTS : publishes
    ORGANIZATIONS ||--o{ FINANCIAL_ENTRIES : records
    ORGANIZATIONS ||--o{ FINANCIAL_EXITS : records
    ORGANIZATIONS ||--o{ FILES : stores
    ORGANIZATIONS ||--o{ AUDIT_LOGS : logs
    
    PROJECTS ||--o{ INITIATIVES : groups
    PROJECTS ||--o{ TIMELINE_POSTS : contains
    PROJECTS ||--o{ FINANCIAL_ENTRIES : tracks
    PROJECTS ||--o{ FINANCIAL_EXITS : tracks
    PROJECTS ||--o{ FILES : contains
    
    INITIATIVES ||--o{ FINANCIAL_ENTRIES : receives
    INITIATIVES ||--o{ FINANCIAL_EXITS : spends
    INITIATIVES ||--o{ INITIATIVES : dependencies
    INITIATIVES ||--o{ USERS : "assigned to"
    
    USERS ||--o{ TIMELINE_POSTS : authors
    USERS ||--o{ FINANCIAL_ENTRIES : creates
    USERS ||--o{ SESSIONS : owns
    USERS ||--o{ AUDIT_LOGS : triggers
    
    FILES ||--o{ AUDIT_LOGS : tracked
    
    ORGANIZATIONS : uuid id PK
    ORGANIZATIONS : string name
    ORGANIZATIONS : string slug UK
    ORGANIZATIONS : string logo
    ORGANIZATIONS : boolean active
    ORGANIZATIONS : timestamp createdAt
    ORGANIZATIONS : timestamp updatedAt
    ORGANIZATIONS : timestamp deletedAt SD
    
    USERS : uuid id PK
    USERS : uuid organizationId FK
    USERS : string name
    USERS : string email UK per org
    USERS : string passwordHash
    USERS : enum role
    USERS : boolean active
    USERS : timestamp createdAt
    USERS : timestamp updatedAt
    USERS : timestamp deletedAt SD
    
    PROJECTS : uuid id PK
    PROJECTS : uuid organizationId FK
    PROJECTS : string name
    PROJECTS : text description
    PROJECTS : enum status
    PROJECTS : date startDate
    PROJECTS : date endDate
    PROJECTS : string coverImage
    PROJECTS : boolean isPublic
    PROJECTS : string publicSlug UK
    PROJECTS : uuid createdBy FK
    PROJECTS : timestamp createdAt
    PROJECTS : timestamp updatedAt
    PROJECTS : timestamp deletedAt SD
    
    INITIATIVES : uuid id PK
    INITIATIVES : uuid projectId FK
    INITIATIVES : uuid organizationId FK
    INITIATIVES : string name
    INITIATIVES : text description
    INITIATIVES : decimal goal
    INITIATIVES : decimal minGoal
    INITIATIVES : decimal raised
    INITIATIVES : integer priority
    INITIATIVES : enum status
    INITIATIVES : uuid responsibleId FK
    INITIATIVES : uuid dependsOn FK
    INITIATIVES : timestamp createdAt
    INITIATIVES : timestamp updatedAt
    INITIATIVES : timestamp deletedAt SD
    
    TIMELINE_POSTS : uuid id PK
    TIMELINE_POSTS : uuid projectId FK
    TIMELINE_POSTS : uuid organizationId FK
    TIMELINE_POSTS : text content
    TIMELINE_POSTS : enum type
    TIMELINE_POSTS : string mediaUrl
    TIMELINE_POSTS : uuid authorId FK
    TIMELINE_POSTS : timestamp publishedAt
    TIMELINE_POSTS : timestamp createdAt
    TIMELINE_POSTS : timestamp updatedAt
    TIMELINE_POSTS : timestamp deletedAt SD
    
    FINANCIAL_ENTRIES : uuid id PK
    FINANCIAL_ENTRIES : uuid projectId FK
    FINANCIAL_ENTRIES : uuid initiativeId FK
    FINANCIAL_ENTRIES : uuid organizationId FK
    FINANCIAL_ENTRIES : string description
    FINANCIAL_ENTRIES : decimal amount
    FINANCIAL_ENTRIES : string category
    FINANCIAL_ENTRIES : string receiptUrl
    FINANCIAL_ENTRIES : date date
    FINANCIAL_ENTRIES : uuid createdBy FK
    FINANCIAL_ENTRIES : timestamp createdAt
    FINANCIAL_ENTRIES : timestamp updatedAt
    FINANCIAL_ENTRIES : timestamp deletedAt SD
    
    FINANCIAL_EXITS : uuid id PK
    FINANCIAL_EXITS : uuid projectId FK
    FINANCIAL_EXITS : uuid initiativeId FK
    FINANCIAL_EXITS : uuid organizationId FK
    FINANCIAL_EXITS : string description
    FINANCIAL_EXITS : decimal amount
    FINANCIAL_EXITS : string category
    FINANCIAL_EXITS : string receiptUrl
    FINANCIAL_EXITS : string supplier
    FINANCIAL_EXITS : date date
    FINANCIAL_EXITS : uuid createdBy FK
    FINANCIAL_EXITS : timestamp createdAt
    FINANCIAL_EXITS : timestamp updatedAt
    FINANCIAL_EXITS : timestamp deletedAt SD
    
    FILES : uuid id PK
    FILES : uuid organizationId FK
    FILES : uuid projectId FK
    FILES : string name
    FILES : string url
    FILES : string type
    FILES : bigint size
    FILES : uuid uploadedBy FK
    FILES : timestamp createdAt
    FILES : timestamp deletedAt SD
    
    AUDIT_LOGS : uuid id PK
    AUDIT_LOGS : uuid organizationId FK
    AUDIT_LOGS : uuid userId FK
    AUDIT_LOGS : string action
    AUDIT_LOGS : string entity
    AUDIT_LOGS : uuid entityId
    AUDIT_LOGS : jsonb before
    AUDIT_LOGS : jsonb after
    AUDIT_LOGS : string ip
    AUDIT_LOGS : string userAgent
    AUDIT_LOGS : timestamp createdAt
    
    SESSIONS : uuid id PK
    SESSIONS : uuid userId FK
    SESSIONS : string token
    SESSIONS : timestamp expiresAt
    SESSIONS : timestamp createdAt
```

---

## 3. Modelo Físico

### 3.1 Tabela: `organizations`

**Objetivo:** Raiz multi-tenant do sistema. Cada organização é isolada logicamente.

```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  logo VARCHAR(500),
  active BOOLEAN NOT NULL DEFAULT true,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deletedAt TIMESTAMP
);
```

| Campo | Tipo | Nulo | Padrão | Descrição |
|-------|------|------|--------|-----------|
| `id` | UUID | Não | gen_random_uuid() | Identificador único |
| `name` | VARCHAR(255) | Não | — | Nome da organização |
| `slug` | VARCHAR(255) | Não | — | URL-safe slug, único globalmente |
| `logo` | VARCHAR(500) | Sim | NULL | URL ou caminho da logo |
| `active` | BOOLEAN | Não | true | Indica se organização está ativa |
| `createdAt` | TIMESTAMP | Não | CURRENT_TIMESTAMP | Criação |
| `updatedAt` | TIMESTAMP | Não | CURRENT_TIMESTAMP | Última atualização |
| `deletedAt` | TIMESTAMP | Sim | NULL | Soft delete |

**Índices:**
```sql
CREATE UNIQUE INDEX idx_organizations_slug ON organizations(slug) WHERE deletedAt IS NULL;
CREATE INDEX idx_organizations_active ON organizations(active) WHERE deletedAt IS NULL;
```

---

### 3.2 Tabela: `users`

**Objetivo:** Usuários da plataforma com controle de acesso baseado em papéis (RBAC).

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizationId UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  passwordHash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'MEMBER',
  active BOOLEAN NOT NULL DEFAULT true,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deletedAt TIMESTAMP,
  FOREIGN KEY (organizationId) REFERENCES organizations(id),
  CONSTRAINT email_unique_per_org UNIQUE (organizationId, email)
);
```

| Campo | Tipo | Nulo | Padrão | Descrição |
|-------|------|------|--------|-----------|
| `id` | UUID | Não | gen_random_uuid() | Identificador único |
| `organizationId` | UUID | Não | — | FK para organização (multi-tenant) |
| `name` | VARCHAR(255) | Não | — | Nome completo |
| `email` | VARCHAR(255) | Não | — | Email único por organização |
| `passwordHash` | VARCHAR(255) | Não | — | Hash bcrypt da senha |
| `role` | VARCHAR(50) | Não | 'MEMBER' | ADMIN, MANAGER, TREASURER, COMMUNICATION, AUDITOR, MEMBER |
| `active` | BOOLEAN | Não | true | Usuário ativo |
| `createdAt` | TIMESTAMP | Não | CURRENT_TIMESTAMP | Criação |
| `updatedAt` | TIMESTAMP | Não | CURRENT_TIMESTAMP | Última atualização |
| `deletedAt` | TIMESTAMP | Sim | NULL | Soft delete |

**Índices:**
```sql
CREATE INDEX idx_users_organizationId ON users(organizationId) WHERE deletedAt IS NULL;
CREATE INDEX idx_users_email ON users(email) WHERE deletedAt IS NULL;
CREATE INDEX idx_users_active ON users(active) WHERE deletedAt IS NULL;
```

**Papéis (Roles):**
- `ADMIN`: Acesso total, gerencia organização, usuários e auditoria
- `MANAGER`: Gerencia projetos e iniciativas
- `TREASURER`: Gerencia entradas/saídas financeiras
- `COMMUNICATION`: Publica na timeline
- `AUDITOR`: Acesso somente leitura a relatórios financeiros
- `MEMBER`: Membro passivo, visualiza informações públicas

---

### 3.3 Tabela: `projects`

**Objetivo:** Projetos gerenciados pela organização, com meta financeira.

```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizationId UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
  startDate DATE,
  endDate DATE,
  coverImage VARCHAR(500),
  isPublic BOOLEAN NOT NULL DEFAULT false,
  publicSlug VARCHAR(255),
  createdBy UUID NOT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deletedAt TIMESTAMP,
  FOREIGN KEY (organizationId) REFERENCES organizations(id),
  FOREIGN KEY (createdBy) REFERENCES users(id)
);
```

| Campo | Tipo | Nulo | Padrão | Descrição |
|-------|------|------|--------|-----------|
| `id` | UUID | Não | gen_random_uuid() | Identificador único |
| `organizationId` | UUID | Não | — | FK para organização (multi-tenant) |
| `name` | VARCHAR(255) | Não | — | Nome do projeto |
| `description` | TEXT | Sim | NULL | Descrição longa |
| `status` | VARCHAR(50) | Não | 'DRAFT' | DRAFT, ACTIVE, COMPLETED, ARCHIVED |
| `startDate` | DATE | Sim | NULL | Data de início |
| `endDate` | DATE | Sim | NULL | Data de término |
| `coverImage` | VARCHAR(500) | Sim | NULL | URL da imagem de capa |
| `isPublic` | BOOLEAN | Não | false | Acessível publicamente |
| `publicSlug` | VARCHAR(255) | Sim | NULL | Slug para acesso público (único) |
| `createdBy` | UUID | Não | — | FK para usuário criador |
| `createdAt` | TIMESTAMP | Não | CURRENT_TIMESTAMP | Criação |
| `updatedAt` | TIMESTAMP | Não | CURRENT_TIMESTAMP | Última atualização |
| `deletedAt` | TIMESTAMP | Sim | NULL | Soft delete |

**Índices:**
```sql
CREATE INDEX idx_projects_organizationId ON projects(organizationId) WHERE deletedAt IS NULL;
CREATE INDEX idx_projects_status ON projects(status) WHERE deletedAt IS NULL;
CREATE INDEX idx_projects_isPublic ON projects(isPublic) WHERE deletedAt IS NULL;
CREATE UNIQUE INDEX idx_projects_publicSlug ON projects(publicSlug) WHERE deletedAt IS NULL AND isPublic = true;
CREATE INDEX idx_projects_createdBy ON projects(createdBy) WHERE deletedAt IS NULL;
```

---

### 3.4 Tabela: `initiatives`

**Objetivo:** Objetivos/metas dentro de um projeto com rastreamento de progresso financeiro.

```sql
CREATE TABLE initiatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  projectId UUID NOT NULL,
  organizationId UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  goal DECIMAL(15, 2),
  minGoal DECIMAL(15, 2),
  raised DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  priority INTEGER DEFAULT 0,
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  responsibleId UUID,
  dependsOn UUID,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deletedAt TIMESTAMP,
  FOREIGN KEY (projectId) REFERENCES projects(id),
  FOREIGN KEY (organizationId) REFERENCES organizations(id),
  FOREIGN KEY (responsibleId) REFERENCES users(id),
  FOREIGN KEY (dependsOn) REFERENCES initiatives(id)
);
```

| Campo | Tipo | Nulo | Padrão | Descrição |
|-------|------|------|--------|-----------|
| `id` | UUID | Não | gen_random_uuid() | Identificador único |
| `projectId` | UUID | Não | — | FK para projeto |
| `organizationId` | UUID | Não | — | FK para organização (multi-tenant) |
| `name` | VARCHAR(255) | Não | — | Nome da iniciativa |
| `description` | TEXT | Sim | NULL | Descrição |
| `goal` | DECIMAL(15,2) | Sim | NULL | Meta financeira |
| `minGoal` | DECIMAL(15,2) | Sim | NULL | Meta mínima |
| `raised` | DECIMAL(15,2) | Não | 0.00 | Valor arrecadado até agora |
| `priority` | INTEGER | Sim | 0 | Prioridade (maior = mais importante) |
| `status` | VARCHAR(50) | Não | 'PENDING' | PENDING, IN_PROGRESS, COMPLETED, CANCELLED |
| `responsibleId` | UUID | Sim | NULL | FK para usuário responsável |
| `dependsOn` | UUID | Sim | NULL | FK para outra iniciativa (dependência) |
| `createdAt` | TIMESTAMP | Não | CURRENT_TIMESTAMP | Criação |
| `updatedAt` | TIMESTAMP | Não | CURRENT_TIMESTAMP | Última atualização |
| `deletedAt` | TIMESTAMP | Sim | NULL | Soft delete |

**Índices:**
```sql
CREATE INDEX idx_initiatives_projectId ON initiatives(projectId) WHERE deletedAt IS NULL;
CREATE INDEX idx_initiatives_organizationId ON initiatives(organizationId) WHERE deletedAt IS NULL;
CREATE INDEX idx_initiatives_status ON initiatives(status) WHERE deletedAt IS NULL;
CREATE INDEX idx_initiatives_responsibleId ON initiatives(responsibleId) WHERE deletedAt IS NULL;
CREATE INDEX idx_initiatives_dependsOn ON initiatives(dependsOn) WHERE deletedAt IS NULL;
```

---

### 3.5 Tabela: `timeline_posts`

**Objetivo:** Comunicação com a comunidade, updates sobre progresso do projeto.

```sql
CREATE TABLE timeline_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  projectId UUID NOT NULL,
  organizationId UUID NOT NULL,
  content TEXT NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'TEXT',
  mediaUrl VARCHAR(500),
  authorId UUID NOT NULL,
  publishedAt TIMESTAMP,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deletedAt TIMESTAMP,
  FOREIGN KEY (projectId) REFERENCES projects(id),
  FOREIGN KEY (organizationId) REFERENCES organizations(id),
  FOREIGN KEY (authorId) REFERENCES users(id)
);
```

| Campo | Tipo | Nulo | Padrão | Descrição |
|-------|------|------|--------|-----------|
| `id` | UUID | Não | gen_random_uuid() | Identificador único |
| `projectId` | UUID | Não | — | FK para projeto |
| `organizationId` | UUID | Não | — | FK para organização (multi-tenant) |
| `content` | TEXT | Não | — | Conteúdo do post |
| `type` | VARCHAR(50) | Não | 'TEXT' | TEXT, PHOTO, VIDEO, PDF, LINK |
| `mediaUrl` | VARCHAR(500) | Sim | NULL | URL da mídia (se houver) |
| `authorId` | UUID | Não | — | FK para usuário autor |
| `publishedAt` | TIMESTAMP | Sim | NULL | Data de publicação (NULL = rascunho) |
| `createdAt` | TIMESTAMP | Não | CURRENT_TIMESTAMP | Criação |
| `updatedAt` | TIMESTAMP | Não | CURRENT_TIMESTAMP | Última atualização |
| `deletedAt` | TIMESTAMP | Sim | NULL | Soft delete |

**Índices:**
```sql
CREATE INDEX idx_timeline_posts_projectId ON timeline_posts(projectId) WHERE deletedAt IS NULL;
CREATE INDEX idx_timeline_posts_organizationId ON timeline_posts(organizationId) WHERE deletedAt IS NULL;
CREATE INDEX idx_timeline_posts_authorId ON timeline_posts(authorId) WHERE deletedAt IS NULL;
CREATE INDEX idx_timeline_posts_publishedAt ON timeline_posts(publishedAt) WHERE deletedAt IS NULL AND publishedAt IS NOT NULL;
```

---

### 3.6 Tabela: `financial_entries`

**Objetivo:** Entradas/receitas do projeto (doações, empréstimos, etc).

```sql
CREATE TABLE financial_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  projectId UUID NOT NULL,
  initiativeId UUID,
  organizationId UUID NOT NULL,
  description VARCHAR(255) NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  category VARCHAR(100),
  receiptUrl VARCHAR(500),
  date DATE NOT NULL,
  createdBy UUID NOT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deletedAt TIMESTAMP,
  FOREIGN KEY (projectId) REFERENCES projects(id),
  FOREIGN KEY (initiativeId) REFERENCES initiatives(id),
  FOREIGN KEY (organizationId) REFERENCES organizations(id),
  FOREIGN KEY (createdBy) REFERENCES users(id)
);
```

| Campo | Tipo | Nulo | Padrão | Descrição |
|-------|------|------|--------|-----------|
| `id` | UUID | Não | gen_random_uuid() | Identificador único |
| `projectId` | UUID | Não | — | FK para projeto |
| `initiativeId` | UUID | Sim | NULL | FK para iniciativa (opcional) |
| `organizationId` | UUID | Não | — | FK para organização (multi-tenant) |
| `description` | VARCHAR(255) | Não | — | Descrição da entrada |
| `amount` | DECIMAL(15,2) | Não | — | Valor recebido |
| `category` | VARCHAR(100) | Sim | NULL | DONATION, LOAN, GRANT, OTHER |
| `receiptUrl` | VARCHAR(500) | Sim | NULL | URL do comprovante |
| `date` | DATE | Não | — | Data da entrada |
| `createdBy` | UUID | Não | — | FK para usuário criador |
| `createdAt` | TIMESTAMP | Não | CURRENT_TIMESTAMP | Criação |
| `updatedAt` | TIMESTAMP | Não | CURRENT_TIMESTAMP | Última atualização |
| `deletedAt` | TIMESTAMP | Sim | NULL | Soft delete |

**Índices:**
```sql
CREATE INDEX idx_financial_entries_projectId ON financial_entries(projectId) WHERE deletedAt IS NULL;
CREATE INDEX idx_financial_entries_initiativeId ON financial_entries(initiativeId) WHERE deletedAt IS NULL;
CREATE INDEX idx_financial_entries_organizationId ON financial_entries(organizationId) WHERE deletedAt IS NULL;
CREATE INDEX idx_financial_entries_date ON financial_entries(date) WHERE deletedAt IS NULL;
CREATE INDEX idx_financial_entries_category ON financial_entries(category) WHERE deletedAt IS NULL;
```

---

### 3.7 Tabela: `financial_exits`

**Objetivo:** Saídas/despesas do projeto (custos operacionais, implementação, etc).

```sql
CREATE TABLE financial_exits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  projectId UUID NOT NULL,
  initiativeId UUID,
  organizationId UUID NOT NULL,
  description VARCHAR(255) NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  category VARCHAR(100),
  receiptUrl VARCHAR(500),
  supplier VARCHAR(255),
  date DATE NOT NULL,
  createdBy UUID NOT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deletedAt TIMESTAMP,
  FOREIGN KEY (projectId) REFERENCES projects(id),
  FOREIGN KEY (initiativeId) REFERENCES initiatives(id),
  FOREIGN KEY (organizationId) REFERENCES organizations(id),
  FOREIGN KEY (createdBy) REFERENCES users(id)
);
```

| Campo | Tipo | Nulo | Padrão | Descrição |
|-------|------|------|--------|-----------|
| `id` | UUID | Não | gen_random_uuid() | Identificador único |
| `projectId` | UUID | Não | — | FK para projeto |
| `initiativeId` | UUID | Sim | NULL | FK para iniciativa (opcional) |
| `organizationId` | UUID | Não | — | FK para organização (multi-tenant) |
| `description` | VARCHAR(255) | Não | — | Descrição da saída |
| `amount` | DECIMAL(15,2) | Não | — | Valor gasto |
| `category` | VARCHAR(100) | Sim | NULL | MATERIAL, SERVICE, PERSONNEL, TRANSPORT, OTHER |
| `receiptUrl` | VARCHAR(500) | Sim | NULL | URL do comprovante |
| `supplier` | VARCHAR(255) | Sim | NULL | Nome do fornecedor |
| `date` | DATE | Não | — | Data da saída |
| `createdBy` | UUID | Não | — | FK para usuário criador |
| `createdAt` | TIMESTAMP | Não | CURRENT_TIMESTAMP | Criação |
| `updatedAt` | TIMESTAMP | Não | CURRENT_TIMESTAMP | Última atualização |
| `deletedAt` | TIMESTAMP | Sim | NULL | Soft delete |

**Índices:**
```sql
CREATE INDEX idx_financial_exits_projectId ON financial_exits(projectId) WHERE deletedAt IS NULL;
CREATE INDEX idx_financial_exits_initiativeId ON financial_exits(initiativeId) WHERE deletedAt IS NULL;
CREATE INDEX idx_financial_exits_organizationId ON financial_exits(organizationId) WHERE deletedAt IS NULL;
CREATE INDEX idx_financial_exits_date ON financial_exits(date) WHERE deletedAt IS NULL;
CREATE INDEX idx_financial_exits_category ON financial_exits(category) WHERE deletedAt IS NULL;
```

---

### 3.8 Tabela: `files`

**Objetivo:** Armazenamento de referências a arquivos (fotos, documentos, comprovantes).

```sql
CREATE TABLE files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizationId UUID NOT NULL,
  projectId UUID,
  name VARCHAR(255) NOT NULL,
  url VARCHAR(500) NOT NULL,
  type VARCHAR(50),
  size BIGINT,
  uploadedBy UUID NOT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deletedAt TIMESTAMP,
  FOREIGN KEY (organizationId) REFERENCES organizations(id),
  FOREIGN KEY (projectId) REFERENCES projects(id),
  FOREIGN KEY (uploadedBy) REFERENCES users(id)
);
```

| Campo | Tipo | Nulo | Padrão | Descrição |
|-------|------|------|--------|-----------|
| `id` | UUID | Não | gen_random_uuid() | Identificador único |
| `organizationId` | UUID | Não | — | FK para organização (multi-tenant) |
| `projectId` | UUID | Sim | NULL | FK para projeto (opcional) |
| `name` | VARCHAR(255) | Não | — | Nome do arquivo |
| `url` | VARCHAR(500) | Não | — | URL do arquivo (S3, etc) |
| `type` | VARCHAR(50) | Sim | NULL | MIME type (image/jpeg, etc) |
| `size` | BIGINT | Sim | NULL | Tamanho em bytes |
| `uploadedBy` | UUID | Não | — | FK para usuário que fez upload |
| `createdAt` | TIMESTAMP | Não | CURRENT_TIMESTAMP | Data de upload |
| `deletedAt` | TIMESTAMP | Sim | NULL | Soft delete |

**Índices:**
```sql
CREATE INDEX idx_files_organizationId ON files(organizationId) WHERE deletedAt IS NULL;
CREATE INDEX idx_files_projectId ON files(projectId) WHERE deletedAt IS NULL;
CREATE INDEX idx_files_uploadedBy ON files(uploadedBy) WHERE deletedAt IS NULL;
```

---

### 3.9 Tabela: `audit_logs`

**Objetivo:** Rastreamento de todas as ações críticas para conformidade e auditoria.

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizationId UUID NOT NULL,
  userId UUID,
  action VARCHAR(50) NOT NULL,
  entity VARCHAR(100) NOT NULL,
  entityId UUID NOT NULL,
  before JSONB,
  after JSONB,
  ip VARCHAR(45),
  userAgent VARCHAR(500),
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organizationId) REFERENCES organizations(id),
  FOREIGN KEY (userId) REFERENCES users(id)
);
```

| Campo | Tipo | Nulo | Padrão | Descrição |
|-------|------|------|--------|-----------|
| `id` | UUID | Não | gen_random_uuid() | Identificador único |
| `organizationId` | UUID | Não | — | FK para organização (multi-tenant) |
| `userId` | UUID | Sim | NULL | FK para usuário que realizou ação |
| `action` | VARCHAR(50) | Não | — | CREATE, UPDATE, DELETE, EXPORT |
| `entity` | VARCHAR(100) | Não | — | Nome da entidade (projects, users, etc) |
| `entityId` | UUID | Não | — | ID da entidade afetada |
| `before` | JSONB | Sim | NULL | Estado anterior (antes da mudança) |
| `after` | JSONB | Sim | NULL | Estado novo (depois da mudança) |
| `ip` | VARCHAR(45) | Sim | NULL | Endereço IP da requisição |
| `userAgent` | VARCHAR(500) | Sim | NULL | User-Agent do navegador |
| `createdAt` | TIMESTAMP | Não | CURRENT_TIMESTAMP | Timestamp da ação |

**Índices:**
```sql
CREATE INDEX idx_audit_logs_organizationId ON audit_logs(organizationId);
CREATE INDEX idx_audit_logs_userId ON audit_logs(userId);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity);
CREATE INDEX idx_audit_logs_createdAt ON audit_logs(createdAt);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
```

---

### 3.10 Tabela: `sessions`

**Objetivo:** Gerenciamento de sessões de usuário para autenticação e autorização.

```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  userId UUID NOT NULL,
  token VARCHAR(500) NOT NULL,
  expiresAt TIMESTAMP NOT NULL,
  createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id),
  CONSTRAINT token_unique UNIQUE (token)
);
```

| Campo | Tipo | Nulo | Padrão | Descrição |
|-------|------|------|--------|-----------|
| `id` | UUID | Não | gen_random_uuid() | Identificador único |
| `userId` | UUID | Não | — | FK para usuário |
| `token` | VARCHAR(500) | Não | — | Token JWT ou session string (único) |
| `expiresAt` | TIMESTAMP | Não | — | Expiração da sessão |
| `createdAt` | TIMESTAMP | Não | CURRENT_TIMESTAMP | Criação da sessão |

**Índices:**
```sql
CREATE INDEX idx_sessions_userId ON sessions(userId);
CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_expiresAt ON sessions(expiresAt);
```

---

## 4. Cardinalidade e Chaves Estrangeiras

| De | Para | Tipo | Nota |
|----|----|------|------|
| `users` | `organizations` | N:1 | Múltiplos usuários por org |
| `projects` | `organizations` | N:1 | Múltiplos projetos por org |
| `projects` | `users` | N:1 | Criador do projeto |
| `initiatives` | `projects` | N:1 | Múltiplas iniciativas por projeto |
| `initiatives` | `users` | N:1 | Responsável pela iniciativa |
| `initiatives` | `initiatives` | N:1 | Dependência entre iniciativas |
| `timeline_posts` | `projects` | N:1 | Múltiplos posts por projeto |
| `timeline_posts` | `users` | N:1 | Autor do post |
| `financial_entries` | `projects` | N:1 | Múltiplas entradas por projeto |
| `financial_entries` | `initiatives` | N:1 | Entrada vinculada a iniciativa |
| `financial_exits` | `projects` | N:1 | Múltiplas saídas por projeto |
| `financial_exits` | `initiatives` | N:1 | Saída vinculada a iniciativa |
| `files` | `organizations` | N:1 | Arquivos da organização |
| `files` | `projects` | N:1 | Arquivos do projeto |
| `audit_logs` | `organizations` | N:1 | Logs da organização |
| `audit_logs` | `users` | N:1 | Usuário que realizou ação |
| `sessions` | `users` | N:1 | Múltiplas sessões por usuário |

---

## 5. Índices e Performance

### 5.1 Índices de Filtragem Multi-Tenant

Toda query deve filtrar por `organizationId`. Índices garantem performance:

```sql
-- Exemplo de query otimizada
SELECT * FROM projects 
WHERE organizationId = ? AND deletedAt IS NULL AND status = 'ACTIVE'
ORDER BY createdAt DESC;
-- Utiliza: idx_projects_organizationId + idx_projects_status
```

### 5.2 Índices em Chaves Estrangeiras

Todas as FKs devem ter índices para otimizar JOINs:

```sql
-- Automaticamente criados pelo PostgreSQL em PRIMARY KEY
-- Índices adicionais em FK importantes (já listados acima)
```

### 5.3 Índices Compostos (se necessário em v1.1)

```sql
-- Futuro: busca otimizada de relatórios financeiros
CREATE INDEX idx_financial_entries_composite ON financial_entries(
  organizationId, projectId, date
) WHERE deletedAt IS NULL;
```

### 5.4 Índices de Texto (Busca)

```sql
-- Futuro: busca full-text em projects
CREATE INDEX idx_projects_name_tsvector ON projects 
USING GIN (to_tsvector('portuguese', name || ' ' || COALESCE(description, '')))
WHERE deletedAt IS NULL;
```

---

## 6. Estratégia Soft Delete

### Princípio

Nenhum registro é deletado fisicamente. Um campo `deletedAt` marca a exclusão lógica.

### Implementação

```sql
-- Campo presente em todas as tabelas (exceto audit_logs e sessions)
deletedAt TIMESTAMP NULL DEFAULT NULL

-- Todas as queries devem incluir
WHERE deletedAt IS NULL

-- Trigger automático de updatedAt ao fazer soft delete
CREATE OR REPLACE FUNCTION mark_deleted()
RETURNS TRIGGER AS $$
BEGIN
  NEW.deletedAt = CURRENT_TIMESTAMP;
  NEW.updatedAt = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Benefícios

1. **Recuperabilidade:** Dados nunca são perdidos permanentemente
2. **Auditoria:** Histórico completo preservado
3. **Conformidade:** Atende LGPD com período de retenção
4. **Reversibilidade:** Pode-se "undelete" se necessário

### Limpeza Permanente (GDPR/LGPD)

```sql
-- Executado apenas após período de retenção (ex: 90 dias)
DELETE FROM projects WHERE deletedAt < CURRENT_TIMESTAMP - INTERVAL '90 days';
```

---

## 7. Estratégia Multi-Tenant

### Isolamento de Dados

1. **Chave de Tenant:** Todas as tabelas incluem `organizationId` (exceto `organizations` e `audit_logs/sessions`)
2. **Filtros Automáticos:** Middleware de autenticação injeta `organizationId` em toda query
3. **Row-Level Security (futuro):** PostgreSQL RLS para isolamento em nível de banco

### Implementação em Prisma

```prisma
// middleware de contexto (pseudo-código)
const tenantId = req.user.organizationId;

// Todas as queries filtram automaticamente
const projects = await prisma.projects.findMany({
  where: {
    organizationId: tenantId,
    deletedAt: null
  }
});
```

### Separação de Dados

- **Sem compartilhamento de dados** entre organizações
- **Slugs únicos globalmente** (organization.slug, project.publicSlug)
- **Email único por organização** (users.email)

---

## 8. Estratégia de Versionamento (Prisma Migrations)

### Padrão de Migrations

```bash
# Criando migração
npx prisma migrate dev --name add_projects_table

# Arquivo gerado: prisma/migrations/[timestamp]_add_projects_table/migration.sql
```

### Estrutura de Migrations

```
prisma/
├── migrations/
│   ├── 20250101000000_init/
│   │   └── migration.sql
│   ├── 20250102000000_add_projects/
│   │   └── migration.sql
│   └── ...
├── schema.prisma
└── .env
```

### Versionamento em Schema

```prisma
// Sempre incluir comentários com versão
// schema.prisma
// v1.0: Core tables (organizations, users, projects, initiatives)
// v1.1: Financial module (entries, exits)
// v1.2: Timeline module (posts)
// v1.3: Audit & Sessions

model Organization {
  /// @map("organizations")
  id String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  
  @@map("organizations")
}
```

### Deploy Seguro

```bash
# Pre-deploy: validar migração em ambiente de staging
npx prisma migrate deploy --skip-generate

# Rollback (se necessário)
# Requer migration de rollback explícita (não automático)
npx prisma migrate resolve --rolled-back "[timestamp]_migration_name"
```

---

## 9. Convenções de Nomenclatura

### Tabelas

- **Plural, snake_case:** `organizations`, `users`, `projects`, `timeline_posts`
- **Prefixo financeiro:** `financial_entries`, `financial_exits`
- **Sem prefixo de organização:** Multi-tenant é implícito via `organizationId`

### Colunas

- **ID:** `id` (UUID, PK)
- **Chaves Estrangeiras:** `<entity>Id` (ex: `organizationId`, `projectId`, `userId`)
- **Timestamps:** `createdAt`, `updatedAt`, `deletedAt`
- **Booleanos:** Prefixo `is` (ex: `isPublic`, `active`)
- **Enums:** Valores em UPPERCASE (ex: `DRAFT`, `ACTIVE`)

### Índices

```
idx_<table>_<column>            -- índice simples
idx_<table>_<col1>_<col2>       -- índice composto
idx_<table>_<column>_unique     -- índice único
```

### Constraints

```
pk_<table>                       -- primary key
fk_<table>_<refTable>           -- foreign key
uq_<table>_<column>             -- unique
ck_<table>_<column>             -- check
```

---

## 10. Questões de Segurança

### SQL Injection

✅ **Mitigação:** Prisma ORM com query builder parameterizado
```prisma
const project = await prisma.projects.findUnique({
  where: { id: projectId } // Parametrizado automaticamente
});
```

### Vazamento de Dados Multi-Tenant

✅ **Mitigação:** Middleware valida `organizationId` antes de queries
```typescript
// Middleware (pseudo-código)
const user = await auth(req);
if (user.organizationId !== requestedOrgId) {
  throw new UnauthorizedError();
}
```

### Auditoria

✅ **Mitigação:** Trigger automático em audit_logs
```sql
CREATE TRIGGER financial_entries_audit
AFTER INSERT OR UPDATE ON financial_entries
FOR EACH ROW EXECUTE FUNCTION log_audit();
```

---

## 11. Performance e Escalabilidade

### Limites Conhecidos (v1.0)

- **Tabelas sem particionamento:** Adequado até ~100M de registros
- **Soft delete sem índice:** Query lenta em tabelas grandes (adicionar índice partial)
- **Sem cache:** Operações repetem queries ao banco

### Upgrade Path

| Fase | Mudança | Gatilho |
|------|---------|---------|
| v1.0 | Sem cache, soft delete com índice | Em produção |
| v1.1 | Redis cache em relatórios financeiros | Latência > 2s |
| v1.2 | Particionamento temporal de audit_logs | > 500M de logs |
| v1.3 | Replicação de leitura (read replicas) | QPS > 1000 |

---

## 12. Conformidade Legal

### LGPD (Lei Geral de Proteção de Dados)

- ✅ Soft delete permite auditoria pós-exclusão
- ✅ Audit logs rastreiam acesso a dados sensíveis
- ✅ Multi-tenant isola dados de diferentes usuários
- ⚠️ Implementar direito ao esquecimento: script de purga após 90 dias

### GDPR

- ✅ Mesmo padrão de auditoria
- ⚠️ Criptografia de dados em repouso (futuro: TDE do PostgreSQL)
- ⚠️ Backup com retenção limitada

---

## Referências Rápidas

### Criar Novo Projeto

```bash
# 1. Cria migração
npx prisma migrate dev --name add_new_feature

# 2. Atualiza schema.prisma

# 3. Gera tipos TypeScript
npx prisma generate

# 4. Valida em staging antes de deploy
```

### Fazer Query Segura

```typescript
// ✅ Correto: Filtro multi-tenant obrigatório
const projects = await prisma.projects.findMany({
  where: {
    organizationId: user.organizationId,
    deletedAt: null
  }
});

// ❌ Errado: Sem filtro de tenant
const projects = await prisma.projects.findMany();
```

### Adicionar Auditoria Manual

```typescript
// Após DELETE/UPDATE/CREATE
await prisma.auditLog.create({
  data: {
    organizationId,
    userId,
    action: 'DELETE',
    entity: 'projects',
    entityId,
    before: JSON.stringify(oldData),
    after: null,
    ip: req.ip,
    userAgent: req.headers['user-agent']
  }
});
```

---

## Changelog

| Versão | Data | Mudanças |
|--------|------|----------|
| 1.0 | 2026-07-14 | Documentação inicial com 11 tabelas core |

---

**Última atualização:** 14 de julho de 2026
**Responsável:** Architecture Team
**Status:** Em implementação com Prisma ORM
