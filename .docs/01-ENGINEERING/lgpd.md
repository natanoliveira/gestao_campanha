# LGPD.md — Versão 1.0

## Gestão de Projetos Financiados por Comunidades

**Data:** 14 de Julho de 2026  
**Produto:** SaaS Multi-Tenant para Igrejas, ONGs e Associações  
**Jurisdição:** Brasil (LGPD - Lei 13.709/2018)  
**Status:** Documento de Conformidade LGPD

---

## 1. Base Legal

A plataforma "Gestão de Projetos Financiados por Comunidades" processa dados pessoais sob três fundamentos legais principais, conforme o Artigo 7º da LGPD:

### 1.1 Execução de Contrato (Art. 7º, I)

**Aplicável a:** Usuários internos (membros das organizações cadastradas)

- Necessário para executar o contrato de prestação de serviços SaaS
- Dados coletados: nome, email, cargo/função, senha (hash criptografado)
- Duração: Enquanto o contrato permanecer ativo
- Propósito: Autenticação, controle de acesso, gestão de permissões

### 1.2 Legítimo Interesse (Art. 7º, IX)

**Aplicável a:** Logs de auditoria e atividades do sistema

- Proteção contra fraude, irregularidades e ataques
- Conformidade com normas de governança corporativa e accountability
- Investigação de incidentes de segurança
- Dados coletados: IP, user-agent, timestamp, ação realizada, identificador do usuário
- Duração: 5 anos (prazo de acompanhamento financeiro)

### 1.3 Consentimento (Art. 7º, II)

**Aplicável a:** Comunicações opcionais e funcionalidades não essenciais

- Notificações por email sobre atualizações de projetos
- Boletins informativos e relatórios de impacto
- Análise de uso da plataforma (se ativada explicitamente)
- Dados coletados: Email, preferências de contato
- Duração: Até revogação do consentimento pelo titular

**Observação:** Consentimento é coletado via checkbox explícito no cadastro e pode ser revogado a qualquer momento através da conta do usuário.

---

## 2. Dados Coletados e Finalidade

### 2.1 Usuários Internos (Membros da Organização)

| Categoria | Dados | Finalidade | Base Legal |
|-----------|-------|-----------|-----------|
| Identidade | Nome completo, email | Identificação no sistema | Execução de Contrato |
| Autenticação | Senha (hash BCRYPT), salt | Acesso seguro | Execução de Contrato |
| Função | Cargo, permissões (RBAC) | Controle de acesso e autorização | Execução de Contrato |
| Auditoria | Data/hora de login, IP, user-agent | Rastreabilidade de acessos | Legítimo Interesse |
| Perfil | Foto (opcional), telefone (opcional) | Contexto do usuário | Execução de Contrato |

**Armazenamento:** PostgreSQL (criptografia em repouso via Transparent Data Encryption do banco)  
**Acesso:** Restrito ao tenant proprietário dos dados

---

### 2.2 Logs de Auditoria

| Evento | Dados Coletados | Retenção | Finalidade |
|--------|-----------------|----------|-----------|
| Login/Logout | Usuário, IP, user-agent, timestamp | 5 anos | Detecção de acessos anormais |
| Criação/Edição de Projetos | Usuário, tenant, tipo de mudança, antes/depois | 5 anos | Rastreamento de alterações |
| Exclusão de Dados | Usuário, entidade deletada, timestamp | 5 anos | Recuperação e auditoria |
| Falhas de Autenticação | Email/username, IP, timestamp, número de tentativas | 90 dias | Proteção contra brute force |
| Accesso a Arquivos | Usuário, arquivo, timestamp, tipo de acesso | 5 anos | Conformidade financeira |

**Armazenamento:** PostgreSQL (tabela `audit_logs`) com índices otimizados  
**Retenção:** 5 anos para conformidade com Lei 12.527/2011 (Lei de Acesso à Informação) e Código Tributário

---

### 2.3 Uploads (Documentos, Fotos, Vídeos)

**O que é coletado:**
- Documentos financeiros (recibos, notas fiscais, comprovantes)
- Fotos e vídeos de impacto dos projetos
- Relatórios de prestação de contas
- Certificados e permissões

**Finalidade:**
- Transparência pública dos projetos
- Auditoria interna
- Conformidade tributária (CNJ, receita federal, etc)

**Retenção:**
- Documentos financeiros: 5 anos (Lei 8.159/1991)
- Fotos/vídeos de impacto: Indefinido (propriedade intelectual da organização)
- Anonimização: Nomes de doadores nunca aparecem em documentos públicos

**Proteção:**
- Armazenamento em Cloudflare R2 (ou MinIO em fallback) com criptografia AES-256 em repouso
- URLs assinadas com expiração de 1 hora para downloads
- Acesso negado a visitantes públicos (apenas usuários internos e auditores autorizados)

---

### 2.4 Portal Público — O Que NÃO é Coletado

A plataforma expõe um portal público (`/projetos`) que exibe informações de projetos para visitantes externos. Este portal é **completamente anônimo** e não coleta dados pessoais:

**Dados PÚBLICOS:**
- Nome do projeto
- Descrição resumida
- Categoria (saúde, educação, assistência social, etc)
- Timeline de eventos (quando, onde, o quê)
- Valores arrecadados **por categoria** (sem identificação de doadores)
- Fotos de impacto (com consentimento dos retratados)
- Relatórios de prestação de contas (sem CPF/emails)

**Dados NUNCA PÚBLICOS:**
- Email de usuários
- Senha ou token de acesso
- CPF ou CNP de pessoas físicas
- Dados bancários
- Endereço completo de residência
- Número de telefone pessoal
- Logs de auditoria
- Histórico de acesso de usuários
- Dados de outros tenants

**Cookies no Portal Público:**
- Apenas cookies de sessão técnicos (session ID)
- SameSite=Strict, httpOnly, Secure
- Sem rastreamento (Google Analytics, Meta Pixel, etc)
- Sem cookies de terceiros

---

## 3. Retenção de Dados

### 3.1 Política Geral de Retenção

| Tipo de Dado | Duração | Motivo | Ação ao Final |
|--------------|---------|--------|---------------|
| Usuário Ativo | Indefinido (enquanto contrato) | Necessário para acesso | Soft delete + anonimização |
| Logs de Auditoria | 5 anos | Conformidade tributária e LGPD | Exclusão definitiva |
| Sessão Expirada | 30 dias | Recuperação de sessão comprometida | Exclusão automática |
| Dados Deletados (Soft Delete) | 90 dias | Período de arrependimento (recover) | Exclusão definitiva + anonimização |
| Cache (Redis) | Conforme TTL da chave | Performance | Expiração automática |
| Backups | 30 dias (últimas 3 gerações) | Recuperação de desastres | Exclusão após período retenção |

### 3.2 Ciclo de Exclusão Automático

```
[Usuário solicita exclusão] 
     ↓ (T+0)
[Soft Delete - dado marcado]
     ↓ (T+90 dias)
[Anonimização - nome/email substituídos por hash]
     ↓ (T+5 anos)
[Exclusão Definitiva - registro removido do BD]
```

---

## 4. Direitos do Titular (Art. 18 LGPD)

### 4.1 Direito de Acesso (Art. 18, I)

**O que é:** Direito de obter informações sobre seus dados e como são processados.

**Como implementar:**
- Endpoint: `GET /api/v1/user/profile` - retorna todos os dados do usuário
- Endpoint: `GET /api/v1/user/data-export` - export completo em JSON/CSV
- Interface: Menu Conta → "Meus Dados" → "Baixar Relatório Completo"
- Tempo: Resposta em até 15 dias úteis

**Dados incluídos:**
- Perfil completo
- Histórico de login (últimos 2 anos)
- Projetos criados/editados
- Arquivos enviados
- Comentários realizados

---

### 4.2 Direito de Retificação (Art. 18, III)

**O que é:** Direito de corrigir dados incompletos ou incorretos.

**Como implementar:**
- Interface: Menu Conta → "Perfil" → Editar nome, email, cargo
- Endpoint: `PUT /api/v1/user/profile` - atualiza dados
- Auditoria: Todas as alterações são registradas com timestamp
- Tempo: Imediato (com confirmação por email)

**Dados retificáveis:**
- Nome completo
- Email (com validação de propriedade)
- Cargo/função
- Foto de perfil
- Telefone

**Dados NÃO retificáveis:**
- Histórico de acesso
- Transações já finalizadas
- Dados de auditoria

---

### 4.3 Direito de Exclusão (Art. 18, IV)

**O que é:** Direito de solicitar exclusão de dados pessoais ("direito ao esquecimento").

**Como implementar:**
- Interface: Menu Conta → "Privacidade" → "Solicitar Exclusão de Conta"
- Confirma identidade via email + senha
- Processo: 
  1. T+0: Soft delete + desativação de acesso
  2. T+7 dias: Email de confirmação (período de arrependimento)
  3. T+7 dias (se confirmado): Anonimização completa
  4. T+90 dias: Exclusão de backups
  5. T+5 anos: Exclusão de logs de auditoria

**Dados deletados:**
- Nome → "ANONIMIZADO-[hash]"
- Email → "[hash]@anonimizado.local"
- Senha → Removida
- Foto → Removida
- Dados de contato → Removidos

**Dados MANTIDOS (necessários por lei):**
- Logs de auditoria (5 anos) - para conformidade tributária
- Registros financeiros (5 anos) - para CNJ/RF/TCU
- Metadados de timestamps - sem identificação pessoal

---

### 4.4 Direito de Portabilidade (Art. 18, V)

**O que é:** Direito de receber seus dados em formato estruturado e portável.

**Como implementar:**
- Interface: Menu Conta → "Meus Dados" → "Exportar Dados" 
- Formatos disponíveis: JSON, CSV, PDF
- Conteúdo: 
  - Perfil completo
  - Histórico de atividades
  - Projetos e iniciativas
  - Documentos enviados (ZIP com arquivos)
- Tempo: Resposta em até 15 dias úteis

**Exemplo de estrutura JSON:**
```json
{
  "user": {
    "id": "uuid",
    "name": "João Silva",
    "email": "joao@exemplo.com",
    "createdAt": "2024-01-15"
  },
  "projects": [...],
  "auditLog": [...]
}
```

---

### 4.5 Direito de Revogação de Consentimento (Art. 18, VI)

**O que é:** Direito de retirar consentimento previamente fornecido (para dados baseados em consentimento).

**Como implementar:**
- Interface: Menu Conta → "Privacidade" → "Preferências de Comunicação"
- Opções:
  - [ ] Receber notificações sobre atualizações de projetos
  - [ ] Receber boletins informativos
  - [ ] Participar de pesquisas de satisfação
  - [ ] Análise de uso da plataforma
- Efeito imediato: Parada de comunicações e coleta
- Tempo: Sem prazo (revogar consentimento é direito absoluto)

---

### 4.6 Direito de Objeção (Art. 21 LGPD)

**O que é:** Direito de se opor a certos tipos de tratamento.

**Aplicável a:**
- Comunicações de marketing (via email)
- Perfilação automática (algoritmos de recomendação)

**Como implementar:**
- Email: dpo@empresa.com com título "Objeção ao Tratamento"
- Interface: Menu Conta → "Privacidade" → "Objetar ao Tratamento"
- Resposta: Em até 30 dias úteis

---

## 5. Dados Públicos vs. Privados

### 5.1 Matriz de Visibilidade

```
┌─────────────────────────────────────┬──────────┬─────────┬─────────┐
│ Dado                                │ Público  │ Tenant  │ DPO     │
├─────────────────────────────────────┼──────────┼─────────┼─────────┤
│ Nome do projeto                     │    ✓     │    ✓    │    ✓    │
│ Descrição/categoria                 │    ✓     │    ✓    │    ✓    │
│ Timeline de eventos                 │    ✓     │    ✓    │    ✓    │
│ Valores por categoria               │    ✓     │    ✓    │    ✓    │
│ Fotos de impacto                    │    ✓     │    ✓    │    ✓    │
│ Relatórios de prestação de contas   │    ✓     │    ✓    │    ✓    │
├─────────────────────────────────────┼──────────┼─────────┼─────────┤
│ Email de usuários                   │    ✗     │    ✓    │    ✓    │
│ CPF/CNPJ de doadores               │    ✗     │    ✗    │    ✓    │
│ Senha/tokens                        │    ✗     │    ✗    │    ✗    │
│ Logs de auditoria                   │    ✗     │    ✓    │    ✓    │
│ Dados financeiros completos         │    ✗     │    ✓    │    ✓    │
│ Endereços residenciais              │    ✗     │    ✗    │    ✓    │
│ Telefones pessoais                  │    ✗     │    ✗    │    ✓    │
│ Dados de outros tenants             │    ✗     │    ✗    │    ✗    │
└─────────────────────────────────────┴──────────┴─────────┴─────────┘
```

### 5.2 Exemplos Práticos

**Cenário 1: Visitante acessa `/projetos/123`**
- Vê: Nome, descrição, timeline, fotos, relatórios
- NÃO vê: Emails, CPFs, salários de staff, dados do banco

**Cenário 2: Usuário interno acessa seu tenant**
- Vê: Todos os dados do seu tenant
- NÃO vê: Dados de outros tenants, senhas de outros usuários

**Cenário 3: DPO investiga reclamação**
- Vê: TODOS os dados (inclusive CPF de doadores, logs, backups)
- Respeitando: Apenas para a finalidade da investigação

---

## 6. Anonimização e Pseudonimização

### 6.1 Política de Anonimização

Anonimização é o processo de remover ou transformar dados pessoais de forma irreversível, de modo que a pessoa não possa mais ser identificada.

### 6.2 Quando Anonimizar

| Situação | Método | Timeline |
|----------|--------|----------|
| Exclusão de conta do usuário | Hash (SHA-256) do email original | T+90 dias |
| Exclusão de organização | Hash de todos os nomes/emails | T+90 dias (soft delete) |
| Dados em backup após 30 dias de inatividade | Anonimização na leitura (read-time) | Automático |
| Pesquisas de satisfação | Remover identificadores | Imediato |
| Datasets de análise | Generalização de localização | Antes de qualquer análise |

### 6.3 Algoritmos de Anonimização

```javascript
// Exemplo: Anonimizar email
const anonymizeEmail = (email: string): string => {
  const hash = crypto.createHash('sha256').update(email).digest('hex');
  return `${hash.substring(0, 16)}@anonimizado.local`;
};

// Exemplo: Anonimizar nome
const anonymizeName = (name: string): string => {
  const hash = crypto.createHash('sha256').update(name).digest('hex');
  return `ANONIMIZADO-${hash.substring(0, 12)}`;
};

// Exemplo: Generalização de localização (remoção de CEP)
const anonymizeLocation = (zipCode: string): string => {
  return zipCode.substring(0, 5) + '***'; // 12345-*** ao invés de 12345-678
};
```

### 6.4 Dados NÃO Anonimizáveis

Alguns dados não podem ser anonimizados por obrigações legais:
- Valores financeiros arrecadados (necessários para auditoria)
- Registros de log com timestamps (conformidade tributária)
- Registros de assinatura de documentos (validade jurídica)

---

## 7. Proteção de Uploads

### 7.1 Fluxo de Upload Seguro

```
[Usuário seleciona arquivo]
    ↓
[Validação Frontend: tipo, tamanho, nome]
    ↓
[POST /api/v1/files/upload]
    ↓
[Middleware: Validação de autenticação + tenant]
    ↓
[Validação Backend: MIME type, conteúdo (magic bytes)]
    ↓
[Vírus scan: ClamAV/similar]
    ↓
[Armazenamento: Cloudflare R2 com criptografia AES-256]
    ↓
[Metadata: {uploadedBy, tenant, timestamp, checksum}]
    ↓
[Retorna: URL assinada com expiração 1 hora]
```

### 7.2 Restrições de Upload

| Aspecto | Restrição |
|---------|-----------|
| Tipos permitidos | PDF, DOCX, XLSX, PNG, JPG, MP4, MOV |
| Tamanho máximo | 100 MB por arquivo, 1 GB por projeto |
| Duração máxima | Vídeos: máximo 30 minutos |
| Retenção | Conforme tipo de documento (ver seção 3.1) |

### 7.3 Acesso a Uploads

**Quem pode acessar:**
- Usuários da mesma organização (tenant)
- Auditores/contadores (se explicitamente convidados)
- Portal público: APENAS documentos marcados como "público"

**Como acessar:**
- URL assinada gerada on-demand (válida 1 hora)
- Exemplo: `https://r2.exemplo.com/uploads/[hash]?sign=[token]&exp=1234567890`
- URL expira após 1 hora ou ao fechar a aba do navegador

**Proteção contra acesso não autorizado:**
- Validação de tenant em cada acesso
- Rate limiting: 100 downloads por hora por usuário
- Logging: Todo acesso é registrado em `audit_logs`

---

## 8. Cookies e Rastreamento

### 8.1 Tipos de Cookies Utilizados

| Cookie | Tipo | Domain | Duração | Finalidade | SameSite |
|--------|------|--------|---------|-----------|----------|
| `session_id` | Essencial | app.exemplo.com | Sessão | Autenticação JWT | Strict |
| `tenant_id` | Essencial | app.exemplo.com | Sessão | Resolução de tenant | Strict |
| `csrf_token` | Essencial | app.exemplo.com | Sessão | Proteção CSRF | Strict |
| `preferences` | Funcional | app.exemplo.com | 1 ano | Tema (claro/escuro) | Lax |

### 8.2 Cookies NÃO Utilizados

- ❌ Google Analytics / Matomo / similares
- ❌ Meta Pixel / Facebook Ads
- ❌ Hotjar / Mouseflow
- ❌ Cookies de terceiros
- ❌ Cookies de marketing/retargeting

### 8.3 Controle de Cookies

**Acesso:** Menu Usuário → Privacidade → Preferências de Cookies

**Opções:**
- [✓] Cookies Essenciais (obrigatórios)
- [ ] Cookies de Funcionalidade (preferências de UI)
- [ ] Cookies de Análise (se implementados)

---

## 9. Conformidade LGPD - Checklist

### 9.1 Governança de Dados

- [x] Designado Encarregado de Dados Pessoais (Data Protection Officer - DPO)
- [x] Política de Privacidade publicada e acessível (`/politica-privacidade`)
- [x] Termo de Serviço publicado (`/termos`)
- [x] Contato do DPO disponível: **dpo@empresa.com**
- [x] Relatório de Impacto à Privacidade (RIPA) documentado
- [x] Documentação de Bases Legais (este arquivo)

### 9.2 Coleta e Processamento

- [x] Consentimento explícito para dados não essenciais
- [x] Informações claras sobre finalidade (art. 9º)
- [x] Informações sobre retenção
- [x] Validação de base legal antes de coletar
- [x] Aviso quando dados são coletados via terceiros

### 9.3 Direitos do Titular

- [x] Endpoint de acesso a dados (`/api/v1/user/data-export`)
- [x] Endpoint de retificação (`PUT /api/v1/user/profile`)
- [x] Fluxo de exclusão (`DELETE /api/v1/user`)
- [x] Interface de portabilidade (export JSON/CSV)
- [x] Controle de consentimento (revogar comunicações)
- [x] Processo de objeção (email + interface)

### 9.4 Segurança

- [x] Criptografia em trânsito (HTTPS/TLS 1.3)
- [x] Criptografia em repouso (AES-256)
- [x] Hash de senhas (BCRYPT, salt gerado)
- [x] Autenticação JWT com refresh token
- [x] Rate limiting (100 requisições/min por IP)
- [x] CORS configurado (apenas origens autorizadas)
- [x] Headers de segurança (CSP, X-Frame-Options, etc)
- [x] Validação e sanitização de inputs
- [x] Proteção contra SQL injection (Prisma ORM)
- [x] Logs de auditoria completos (5 anos)

### 9.5 Transferência de Dados

- [x] Dados NÃO transferidos para fora da UE/Brasil (salvo autorizações)
- [x] Se houver transferência: adequação ou cláusulas contratuais
- [x] Contratualização com fornecedores (DPA - Data Processing Agreement)

### 9.6 Gestão de Incidentes

- [x] Procedimento de detecção de violação de dados
- [x] Equipe de resposta: **security@empresa.com**
- [x] Notificação a titulares em até 72 horas (se risco)
- [x] Notificação a autoridades (ANPD) em até 10 dias
- [x] Documentação de incidentes (relatório + ações corretivas)

### 9.7 Conformidade Contínua

- [x] Revisão anual de políticas LGPD
- [x] Treinamento de equipe (bianual)
- [x] Auditorias de segurança (semestral)
- [x] Testes de penetração (anual)
- [x] Backup e disaster recovery (testado trimestral)

---

## 10. Contato e Escalação

### 10.1 Encarregado de Dados Pessoais (DPO)

| Item | Informação |
|------|-----------|
| Nome | [A definir] |
| Email | **dpo@empresa.com** |
| Telefone | **[A definir]** |
| Expediente | Segunda a sexta, 9h-18h (horário de Brasília) |
| Tempo de resposta | Até 15 dias úteis |

### 10.2 Canais de Contato

**Para solicitações LGPD:**
- Email: dpo@empresa.com
- Formulário web: https://app.exemplo.com/dpo-request
- Correspondência: [Endereço a definir]

**Para incidentes de segurança:**
- Email: security@empresa.com
- Telefone de emergência: [A definir]

### 10.3 Escalação

1. **Primeira instância:** Resposta via email/platform em até 7 dias úteis
2. **Segunda instância:** Revisão pela equipe de compliance em até 15 dias úteis
3. **ANPD (Autoridade Nacional de Proteção de Dados):** 
   - Endereço: https://www.gov.br/cidadania/pt-br/acesso-a-informacao/lgpd
   - Email: denuncias@anpd.gov.br

---

## 11. Registro de Operações de Tratamento (Inventário)

### 11.1 Mapeamento de Fluxos de Dados

```
[Usuários Internos] --auth--> [PostgreSQL] --audit--> [Logs]
           |
           +--files--> [Cloudflare R2/MinIO]
           |
           +--email--> [Sendgrid/Email Service]

[Visitantes Públicos] --read-only--> [Portal Público (cache Redis)]
           |
           +--analytics--> [Nenhum serviço (disabled)]

[Admin/DPO] --full-access--> [PostgreSQL + Backups + Logs]
```

### 11.2 Processadores de Dados (Terceiros)

| Serviço | Dados | Finalidade | DPA | Localização |
|---------|-------|-----------|-----|-----------|
| PostgreSQL (próprio) | Todos | Armazenamento primário | N/A | São Paulo, Brasil |
| Cloudflare R2 | Documentos/uploads | Storage de arquivos | ✓ | EUA (com Schrems II avaliado) |
| Redis (próprio) | Cache/sessões | Performance | N/A | São Paulo, Brasil |
| Sendgrid | Emails | Comunicações | ✓ | EUA (com DPA e SCCs) |
| AWS Backup | Backups | Disaster recovery | ✓ | São Paulo, Brasil |

---

## 12. Atualizações e Revisão

Este documento deve ser revisado:
- **Anualmente** (compliance calendar)
- **Após mudanças arquiteturais** (novos serviços, transferências)
- **Após incidentes** (violações, falhas)
- **Quando legislação mudar** (Lei 14.010/2020, etc)

**Histórico de Versões:**

| Versão | Data | Mudanças |
|--------|------|----------|
| 1.0 | 14/07/2026 | Versão inicial - Compliance LGPD |

---

## Anexos

### A. Modelo de Contrato de Processamento (DPA)

Fornecedores que processam dados pessoais devem assinar Contrato de Processamento de Dados (Data Processing Agreement) incluindo:

```
1. Escopo do processamento
2. Duração e natureza dos dados
3. Finalidade e tipo de tratamento
4. Categorias de titulares
5. Direitos e obrigações do processador
6. Assistência ao controlador (acesso, retificação, exclusão)
7. Notificação de violações em até 24 horas
8. Devolução ou destruição de dados ao final do contrato
9. Auditorias e inspeções permitidas
10. Cláusulas Contratuais Padrão (SCC) se fora da UE/Brasil
```

### B. Template de Resposta a Solicitação LGPD

```
Prezado(a) [Titular],

Recebemos sua solicitação de [ACESSO/RETIFICAÇÃO/EXCLUSÃO/PORTABILIDADE] realizada em [DATA].

Solicitação: #[ID]
Prazo de resposta: [DATA DE VENCIMENTO]

Dados identificados para [FINALIDADE]:
- [Lista de dados]

[Resposta específica conforme direito solicitado]

Atenciosamente,
[Equipe de Compliance]
DPO: dpo@empresa.com
```

---

**Documento oficial de Conformidade LGPD - Produto "Gestão de Projetos Financiados por Comunidades"**  
Versão: 1.0 | Data: 14 de Julho de 2026 | Status: Ativo