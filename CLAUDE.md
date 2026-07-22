@AGENTS.md

# gestao_campanha — Contexto do Projeto

Sistema de gestão de campanhas/projetos com portal público. Multi-tenant, dark-only, RBAC com permission matrix.

## Stack

- **Next.js 15** App Router — route groups `(app)`, `(auth)`, `(public)`
- **Prisma v7** + `@prisma/adapter-neon` + `@neondatabase/serverless`
- **Tailwind v4** CSS-first (`@theme inline` em `globals.css`)
- **base-ui**: `Dialog.Root/Trigger/Backdrop/Popup/Close`, `Drawer.Root swipeDirection="right"`
- **React Hook Form** + **Zod v4** para formulários
- **Lucide React** para ícones
- **IBM Plex Sans** (body) + **IBM Plex Serif** (headings) via `next/font`

## Design System

CSS vars em `:root` (dark always-on — nunca adicionar modo light):

```css
--background: #0c0b0a   --card: #151413   --surface-2: #1c1a18
--primary: #f59e0b      --success: #22c55e  --destructive: #ef4444  --warning: #fbbf24
--text-subtle: #6b6460  --border: #2c2824   --accent-hover: #d97706
```

## Padrões Críticos de Código

```ts
// Next.js 15: params é Promise
const { id } = await params;

// Soft delete: SEMPRE filtrar
where: { organizationId, deletedAt: null }

// Bearer JWT via header
Authorization: Bearer <token>

// Paginação
paginatedResponse(data, total, page, limit)
// → { data, meta: { total, page, limit, totalPages } }
```

- **Params**: `authenticate(req)` → `{ userId, organizationId, role, isMaster }`
- **Erros**: `errorResponse(error)` em todos os catch das rotas
- **Middleware edge**: verifica cookie `refresh_token`; `/api/v1/public/` está em `PUBLIC_PATHS`

## Sistema de Permissões

`src/lib/permissions.ts` — usar `can(role, permission)` em vez de comparar role diretamente:

| Permission | Quem tem |
|---|---|
| `*` (todas) | ADMIN |
| `project:write` | ADMIN, MANAGER |
| `initiative:write` | ADMIN, MANAGER |
| `financial:write` | ADMIN, MANAGER, TREASURER |
| `timeline:write` | ADMIN, MANAGER, COMMUNICATION |
| `category:write` | ADMIN, MANAGER |
| `user:read` | ADMIN, MANAGER, AUDITOR |
| `org:manage` | ADMIN |

```ts
// API routes
import { authorize } from "@/middlewares/authorize";
authorize(payload, "project:write"); // lança 403 se sem permissão

// Frontend
import { can } from "@/lib/permissions";
const canManage = can(role, "project:write");
const isAdmin   = can(role, "org:manage");
```

**Nunca** comparar `role === "ADMIN"` ou `role === "MANAGER"` diretamente.

`showDeleted` em listagens: restrito a `can(payload.role, "org:manage")`.

## Padrões de UI

### Modal vs Drawer
- **Criar/Editar** → `Dialog` base-ui (modal)
- **Visualizar detalhes** → `AppDrawer` (drawer lateral, read-only)
- Nunca usar AppDrawer para formulários

### Soft Delete nas listagens
- Não-ADMIN: filtra `deletedAt: null` — removidos invisíveis
- ADMIN: mostra removidos com badge "Removido" + `opacity-60` + toggle "Mostrar removidos"

### Componentes compartilhados
- `ConfirmDialog` — todo botão destrutivo: gerencia open, loading, error, auto-close on success
- `AlertsPanel` — widget de alertas de prazo no dashboard
- `KPICard`, `FeedItem`, `ProgressBar`, `Badge`, `Spinner`, `AppDrawer`

## Módulos Implementados

- **Auth** — login, refresh, logout, session-expired
- **Dashboard** — KPIs, projetos recentes, atividades, categorias, AlertsPanel
- **Projetos** — CRUD completo + edição modal + slug automático + portal público
- **Iniciativas** — CRUD + `endDate` para alertas de prazo + dependências
- **Lançamentos** — entries/exits por projeto e por iniciativa
- **Categorias Financeiras** — CRUD, tabs Entradas/Despesas
- **Usuários** — CRUD, soft delete, busca
- **Timeline** — posts com tipos (TEXT/PHOTO/VIDEO/PDF/LINK)
- **Configurações** — 4 abas: Organização, Usuários, Categorias, Plano
- **Master** — `/master/organizacoes`, `/master/planos`; Org Switcher no sidebar
- **Stripe** — Checkout Session de upgrade + webhook

## Credenciais Seed

```
Master: master@sistema.com / master123
Admin:  admin@demo.com / senha123
```

## Git e Commits

- **Nunca executar** `git commit`, `git push` ou `git pull` — apenas gerar a mensagem
- Mensagem baseada em `git status`/`git diff`, sem `Co-Authored-By`
- O usuário controla todos os comandos git

## Skills a Invocar

Antes de cada feature/fase, verificar e invocar skills pertinentes:
- `token-efficiency` — sempre
- `frontend-design` — componentes/páginas novas
- `brainstorming` — features sem spec definida
- `simplify` ou `/simplify` — antes de apresentar código

## Padrões de Revisão de Código

Após concluir qualquer implementação, revisar:
- Funções com mais de 30 linhas (provavelmente fazendo muito)
- Lógica duplicada mais de duas vezes (extrair para utilitário)
- Qualquer `any` no TypeScript (substituir por tipos reais)
- Componentes com mais de 3 props que poderiam ser agrupadas em objeto
- Ausência de tratamento de erros em operações assíncronas

Executar `/simplify` antes de apresentar código ao usuário.

## Infra e Deploy

- `vercel.json` na raiz com todas as envs mapeadas
- Deploy alvo: Vercel + Neon (em andamento)
- `JWT_SECRET` e `JWT_REFRESH_SECRET` gerados e gravados no `.env` (48 bytes, base64)
- Ao subir para Vercel: copiar os mesmos valores do `.env` para o dashboard (ou gerar novos — usuários dev perderão sessão)

## Pendências

- Instalar Vitest: `npm install -D vitest` (config já existe em `vitest.config.ts`)
- Stripe: substituir chaves placeholder no `.env` (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID_PREMIUM`)
- Painel de decisão / alertas avançados (brainstorming adiado)
- Upload S3/R2 — lib pronta (`uploadFile`, `deleteFile`, `getPresignedUrl`), falta UI
- Configurar envs no Vercel dashboard após deploy
