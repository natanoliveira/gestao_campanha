# Graph Report - .  (2026-08-13)

## Corpus Check
- 156 files · ~81,332 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 802 nodes · 1731 edges · 73 communities (44 shown, 29 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 13 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Infrastructure & Data Schema
- Dashboard & Financial API Routes
- Project Dependencies & Config
- Master Admin — Organizations
- Project Detail Page UI
- Dashboard Charts & Alerts API
- Settings Page — Tabs UI
- TypeScript Type References
- Financial Categories API
- Dashboard UI Components
- Auth API — Login & Logout
- Initiative Financial Entries API
- Initiatives UI
- Component Aliases & Config
- Settings — Org Config UI
- Public Project Portal
- Decision Panel & Deadline Alerts
- Master Audit Log
- Pagination Library
- Users Management UI
- Users API & DTOs
- Admin Guide — Usage Flows
- Initiatives DTOs
- AWS S3 & External Packages
- Organizations API & DTOs
- File Upload API
- Financial Categories DTOs
- Pledges (Ofertas) UI
- PIX QR Code & Pledge API
- Theme Toggle Dark/Light
- Timeline DTOs
- Theme Selection Planning
- PDF Report API
- Vercel Deploy Config
- Root Layout & Fonts
- Prisma Seed
- Email Digest Cron
- Pledge Status API
- Edge Proxy Middleware
- Brand Logo
- App Favicon SVG
- base-ui Component Library
- bcryptjs — Password Hashing
- clsx — Class Utility
- ESLint Config
- React Hook Form Resolvers
- jsonwebtoken — JWT
- Lucide React Icons
- Neon Serverless DB
- Next.js Framework
- Next.js Config
- Prisma ORM
- Prisma Neon Adapter
- Prisma Client
- React DOM
- React Hook Form
- React PDF Renderer
- Recharts
- shadcn Components
- Sonner Toasts
- Stripe SDK
- Tailwind Merge
- QRCode Types
- Upstash Redis
- WebSocket (ws)
- Zod Validation
- PostCSS Config
- Apple Icon Brand

## God Nodes (most connected - your core abstractions)
1. `errorResponse()` - 97 edges
2. `authenticate()` - 89 edges
3. `cn()` - 78 edges
4. `authorize()` - 46 edges
5. `logAudit()` - 40 edges
6. `fetchWithAuth()` - 39 edges
7. `can()` - 30 edges
8. `AppError` - 21 edges
9. `compilerOptions` - 16 edges
10. `Spinner()` - 13 edges

## Surprising Connections (you probably didn't know these)
- `MinIO S3-Compatible Storage Service` --conceptually_related_to--> `Gestão Campanha README`  [INFERRED]
  docker-compose.yml → README.md
- `RBAC Permission Matrix` --references--> `User Entity`  [INFERRED]
  README.md → docs/database-er.md
- `Pledge (Oferta) Public Flow` --conceptually_related_to--> `Pledge Model Schema`  [INFERRED]
  README.md → docs/superpowers/plans/2026-08-03-gestao-ofertas.md
- `JWT Auth and Session Management` --conceptually_related_to--> `Redis 7 Alpine Service`  [INFERRED]
  README.md → docker-compose.yml
- `JWT Auth and Session Management` --references--> `Session Entity`  [INFERRED]
  README.md → docs/database-er.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Financial Tracking Pipeline (Pledge -> Entry -> Exit -> Dashboard)** — docs_superpowers_plans_gestao_ofertas_pledge_model, docs_database_er_financialentry, docs_database_er_financialexit, docs_superpowers_plans_gestao_ofertas_4d_metrics [EXTRACTED 0.95]
- **Multi-Tenant Isolation Pattern (Organization -> organizationId filter -> All Entities)** — readme_multi_tenant, docs_database_er_organization, docs_database_er_soft_delete, docs_database_er_auditlog [EXTRACTED 0.95]
- **Theme Persistence Mechanism (localStorage + anti-flash script + CSS class toggle)** — docs_superpowers_plans_theme_selection_anti_flash, docs_superpowers_plans_theme_selection_theme_ts, docs_superpowers_specs_theme_selection_design_palette_dark, docs_superpowers_specs_theme_selection_design_palette_light [EXTRACTED 0.95]

## Communities (73 total, 29 thin omitted)

### Community 0 - "Infrastructure & Data Schema"
Cohesion: 0.05
Nodes (58): MinIO S3-Compatible Storage Service, Redis 7 Alpine Service, Docker Compose Local Dev Services, AuditLog Entity, FinancialCategory Entity, FinancialEntry Entity, FinancialExit Entity, Initiative Entity (+50 more)

### Community 1 - "Dashboard & Financial API Routes"
Cohesion: 0.09
Nodes (39): GET(), GET(), GET(), POST(), GET(), PUT(), GET(), POST() (+31 more)

### Community 2 - "Project Dependencies & Config"
Cohesion: 0.05
Nodes (40): dotenv, eslint, eslint-config-next, devDependencies, dotenv, eslint, eslint-config-next, tailwindcss (+32 more)

### Community 3 - "Master Admin — Organizations"
Cohesion: 0.11
Nodes (23): Org, OrganizacoesPage(), Plan, Skeleton(), EMPTY_FORM, fmt(), limitLabel(), Plan (+15 more)

### Community 4 - "Project Detail Page UI"
Cohesion: 0.08
Nodes (31): CategoryReport(), currentRole(), FinancialRow, FinancialTable(), FinCategory, fmt(), INIT_FORM_EMPTY, INIT_STATUS (+23 more)

### Community 5 - "Dashboard Charts & Alerts API"
Cohesion: 0.12
Nodes (12): GET(), groupByMonth(), POST(), Ctx, Ctx, schema, Ctx, GET() (+4 more)

### Community 6 - "Settings Page — Tabs UI"
Cohesion: 0.11
Nodes (24): CategoriasTab(), currentRole(), OrgTab(), PlanoTab(), UsersTab(), Category, CategoryType, currentRole() (+16 more)

### Community 7 - "TypeScript Type References"
Cohesion: 0.06
Nodes (30): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+22 more)

### Community 8 - "Financial Categories API"
Cohesion: 0.12
Nodes (26): Ctx, DELETE(), PUT(), POST(), createSchema, GET(), POST(), DELETE() (+18 more)

### Community 9 - "Dashboard UI Components"
Cohesion: 0.09
Nodes (27): CategoryStat, ChartData, DashboardPage(), fmt(), PIE_COLORS, progressVariant(), ProjectStatus, Skeleton() (+19 more)

### Community 10 - "Auth API — Login & Logout"
Cohesion: 0.14
Nodes (16): POST(), POST(), POST(), JwtPayload, RefreshPayload, signAccessToken(), signRefreshToken(), verifyAccessToken() (+8 more)

### Community 11 - "Initiative Financial Entries API"
Cohesion: 0.18
Nodes (15): Ctx, Ctx, Ctx, Ctx, AuditParams, base, CreateFinancialEntryDTO, createFinancialEntrySchema (+7 more)

### Community 12 - "Initiatives UI"
Cohesion: 0.11
Nodes (18): currentRole(), emptyForm, FinancialCategory, FinancialInlineTable(), FinancialRow, fmt(), InitForm, Initiative (+10 more)

### Community 13 - "Component Aliases & Config"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 14 - "Settings — Org Config UI"
Cohesion: 0.10
Nodes (13): CAT_TABS, Category, CategoryType, ConfiguracoesPage(), DashboardStats, OrgData, Role, ROLE_MAP (+5 more)

### Community 15 - "Public Project Portal"
Cohesion: 0.15
Nodes (15): barColor(), fmt(), formatDate(), Initiative, MetricRow(), pct(), Portal, PublicPortalPage() (+7 more)

### Community 16 - "Decision Panel & Deadline Alerts"
Cohesion: 0.18
Nodes (15): currentRole(), daysBadge(), DecisoesPage(), Skeleton(), Alert, AlertsPanel(), currentRole(), daysBadge() (+7 more)

### Community 17 - "Master Audit Log"
Cohesion: 0.16
Nodes (15): ACTION_LABEL, ACTION_OPTIONS, actionBadgeVariant(), ActionIcon(), AuditDetail(), AuditEntry, AuditoriaPage(), describe() (+7 more)

### Community 18 - "Pagination Library"
Cohesion: 0.19
Nodes (12): paginatedResponse(), PaginationParams, parsePagination(), CreateProjectDTO, createProjectSchema, ListProjectsDTO, listProjectsSchema, statuses (+4 more)

### Community 19 - "Users Management UI"
Cohesion: 0.13
Nodes (8): currentRole(), Role, ROLE_MAP, ROLES, Skeleton(), STEPS, User, UsersPage()

### Community 20 - "Users API & DTOs"
Cohesion: 0.27
Nodes (10): CreateUserDTO, createUserSchema, ListUsersDTO, listUsersSchema, roles, UpdateUserDTO, updateUserSchema, select (+2 more)

### Community 21 - "Admin Guide — Usage Flows"
Cohesion: 0.14
Nodes (12): Flow, FlowNode, FLOWS, GuiaPage(), LEGEND, Node(), NODE_STYLES, NodeVariant (+4 more)

### Community 22 - "Initiatives DTOs"
Cohesion: 0.29
Nodes (9): CreateInitiativeDTO, createInitiativeSchema, ListInitiativesDTO, listInitiativesSchema, statuses, UpdateInitiativeDTO, updateInitiativeSchema, baseSelect (+1 more)

### Community 23 - "AWS S3 & External Packages"
Cohesion: 0.18
Nodes (11): @aws-sdk/client-s3, @aws-sdk/s3-request-presigner, class-variance-authority, dependencies, @aws-sdk/client-s3, @aws-sdk/s3-request-presigner, class-variance-authority, react (+3 more)

### Community 24 - "Organizations API & DTOs"
Cohesion: 0.35
Nodes (7): CreateOrganizationDTO, createOrganizationSchema, UpdateOrganizationDTO, updateOrganizationSchema, organizationRepository, select, organizationService

### Community 25 - "File Upload API"
Cohesion: 0.31
Nodes (6): ALLOWED, POST(), resolveFolder(), slugify(), r2, uploadFile()

### Community 26 - "Financial Categories DTOs"
Cohesion: 0.33
Nodes (6): CreateFinancialCategoryDTO, createFinancialCategorySchema, UpdateFinancialCategoryDTO, updateFinancialCategorySchema, financialCategoryRepository, select

### Community 27 - "Pledges (Ofertas) UI"
Cohesion: 0.28
Nodes (8): fmt(), formatDate(), Initiative, OfertasPage(), Pledge, Project, Skeleton(), STATUS_BADGE

### Community 28 - "PIX QR Code & Pledge API"
Cohesion: 0.38
Nodes (6): qrcode, qrcode, POST(), buildPixPayload(), crc16(), tlv()

### Community 29 - "Theme Toggle Dark/Light"
Cohesion: 0.38
Nodes (4): ThemeToggle(), setTheme(), Theme, toggleTheme()

### Community 30 - "Timeline DTOs"
Cohesion: 0.33
Nodes (5): CreateTimelinePostDTO, createTimelinePostSchema, types, select, timelineRepository

### Community 31 - "Theme Selection Planning"
Cohesion: 0.47
Nodes (6): Theme Selection Implementation Plan 2026-08-04, Anti-Flash Script Pattern for Theme Persistence, Theme Utility Module (src/lib/theme.ts), Theme Selection Design Spec 2026-08-04, Dark Theme Palette (Charcoal/Amber), Light Theme Palette (Slate Cold)

### Community 32 - "PDF Report API"
Cohesion: 0.47
Nodes (5): Ctx, fmt(), fmtDate(), GET(), styles

### Community 33 - "Vercel Deploy Config"
Cohesion: 0.33
Nodes (5): crons, framework, functions, src/app/api/v1/webhooks/stripe/route.ts, maxDuration

### Community 34 - "Root Layout & Fonts"
Cohesion: 0.40
Nodes (3): ibmPlexSans, ibmPlexSerif, metadata

### Community 37 - "Pledge Status API"
Cohesion: 0.50
Nodes (3): Ctx, PATCH(), patchSchema

### Community 38 - "Edge Proxy Middleware"
Cohesion: 0.67
Nodes (3): config, proxy(), PUBLIC_PATHS

### Community 39 - "Brand Logo"
Cohesion: 0.67
Nodes (3): Brand Amber Checkmark Identity, Gestão de Campanha — Full Logo, Gestão de Campanha Wordmark

### Community 40 - "App Favicon SVG"
Cohesion: 0.67
Nodes (3): Amber Checkmark Brand Symbol, Amber Primary Color #F59E0B, App Icon Favicon (SVG)

## Knowledge Gaps
- **265 isolated node(s):** `$schema`, `style`, `rsc`, `tsx`, `config` (+260 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **29 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `can()` connect `Settings Page — Tabs UI` to `Dashboard & Financial API Routes`, `Project Detail Page UI`, `Financial Categories API`, `Initiative Financial Entries API`, `Initiatives UI`, `Settings — Org Config UI`, `Decision Panel & Deadline Alerts`, `Users Management UI`, `Users API & DTOs`?**
  _High betweenness centrality (0.220) - this node is a cross-community bridge._
- **Why does `errorResponse()` connect `Dashboard & Financial API Routes` to `PDF Report API`, `Pledge Status API`, `Dashboard Charts & Alerts API`, `Financial Categories API`, `Auth API — Login & Logout`, `Initiative Financial Entries API`, `Users API & DTOs`, `Organizations API & DTOs`, `File Upload API`, `PIX QR Code & Pledge API`?**
  _High betweenness centrality (0.209) - this node is a cross-community bridge._
- **Why does `dependencies` connect `AWS S3 & External Packages` to `Project Dependencies & Config`, `PIX QR Code & Pledge API`, `base-ui Component Library`, `bcryptjs — Password Hashing`, `clsx — Class Utility`, `React Hook Form Resolvers`, `jsonwebtoken — JWT`, `Lucide React Icons`, `Neon Serverless DB`, `Next.js Framework`, `Prisma ORM`, `Prisma Neon Adapter`, `Prisma Client`, `React DOM`, `React Hook Form`, `React PDF Renderer`, `Recharts`, `shadcn Components`, `Sonner Toasts`, `Stripe SDK`, `Tailwind Merge`, `QRCode Types`, `Upstash Redis`, `WebSocket (ws)`, `Zod Validation`?**
  _High betweenness centrality (0.177) - this node is a cross-community bridge._
- **What connects `$schema`, `style`, `rsc` to the rest of the system?**
  _269 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Infrastructure & Data Schema` be split into smaller, more focused modules?**
  _Cohesion score 0.0544464609800363 - nodes in this community are weakly interconnected._
- **Should `Dashboard & Financial API Routes` be split into smaller, more focused modules?**
  _Cohesion score 0.08953900709219859 - nodes in this community are weakly interconnected._
- **Should `Project Dependencies & Config` be split into smaller, more focused modules?**
  _Cohesion score 0.04878048780487805 - nodes in this community are weakly interconnected._