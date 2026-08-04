# 🏛️ Gestão Campanha

> Sistema multi-tenant para organizações gerenciarem projetos, campanhas de arrecadação e prestação de contas — com portal público de transparência financeira.

---

## ✨ O que é

Plataforma web completa que centraliza:

- 📁 **Projetos e iniciativas** com metas, prazos e progresso financeiro
- 💸 **Arrecadação** via formulário público com QR PIX gerado automaticamente
- 📊 **Dashboard financeiro** com KPIs, gráficos e alertas de prazo
- 🌐 **Portal público** por slug — transparência sem precisar de login
- 🔐 **Controle de acesso por papel** (RBAC) com 6 níveis de permissão
- 📣 **Timeline** de comunicação por projeto (texto, foto, vídeo, PDF, link)
- 📬 **Email digest semanal** automático para administradores

---

## 🔄 Fluxos Principais

### 1 — Ciclo de vida de um projeto

```
[Criar Projeto] ──► [Criar Iniciativas] ──► [Publicar na Timeline]
                                                      │
                                                      ▼
[Dashboard atualiza] ◄── [Lançamento criado] ◄── [Confirmar Oferta] ◄── [Receber Ofertas via portal]
```

### 2 — Jornada do apoiador (portal público)

```
[Acessa /p/slug] ──► [Escolhe projeto ou iniciativa] ──► [Preenche formulário (2 etapas)]
                                                                        │
                                                                        ▼
[Oferta confirmada] ◄── [Admin confirma no sistema] ◄── [Realiza pagamento PIX] ◄── [Recebe QR + PDF recibo]
```

### 3 — Gestão financeira

```
[Oferta confirmada]          [Lançamento manual]
        │                           │
        └──────────┬────────────────┘
                   ▼
          [Entrada registrada com categoria]
                   │
          [Despesas registradas]
                   │
                   ▼
          [Dashboard: KPIs + gráficos atualizados]
```

### 4 — Autenticação e sessão

```mermaid
sequenceDiagram
    participant U as Usuário
    participant P as proxy.ts (Edge)
    participant API as /api/v1/auth
    participant DB as Neon Postgres

    U->>API: POST /login {email, senha}
    API->>DB: verifica credenciais
    DB-->>API: usuário encontrado
    API-->>U: { accessToken } + cookie refresh_token (HttpOnly)

    Note over U,P: Toda navegação subsequente
    U->>P: GET /dashboard
    P->>P: verifica cookie refresh_token
    alt sem cookie
        P-->>U: redirect /login
    else cookie presente
        P-->>U: acesso permitido
    end

    Note over U,API: Token expirado (401)
    U->>API: POST /refresh (cookie automático)
    API->>DB: valida Session ativa
    DB-->>API: Session válida
    API-->>U: novo accessToken

    Note over U,API: Logout
    U->>API: POST /logout (com Bearer token)
    API->>DB: revoga Session
    API-->>U: cookie refresh_token apagado (Max-Age=0)
```

---

## 🛠️ Stack

| Camada | Tecnologia |
|--------|-----------|
| 🖥️ Framework | **Next.js 16.2.12** App Router — grupos `(app)` `(auth)` `(public)` |
| 🗄️ Banco | **Prisma v7** + `@prisma/adapter-neon` + **Neon Postgres** (serverless) |
| 🎨 CSS | **Tailwind v4** — CSS-first com `@theme inline` em `globals.css` |
| 🧩 UI | **base-ui** — `Dialog`, `Drawer`; **Lucide React** — ícones |
| 📝 Formulários | **React Hook Form** + **Zod v4** |
| 📈 Gráficos | **Recharts** — linha, barra, pizza |
| 📄 PDF | **@react-pdf/renderer** — relatório por projeto |
| 📮 Email | **Brevo API** — digest semanal via `src/lib/brevo.ts` |
| ☁️ Upload | **Cloudflare R2** — via `src/lib/r2.ts` |
| 💳 Pagamento | **Stripe** — Checkout Session + webhook de upgrade de plano |
| 🔒 Auth | **JWT** (access 1h `localStorage`) + refresh token (7d `HttpOnly cookie`) |
| 🖋️ Tipografia | **IBM Plex Sans** (body) + **IBM Plex Serif** (headings) via `next/font` |
| 🍞 Toasts | **Sonner** — `<Toaster position="top-center" richColors />` |
| 📱 QR Code | **qrcode** — gerado server-side como SVG (nunca client-side) |

---

## 🔐 Papéis e Permissões (RBAC)

| Papel | Permissões |
|-------|-----------|
| `ADMIN` | Acesso total — gerencia org, usuários, projetos, finanças, timeline |
| `MANAGER` | Cria/edita projetos e iniciativas |
| `TREASURER` | Registra lançamentos financeiros |
| `COMMUNICATION` | Publica posts na timeline |
| `AUDITOR` | Somente leitura |
| `MEMBER` | Somente leitura |

> Sempre usar `can(role, permission)` de `src/lib/permissions.ts`. Nunca comparar `role === "ADMIN"` diretamente.

```
permission "org:manage"        → ADMIN
permission "project:write"     → ADMIN, MANAGER
permission "initiative:write"  → ADMIN, MANAGER
permission "financial:write"   → ADMIN, MANAGER, TREASURER
permission "timeline:write"    → ADMIN, MANAGER, COMMUNICATION
permission "category:write"    → ADMIN, MANAGER
permission "user:read"         → ADMIN, MANAGER, AUDITOR
```

---

## 📦 Módulos Implementados

| Módulo | Descrição |
|--------|-----------|
| 🔐 **Auth** | Login, logout, refresh, sessão expirada |
| 📊 **Dashboard** | KPIs, alertas de prazo, 3 gráficos Recharts |
| 📁 **Projetos** | CRUD, slug, portal público, download PDF |
| 🎯 **Iniciativas** | CRUD, meta, prazo, total de ofertas |
| 💰 **Lançamentos** | Entradas e despesas por projeto/iniciativa com categorias |
| 🏷️ **Categorias** | CRUD por tipo (Entrada / Despesa) |
| 🤝 **Ofertas (Pledges)** | Formulário público 2 etapas, QR PIX server-side, PDF recibo, filtros internos |
| 📣 **Timeline** | Posts com upload de mídia para R2 |
| 👥 **Usuários** | CRUD, papéis, soft delete, busca |
| ⚙️ **Configurações** | 4 abas: Organização, Usuários, Categorias, Plano |
| 👑 **Master** | Multi-org: trocar contexto de org sem re-autenticar |
| 💳 **Stripe** | Checkout Session de upgrade + webhook |
| 📬 **Email Digest** | Cron toda segunda 12h UTC via Brevo |
| 🔍 **Auditoria** | Histórico com diff visual before/after (somente master) |
| 📖 **Guia** | Treinamento de uso para usuário final + fluxograma de ações |

---

## 🏗️ Arquitetura

```
src/
├── app/
│   ├── (app)/                        # Layout autenticado (sidebar)
│   │   ├── dashboard/page.tsx
│   │   ├── projects/[id]/page.tsx
│   │   ├── ofertas/page.tsx
│   │   ├── decisoes/page.tsx
│   │   ├── configuracoes/page.tsx
│   │   ├── guia/page.tsx             # Treinamento de uso + fluxograma
│   │   └── master/                   # Área master (multi-org)
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── session-expired/page.tsx
│   ├── (public)/
│   │   └── p/[slug]/page.tsx         # Portal público de transparência
│   └── api/v1/
│       ├── auth/          login · logout · refresh
│       ├── dashboard/     stats · charts
│       ├── projects/      CRUD + [id]/report (PDF)
│       ├── initiatives/   CRUD
│       ├── entries/       lançamentos de entrada
│       ├── exits/         lançamentos de saída
│       ├── pledges/       ofertas
│       ├── timeline/      posts
│       ├── users/         CRUD
│       ├── upload/        multipart → R2
│       ├── webhooks/      stripe
│       ├── cron/          weekly-digest
│       └── public/        projetos sem auth
├── components/
│   ├── layout/sidebar.tsx
│   └── shared/
│       ├── confirm-dialog.tsx        # Todo botão destrutivo
│       ├── app-drawer.tsx            # Drawer lateral (somente visualização)
│       ├── currency-input.tsx        # Máscara pt-BR, emite string numérica
│       ├── alerts-panel.tsx          # Alertas de prazo no dashboard
│       ├── pledge-form.tsx           # Formulário público de oferta
│       └── kpi-card · progress-bar · badge · spinner · feed-item
├── lib/
│   ├── prisma.ts · jwt.ts · errors.ts · pagination.ts
│   ├── r2.ts                         # Upload Cloudflare R2
│   ├── brevo.ts                      # Email transacional
│   ├── fetch-with-auth.ts            # fetch + refresh automático
│   └── permissions.ts                # can(role, permission)
├── middlewares/
│   ├── authenticate.ts               # verifica Bearer JWT
│   └── authorize.ts                  # lança 403 se sem permissão
├── modules/
│   └── {auth,projects,initiatives,pledges,users,...}/
│       service.ts · repository.ts · dto.ts
└── proxy.ts                          # Edge: verifica cookie → redirect /login
```

> **Nota:** `proxy.ts` substitui `middleware.ts` (depreciado no Next.js 16).  
> Caminhos `/api/v1/public/` e `/p/` são públicos — sem verificação de cookie.

---

## ⚙️ Configuração

### Variáveis de Ambiente

Crie `.env` na raiz:

```env
# Banco
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require

# JWT (gerar com: openssl rand -base64 48)
JWT_SECRET=...
JWT_REFRESH_SECRET=...

# Cron (gerar com: openssl rand -base64 32)
CRON_SECRET=...

# Cloudflare R2
R2_ENDPOINT=https://<account>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=gestao-campanha
R2_PUBLIC_URL=https://...

# Brevo (email)
BREVO_API_KEY=...

# Stripe
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...

# App
NEXT_PUBLIC_APP_URL=https://gestao-campanha-alpha.vercel.app
```

### Instalação

```bash
npm install
npx prisma generate
npx prisma db push
npx prisma db seed   # cria usuários e dados de demo
npm run dev
```

Acesse `http://localhost:3000`

### Credenciais de Demo

| Email | Senha | Papel |
|-------|-------|-------|
| `master@sistema.com` | `master123` | Master (multi-org) |
| `admin@demo.com` | `senha123` | ADMIN |

---

## 🚀 Deploy

- **Plataforma:** Vercel + Neon
- Variáveis de ambiente configuradas no dashboard da Vercel
- `CRON_SECRET` obrigatório no dashboard Vercel (usado pelo cron de digest semanal)
- JWT secrets copiados do `.env` para o dashboard Vercel

Cron configurado em `vercel.json`:
```json
{ "crons": [{ "path": "/api/v1/cron/weekly-digest", "schedule": "0 12 * * 1" }] }
```

---

## 🗺️ Pendências

- [ ] Confirmação automática de oferta via webhook Pix
- [ ] Comentários no portal público (sem conta)
- [ ] Notificações em tempo real (SSE)
- [ ] Exportação CSV de lançamentos e ofertas
- [ ] Painel de decisão avançado (`/decisoes` — alertas básicos prontos)
- [ ] Busca global cross-entity
