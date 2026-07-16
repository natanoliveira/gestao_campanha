# Página de Configurações — Design Spec

> **For agentic workers:** Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this spec.

**Goal:** Centralizar todas as configurações da organização em `/configuracoes` com 4 abas — Organização, Usuários, Categorias e Plano — removendo Usuários e Cat. Financeiras do sidebar.

**Architecture:** Página cliente com tabs horizontais (padrão já usado em projetos). Cada aba embute a funcionalidade completa inline. Acesso para ADMIN e MANAGER, com restrições por aba.

**Tech Stack:** Next.js 15 App Router, Prisma v7, base-ui Dialog, fetchWithAuth, Tailwind CSS, design system existente.

---

## Global Constraints

- Tenant isolation: toda query filtra por `organizationId` do JWT
- Soft delete: `deletedAt: null` em todas as queries
- RBAC: ADMIN acesso total; MANAGER acessa mas não edita org nem plano
- Padrão modal: `Dialog` de `@base-ui/react/dialog` para criar/editar
- Padrão de fetch: `fetchWithAuth` de `@/lib/fetch-with-auth`
- Padrão de classes: `inputCls`, `textareaCls`, `dialogPopupCls`, `overlayBackdropCls` iguais aos demais módulos
- Tabs: mesmo padrão visual de `projects/[id]/page.tsx`
- Valores dos planos: Basic = R$ 99,90 | Premium = R$ 159,90

---

## Schema

Adicionar à tabela `Organization` no Prisma:

```prisma
enum Plan {
  BASIC
  PREMIUM
}

model Organization {
  // ... campos existentes ...
  plan  Plan  @default(BASIC)
}
```

Limites por plano (enforced na service layer):

| Limite | BASIC | PREMIUM |
|--------|-------|---------|
| Projetos ativos | 3 | ilimitado |
| Iniciativas por projeto | 5 | ilimitado |
| Usuários | 5 | ilimitado |
| Integração Stripe | não | sim (spec futuro) |
| Relatórios avançados | não | sim (spec futuro) |

---

## API

### GET /api/v1/organizations/me
- Retorna dados da org do usuário autenticado
- `select`: `id`, `name`, `slug`, `plan`, `active`
- Acesso: qualquer role autenticada

### PUT /api/v1/organizations/[id] (já existe)
- Atualiza `name` e `slug`
- Apenas ADMIN pode chamar (validar `role === "ADMIN"` na rota)
- Valida slug único (já implementado no service)

---

## Sidebar

Arquivo: `src/components/layout/sidebar.tsx`

- **Adicionar:** item "Configurações" com ícone `Settings` (lucide), href `/configuracoes`, na seção Organização
- **Remover:** itens "Usuários" (`/users`) e "Cat. Financeiras" (`/financial-categories`) da seção Organização

---

## Página `/configuracoes`

Arquivo: `src/app/(app)/configuracoes/page.tsx`

### Estrutura geral

```
Header: "Configurações" + subtítulo "Administre sua organização"
Tabs: Organização | Usuários | Categorias | Plano
Conteúdo da aba ativa
```

MANAGER vê todas as abas. Campos de edição e botões de ação ficam ocultos ou desabilitados conforme a aba (ver restrições abaixo).

---

### Aba: Organização

**Acesso:** ADMIN edita. MANAGER vê somente leitura.

Campos exibidos:
- **Nome** — `input` com `name="name"`, `autoComplete="off"`
- **Slug** — `input` com `name="slug"`, `autoComplete="off"`, `spellCheck={false}`, hint "Altera a URL pública da organização"

Comportamento:
- Carrega dados via `GET /api/v1/organizations/me` no mount
- Botão "Salvar alterações" visível apenas para ADMIN
- Submit: `PUT /api/v1/organizations/[orgId]` com `{ name, slug }`
- Feedback inline de erro (ex: slug já em uso)

---

### Aba: Usuários

**Acesso:** ADMIN vê e edita. MANAGER vê somente leitura (sem botões de criar/editar/remover).

Funcionalidade idêntica à atual `src/app/(app)/users/page.tsx`:
- Lista com busca e filtro por role
- Badge de status ativo/removido (ADMIN vê removidos com badge "Removido")
- Modal criar usuário (ADMIN only): nome, email, senha, role
- Modal editar usuário (ADMIN only): nome, role, status
- Remover com `ConfirmDialog` (ADMIN only, soft delete)

Reutilizar lógica e componentes existentes de `src/app/(app)/users/page.tsx` — mover para dentro da aba.

---

### Aba: Categorias

**Acesso:** ADMIN e MANAGER editam.

Funcionalidade idêntica à atual `src/app/(app)/financial-categories/page.tsx`:
- Duas sub-abas: Entradas | Despesas
- Lista de categorias por tipo
- Modal criar/editar categoria: campo nome
- Remover com `ConfirmDialog` (soft delete)

Reutilizar lógica e componentes existentes de `src/app/(app)/financial-categories/page.tsx`.

---

### Aba: Plano

**Acesso:** ADMIN e MANAGER veem. Apenas ADMIN vê o botão de upgrade.

Seções:

**1. Plano atual**
- Card mostrando plano (`BASIC` ou `PREMIUM`), valor mensal e data de início (se disponível)

**2. Medidor de uso** (somente plano BASIC)
- Busca via `GET /api/v1/dashboard/stats` ou endpoint dedicado
- Exibe: projetos ativos (X de 3), usuários ativos (X de 5)
- Iniciativas por projeto: exibir máximo entre todos os projetos (X de 5)
- Barra de progresso simples para cada limite

**3. Comparação de planos**
- Tabela ou cards lado a lado Basic vs Premium com os limites definidos

**4. CTA de upgrade** (visível apenas para ADMIN, apenas no plano BASIC)
- Botão "Fazer upgrade para Premium — R$ 159,90/mês"
- Por ora: abre modal de confirmação com mensagem "Entre em contato para realizar o upgrade" + email de contato
- Integração Stripe fica para spec futuro

---

## Restrições de acesso por aba

| Aba | ADMIN | MANAGER |
|-----|-------|---------|
| Organização | lê + edita | somente leitura |
| Usuários | lê + CRUD completo | somente leitura |
| Categorias | lê + CRUD completo | lê + CRUD completo |
| Plano | lê + vê CTA upgrade | lê (sem CTA) |

---

## Páginas existentes mantidas mas sem link no sidebar

- `src/app/(app)/users/page.tsx` — mantém (acessível via URL direta)
- `src/app/(app)/financial-categories/page.tsx` — mantém (acessível via URL direta)

---

## O que este spec NÃO inclui

- Upload de logo da organização
- Integração Stripe para cobrança real (spec futuro)
- Webhook de plano / gerenciamento de assinatura (spec futuro)
- Cancelamento de plano
