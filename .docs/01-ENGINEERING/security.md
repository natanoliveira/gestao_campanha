# SECURITY.md — Versão 1.0

## Gestão de Projetos Financiados por Comunidades — Política de Segurança

Documento de referência para implementação, auditoria e compliance de segurança no SaaS multi-tenant de gestão de campanhas financiadas por comunidades. Todos os desenvolvedores devem estar familiarizados com este documento antes de trabalhar com autenticação, autorização ou dados sensíveis.

---

## 1. Autenticação

### 1.1 JWT (JSON Web Tokens)

A autenticação baseia-se em JWT com ciclo de vida estruturado:

- **Access Token**: validade de **1 hora**
  - Armazenado em `Authorization: Bearer <token>` (header) ou httpOnly cookie
  - Contém: `sub` (userId), `org` (organizationId), `iat`, `exp`, `iss`
  - Usado para validar autorização em cada requisição

- **Refresh Token**: validade de **7 dias**
  - Armazenado exclusivamente em **httpOnly, Secure, SameSite=Strict** cookie
  - Rotacionado a cada uso (refresh token rotation)
  - Revogável via blacklist em Redis
  - Nunca exposto em JavaScript

### 1.2 Refresh Token Rotation

Implementação obrigatória:

```
Cliente → POST /auth/refresh com Refresh Token (cookie)
Servidor valida RT (não revogado em Redis)
Servidor gera novo Access Token + novo Refresh Token
Servidor invalida RT anterior (adiciona a blacklist Redis com TTL=7d)
Servidor retorna novo AT (header/httpOnly) + novo RT (httpOnly cookie)
Cliente armazena novo AT e continua
```

**Benefício**: Se um RT for interceptado, é válido apenas uma vez; uso subsequente não autorizado causa logout.

### 1.3 Controle de Sessão e Revogação

- **Redis Blacklist**: tokens revogados armazenados com chave `revoked:token:{jti}:{expiry}` e TTL até expiração do token
- **Logout**: adiciona access token e refresh token à blacklist imediatamente
- **Bloqueio por Tentativas**: após 5 falhas de autenticação em 1 minuto por IP/email, bloqueia conta por 15 minutos
- **Rate Limiting em /auth/login**: máximo 5 tentativas por minuto por IP

### 1.4 Segurança de Senhas

- Algoritmo: **bcrypt** com salt factor ≥ 12
- Nunca armazenar senhas em plaintext
- Hash salted e verificado em cada login
- Senhas devem atender mínimo: 12 caracteres, maiúsculas, minúsculas, números, especiais

---

## 2. Autorização

### 2.1 RBAC (Role-Based Access Control)

Matriz de permissões por role e módulo:

| Role | Campanhas | Financeiro | Comunicação | Auditoria | Usuários |
|------|-----------|-----------|--------------|-----------|----------|
| **ADMIN** | CRUD | CRUD | CRUD | R | CRUD |
| **MANAGER** | CRUD | R | R | - | R |
| **TREASURER** | R | CRUD | R | R | - |
| **COMMUNICATION** | R | - | CRUD | - | - |
| **AUDITOR** | R | R | R | CRUD | R |
| **MEMBER** | R (próprios) | - | - | - | R (próprio) |

- **ADMIN**: acesso total, criação de usuários, rotação de secrets
- **MANAGER**: gestão de campanhas, visibilidade financeira
- **TREASURER**: gestão de transações, relatórios financeiros, auditoria
- **COMMUNICATION**: canais de comunicação com apoiadores
- **AUDITOR**: auditoria completa, sem modificação
- **MEMBER**: visualização de campanhas públicas, próprio perfil

### 2.2 Middleware de Multi-Tenancy

Validação **obrigatória** em toda requisição autenticada:

```javascript
// middleware: validateTenant.ts
if (user.organizationId !== request.organizationId) {
  throw new UnauthorizedError("Access denied: different tenant");
}
```

**Crítico**: Nenhuma query retorna dados de outro tenant sem validação explícita. Sempre filtrar por `organizationId` em:
- `WHERE organizationId = $1`
- Joins nunca devem cruzar tenant boundaries sem verificação

### 2.3 Isolamento de Dados

- **Portal Público**: acesso sem autenticação, apenas leitura de campanhas públicas
  - Não retorna dados financeiros, emails, informações de organizações
  - Filtro automático: `WHERE isPublic = true AND status = 'active'`
  - Rate limit: 100 req/min
- **Portal Autenticado**: acesso controlado por RBAC
  - Rate limit: 100 req/min
- **API Interna**: endpoints de upload, processamento em background
  - Rate limit: 10 req/min para uploads
  - Autenticação obrigatória

---

## 3. OWASP Top 10 — Mitigações Implementadas

### 3.1 A01:2021 — Broken Access Control
**Risco**: Usuários acessam dados/funcionalidades de outro tenant ou fora de seu role.

**Mitigação**:
- Middleware `validateTenant` em todas as rotas autenticadas
- RBAC implementation check-in-code via Zod schemas e guards
- Queries parametrizadas com `organizationId` em WHERE
- Testes de segurança que verificam acesso negado cross-tenant
- Auditoria de ações sensíveis (criação de usuário, mudança de role, exclusão)

**Verificação**: `grep -r "organizationId" app/api/ | wc -l` deve conter todas as queries.

### 3.2 A02:2021 — Cryptographic Failures
**Risco**: Senhas não criptografadas, comunicação insegura, chaves expostas.

**Mitigação**:
- Senhas: **bcrypt** com salt ≥ 12
- HTTPS obrigatório via `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- Secrets em variáveis de ambiente, nunca em código
- JWT_SECRET rotacionado a cada **90 dias** (automatizado via CI/CD)
- Dados em repouso: encryption em PostgreSQL (Transparent Data Encryption) ou Redis (via Cloudflare R2 para attachments)
- Arquivo sensível `.env.local` em `.gitignore`

### 3.3 A03:2021 — Injection
**Risco**: SQL injection, command injection, template injection.

**Mitigação**:
- **SQL Injection**: Prisma ORM com prepared statements (não concatena strings)
  ```typescript
  // ✅ Seguro (Prisma)
  const user = await prisma.user.findUnique({
    where: { id: userId, organizationId }
  });
  
  // ❌ Nunca fazer
  // const user = await db.query(`SELECT * FROM users WHERE id = ${userId}`);
  ```
- **Command Injection**: sanitizar argumentos se usar `child_process`, preferir bibliotecas
- **Template Injection**: usar templates com escape automático (Next.js RSC)

### 3.4 A04:2021 — Insecure Design
**Risco**: Arquitetura sem considerar segurança, fluxos sem validação.

**Mitigação**:
- Validação de entrada com **Zod** em todas as APIs
  ```typescript
  const createCampaignSchema = z.object({
    name: z.string().min(1).max(255),
    description: z.string().max(5000),
    targetAmount: z.number().positive(),
    organizationId: z.string().uuid(),
  });
  
  const data = createCampaignSchema.parse(req.body);
  ```
- Validação de saída: não expor campos internos (ex: `password_hash`, `api_key`)
- Fluxo de refresh token com double-token pattern (AT + RT)
- Timeout de sessão: 1h para AT, 7d para RT

### 3.5 A05:2021 — Security Misconfiguration
**Risco**: Headers faltando, CORS aberto, portas expostas, versões de frameworks visíveis.

**Mitigação**:
- **next.config.js** com headers de segurança:
  ```javascript
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-XSS-Protection", value: "1; mode=block" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "geolocation=(), microphone=(), camera=()" },
      ]
    }];
  }
  ```
- **CORS**: restringir a `origin: process.env.NEXT_PUBLIC_APP_URL` apenas
- Remover headers `X-Powered-By`, informações de versão (via middleware)
- Desabilitar acesso direto a arquivos de config (`.env`, `.git`, etc)
- Audit de dependências: `npm audit` em CI/CD, resolver HIGH/CRITICAL

### 3.6 A06:2021 — Vulnerable Components
**Risco**: Dependências com vulnerabilidades conhecidas.

**Mitigação**:
- **npm audit** executado em CI/CD (pipeline rejeita commit com HIGH/CRITICAL)
- Dependabot ativado para alertas automáticos
- Auditoria manual trimestral de top packages
- Manter Node.js e npm atualizados (LTS only)
- Scanning de containers (se usar Docker) com Trivy

### 3.7 A07:2021 — Authentication Failures
**Risco**: Senhas fracas, reuso de tokens, bypass de 2FA.

**Mitigação**:
- **Rate Limiting**: 5 tentativas/min em `/auth/login`, bloqueio por 15min após limite
- **Bloqueio de Conta**: após 10 falhas em 1h, conta bloqueada até admin desbloqueie
- **Token Expiry**: AT (1h), RT (7d), ambos revogáveis imediatamente
- **2FA** (futuro): implementar TOTP via authenticator (Google Authenticator, Authy)
- **Detecção de Anomalia**: alertar admin se login de novo país/IP (geolocation)
- **Reset Password**: token com validade de 30 minutos, enviado por email, one-time use

### 3.8 A08:2021 — Software Integrity Failures
**Risco**: Deploy de código comprometido, dependências alteradas, supply chain attack.

**Mitigação**:
- **Git Signing**: commits assinados com GPG (enforce via branch protection)
- **CI/CD Integrity**: GitHub Actions com secrets encriptados, variáveis de ambiente sensíveis mascaradas
- **Build Artifacts**: verificação de checksum pós-build
- **Dependency Locking**: `package-lock.json` sempre commitado, `npm ci` em CI/CD (não `npm install`)
- **Code Review**: mínimo 1 aprovação antes de merge (em main), DependaBot reviews

### 3.9 A09:2021 — Logging and Monitoring Failures
**Risco**: Ações críticas não auditadas, segredos em logs, detecção tardio de ataques.

**Mitigação**:
- **Auditoria Completa**: log de todas as ações sensíveis
  - Login/Logout com IP, User-Agent, timestamp
  - Mudança de role, permissões, exclusão de usuário
  - Criação/edição de campanhas financeiras
  - Acesso a relatórios financeiros
- **Formato de Log**: JSON estruturado, nunca armazenar senhas/tokens
  ```json
  {
    "timestamp": "2026-07-14T10:30:00Z",
    "userId": "user-uuid",
    "organizationId": "org-uuid",
    "action": "campaign.created",
    "resource": "campaign-uuid",
    "changes": { "status": "draft" },
    "ipAddress": "203.0.113.42",
    "userAgent": "Mozilla/5.0...",
    "result": "success"
  }
  ```
- **Retenção**: mínimo 1 ano para ações críticas, 90 dias para gerais
- **Alertas**: notificar admin em tempo real de
  - Múltiplas falhas de autenticação
  - Acesso negado por ACL
  - Mudança de configurações de segurança
  - Uploads anômalos (volume, tipo)
- **Ferramentas**: integração com log aggregator (CloudWatch, Datadog, ou Stack de logs open-source)

### 3.10 A10:2021 — SSRF (Server-Side Request Forgery)
**Risco**: Servidor fazendo requisições para URLs maliciosas ou IPs internos.

**Mitigação**:
- **Validação de URL**: whitelist de domínios permitidos para webhooks/integrações
  ```typescript
  const allowedDomains = ['webhook.example.com', 'api.payment.com'];
  const urlObj = new URL(webhookUrl);
  if (!allowedDomains.includes(urlObj.hostname)) {
    throw new Error('Domain not allowed');
  }
  ```
- **Bloqueio de IPs Privados**: rejeitar requisições para `localhost`, `127.0.0.1`, `10.x.x.x`, `172.16.x.x`, `192.168.x.x`
- **Timeout**: máximo 5 segundos para requisições externas
- **Validação de Content-Type**: aceitar apenas tipos esperados
- Usar bibliotecas como `undici` com opções de segurança habilitadas

---

## 4. Proteções Específicas de Aplicação

### 4.1 SQL Injection
**Implementação**: Prisma ORM com prepared statements
- Nunca concatenar valores em queries
- Usar placeholders (`$1`, `$2`) via Prisma
- Testar com payloads conhecidos (OWASP SQL Injection Test Cases)

### 4.2 Cross-Site Scripting (XSS)
**Implementação**:
- Sanitizar inputs com `sanitize-html` se aceitar HTML rico
- Usar Content-Security-Policy (CSP) header
  ```
  Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-{random}'; style-src 'self' 'unsafe-inline';
  ```
- Next.js RSC escape automático de outputs
- Validar e escapar dados antes de renderizar em templates

### 4.3 Cross-Site Request Forgery (CSRF)
**Implementação**:
- Usar CSRF tokens em mutations (POST, PUT, DELETE)
  ```typescript
  // Gerar token em GET /csrf-token
  const csrfToken = crypto.randomUUID();
  res.cookie('csrf', csrfToken, { httpOnly: false, sameSite: 'strict' });
  
  // Validar em mutations
  const token = req.body._csrf || req.headers['x-csrf-token'];
  if (token !== req.cookies.csrf) throw new Error('CSRF token mismatch');
  ```
- **SameSite Cookie**: `SameSite=Strict` no access token (httpOnly cookie)
- **Preflight Requests**: CORS preflight (OPTIONS) valida Origin

### 4.4 Clickjacking
**Implementação**:
- Header `X-Frame-Options: DENY` bloqueia iframe em sites externos
- Alternativa: `X-Frame-Options: SAMEORIGIN` se iframe interno necessário
- Content-Security-Policy `frame-ancestors 'none'`

### 4.5 File Upload
**Implementação**:
- **Validação de Tipo MIME**: verificar magic bytes, não apenas extensão
  ```typescript
  import fileType from 'file-type';
  const type = await fileType.fromBuffer(buffer);
  const allowedMimes = ['image/png', 'image/jpeg', 'application/pdf'];
  if (!allowedMimes.includes(type?.mime)) {
    throw new Error('File type not allowed');
  }
  ```
- **Tamanho Máximo**: 10 MB por arquivo, 100 MB por upload (resumível)
- **Nome Aleatório**: renomear arquivo para UUID + extensão
  ```typescript
  const filename = `${crypto.randomUUID()}.${ext}`;
  ```
- **Storage**: Cloudflare R2 ou MinIO com acesso privado (não público)
- **Scan de Malware**: integrar ClamAV ou VirusTotal (assíncrono, quarentena até scan)
- **CDN**: servir uploads via CDN com token/expiry (não URL permanente)

### 4.6 Brute Force
**Implementação**:
- **Rate Limiting em /auth/login**: máximo 5 tentativas por minuto por IP
- **Bloqueio Progressivo**:
  - 5 falhas em 1 min → bloqueio de 5 min
  - 10 falhas em 1 hora → bloqueio de 24h
  - Notificação de email ao usuário
- **Tracking**: Redis key `auth_attempts:{email}:{date}` com TTL 1h
- **Desbloqueio**: manual by admin ou automático após período

### 4.7 Rate Limiting
**Implementação**:
- Usar middleware `ratelimit` (ex: `Ratelimit` da Upstash ou `express-rate-limit`)
- Limites por endpoint:
  | Endpoint | Limite | Janela |
  |----------|--------|--------|
  | /auth/login | 5 req | 1 min |
  | /auth/refresh | 10 req | 1 min |
  | /api/upload | 10 req | 1 min |
  | /api/* (geral) | 100 req | 1 min |
  | /public/* | 100 req | 1 min |

- **Identificador**: IP (anônimo) ou userId (autenticado)
- **Response**: HTTP 429 (Too Many Requests) com header `Retry-After: 60`

---

## 5. Headers de Segurança

### 5.1 Implementação em next.config.js

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()",
          },
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self'; frame-ancestors 'none';",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
```

### 5.2 Descrição dos Headers

| Header | Valor | Propósito |
|--------|-------|----------|
| **Strict-Transport-Security** | `max-age=31536000; includeSubDomains; preload` | Força HTTPS por 1 ano, incl. subdomínios, adiciona à preload list |
| **X-Content-Type-Options** | `nosniff` | Previne MIME sniffing, força navegador a usar Content-Type |
| **X-Frame-Options** | `DENY` | Bloqueia iframe em sites externos (clickjacking) |
| **X-XSS-Protection** | `1; mode=block` | Habilita filtro XSS do navegador, bloqueia se detectado |
| **Referrer-Policy** | `strict-origin-when-cross-origin` | Não envia referrer em requisições cross-origin |
| **Permissions-Policy** | `geolocation=(), microphone=(), ...` | Desabilita APIs perigosas (geoloc, câmera, pagamento) |
| **Content-Security-Policy** | `default-src 'self'; ...` | Restringe carregamento de scripts/recursos a origem própria |

---

## 6. Secrets e Variáveis de Ambiente

### 6.1 Gestão de Secrets

**Nunca commitar** arquivos `.env`, `.env.local`, `.env.*.local` — adicionar a `.gitignore`:

```
# .gitignore
.env.local
.env.*.local
.env
.env.production.local
node_modules/
.next/
```

### 6.2 Variáveis Obrigatórias

```env
# Autenticação
JWT_SECRET=<gerar via: openssl rand -base64 32>
JWT_REFRESH_SECRET=<gerar via: openssl rand -base64 32>
JWT_EXPIRY=3600
JWT_REFRESH_EXPIRY=604800

# Banco de Dados
DATABASE_URL=postgresql://user:pass@localhost:5432/db

# Redis (Session Store & Blacklist)
REDIS_URL=redis://localhost:6379

# Cloudflare R2 ou MinIO
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=

# Email (para reset password, notificações)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=noreply@app.com

# Aplicação
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://app.example.com
LOG_LEVEL=info
```

### 6.3 Rotação de Secrets

**JWT_SECRET e JWT_REFRESH_SECRET** devem ser rotacionados a cada **90 dias**:

1. Gerar novo secret via `openssl rand -base64 32`
2. Armazenar em secret manager (AWS Secrets Manager, HashiCorp Vault, Vercel Secrets)
3. Aplicação suporta múltiplos secrets (ler antigo e novo durante transição)
4. Após 7 dias (RT expiry), rotação completa (todos os RTs invalidados)
5. Documentar data da rotação em changelog

---

## 7. Fluxo de Autenticação JWT com Refresh Token

```mermaid
sequenceDiagram
    participant User
    participant Browser
    participant App as Aplicação<br/>(Next.js)
    participant DB as PostgreSQL
    participant Redis

    User->>App: 1. POST /auth/login<br/>(email, password)
    App->>DB: 2. SELECT user WHERE email = $1
    DB-->>App: user (hashed password)
    
    alt Credenciais válidas
        App->>App: 3. bcrypt.compare(password, hash)
        App->>Redis: 4. Limpar auth_attempts:{email}
        App->>App: 5. Gerar JWT Access Token (1h)
        App->>App: 6. Gerar JWT Refresh Token (7d)
        App->>Browser: 7. Response: AT (header), RT (httpOnly cookie)
        Browser->>User: Login bem-sucedido
        
    else Credenciais inválidas
        App->>Redis: 4. auth_attempts:{email} += 1 (TTL 1h)
        App->>Redis: 5. Verificar tentativas > 5
        alt Limite atingido
            App->>Browser: 6. HTTP 429 / bloqueio por 15 min
        else Limite OK
            App->>Browser: 6. HTTP 401 Unauthorized
        end
    end

    rect rgb(200, 220, 255)
    Note over User,Redis: Requisições Autenticadas
    User->>App: 8. GET /api/campaigns<br/>Authorization: Bearer AT
    App->>App: 9. jwt.verify(AT, JWT_SECRET)
    App->>Redis: 10. Verificar AT revogado?
    Redis-->>App: 10. Não revogado
    App->>DB: 11. SELECT campaigns<br/>WHERE organizationId = $1
    DB-->>App: campanhas
    App->>User: 12. HTTP 200 + campanhas
    end

    rect rgb(255, 240, 200)
    Note over User,Redis: Refresh de Token
    User->>App: 13. POST /auth/refresh<br/>(RT via cookie)
    App->>App: 14. jwt.verify(RT, JWT_REFRESH_SECRET)
    App->>Redis: 15. Verificar RT revogado?
    Redis-->>App: 15. Não revogado
    App->>App: 16. Gerar novo AT (1h)
    App->>App: 17. Gerar novo RT (7d)
    App->>Redis: 18. Adicionar old-RT a blacklist (TTL 7d)
    App->>Browser: 19. Response: new AT, new RT (httpOnly cookie)
    Browser->>User: Sessão renovada
    end

    rect rgb(255, 200, 200)
    Note over User,Redis: Logout
    User->>App: 20. POST /auth/logout
    App->>Redis: 21. Revogar AT (adiciona a blacklist, TTL 1h)
    App->>Redis: 22. Revogar RT (adiciona a blacklist, TTL 7d)
    App->>Browser: 23. Clear cookies, logout bem-sucedido
    Browser->>User: Desconectado
    end
```

**Fluxo Detalhado**:

1. **Login**: Usuário envia email e password
2. **Validação**: App busca usuário no DB, valida com bcrypt
3. **Geração de Tokens**: 
   - Access Token (AT) com 1h de validade
   - Refresh Token (RT) com 7d de validade
4. **Storage**:
   - AT pode ir em header (Authorization) ou httpOnly cookie
   - RT **sempre** em httpOnly, Secure, SameSite=Strict cookie
5. **Uso de AT**: Cada requisição envia AT para validação de autorização
6. **Refresh**: Quando AT expira, cliente envia RT para obter novo AT
7. **Rotação**: Cada refresh invalida o RT anterior (blacklist Redis)
8. **Logout**: Ambos tokens adicionados à blacklist, cookies limpos

---

## 8. Checklist de Segurança Pré-Deploy

Antes de qualquer deploy em staging/produção, validar:

### Autenticação
- [ ] JWT_SECRET e JWT_REFRESH_SECRET configurados e diferentes
- [ ] Tokens com validade correta (AT 1h, RT 7d)
- [ ] Refresh token rotation implementado
- [ ] Blacklist de tokens em Redis com TTL correto
- [ ] Rate limiting em /auth/login (5 req/min)
- [ ] Bloqueio de conta após 10 falhas em 1h

### Autorização
- [ ] RBAC implementado para todos os roles
- [ ] Matriz de permissões testada por role
- [ ] Middleware de multi-tenancy em todas as rotas autenticadas
- [ ] Queries com filtro `organizationId` verificadas
- [ ] Testes de acesso negado cross-tenant

### Proteções OWASP
- [ ] SQL Injection: Prisma ORM, sem query concatenation
- [ ] XSS: Sanitização de inputs, CSP header
- [ ] CSRF: CSRF tokens, SameSite cookies
- [ ] Injection: Validação Zod em todas as entradas
- [ ] Insecure Design: Fluxo JWT implementado
- [ ] Security Misconfiguration: Headers de segurança (HSTS, X-Frame-Options, etc)
- [ ] Vulnerable Components: `npm audit` resolvido (HIGH/CRITICAL)
- [ ] Auth Failures: Rate limiting, bloqueio por tentativas
- [ ] Logging: Auditoria de ações sensíveis
- [ ] SSRF: Validação de URLs, bloqueio de IPs privados

### File Upload
- [ ] Validação de MIME type (magic bytes)
- [ ] Tamanho máximo 10 MB
- [ ] Rename para UUID (não armazenar nome original)
- [ ] Storage privado (Cloudflare R2 / MinIO)
- [ ] Scan de malware integrado (opcional mas recomendado)

### Headers de Segurança
- [ ] Strict-Transport-Security (1 ano)
- [ ] X-Content-Type-Options: nosniff
- [ ] X-Frame-Options: DENY
- [ ] X-XSS-Protection: 1; mode=block
- [ ] Content-Security-Policy configurado
- [ ] Referrer-Policy: strict-origin-when-cross-origin
- [ ] Permissions-Policy (desabilitar APIs perigosas)

### Secrets e Variáveis
- [ ] .env.local em .gitignore
- [ ] Todas as variáveis obrigatórias configuradas
- [ ] DATABASE_URL, REDIS_URL, JWT_SECRET não expostos
- [ ] SMTP credentials configuradas para notificações
- [ ] NODE_ENV=production

### Database
- [ ] PostgreSQL com encryption em repouso (TDE)
- [ ] Backups automáticos a cada 24h
- [ ] Retenção de 30 dias de backups
- [ ] Acesso restrito por VPC/firewall
- [ ] Conexões via SSL/TLS obrigatório

### Monitoring e Auditoria
- [ ] Auditoria de ações sensíveis ativada (login, mudança de role, exclusão)
- [ ] Logs centralizados (CloudWatch / Datadog / ELK)
- [ ] Alertas configurados (múltiplas falhas, acesso negado)
- [ ] Retenção de logs: mínimo 1 ano (críticos), 90 dias (gerais)

### CI/CD
- [ ] GitHub Actions com secrets encriptados
- [ ] `npm audit` executa e rejeita build com HIGH/CRITICAL
- [ ] Commits assinados com GPG (enforce)
- [ ] Branch protection em main (mínimo 1 review)
- [ ] Logs de deploy auditados

### Testes
- [ ] Testes de segurança para RBAC (acesso negado cross-tenant)
- [ ] Testes de rate limiting
- [ ] Testes de SQL injection
- [ ] Testes de XSS
- [ ] Testes de CSRF

### Documentação
- [ ] Este documento (SECURITY.md) atualizado
- [ ] Runbook de incident response disponível
- [ ] Processo de rotação de secrets documentado
- [ ] Contatos de segurança identificados (SECURITY.txt)

---

## 9. Contatos e Escalação

Para reportar vulnerabilidades ou incidentes de segurança:

1. **Não abrir issue pública** — enviar email direto
2. Email de segurança: `security@example.com` (a implementar)
3. Responsável: Tech Lead + CTO
4. SLA de resposta: máximo 24h

Incluir no relatório:
- Descrição da vulnerabilidade
- Passos para reproduzir
- Impacto potencial
- Sugestões de correção (se tiver)

---

## 10. Atualizações e Versionamento

- **Versão Atual**: 1.0 (2026-07-14)
- **Próxima Review**: 2026-10-14 (90 dias)
- **Mudanças Principais**:
  - JWT com refresh token rotation
  - RBAC com 6 roles
  - Multi-tenancy obrigatória
  - OWASP Top 10 mitigado
  - Rate limiting em endpoints críticos

---

## Apêndice A: Comandos Úteis

### Gerar JWT_SECRET
```bash
openssl rand -base64 32
```

### Testar Rate Limiting
```bash
for i in {1..10}; do curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"wrong"}'; done
```

### Verificar Headers de Segurança
```bash
curl -I https://app.example.com | grep -E "Strict-Transport|X-Content|X-Frame|CSP"
```

### Audit de Dependências
```bash
npm audit --depth=10
npm audit fix --depth=10
```

---

**Documento mantido por**: Tech Lead  
**Último atualizado**: 2026-07-14  
**Próxima revisão**: 2026-10-14
