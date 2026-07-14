# API.md — Versão 1.0

## Visão Geral

Esta documentação descreve a REST API do produto **Gestão de Projetos Financiados por Comunidades**, construída com **Next.js Route Handlers**.

### Informações Gerais

- **Base URL:** `/api/v1`
- **Autenticação:** JWT via header `Authorization: Bearer {token}`
- **Multi-Tenant:** Header `X-Organization-Id` ou slug na URL
- **Paginação:** Query params `page` e `limit`
- **Content-Type:** `application/json` (exceto uploads: `multipart/form-data`)

---

## Autenticação

### POST /api/v1/auth/login

Realiza autenticação de usuário e retorna JWT.

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Query Params:**
Nenhum

**Response 200:**
```json
{
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "admin",
      "organizationId": "org-uuid",
      "createdAt": "2026-07-14T10:00:00Z"
    }
  }
}
```

**Erros Possíveis:**
- `401 Unauthorized`: Email ou senha inválidos
- `400 Bad Request`: Email ou senha ausentes

**Exemplo cURL:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securePassword123"
  }'
```

---

### POST /api/v1/auth/refresh

Renova o token JWT utilizando refresh token.

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {refreshToken}
```

**Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Query Params:**
Nenhum

**Response 200:**
```json
{
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Erros Possíveis:**
- `401 Unauthorized`: Refresh token inválido ou expirado
- `400 Bad Request`: Refresh token ausente

**Exemplo cURL:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

---

### POST /api/v1/auth/logout

Realiza logout do usuário e invalida tokens.

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Body:**
```json
{}
```

**Query Params:**
Nenhum

**Response 200:**
```json
{
  "data": {
    "message": "Logout realizado com sucesso"
  }
}
```

**Erros Possíveis:**
- `401 Unauthorized`: Token inválido ou expirado

**Exemplo cURL:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/logout \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## Organizações

### GET /api/v1/organizations/:id

Recupera informações de uma organização específica.

**Headers:**
```
Authorization: Bearer {token}
X-Organization-Id: org-uuid
```

**Body:**
Nenhum

**Query Params:**
Nenhum

**Response 200:**
```json
{
  "data": {
    "id": "org-uuid",
    "name": "Comunidade Local",
    "slug": "comunidade-local",
    "description": "Organização voltada para projetos comunitários",
    "email": "contact@comunidade.com",
    "phone": "+55 11 99999-9999",
    "address": "Rua Principal, 123",
    "city": "São Paulo",
    "state": "SP",
    "country": "Brasil",
    "taxId": "12.345.678/0001-90",
    "website": "https://comunidade.com",
    "logo": "https://cdn.example.com/logo.png",
    "isActive": true,
    "createdAt": "2026-01-10T08:00:00Z",
    "updatedAt": "2026-07-14T10:00:00Z"
  }
}
```

**Erros Possíveis:**
- `401 Unauthorized`: Token inválido ou ausente
- `403 Forbidden`: Sem permissão para acessar esta organização
- `404 Not Found`: Organização não encontrada

**Exemplo cURL:**
```bash
curl -X GET http://localhost:3000/api/v1/organizations/org-uuid \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "X-Organization-Id: org-uuid"
```

---

### PUT /api/v1/organizations/:id

Atualiza informações de uma organização.

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
X-Organization-Id: org-uuid
```

**Body:**
```json
{
  "name": "Comunidade Local Atualizada",
  "description": "Nova descrição da organização",
  "email": "newemail@comunidade.com",
  "phone": "+55 11 99999-8888",
  "address": "Rua Principal, 456",
  "city": "São Paulo",
  "state": "SP",
  "country": "Brasil",
  "website": "https://newcomunidade.com",
  "logo": "https://cdn.example.com/new-logo.png"
}
```

**Query Params:**
Nenhum

**Response 200:**
```json
{
  "data": {
    "id": "org-uuid",
    "name": "Comunidade Local Atualizada",
    "slug": "comunidade-local",
    "description": "Nova descrição da organização",
    "email": "newemail@comunidade.com",
    "phone": "+55 11 99999-8888",
    "address": "Rua Principal, 456",
    "city": "São Paulo",
    "state": "SP",
    "country": "Brasil",
    "taxId": "12.345.678/0001-90",
    "website": "https://newcomunidade.com",
    "logo": "https://cdn.example.com/new-logo.png",
    "isActive": true,
    "createdAt": "2026-01-10T08:00:00Z",
    "updatedAt": "2026-07-14T11:00:00Z"
  }
}
```

**Erros Possíveis:**
- `401 Unauthorized`: Token inválido ou ausente
- `403 Forbidden`: Sem permissão para editar esta organização
- `404 Not Found`: Organização não encontrada
- `400 Bad Request`: Dados inválidos

**Exemplo cURL:**
```bash
curl -X PUT http://localhost:3000/api/v1/organizations/org-uuid \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -H "X-Organization-Id: org-uuid" \
  -d '{
    "name": "Comunidade Local Atualizada",
    "email": "newemail@comunidade.com"
  }'
```

---

### POST /api/v1/organizations

Cria uma nova organização.

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Body:**
```json
{
  "name": "Nova Comunidade",
  "slug": "nova-comunidade",
  "description": "Descrição da nova organização",
  "email": "contact@nova.com",
  "phone": "+55 11 99999-7777",
  "address": "Avenida Principal, 789",
  "city": "Rio de Janeiro",
  "state": "RJ",
  "country": "Brasil",
  "taxId": "98.765.432/0001-10",
  "website": "https://nova.com",
  "logo": "https://cdn.example.com/nova-logo.png"
}
```

**Query Params:**
Nenhum

**Response 200:**
```json
{
  "data": {
    "id": "new-org-uuid",
    "name": "Nova Comunidade",
    "slug": "nova-comunidade",
    "description": "Descrição da nova organização",
    "email": "contact@nova.com",
    "phone": "+55 11 99999-7777",
    "address": "Avenida Principal, 789",
    "city": "Rio de Janeiro",
    "state": "RJ",
    "country": "Brasil",
    "taxId": "98.765.432/0001-10",
    "website": "https://nova.com",
    "logo": "https://cdn.example.com/nova-logo.png",
    "isActive": true,
    "createdAt": "2026-07-14T12:00:00Z",
    "updatedAt": "2026-07-14T12:00:00Z"
  }
}
```

**Erros Possíveis:**
- `401 Unauthorized`: Token inválido ou ausente
- `403 Forbidden`: Sem permissão para criar organizações
- `400 Bad Request`: Dados inválidos ou slug duplicado
- `409 Conflict`: Organização com este slug já existe

**Exemplo cURL:**
```bash
curl -X POST http://localhost:3000/api/v1/organizations \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Nova Comunidade",
    "slug": "nova-comunidade",
    "email": "contact@nova.com"
  }'
```

---

## Usuários

### GET /api/v1/users

Lista usuários da organização com suporte a paginação e filtros.

**Headers:**
```
Authorization: Bearer {token}
X-Organization-Id: org-uuid
```

**Body:**
Nenhum

**Query Params:**
- `page` (opcional, padrão: 1): Número da página
- `limit` (opcional, padrão: 20): Quantidade de registros por página
- `role` (opcional): Filtrar por função (admin, manager, member)
- `active` (opcional): Filtrar por status (true/false)
- `search` (opcional): Buscar por nome ou email

**Response 200:**
```json
{
  "data": [
    {
      "id": "user-uuid-1",
      "email": "admin@example.com",
      "name": "Admin User",
      "role": "admin",
      "isActive": true,
      "createdAt": "2026-01-01T08:00:00Z",
      "updatedAt": "2026-07-14T10:00:00Z"
    },
    {
      "id": "user-uuid-2",
      "email": "manager@example.com",
      "name": "Manager User",
      "role": "manager",
      "isActive": true,
      "createdAt": "2026-02-15T09:00:00Z",
      "updatedAt": "2026-07-14T10:00:00Z"
    }
  ],
  "meta": {
    "total": 25,
    "page": 1,
    "limit": 20,
    "totalPages": 2
  }
}
```

**Erros Possíveis:**
- `401 Unauthorized`: Token inválido ou ausente
- `403 Forbidden`: Sem permissão para listar usuários
- `400 Bad Request`: Parâmetros de paginação inválidos

**Exemplo cURL:**
```bash
curl -X GET "http://localhost:3000/api/v1/users?page=1&limit=20&role=manager" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "X-Organization-Id: org-uuid"
```

---

### POST /api/v1/users

Cria um novo usuário na organização.

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
X-Organization-Id: org-uuid
```

**Body:**
```json
{
  "email": "newuser@example.com",
  "name": "New User",
  "password": "SecurePassword123!",
  "role": "member",
  "isActive": true
}
```

**Query Params:**
Nenhum

**Response 200:**
```json
{
  "data": {
    "id": "new-user-uuid",
    "email": "newuser@example.com",
    "name": "New User",
    "role": "member",
    "isActive": true,
    "createdAt": "2026-07-14T13:00:00Z",
    "updatedAt": "2026-07-14T13:00:00Z"
  }
}
```

**Erros Possíveis:**
- `401 Unauthorized`: Token inválido ou ausente
- `403 Forbidden`: Sem permissão para criar usuários
- `400 Bad Request`: Dados inválidos ou email inválido
- `409 Conflict`: Usuário com este email já existe

**Exemplo cURL:**
```bash
curl -X POST http://localhost:3000/api/v1/users \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -H "X-Organization-Id: org-uuid" \
  -d '{
    "email": "newuser@example.com",
    "name": "New User",
    "password": "SecurePassword123!",
    "role": "member"
  }'
```

---

### GET /api/v1/users/:id

Recupera informações de um usuário específico.

**Headers:**
```
Authorization: Bearer {token}
X-Organization-Id: org-uuid
```

**Body:**
Nenhum

**Query Params:**
Nenhum

**Response 200:**
```json
{
  "data": {
    "id": "user-uuid",
    "email": "user@example.com",
    "name": "User Name",
    "role": "member",
    "isActive": true,
    "lastLogin": "2026-07-14T14:00:00Z",
    "createdAt": "2026-01-10T08:00:00Z",
    "updatedAt": "2026-07-14T14:00:00Z"
  }
}
```

**Erros Possíveis:**
- `401 Unauthorized`: Token inválido ou ausente
- `403 Forbidden`: Sem permissão para visualizar este usuário
- `404 Not Found`: Usuário não encontrado

**Exemplo cURL:**
```bash
curl -X GET http://localhost:3000/api/v1/users/user-uuid \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "X-Organization-Id: org-uuid"
```

---

### PUT /api/v1/users/:id

Atualiza informações de um usuário.

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
X-Organization-Id: org-uuid
```

**Body:**
```json
{
  "name": "Updated User Name",
  "role": "manager",
  "isActive": true
}
```

**Query Params:**
Nenhum

**Response 200:**
```json
{
  "data": {
    "id": "user-uuid",
    "email": "user@example.com",
    "name": "Updated User Name",
    "role": "manager",
    "isActive": true,
    "createdAt": "2026-01-10T08:00:00Z",
    "updatedAt": "2026-07-14T15:00:00Z"
  }
}
```

**Erros Possíveis:**
- `401 Unauthorized`: Token inválido ou ausente
- `403 Forbidden`: Sem permissão para editar este usuário
- `404 Not Found`: Usuário não encontrado
- `400 Bad Request`: Dados inválidos

**Exemplo cURL:**
```bash
curl -X PUT http://localhost:3000/api/v1/users/user-uuid \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -H "X-Organization-Id: org-uuid" \
  -d '{
    "name": "Updated User Name",
    "role": "manager"
  }'
```

---

### DELETE /api/v1/users/:id

Realiza soft delete de um usuário (marca como inativo).

**Headers:**
```
Authorization: Bearer {token}
X-Organization-Id: org-uuid
```

**Body:**
Nenhum

**Query Params:**
Nenhum

**Response 200:**
```json
{
  "data": {
    "id": "user-uuid",
    "message": "Usuário deletado com sucesso (soft delete)"
  }
}
```

**Erros Possíveis:**
- `401 Unauthorized`: Token inválido ou ausente
- `403 Forbidden`: Sem permissão para deletar usuários
- `404 Not Found`: Usuário não encontrado

**Exemplo cURL:**
```bash
curl -X DELETE http://localhost:3000/api/v1/users/user-uuid \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "X-Organization-Id: org-uuid"
```

---

## Projetos

### GET /api/v1/projects

Lista projetos com suporte a paginação e filtros.

**Headers:**
```
Authorization: Bearer {token}
X-Organization-Id: org-uuid
```

**Body:**
Nenhum

**Query Params:**
- `page` (opcional, padrão: 1): Número da página
- `limit` (opcional, padrão: 20): Quantidade de registros por página
- `status` (opcional): Filtrar por status (draft, active, completed, archived)
- `search` (opcional): Buscar por título ou descrição

**Response 200:**
```json
{
  "data": [
    {
      "id": "project-uuid-1",
      "title": "Reforma da Escola Local",
      "slug": "reforma-escola-local",
      "description": "Projeto de reforma e modernização da escola",
      "status": "active",
      "goalAmount": 50000.00,
      "collectedAmount": 35000.00,
      "percentageReached": 70,
      "startDate": "2026-03-01T00:00:00Z",
      "endDate": "2026-12-31T23:59:59Z",
      "createdBy": "user-uuid",
      "createdAt": "2026-02-01T08:00:00Z",
      "updatedAt": "2026-07-14T10:00:00Z"
    }
  ],
  "meta": {
    "total": 12,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

**Erros Possíveis:**
- `401 Unauthorized`: Token inválido ou ausente
- `403 Forbidden`: Sem permissão para listar projetos
- `400 Bad Request`: Parâmetros de paginação inválidos

**Exemplo cURL:**
```bash
curl -X GET "http://localhost:3000/api/v1/projects?page=1&limit=20&status=active" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "X-Organization-Id: org-uuid"
```

---

### POST /api/v1/projects

Cria um novo projeto.

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
X-Organization-Id: org-uuid
```

**Body:**
```json
{
  "title": "Novo Projeto Comunitário",
  "slug": "novo-projeto-comunitario",
  "description": "Descrição detalhada do projeto",
  "goalAmount": 100000.00,
  "startDate": "2026-08-01T00:00:00Z",
  "endDate": "2026-12-31T23:59:59Z",
  "status": "draft"
}
```

**Query Params:**
Nenhum

**Response 200:**
```json
{
  "data": {
    "id": "new-project-uuid",
    "title": "Novo Projeto Comunitário",
    "slug": "novo-projeto-comunitario",
    "description": "Descrição detalhada do projeto",
    "status": "draft",
    "goalAmount": 100000.00,
    "collectedAmount": 0.00,
    "percentageReached": 0,
    "startDate": "2026-08-01T00:00:00Z",
    "endDate": "2026-12-31T23:59:59Z",
    "createdBy": "user-uuid",
    "createdAt": "2026-07-14T16:00:00Z",
    "updatedAt": "2026-07-14T16:00:00Z"
  }
}
```

**Erros Possíveis:**
- `401 Unauthorized`: Token inválido ou ausente
- `403 Forbidden`: Sem permissão para criar projetos
- `400 Bad Request`: Dados inválidos
- `409 Conflict`: Projeto com este slug já existe

**Exemplo cURL:**
```bash
curl -X POST http://localhost:3000/api/v1/projects \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -H "X-Organization-Id: org-uuid" \
  -d '{
    "title": "Novo Projeto Comunitário",
    "slug": "novo-projeto-comunitario",
    "description": "Descrição detalhada do projeto",
    "goalAmount": 100000.00,
    "startDate": "2026-08-01T00:00:00Z",
    "endDate": "2026-12-31T23:59:59Z"
  }'
```

---

### GET /api/v1/projects/:id

Recupera informações detalhadas de um projeto.

**Headers:**
```
Authorization: Bearer {token}
X-Organization-Id: org-uuid
```

**Body:**
Nenhum

**Query Params:**
Nenhum

**Response 200:**
```json
{
  "data": {
    "id": "project-uuid",
    "title": "Reforma da Escola Local",
    "slug": "reforma-escola-local",
    "description": "Projeto de reforma e modernização da escola",
    "status": "active",
    "goalAmount": 50000.00,
    "collectedAmount": 35000.00,
    "percentageReached": 70,
    "startDate": "2026-03-01T00:00:00Z",
    "endDate": "2026-12-31T23:59:59Z",
    "createdBy": "user-uuid",
    "createdAt": "2026-02-01T08:00:00Z",
    "updatedAt": "2026-07-14T10:00:00Z"
  }
}
```

**Erros Possíveis:**
- `401 Unauthorized`: Token inválido ou ausente
- `403 Forbidden`: Sem permissão para visualizar este projeto
- `404 Not Found`: Projeto não encontrado

**Exemplo cURL:**
```bash
curl -X GET http://localhost:3000/api/v1/projects/project-uuid \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "X-Organization-Id: org-uuid"
```

---

### PUT /api/v1/projects/:id

Atualiza informações de um projeto.

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
X-Organization-Id: org-uuid
```

**Body:**
```json
{
  "title": "Reforma da Escola Local - Atualizado",
  "description": "Descrição atualizada",
  "goalAmount": 60000.00,
  "endDate": "2027-03-31T23:59:59Z"
}
```

**Query Params:**
Nenhum

**Response 200:**
```json
{
  "data": {
    "id": "project-uuid",
    "title": "Reforma da Escola Local - Atualizado",
    "slug": "reforma-escola-local",
    "description": "Descrição atualizada",
    "status": "active",
    "goalAmount": 60000.00,
    "collectedAmount": 35000.00,
    "percentageReached": 58.33,
    "startDate": "2026-03-01T00:00:00Z",
    "endDate": "2027-03-31T23:59:59Z",
    "createdBy": "user-uuid",
    "createdAt": "2026-02-01T08:00:00Z",
    "updatedAt": "2026-07-14T17:00:00Z"
  }
}
```

**Erros Possíveis:**
- `401 Unauthorized`: Token inválido ou ausente
- `403 Forbidden`: Sem permissão para editar este projeto
- `404 Not Found`: Projeto não encontrado
- `400 Bad Request`: Dados inválidos

**Exemplo cURL:**
```bash
curl -X PUT http://localhost:3000/api/v1/projects/project-uuid \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -H "X-Organization-Id: org-uuid" \
  -d '{
    "title": "Reforma da Escola Local - Atualizado",
    "goalAmount": 60000.00
  }'
```

---

### DELETE /api/v1/projects/:id

Realiza soft delete de um projeto.

**Headers:**
```
Authorization: Bearer {token}
X-Organization-Id: org-uuid
```

**Body:**
Nenhum

**Query Params:**
Nenhum

**Response 200:**
```json
{
  "data": {
    "id": "project-uuid",
    "message": "Projeto deletado com sucesso (soft delete)"
  }
}
```

**Erros Possíveis:**
- `401 Unauthorized`: Token inválido ou ausente
- `403 Forbidden`: Sem permissão para deletar projetos
- `404 Not Found`: Projeto não encontrado

**Exemplo cURL:**
```bash
curl -X DELETE http://localhost:3000/api/v1/projects/project-uuid \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "X-Organization-Id: org-uuid"
```

---

### PATCH /api/v1/projects/:id/status

Atualiza o status de um projeto.

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
X-Organization-Id: org-uuid
```

**Body:**
```json
{
  "status": "completed"
}
```

**Query Params:**
Nenhum

**Response 200:**
```json
{
  "data": {
    "id": "project-uuid",
    "status": "completed",
    "updatedAt": "2026-07-14T18:00:00Z"
  }
}
```

**Erros Possíveis:**
- `401 Unauthorized`: Token inválido ou ausente
- `403 Forbidden`: Sem permissão para alterar status
- `404 Not Found`: Projeto não encontrado
- `400 Bad Request`: Status inválido

**Exemplo cURL:**
```bash
curl -X PATCH http://localhost:3000/api/v1/projects/project-uuid/status \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -H "X-Organization-Id: org-uuid" \
  -d '{
    "status": "completed"
  }'
```

---

## Iniciativas

### GET /api/v1/projects/:projectId/initiatives

Lista iniciativas de um projeto específico.

**Headers:**
```
Authorization: Bearer {token}
X-Organization-Id: org-uuid
```

**Body:**
Nenhum

**Query Params:**
- `page` (opcional, padrão: 1): Número da página
- `limit` (opcional, padrão: 20): Quantidade de registros por página

**Response 200:**
```json
{
  "data": [
    {
      "id": "initiative-uuid-1",
      "projectId": "project-uuid",
      "title": "Campanha de Arrecadação",
      "description": "Campanha online para arrecadação de fundos",
      "status": "active",
      "targetAmount": 50000.00,
      "collectedAmount": 35000.00,
      "startDate": "2026-03-01T00:00:00Z",
      "endDate": "2026-12-31T23:59:59Z",
      "createdAt": "2026-02-01T08:00:00Z",
      "updatedAt": "2026-07-14T10:00:00Z"
    }
  ],
  "meta": {
    "total": 5,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

**Erros Possíveis:**
- `401 Unauthorized`: Token inválido ou ausente
- `403 Forbidden`: Sem permissão para listar iniciativas
- `404 Not Found`: Projeto não encontrado
- `400 Bad Request`: Parâmetros de paginação inválidos

**Exemplo cURL:**
```bash
curl -X GET "http://localhost:3000/api/v1/projects/project-uuid/initiatives?page=1&limit=20" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "X-Organization-Id: org-uuid"
```

---

### POST /api/v1/projects/:projectId/initiatives

Cria uma nova iniciativa para um projeto.

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
X-Organization-Id: org-uuid
```

**Body:**
```json
{
  "title": "Nova Iniciativa",
  "description": "Descrição da iniciativa",
  "targetAmount": 25000.00,
  "startDate": "2026-08-01T00:00:00Z",
  "endDate": "2026-11-30T23:59:59Z",
  "status": "draft"
}
```

**Query Params:**
Nenhum

**Response 200:**
```json
{
  "data": {
    "id": "new-initiative-uuid",
    "projectId": "project-uuid",
    "title": "Nova Iniciativa",
    "description": "Descrição da iniciativa",
    "status": "draft",
    "targetAmount": 25000.00,
    "collectedAmount": 0.00,
    "startDate": "2026-08-01T00:00:00Z",
    "endDate": "2026-11-30T23:59:59Z",
    "createdAt": "2026-07-14T19:00:00Z",
    "updatedAt": "2026-07-14T19:00:00Z"
  }
}
```

**Erros Possíveis:**
- `401 Unauthorized`: Token inválido ou ausente
- `403 Forbidden`: Sem permissão para criar iniciativas
- `404 Not Found`: Projeto não encontrado
- `400 Bad Request`: Dados inválidos

**Exemplo cURL:**
```bash
curl -X POST http://localhost:3000/api/v1/projects/project-uuid/initiatives \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -H "X-Organization-Id: org-uuid" \
  -d '{
    "title": "Nova Iniciativa",
    "description": "Descrição da iniciativa",
    "targetAmount": 25000.00,
    "startDate": "2026-08-01T00:00:00Z",
    "endDate": "2026-11-30T23:59:59Z"
  }'
```

---

### GET /api/v1/initiatives/:id

Recupera informações detalhadas de uma iniciativa.

**Headers:**
```
Authorization: Bearer {token}
X-Organization-Id: org-uuid
```

**Body:**
Nenhum

**Query Params:**
Nenhum

**Response 200:**
```json
{
  "data": {
    "id": "initiative-uuid",
    "projectId": "project-uuid",
    "title": "Campanha de Arrecadação",
    "description": "Campanha online para arrecadação de fundos",
    "status": "active",
    "targetAmount": 50000.00,
    "collectedAmount": 35000.00,
    "percentageReached": 70,
    "startDate": "2026-03-01T00:00:00Z",
    "endDate": "2026-12-31T23:59:59Z",
    "createdAt": "2026-02-01T08:00:00Z",
    "updatedAt": "2026-07-14T10:00:00Z"
  }
}
```

**Erros Possíveis:**
- `401 Unauthorized`: Token inválido ou ausente
- `403 Forbidden`: Sem permissão para visualizar esta iniciativa
- `404 Not Found`: Iniciativa não encontrada

**Exemplo cURL:**
```bash
curl -X GET http://localhost:3000/api/v1/initiatives/initiative-uuid \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "X-Organization-Id: org-uuid"
```

---

### PUT /api/v1/initiatives/:id

Atualiza informações de uma iniciativa.

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
X-Organization-Id: org-uuid
```

**Body:**
```json
{
  "title": "Campanha de Arrecadação - Atualizado",
  "description": "Descrição atualizada",
  "targetAmount": 60000.00
}
```

**Query Params:**
Nenhum

**Response 200:**
```json
{
  "data": {
    "id": "initiative-uuid",
    "projectId": "project-uuid",
    "title": "Campanha de Arrecadação - Atualizado",
    "description": "Descrição atualizada",
    "status": "active",
    "targetAmount": 60000.00,
    "collectedAmount": 35000.00,
    "percentageReached": 58.33,
    "startDate": "2026-03-01T00:00:00Z",
    "endDate": "2026-12-31T23:59:59Z",
    "createdAt": "2026-02-01T08:00:00Z",
    "updatedAt": "2026-07-14T20:00:00Z"
  }
}
```

**Erros Possíveis:**
- `401 Unauthorized`: Token inválido ou ausente
- `403 Forbidden`: Sem permissão para editar esta iniciativa
- `404 Not Found`: Iniciativa não encontrada
- `400 Bad Request`: Dados inválidos

**Exemplo cURL:**
```bash
curl -X PUT http://localhost:3000/api/v1/initiatives/initiative-uuid \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -H "X-Organization-Id: org-uuid" \
  -d '{
    "title": "Campanha de Arrecadação - Atualizado",
    "targetAmount": 60000.00
  }'
```

---

### DELETE /api/v1/initiatives/:id

Realiza soft delete de uma iniciativa.

**Headers:**
```
Authorization: Bearer {token}
X-Organization-Id: org-uuid
```

**Body:**
Nenhum

**Query Params:**
Nenhum

**Response 200:**
```json
{
  "data": {
    "id": "initiative-uuid",
    "message": "Iniciativa deletada com sucesso (soft delete)"
  }
}
```

**Erros Possíveis:**
- `401 Unauthorized`: Token inválido ou ausente
- `403 Forbidden`: Sem permissão para deletar iniciativas
- `404 Not Found`: Iniciativa não encontrada

**Exemplo cURL:**
```bash
curl -X DELETE http://localhost:3000/api/v1/initiatives/initiative-uuid \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "X-Organization-Id: org-uuid"
```

---

## Timeline

### GET /api/v1/projects/:projectId/timeline

Lista eventos da timeline de um projeto com paginação.

**Headers:**
```
Authorization: Bearer {token}
X-Organization-Id: org-uuid
```

**Body:**
Nenhum

**Query Params:**
- `page` (opcional, padrão: 1): Número da página
- `limit` (opcional, padrão: 20): Quantidade de registros por página

**Response 200:**
```json
{
  "data": [
    {
      "id": "timeline-uuid-1",
      "projectId": "project-uuid",
      "title": "Kickoff do Projeto",
      "description": "Evento de início oficial do projeto",
      "date": "2026-03-01T10:00:00Z",
      "type": "milestone",
      "createdAt": "2026-02-01T08:00:00Z",
      "updatedAt": "2026-07-14T10:00:00Z"
    }
  ],
  "meta": {
    "total": 10,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

**Erros Possíveis:**
- `401 Unauthorized`: Token inválido ou ausente
- `403 Forbidden`: Sem permissão para listar timeline
- `404 Not Found`: Projeto não encontrado
- `400 Bad Request`: Parâmetros de paginação inválidos

**Exemplo cURL:**
```bash
curl -X GET "http://localhost:3000/api/v1/projects/project-uuid/timeline?page=1&limit=20" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "X-Organization-Id: org-uuid"
```

---

### POST /api/v1/projects/:projectId/timeline

Cria um novo evento na timeline do projeto.

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
X-Organization-Id: org-uuid
```

**Body:**
```json
{
  "title": "Novo Marco",
  "description": "Descrição do novo marco",
  "date": "2026-09-15T14:00:00Z",
  "type": "milestone"
}
```

**Query Params:**
Nenhum

**Response 200:**
```json
{
  "data": {
    "id": "new-timeline-uuid",
    "projectId": "project-uuid",
    "title": "Novo Marco",
    "description": "Descrição do novo marco",
    "date": "2026-09-15T14:00:00Z",
    "type": "milestone",
    "createdAt": "2026-07-14T21:00:00Z",
    "updatedAt": "2026-07-14T21:00:00Z"
  }
}
```

**Erros Possíveis:**
- `401 Unauthorized`: Token inválido ou ausente
- `403 Forbidden`: Sem permissão para criar timeline
- `404 Not Found`: Projeto não encontrado
- `400 Bad Request`: Dados inválidos

**Exemplo cURL:**
```bash
curl -X POST http://localhost:3000/api/v1/projects/project-uuid/timeline \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -H "X-Organization-Id: org-uuid" \
  -d '{
    "title": "Novo Marco",
    "description": "Descrição do novo marco",
    "date": "2026-09-15T14:00:00Z",
    "type": "milestone"
  }'
```

---

### PUT /api/v1/timeline/:id

Atualiza um evento da timeline.

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
X-Organization-Id: org-uuid
```

**Body:**
```json
{
  "title": "Marco Atualizado",
  "description": "Descrição atualizada",
  "date": "2026-09-20T14:00:00Z",
  "type": "update"
}
```

**Query Params:**
Nenhum

**Response 200:**
```json
{
  "data": {
    "id": "timeline-uuid",
    "projectId": "project-uuid",
    "title": "Marco Atualizado",
    "description": "Descrição atualizada",
    "date": "2026-09-20T14:00:00Z",
    "type": "update",
    "createdAt": "2026-02-01T08:00:00Z",
    "updatedAt": "2026-07-14T22:00:00Z"
  }
}
```

**Erros Possíveis:**
- `401 Unauthorized`: Token inválido ou ausente
- `403 Forbidden`: Sem permissão para editar timeline
- `404 Not Found`: Evento não encontrado
- `400 Bad Request`: Dados inválidos

**Exemplo cURL:**
```bash
curl -X PUT http://localhost:3000/api/v1/timeline/timeline-uuid \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -H "X-Organization-Id: org-uuid" \
  -d '{
    "title": "Marco Atualizado",
    "date": "2026-09-20T14:00:00Z"
  }'
```

---

### DELETE /api/v1/timeline/:id

Realiza soft delete de um evento da timeline.

**Headers:**
```
Authorization: Bearer {token}
X-Organization-Id: org-uuid
```

**Body:**
Nenhum

**Query Params:**
Nenhum

**Response 200:**
```json
{
  "data": {
    "id": "timeline-uuid",
    "message": "Evento deletado com sucesso (soft delete)"
  }
}
```

**Erros Possíveis:**
- `401 Unauthorized`: Token inválido ou ausente
- `403 Forbidden`: Sem permissão para deletar timeline
- `404 Not Found`: Evento não encontrado

**Exemplo cURL:**
```bash
curl -X DELETE http://localhost:3000/api/v1/timeline/timeline-uuid \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "X-Organization-Id: org-uuid"
```

---

## Prestação de Contas (Entradas e Saídas)

### GET /api/v1/projects/:projectId/financial

Recupera informações financeiras completas do projeto (entradas e saídas).

**Headers:**
```
Authorization: Bearer {token}
X-Organization-Id: org-uuid
```

**Body:**
Nenhum

**Query Params:**
- `page` (opcional, padrão: 1): Número da página
- `limit` (opcional, padrão: 20): Quantidade de registros por página

**Response 200:**
```json
{
  "data": {
    "entries": [
      {
        "id": "entry-uuid-1",
        "projectId": "project-uuid",
        "amount": 5000.00,
        "source": "Doação individual",
        "description": "Primeira doação",
        "date": "2026-03-05T10:00:00Z",
        "contributor": "John Doe",
        "createdAt": "2026-03-05T10:00:00Z",
        "updatedAt": "2026-03-05T10:00:00Z"
      }
    ],
    "exits": [
      {
        "id": "exit-uuid-1",
        "projectId": "project-uuid",
        "amount": 1000.00,
        "category": "materiais",
        "description": "Compra de materiais de construção",
        "date": "2026-03-10T14:00:00Z",
        "createdAt": "2026-03-10T14:00:00Z",
        "updatedAt": "2026-03-10T14:00:00Z"
      }
    ],
    "summary": {
      "totalEntries": 35000.00,
      "totalExits": 12000.00,
      "balance": 23000.00
    }
  },
  "meta": {
    "total": 25,
    "page": 1,
    "limit": 20,
    "totalPages": 2
  }
}
```

**Erros Possíveis:**
- `401 Unauthorized`: Token inválido ou ausente
- `403 Forbidden`: Sem permissão para visualizar dados financeiros
- `404 Not Found`: Projeto não encontrado
- `400 Bad Request`: Parâmetros de paginação inválidos

**Exemplo cURL:**
```bash
curl -X GET "http://localhost:3000/api/v1/projects/project-uuid/financial?page=1&limit=20" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "X-Organization-Id: org-uuid"
```

---

### POST /api/v1/projects/:projectId/financial/entries

Registra uma entrada de fundos no projeto.

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
X-Organization-Id: org-uuid
```

**Body:**
```json
{
  "amount": 2500.00,
  "source": "Doação",
  "description": "Doação de novo contribuidor",
  "date": "2026-07-14T15:00:00Z",
  "contributor": "Jane Smith"
}
```

**Query Params:**
Nenhum

**Response 200:**
```json
{
  "data": {
    "id": "new-entry-uuid",
    "projectId": "project-uuid",
    "amount": 2500.00,
    "source": "Doação",
    "description": "Doação de novo contribuidor",
    "date": "2026-07-14T15:00:00Z",
    "contributor": "Jane Smith",
    "createdAt": "2026-07-14T23:00:00Z",
    "updatedAt": "2026-07-14T23:00:00Z"
  }
}
```

**Erros Possíveis:**
- `401 Unauthorized`: Token inválido ou ausente
- `403 Forbidden`: Sem permissão para criar entradas
- `404 Not Found`: Projeto não encontrado
- `400 Bad Request`: Dados inválidos

**Exemplo cURL:**
```bash
curl -X POST http://localhost:3000/api/v1/projects/project-uuid/financial/entries \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -H "X-Organization-Id: org-uuid" \
  -d '{
    "amount": 2500.00,
    "source": "Doação",
    "description": "Doação de novo contribuidor",
    "date": "2026-07-14T15:00:00Z",
    "contributor": "Jane Smith"
  }'
```

---

### POST /api/v1/projects/:projectId/financial/exits

Registra uma saída de fundos do projeto.

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
X-Organization-Id: org-uuid
```

**Body:**
```json
{
  "amount": 1500.00,
  "category": "mao-de-obra",
  "description": "Pagamento de mão de obra",
  "date": "2026-07-14T16:00:00Z",
  "recipient": "Carlos Silva"
}
```

**Query Params:**
Nenhum

**Response 200:**
```json
{
  "data": {
    "id": "new-exit-uuid",
    "projectId": "project-uuid",
    "amount": 1500.00,
    "category": "mao-de-obra",
    "description": "Pagamento de mão de obra",
    "date": "2026-07-14T16:00:00Z",
    "recipient": "Carlos Silva",
    "createdAt": "2026-07-15T00:00:00Z",
    "updatedAt": "2026-07-15T00:00:00Z"
  }
}
```

**Erros Possíveis:**
- `401 Unauthorized`: Token inválido ou ausente
- `403 Forbidden`: Sem permissão para criar saídas
- `404 Not Found`: Projeto não encontrado
- `400 Bad Request`: Dados inválidos

**Exemplo cURL:**
```bash
curl -X POST http://localhost:3000/api/v1/projects/project-uuid/financial/exits \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -H "X-Organization-Id: org-uuid" \
  -d '{
    "amount": 1500.00,
    "category": "mao-de-obra",
    "description": "Pagamento de mão de obra",
    "date": "2026-07-14T16:00:00Z",
    "recipient": "Carlos Silva"
  }'
```

---

### DELETE /api/v1/financial/:id

Realiza soft delete de um registro financeiro (entrada ou saída).

**Headers:**
```
Authorization: Bearer {token}
X-Organization-Id: org-uuid
```

**Body:**
Nenhum

**Query Params:**
Nenhum

**Response 200:**
```json
{
  "data": {
    "id": "financial-uuid",
    "message": "Registro financeiro deletado com sucesso (soft delete)"
  }
}
```

**Erros Possíveis:**
- `401 Unauthorized`: Token inválido ou ausente
- `403 Forbidden`: Sem permissão para deletar registros financeiros
- `404 Not Found`: Registro não encontrado

**Exemplo cURL:**
```bash
curl -X DELETE http://localhost:3000/api/v1/financial/financial-uuid \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "X-Organization-Id: org-uuid"
```

---

## Uploads

### POST /api/v1/uploads

Faz upload de um arquivo para o servidor.

**Headers:**
```
Authorization: Bearer {token}
Content-Type: multipart/form-data
X-Organization-Id: org-uuid
```

**Body (multipart/form-data):**
```
file: [arquivo binário]
purpose: "project-image" | "financial-receipt" | "document"
```

**Query Params:**
Nenhum

**Response 200:**
```json
{
  "data": {
    "id": "upload-uuid",
    "filename": "projeto_imagem.jpg",
    "originalName": "projeto_imagem.jpg",
    "mimeType": "image/jpeg",
    "size": 102400,
    "url": "https://cdn.example.com/uploads/2026/07/projeto_imagem.jpg",
    "purpose": "project-image",
    "uploadedAt": "2026-07-15T01:00:00Z"
  }
}
```

**Erros Possíveis:**
- `401 Unauthorized`: Token inválido ou ausente
- `400 Bad Request`: Arquivo não enviado ou formato inválido
- `413 Payload Too Large`: Arquivo excede o tamanho máximo permitido (10MB)
- `415 Unsupported Media Type`: Tipo de arquivo não suportado

**Exemplo cURL:**
```bash
curl -X POST http://localhost:3000/api/v1/uploads \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "X-Organization-Id: org-uuid" \
  -F "file=@/path/to/image.jpg" \
  -F "purpose=project-image"
```

---

## Dashboard

### GET /api/v1/dashboard

Recupera dados resumidos do dashboard para a organização.

**Headers:**
```
Authorization: Bearer {token}
X-Organization-Id: org-uuid
```

**Body:**
Nenhum

**Query Params:**
Nenhum

**Response 200:**
```json
{
  "data": {
    "overview": {
      "activeProjects": 8,
      "totalProjects": 15,
      "completedProjects": 7,
      "archivedProjects": 0
    },
    "financial": {
      "totalRaised": 250000.00,
      "totalSpent": 180000.00,
      "balance": 70000.00
    },
    "goals": {
      "totalGoalAmount": 350000.00,
      "percentageReached": 71.43,
      "averagePercentagePerProject": 68.5
    },
    "recentProjects": [
      {
        "id": "project-uuid-1",
        "title": "Reforma da Escola Local",
        "status": "active",
        "goalAmount": 50000.00,
        "collectedAmount": 35000.00,
        "percentageReached": 70
      }
    ],
    "recentActivities": [
      {
        "id": "activity-uuid-1",
        "type": "entry",
        "description": "Nova doação recebida",
        "amount": 5000.00,
        "projectTitle": "Reforma da Escola Local",
        "timestamp": "2026-07-14T20:00:00Z"
      }
    ]
  }
}
```

**Erros Possíveis:**
- `401 Unauthorized`: Token inválido ou ausente
- `403 Forbidden`: Sem permissão para visualizar dashboard

**Exemplo cURL:**
```bash
curl -X GET http://localhost:3000/api/v1/dashboard \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "X-Organization-Id: org-uuid"
```

---

## Portal Público

Estes endpoints **não requerem autenticação JWT** e permitem acesso público aos projetos.

### GET /api/v1/public/projects/:slug

Recupera informações públicas de um projeto por slug.

**Headers:**
```
Content-Type: application/json
```

**Body:**
Nenhum

**Query Params:**
Nenhum

**Response 200:**
```json
{
  "data": {
    "id": "project-uuid",
    "title": "Reforma da Escola Local",
    "slug": "reforma-escola-local",
    "description": "Projeto de reforma e modernização da escola",
    "status": "active",
    "goalAmount": 50000.00,
    "collectedAmount": 35000.00,
    "percentageReached": 70,
    "startDate": "2026-03-01T00:00:00Z",
    "endDate": "2026-12-31T23:59:59Z",
    "organization": {
      "name": "Comunidade Local",
      "slug": "comunidade-local",
      "logo": "https://cdn.example.com/logo.png",
      "website": "https://comunidade.com"
    }
  }
}
```

**Erros Possíveis:**
- `404 Not Found`: Projeto não encontrado ou não está público
- `400 Bad Request`: Slug inválido

**Exemplo cURL:**
```bash
curl -X GET http://localhost:3000/api/v1/public/projects/reforma-escola-local
```

---

### GET /api/v1/public/projects/:slug/timeline

Recupera timeline pública de um projeto.

**Headers:**
```
Content-Type: application/json
```

**Body:**
Nenhum

**Query Params:**
- `page` (opcional, padrão: 1): Número da página
- `limit` (opcional, padrão: 20): Quantidade de registros por página

**Response 200:**
```json
{
  "data": [
    {
      "id": "timeline-uuid-1",
      "title": "Kickoff do Projeto",
      "description": "Evento de início oficial do projeto",
      "date": "2026-03-01T10:00:00Z",
      "type": "milestone"
    }
  ],
  "meta": {
    "total": 10,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

**Erros Possíveis:**
- `404 Not Found`: Projeto não encontrado ou não está público
- `400 Bad Request`: Slug inválido ou parâmetros de paginação inválidos

**Exemplo cURL:**
```bash
curl -X GET "http://localhost:3000/api/v1/public/projects/reforma-escola-local/timeline?page=1&limit=20"
```

---

### GET /api/v1/public/projects/:slug/financial

Recupera informações financeiras públicas de um projeto.

**Headers:**
```
Content-Type: application/json
```

**Body:**
Nenhum

**Query Params:**
- `page` (opcional, padrão: 1): Número da página
- `limit` (opcional, padrão: 20): Quantidade de registros por página

**Response 200:**
```json
{
  "data": {
    "entries": [
      {
        "id": "entry-uuid-1",
        "amount": 5000.00,
        "source": "Doação individual",
        "date": "2026-03-05T10:00:00Z"
      }
    ],
    "summary": {
      "totalEntries": 35000.00,
      "totalExits": 12000.00,
      "balance": 23000.00
    }
  },
  "meta": {
    "total": 15,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

**Erros Possíveis:**
- `404 Not Found`: Projeto não encontrado ou não está público
- `400 Bad Request`: Slug inválido ou parâmetros de paginação inválidos

**Exemplo cURL:**
```bash
curl -X GET "http://localhost:3000/api/v1/public/projects/reforma-escola-local/financial?page=1&limit=20"
```

---

## Convenções Gerais

### Erros

Todos os erros seguem o seguinte padrão:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Um ou mais campos são inválidos",
    "details": [
      {
        "field": "email",
        "message": "Email inválido"
      }
    ]
  }
}
```

**Códigos de erro comuns:**
- `AUTHENTICATION_REQUIRED`: Token JWT ausente
- `INVALID_TOKEN`: Token JWT inválido ou expirado
- `AUTHORIZATION_DENIED`: Usuário não tem permissão
- `RESOURCE_NOT_FOUND`: Recurso não encontrado
- `VALIDATION_ERROR`: Dados inválidos
- `CONFLICT`: Recurso duplicado
- `RATE_LIMIT_EXCEEDED`: Taxa de requisições excedida
- `INTERNAL_SERVER_ERROR`: Erro do servidor

### Rate Limiting

A API implementa rate limiting para proteger contra abuso. Os seguintes headers são retornados em cada resposta:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1234567890
```

Quando o limite é excedido, a API retorna status `429 Too Many Requests`.

### Paginação

Todas as respostas paginadas incluem um objeto `meta`:

```json
{
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  }
}
```

### Timestamps

Todos os timestamps utilizam formato ISO 8601 com UTC (Z):
```
2026-07-14T15:30:45Z
```

---

## Autenticação e Autorização

### JWT Token

O token JWT contém as seguintes informações:

```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "name": "User Name",
  "role": "manager",
  "organizationId": "org-uuid",
  "iat": 1689360645,
  "exp": 1689447045
}
```

**Validade:** 24 horas (token)
**Refresh Token:** 30 dias

### Roles e Permissões

- **admin**: Acesso total à organização e gestão de usuários
- **manager**: Acesso total a projetos e dados financeiros
- **member**: Acesso leitura a projetos; acesso limitado a dados financeiros

### Headers Obrigatórios

Para endpoints protegidos:
```
Authorization: Bearer {token}
X-Organization-Id: org-uuid
```

---

## Versioning

A API utiliza versionamento via URL path (`/api/v1`). Futuras versões será acessíveis em `/api/v2`, `/api/v3`, etc.

Mudanças não-retrocompatíveis resultam em nova versão.

---

## Suporte e Documentação

Para suporte e documentações adicionais, entre em contato com a equipe de desenvolvimento.

**Última atualização:** 14 de julho de 2026
