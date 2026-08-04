@AGENTS.md

# gestao_campanha — Contexto do Projeto

Sistema de gestão de campanhas/projetos com portal público. Multi-tenant, dark/light theme toggle, RBAC com permission matrix.

## Stack

- **Next.js 16** App Router — route groups `(app)`, `(auth)`, `(public)`
- **Prisma v7** + `@prisma/adapter-neon` + `@neondatabase/serverless`
- **Tailwind v4** CSS-first (`@theme inline` em `globals.css`)
- **base-ui**: `Dialog.Root/Trigger/Backdrop/Popup/Close`, `Drawer.Root swipeDirection="right"` — import: `import { Dialog } from "@base-ui/react/dialog"` (NÃO `@base-ui-components/react/dialog`)
- **React Hook Form** + **Zod v4** para formulários
- **Lucide React** para ícones
- **IBM Plex Sans** (body) + **IBM Plex Serif** (headings) via `next/font`
- **recharts** — gráficos no dashboard
- **@react-pdf/renderer** — geração de PDF por projeto
- **sonner** — toasts (`<Toaster position="top-center" richColors />` em layout.tsx)

## Design System

Dois temas via classe `.dark` no `<html>`. Padrão: escuro. Toggle: `ThemeToggle` no sidebar. Persistência: `localStorage["theme"]`. Anti-flash: `<script>` inline no `<head>`.

`:root` = Slate frio (claro): `--background: #f1f5f9`, `--card: #ffffff`, `--border: #e2e8f0`, `--foreground: #0f172a`

`.dark` = Charcoal/Amber (escuro): `--background: #0c0b0a`, `--card: #151413`, `--border: #2c2824`, `--foreground: #f5f0eb`

Ambos têm `--primary: #f59e0b` (amber), `--success: #22c55e`, `--destructive: #ef4444`

Utilitários: `src/lib/theme.ts` — `getTheme()`, `setTheme(theme)`, `toggleTheme()`

## Padrões Críticos de Código

```ts
// Next.js 16: params é Promise
const { id } = await params;

// Soft delete: SEMPRE filtrar
where: { organizationId, deletedAt: null }

// Bearer JWT via header
Authorization: Bearer <token>

// Paginação
paginatedResponse(data, total, page, limit)
// → { data, meta: { total, page, limit, totalPages } }

// Upload de arquivos: src/lib/r2.ts (vars: R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL)
// Pasta: {orgId}/{projectslug[-initiativeslug]}/{uuid}.ext

// Email transacional: src/lib/brevo.ts
sendEmail(to, subject, html) // via Brevo API, BREVO_API_KEY no .env

// Cron: autenticado por Authorization: Bearer <CRON_SECRET>
```

- **Params**: `authenticate(req)` → `{ userId, organizationId, role, isMaster }`
- **Erros**: `errorResponse(error)` em todos os catch das rotas
- **Proxy edge**: `src/proxy.ts` com `export function proxy` — não mais `middleware.ts`; `/api/v1/public/` está em `PUBLIC_PATHS`
- **CurrencyInput**: `src/components/shared/currency-input.tsx` — type="text", máscara pt-BR, emite string numérica
- **AuditLog**: `organizationId` é opcional no schema (master pode auditar sem org)

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
- `KPICard`, `FeedItem`, `ProgressBar`, `Badge`, `Spinner`, `AppDrawer`, `CurrencyInput`

## Módulos Implementados

- **Auth** — login (toggle visibilidade de senha), refresh, logout, session-expired (fluxo 401 → refresh → /session-expired → /login)
- **Dashboard** — KPIs, projetos recentes, atividades, AlertsPanel, **3 gráficos Recharts** (linha financeira 6m, barra progresso iniciativas, pizza categorias)
- **Projetos** — CRUD completo + edição modal + slug automático + portal público + **botão download PDF**
- **PDF por projeto** — `GET /api/v1/projects/[id]/report` via @react-pdf/renderer (KPIs, iniciativas, entradas, despesas)
- **Iniciativas** — CRUD + `endDate` + coluna "Ofertas" (soma de todos pledges da iniciativa) + `createdById`
- **Lançamentos** — entries/exits por projeto e por iniciativa (campos moeda com CurrencyInput)
- **Categorias Financeiras** — CRUD, tabs Entradas/Despesas
- **Usuários** — CRUD, soft delete, busca
- **Timeline** — posts com tipos (TEXT/PHOTO/VIDEO/PDF/LINK) + upload para R2
- **Upload** — `POST /api/v1/upload` — multipart, valida tipo/tamanho, pasta `{orgId}/{slug}/`
- **Configurações** — 4 abas: Organização, Usuários, Categorias, Plano
- **Master** — `/master/organizacoes`, `/master/planos`; Org Switcher no sidebar (reload ao trocar)
- **Stripe** — Checkout Session de upgrade + webhook
- **Email digest semanal** — `GET /api/v1/cron/weekly-digest` — Brevo, somente projetos ativos, admins da org
- **Dashboard charts** — `GET /api/v1/dashboard/charts` — evolução financeira, progresso iniciativas, distribuição por categoria
- **Ofertas (Pledges)** — formulário público 2 steps com QR PIX (gerado server-side via `qrcode`) + PDF mini recibo + filtros na listagem interna (status, data, ofertante, projeto, iniciativa) + `statusChangedById`/`statusChangedAt` (quem confirmou/cancelou)
- **Guia do Admin** — `/guia` página estática com roadmap de usabilidade (somente ADMIN via `org:manage`)
- **Tema claro/escuro** — toggle Sol/Lua no sidebar; `src/lib/theme.ts` + `src/components/layout/theme-toggle.tsx`; localStorage; anti-flash script em layout.tsx

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

- Deploy alvo: Vercel + Neon
- Envs no dashboard da Vercel (não usar bloco `env` no vercel.json — sintaxe @secret é legada)
- `vercel.json` contém `framework`, `functions` (Stripe maxDuration 30s) e `crons` (weekly-digest toda segunda 12h UTC)
- `JWT_SECRET` e `JWT_REFRESH_SECRET` gerados e gravados no `.env` (48 bytes, base64)
- `CRON_SECRET` gerado e no `.env` — **adicionar no Vercel dashboard**
- Ao subir para Vercel: copiar os valores de JWT do `.env` para o dashboard

## Master — Visibilidade por Org

**Implementado:** header `X-Organization-Id` enviado pelo `fetchWithAuth` quando `isMaster && selectedOrgId`. O middleware `authenticate` sobrescreve `organizationId` do JWT com o valor do header, dando ao master visão dos dados daquela org sem re-autenticar.

**Alternativa registrada — Token de impersonação:**
`POST /api/v1/master/impersonate { orgId }` → JWT temporário com `organizationId` da org. Vantagem: token auto-contido. Desvantagem: round-trip ao banco a cada troca, gerenciamento de expiração, maior superfície de ataque. Preferir o header enquanto a escala não exigir isolamento por token.

## Pendências

- **CRON_SECRET** — adicionar no dashboard Vercel
- **Comentários no portal público** — apoiadores comentam nos posts da timeline sem precisar de conta (rota pública, moderação pelo admin)
- **Confirmação automática de oferta** — webhook Pix para confirmar pledge automaticamente + criar FinancialEntry
- **Notificações em tempo real** — SSE (Server-Sent Events) para alertas de prazo, novos posts na timeline e metas atingidas
- **Exportação CSV** — lançamentos e ofertas para planilha
- **Painel de decisão avançado** — alertas além do básico (página /decisoes existe com 3 ações)
- **Busca global** — pesquisa cross-entity no sistema
