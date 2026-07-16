# Diagrama DE-R — gestao_campanha

```mermaid
erDiagram
    Organization {
        uuid   id        PK
        string name
        string slug      UK
        string logo      "nullable"
        bool   active
        ts     createdAt
        ts     updatedAt
        ts     deletedAt "nullable - soft delete"
    }

    User {
        uuid   id             PK
        uuid   organizationId FK
        string name
        string email
        string passwordHash
        enum   role           "ADMIN|MANAGER|TREASURER|COMMUNICATION|AUDITOR|MEMBER"
        bool   active
        ts     createdAt
        ts     updatedAt
        ts     deletedAt      "nullable - soft delete"
    }

    Session {
        uuid   id        PK
        uuid   userId    FK
        string token     UK
        ts     expiresAt
        ts     createdAt
    }

    Project {
        uuid   id             PK
        uuid   organizationId FK
        uuid   createdById    FK
        string name
        string description    "nullable"
        enum   status         "DRAFT|ACTIVE|COMPLETED|ARCHIVED"
        string coverImage     "nullable"
        bool   isPublic
        string publicSlug     "nullable - UK"
        ts     startDate      "nullable"
        ts     endDate        "nullable"
        ts     createdAt
        ts     updatedAt
        ts     deletedAt      "nullable - soft delete"
    }

    Initiative {
        uuid    id             PK
        uuid    projectId      FK
        uuid    organizationId FK
        uuid    responsibleId  FK "nullable"
        uuid    dependsOnId    FK "nullable - auto-ref"
        string  name
        string  description    "nullable"
        decimal goal           "12,2"
        decimal minGoal        "nullable 12,2"
        int     priority
        enum    status         "PENDING|IN_PROGRESS|COMPLETED|CANCELLED"
        ts      createdAt
        ts      updatedAt
        ts      deletedAt      "nullable - soft delete"
    }

    TimelinePost {
        uuid   id             PK
        uuid   projectId      FK
        uuid   organizationId FK
        uuid   authorId       FK
        string content
        enum   type           "TEXT|PHOTO|VIDEO|PDF|LINK"
        string mediaUrl       "nullable"
        ts     publishedAt
        ts     createdAt
        ts     updatedAt
        ts     deletedAt      "nullable - soft delete"
    }

    FinancialCategory {
        uuid   id             PK
        uuid   organizationId FK
        string name           "max 80"
        enum   type           "ENTRY|EXIT"
        ts     createdAt
        ts     deletedAt      "nullable - soft delete"
    }

    FinancialEntry {
        uuid    id             PK
        uuid    projectId      FK
        uuid    initiativeId   FK
        uuid    organizationId FK
        uuid    createdById    FK
        uuid    categoryId     FK "nullable"
        string  description
        decimal amount         "12,2"
        string  receiptUrl     "nullable"
        date    date
        ts      createdAt
        ts      updatedAt
        ts      deletedAt      "nullable - soft delete"
    }

    FinancialExit {
        uuid    id             PK
        uuid    projectId      FK
        uuid    initiativeId   FK
        uuid    organizationId FK
        uuid    createdById    FK
        uuid    categoryId     FK "nullable"
        string  description
        decimal amount         "12,2"
        string  supplier       "nullable"
        string  receiptUrl     "nullable"
        date    date
        ts      createdAt
        ts      updatedAt
        ts      deletedAt      "nullable - soft delete"
    }

    File {
        uuid   id             PK
        uuid   organizationId FK
        uuid   projectId      FK "nullable"
        string name
        string url
        string type
        int    size
        uuid   uploadedById   FK
        ts     createdAt
        ts     deletedAt      "nullable - soft delete"
    }

    AuditLog {
        uuid   id             PK
        uuid   organizationId FK
        uuid   userId         FK "nullable"
        string action
        string entity
        string entityId
        json   before         "nullable"
        json   after          "nullable"
        string ip             "nullable"
        string userAgent      "nullable"
        ts     createdAt
    }

    %% Relacionamentos

    Organization ||--o{ User             : "possui"
    Organization ||--o{ Project          : "possui"
    Organization ||--o{ FinancialCategory: "define"
    Organization ||--o{ File             : "armazena"
    Organization ||--o{ AuditLog         : "registra"

    User         ||--o{ Session          : "autentica"
    User         ||--o{ TimelinePost     : "publica"
    User         ||--o{ FinancialEntry   : "registra"
    User         ||--o{ FinancialExit    : "registra"
    User         ||--o{ AuditLog         : "gera"
    User         ||--o{ Project          : "cria"

    Project      ||--o{ Initiative       : "contém"
    Project      ||--o{ TimelinePost     : "tem"
    Project      ||--o{ FinancialEntry   : "agrupa"
    Project      ||--o{ FinancialExit    : "agrupa"
    Project      ||--o{ File             : "anexa"

    Initiative   ||--o{ FinancialEntry   : "recebe"
    Initiative   ||--o{ FinancialExit    : "gasta"
    Initiative   |o--o| Initiative       : "depende de"

    FinancialCategory ||--o{ FinancialEntry : "classifica"
    FinancialCategory ||--o{ FinancialExit  : "classifica"
```

## Notas

- **Soft delete** em todos os modelos principais via `deletedAt` — registros nunca são removidos fisicamente
- **Tenant isolation** — todas as queries filtram por `organizationId`
- **`Initiative.raised`** não existe como campo — é calculado via `SUM(FinancialEntry.amount)` em tempo de consulta
- **`FinancialCategory`** é org-level (não por projeto), com tipo `ENTRY` ou `EXIT`
- **`FinancialEntry` e `FinancialExit`** pertencem obrigatoriamente a uma `Initiative` e opcionalmente a uma `FinancialCategory`
- **`Initiative.dependsOnId`** é auto-referência — uma iniciativa pode depender de outra do mesmo projeto
