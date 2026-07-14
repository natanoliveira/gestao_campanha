# TASKS.md — Versão 1.0

Backlog completo organizado por módulo do produto "Gestão de Projetos Financiados por Comunidades".

Campos por tarefa:
- **ID**: Identificador único (ex: TASK-001)
- **Título**: Descrição breve e clara
- **Descrição**: Contexto e especificação
- **Módulo**: Área responsável
- **Prioridade**: P0 (crítica) → P3 (baixa)
- **Complexidade**: XS/S/M/L/XL
- **Story Points**: 1/2/3/5/8/13
- **Dependências**: IDs das tarefas bloqueadoras
- **Status**: TODO

---

## Infraestrutura (INF)

| ID | Título | Descrição | Módulo | Prioridade | Complexidade | Story Points | Dependências | Status |
|---|---|---|---|---|---|---|---|---|
| INF-001 | Setup monorepo Next.js com TypeScript | Configurar estrutura de monorepo com Next.js 14+, TypeScript e padrões de organização (apps, libs, services) | Infraestrutura | P0 | M | 3 | — | TODO |
| INF-002 | Configurar Prisma + PostgreSQL | Setup Prisma ORM, migrações, schema base (Organization, User, Project, Initiative, Timeline, Finance) | Infraestrutura | P0 | S | 2 | INF-001 | TODO |
| INF-003 | Configurar Redis | Instalar e configurar Redis para cache, sessions e jobs | Infraestrutura | P0 | S | 2 | INF-001 | TODO |
| INF-004 | Configurar Cloudflare R2/MinIO | Setup S3-compatível para armazenamento de arquivos (imagens, PDFs, vídeos) | Infraestrutura | P0 | S | 2 | INF-001 | TODO |
| INF-005 | Docker Compose (dev + prod) | Criar configs Docker para desenvolvimento e produção (PostgreSQL, Redis, MinIO) | Infraestrutura | P0 | M | 3 | INF-001, INF-002, INF-003, INF-004 | TODO |
| INF-006 | GitHub Actions CI/CD | Setup pipelines de build, test, lint e deploy automático | Infraestrutura | P1 | M | 5 | INF-001, INF-005 | TODO |
| INF-007 | Configurar shadcn/ui + Tailwind | Setup de UI library com Tailwind CSS, componentes base (Button, Card, Input, Modal) | Infraestrutura | P0 | S | 2 | INF-001 | TODO |

---

## Autenticação (AUTH)

| ID | Título | Descrição | Módulo | Prioridade | Complexidade | Story Points | Dependências | Status |
|---|---|---|---|---|---|---|---|---|
| AUTH-001 | Login com JWT | Implementar fluxo de autenticação: email/senha → JWT (access + refresh tokens) | Autenticação | P0 | M | 5 | INF-002 | TODO |
| AUTH-002 | Refresh Token + Rotation | Implementar refresh token com expiração, rotação automática e revogação | Autenticação | P0 | M | 3 | AUTH-001 | TODO |
| AUTH-003 | Middleware de autenticação | Criar middleware Next.js para validar JWT em rotas protegidas | Autenticação | P0 | S | 3 | AUTH-001 | TODO |
| AUTH-004 | Middleware de autorização RBAC | Implementar Role-Based Access Control (admin, manager, member, viewer) | Autenticação | P0 | M | 5 | AUTH-003, ORG-003 | TODO |
| AUTH-005 | Tela de Login | Interface responsiva: email, senha, "Lembrar-me", reset de senha | Autenticação | P0 | S | 3 | INF-007, AUTH-001 | TODO |
| AUTH-006 | Logout | Implementar logout seguro: limpar tokens, invalidar sessão Redis | Autenticação | P0 | XS | 1 | AUTH-001 | TODO |

---

## Organização (ORG)

| ID | Título | Descrição | Módulo | Prioridade | Complexidade | Story Points | Dependências | Status |
|---|---|---|---|---|---|---|---|---|
| ORG-001 | CRUD Organização | Criar, listar, editar e deletar organizações; dados: nome, slug, descrição, logo | Organização | P0 | M | 5 | INF-002, AUTH-003 | TODO |
| ORG-002 | Gerenciar Usuários | Convidar/remover usuários, listar membros com roles, gerenciar acesso por organização | Organização | P0 | M | 5 | ORG-001, AUTH-004 | TODO |
| ORG-003 | Gerenciar Permissões/Roles | Criar roles customizadas, definir permissões granulares (read, write, delete, approve) | Organização | P0 | M | 5 | ORG-001 | TODO |
| ORG-004 | Tela de Configurações | Interface de settings: dados da org, membros, roles, webhooks, integrações | Organização | P1 | M | 3 | ORG-001, ORG-002, ORG-003 | TODO |

---

## Projetos (PROJ)

| ID | Título | Descrição | Módulo | Prioridade | Complexidade | Story Points | Dependências | Status |
|---|---|---|---|---|---|---|---|---|
| PROJ-001 | CRUD Projeto | Criar, listar, editar, deletar projetos; campos: nome, descrição, status, meta financeira, datas | Projetos | P0 | M | 8 | INF-002, ORG-001, AUTH-004 | TODO |
| PROJ-002 | Máquina de estados de status | Estados: rascunho → planejamento → ativo → concluído → arquivado; transições validadas | Projetos | P0 | S | 3 | PROJ-001 | TODO |
| PROJ-003 | Listagem com filtros e paginação | Listar projetos com filtros (status, org, data), ordenação, paginação e busca | Projetos | P0 | M | 5 | PROJ-001 | TODO |
| PROJ-004 | Tela de detalhes do projeto | Dashboard completo: resumo, timeline, iniciativas, prestação de contas, atividades | Projetos | P0 | L | 8 | PROJ-001, INF-007 | TODO |
| PROJ-005 | Upload de capa do projeto | Permitir upload e customização de imagem de capa (cover image) | Projetos | P1 | S | 3 | PROJ-001, UPL-001 | TODO |

---

## Iniciativas (INIT)

| ID | Título | Descrição | Módulo | Prioridade | Complexidade | Story Points | Dependências | Status |
|---|---|---|---|---|---|---|---|---|
| INIT-001 | CRUD Iniciativas | Criar, listar, editar, deletar iniciativas dentro de projetos; campos: nome, descrição, meta, responsável | Iniciativas | P0 | M | 8 | PROJ-001, INF-002 | TODO |
| INIT-002 | Cálculo de progresso/meta | Calcular progresso automático baseado em timeline e contribuições; visualizar vs meta | Iniciativas | P0 | S | 3 | INIT-001 | TODO |
| INIT-003 | Dependências entre iniciativas | Modelar relacionamentos entre iniciativas; visualizar fluxo em diagrama (DAG) | Iniciativas | P1 | M | 5 | INIT-001 | TODO |
| INIT-004 | Visualização de progresso | Componentes visuais: barras de progresso, cards de status, timeline visual | Iniciativas | P0 | S | 3 | INIT-002, INF-007 | TODO |

---

## Timeline (TML)

| ID | Título | Descrição | Módulo | Prioridade | Complexidade | Story Points | Dependências | Status |
|---|---|---|---|---|---|---|---|---|
| TML-001 | Publicar post (texto) | Criar posts de texto simples com timestamp, autor, edição e delete | Timeline | P0 | S | 3 | PROJ-001, INF-002, AUTH-003 | TODO |
| TML-002 | Publicar foto | Upload de imagem, galeria, embed em posts | Timeline | P0 | S | 3 | TML-001, UPL-001 | TODO |
| TML-003 | Publicar vídeo/link | Suportar embeds de vídeo (YouTube, Vimeo) e links externos | Timeline | P1 | S | 3 | TML-001 | TODO |
| TML-004 | Publicar PDF | Upload de documentos PDF, preview e download | Timeline | P1 | S | 3 | TML-001, UPL-001 | TODO |
| TML-005 | Feed cronológico | Listar posts por projeto em ordem cronológica reversa, paginação e filtros | Timeline | P0 | M | 5 | TML-001, TML-002 | TODO |

---

## Prestação de Contas (FIN)

| ID | Título | Descrição | Módulo | Prioridade | Complexidade | Story Points | Dependências | Status |
|---|---|---|---|---|---|---|---|---|
| FIN-001 | Registrar entrada financeira | Criar transações de entrada: doação, sponsorship, etc. com data, valor, descrição | Prestação de Contas | P0 | M | 5 | PROJ-001, INF-002, AUTH-004 | TODO |
| FIN-002 | Registrar saída financeira | Criar transações de saída: custos, despesas, etc. com data, valor, categoria, descrição | Prestação de Contas | P0 | M | 5 | PROJ-001, INF-002, AUTH-004 | TODO |
| FIN-003 | Cálculo de saldo | Calcular saldo total, por período, por categoria em tempo real | Prestação de Contas | P0 | S | 2 | FIN-001, FIN-002 | TODO |
| FIN-004 | Upload de comprovantes | Anexar comprovantes (NF, recibo, extrato) aos registros financeiros | Prestação de Contas | P0 | S | 3 | FIN-001, FIN-002, UPL-001 | TODO |
| FIN-005 | Relatório público | Gerar e publicar relatório de prestação de contas acessível ao público | Prestação de Contas | P0 | M | 5 | FIN-001, FIN-002, FIN-003, PUB-001 | TODO |

---

## Dashboard (DASH)

| ID | Título | Descrição | Módulo | Prioridade | Complexidade | Story Points | Dependências | Status |
|---|---|---|---|---|---|---|---|---|
| DASH-001 | KPIs gerais | Exibir: total doado, % meta, projetos ativos, ultimas transações | Dashboard | P0 | M | 5 | FIN-003, PROJ-003, AUTH-003 | TODO |
| DASH-002 | Progresso por projeto | Cards com progresso de cada projeto: meta, arrecadado, % conclusão | Dashboard | P0 | M | 5 | PROJ-001, INIT-002, AUTH-003 | TODO |
| DASH-003 | Feed de atividades recentes | Timeline de eventos: novo post, transação, mudança de status, usuário adicionado | Dashboard | P1 | S | 3 | TML-005, FIN-001, PROJ-002, AUTH-003 | TODO |

---

## Portal Público (PUB)

| ID | Título | Descrição | Módulo | Prioridade | Complexidade | Story Points | Dependências | Status |
|---|---|---|---|---|---|---|---|---|
| PUB-001 | Página pública do projeto por slug | URL pública: `/projeto/:slug` - exibe resumo, timeline, progresso, doações sem login | Portal Público | P0 | L | 8 | PROJ-001, TML-005, FIN-003, INF-007 | TODO |
| PUB-002 | Timeline pública | Feed público do projeto: posts visíveis publicamente | Portal Público | P0 | M | 5 | TML-005, PUB-001 | TODO |
| PUB-003 | Prestação de contas pública | Relatório financeiro público: receitas, despesas, saldo | Portal Público | P0 | M | 5 | FIN-005, PUB-001 | TODO |
| PUB-004 | SEO + meta tags | Implementar Open Graph, structured data (schema.org), meta tags dinâmicas por projeto | Portal Público | P1 | S | 3 | PUB-001 | TODO |
| PUB-005 | QR Code do projeto | Gerar QR code que aponta para página pública; exibir em compartilhamentos | Portal Público | P2 | XS | 1 | PUB-001 | TODO |

---

## Uploads (UPL)

| ID | Título | Descrição | Módulo | Prioridade | Complexidade | Story Points | Dependências | Status |
|---|---|---|---|---|---|---|---|---|
| UPL-001 | Serviço de upload R2/MinIO | Implementar API de upload: receber arquivo → armazenar em R2/MinIO → retornar URL | Uploads | P0 | M | 5 | INF-004, INF-002 | TODO |
| UPL-002 | Validação de tipo e tamanho | Validar MIME type, limitar tamanho (img: 10MB, vídeo: 500MB, doc: 50MB) | Uploads | P0 | S | 2 | UPL-001 | TODO |
| UPL-003 | URLs assinadas | Gerar URLs com expiração para arquivos privados; refresh automático | Uploads | P0 | S | 3 | UPL-001, INF-003 | TODO |

---

## Testes (TEST)

| ID | Título | Descrição | Módulo | Prioridade | Complexidade | Story Points | Dependências | Status |
|---|---|---|---|---|---|---|---|---|
| TEST-001 | Setup Jest + Testing Library | Configurar Jest, React Testing Library, fixtures e helpers | Testes | P0 | S | 2 | INF-001 | TODO |
| TEST-002 | Setup Playwright E2E | Configurar Playwright, scripts de teste, CI integration | Testes | P1 | S | 2 | INF-001, INF-006 | TODO |
| TEST-003 | Testes unitários Services | Cobertura de Services: Auth, Finance, Upload, Project, Initiative (target: 80%) | Testes | P0 | L | 8 | TEST-001, AUTH-001, PROJ-001, INIT-001, FIN-001 | TODO |
| TEST-004 | Testes integração API | Testes de fluxos críticos: login → projeto → transação → publicação (target: 80%) | Testes | P0 | L | 8 | TEST-001, AUTH-001, PROJ-001, FIN-001, TML-001 | TODO |
| TEST-005 | Testes E2E fluxos críticos | Testes end-to-end: usuário cria projeto → publica → adiciona transações → visualiza público | Testes | P1 | XL | 13 | TEST-002, PROJ-001, TML-001, FIN-001, PUB-001 | TODO |

---

## Deploy (DEP)

| ID | Título | Descrição | Módulo | Prioridade | Complexidade | Story Points | Dependências | Status |
|---|---|---|---|---|---|---|---|---|
| DEP-001 | Nginx config | Configurar Nginx: reverse proxy, gzip, caching headers, rate limiting | Deploy | P0 | S | 2 | INF-005 | TODO |
| DEP-002 | SSL + Cloudflare | Configurar SSL/TLS, Cloudflare como CDN, certificados automáticos | Deploy | P0 | S | 2 | DEP-001 | TODO |
| DEP-003 | Health checks | Implementar endpoints de health check para monitoramento de uptime | Deploy | P1 | XS | 1 | INF-001 | TODO |
| DEP-004 | Backup automático PostgreSQL | Configurar backups diários, retenção de 30 dias, testes de restauração | Deploy | P1 | S | 3 | INF-002 | TODO |

---

## Resumo de Métricas

| Métrica | Valor |
|---|---|
| **Total de Tarefas** | 69 |
| **P0 (Críticas)** | 51 |
| **P1 (Altas)** | 15 |
| **P2 (Médias)** | 2 |
| **P3 (Baixas)** | 1 |
| **Story Points Totais** | 276 |
| **Tarefas Sem Dependência** | 7 |

---

## Como Usar

1. **Priorização**: Começar com P0 sem dependências (INF-001, AUTH-001, ORG-001)
2. **Sprint Planning**: Somar Story Points → capacidade do time (~25-30 pontos/sprint de 2 semanas)
3. **Rastreamento**: Atualizar Status (TODO → In Progress → In Review → Done)
4. **Dependências**: Respeitar bloqueadores; usar grafo para identificar critical path
