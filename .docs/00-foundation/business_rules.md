# Regras de Negócio - Gestão de Campanha

## 1. Regras Gerais do Sistema

### 1.1 Princípios Fundamentais
- **Nunca excluir dados críticos**: sempre utilizar Soft Delete
- **Auditoria completa**: registrar Data de Criação, Data de Alteração e Usuário Responsável
- **Rastreabilidade financeira**: toda movimentação deve possuir registro
- **Hierarquia obrigatória**: toda Iniciativa pertence a um Projeto; todo Projeto pertence a uma Organização
- **LGPD compliance**: Portal Público nunca expõe dados protegidos
- **Timeline de eventos**: toda alteração relevante gera evento no histórico

### 1.2 Padrões de Dados
- Datas sempre em ISO 8601 (YYYY-MM-DD HH:mm:ss UTC)
- Timestamps com timezone da organização para exibição
- UUIDs para identificadores primários
- Soft Delete: campo `deletedAt` ao invés de remoção física

---

## 2. PROJETOS

### 2.1 Regras de Cadastro
- **Nome**: obrigatório, único por organização, máx 255 caracteres
- **Descrição**: opcional, máx 1000 caracteres
- **Período**: data_inicio e data_fim obrigatórias
  - data_inicio não pode ser anterior ao dia atual
  - data_fim deve ser >= data_inicio
  - duração mínima: 1 dia, máxima: 24 meses
- **Responsável**: obrigatório, deve ser usuário ativo da organização
- **Status inicial**: sempre `draft`
- **Organização**: automaticamente setada do usuário logado

**Exemplo de Cadastro Válido**:
```json
{
  "nome": "Campanha de Verão 2024",
  "descricao": "Campanha de marketing integrada para período de férias",
  "data_inicio": "2024-07-15",
  "data_fim": "2024-09-30",
  "responsavel_id": "user-123",
  "organizacao_id": "org-456"
}
```

### 2.2 Status Permitidos e Transições

| Status | Descrição | Transições Permitidas |
|--------|-----------|----------------------|
| `draft` | Planejamento inicial | → scheduled, → cancelled |
| `scheduled` | Agendada para começar | → active, → cancelled |
| `active` | Em execução | → paused, → completed, → cancelled |
| `paused` | Temporariamente pausada | → active, → cancelled |
| `completed` | Finalizada normalmente | → archived |
| `cancelled` | Cancelada pelo usuário | → archived |
| `archived` | Histórico (não pode ser reativada) | (terminal) |

**Regras de Transição**:
- Apenas `owner` e `admin` podem mudar status
- Status `draft`: editável, deletável
- Status `scheduled`: editável até 24h antes
- Status `active`: apenas pausar/cancelar
- Status `archived`: apenas leitura

### 2.3 Validações de Projeto

| Campo | Validação | Erro |
|-------|-----------|------|
| Nome | Único por org, sem caracteres especiais | "Projeto com este nome já existe" |
| Período | inicio <= fim, fim no máximo 24 meses no futuro | "Período inválido" |
| Responsável | Usuário ativo na organização | "Responsável não encontrado ou inativo" |
| Iniciativas | Projeto não pode ser archived se tiver iniciativas ativas | "Existem iniciativas ativas" |
| Timeline | Projeto não pode ser deletado se tem posts publicados | "Não é possível deletar" |

### 2.4 Edição de Projeto

- **Em draft**: todos os campos editáveis
- **Em scheduled**: apenas `descricao` e `responsavel`
- **Em active**: apenas `descricao`
- **Cancelado/Concluído/Archived**: somente leitura
- Toda edição registra: `usuario_id`, `antes`, `depois`, `timestamp`

### 2.5 Exclusão (Soft Delete)

- Apenas projetos em `draft` podem ser deletados por owner/admin
- Deletar um projeto também marca todas as iniciativas como deletadas
- Deletar uma iniciativa não deleta o projeto
- Campo `deletedAt` registra quando e por quem

**Exemplo**:
```json
{
  "id": "proj-123",
  "nome": "Campanha Cancelada",
  "deletedAt": "2024-07-20T14:30:00Z",
  "deletedBy": "user-456",
  "deletedReason": "Projeto não aprovado pela diretoria"
}
```

### 2.6 Visibilidade e Permissões

| Role | Visualiza | Edita | Deleta |
|------|-----------|-------|--------|
| Owner | Todos os projetos da org | Sim | Sim (draft) |
| Admin | Todos os projetos da org | Sim | Sim (draft) |
| Manager | Projetos onde é responsável | Se responsável | Não |
| Analyst | Leitura | Não | Não |

---

## 3. INICIATIVAS

### 3.1 Regras de Criação

- **Projeto**: obrigatório, projeto deve estar em status ativo
- **Nome**: obrigatório, único por projeto, máx 255 caracteres
- **Meta**: obrigatório, número >= 0 (ex: 10000 para 10k conversões)
- **Meta mínima**: opcional, padrão = 80% da meta principal
- **Percentual**: calculado automaticamente como (realizado / meta) * 100
- **Prioridade**: obrigatória (alta, média, baixa) - afeta ordem na UI
- **Responsável**: obrigatório, usuário ativo da organização
- **Dependências**: pode depender de 0 ou mais iniciativas do mesmo projeto
- **Data de início**: padrão = data_inicio do projeto
- **Data de fim**: padrão = data_fim do projeto

**Exemplo de Cadastro**:
```json
{
  "projeto_id": "proj-123",
  "nome": "Gerar 10k Downloads",
  "meta": 10000,
  "meta_minima": 8000,
  "prioridade": "alta",
  "responsavel_id": "user-789",
  "dependencias": ["init-456"],
  "data_inicio": "2024-07-15",
  "data_fim": "2024-08-15"
}
```

### 3.2 Status e Situações da Iniciativa

| Status | Significa |
|--------|-----------|
| `draft` | Planejamento em andamento |
| `active` | Em execução |
| `paused` | Pausada temporariamente |
| `completed` | Meta atingida, iniciativa encerrada |
| `cancelled` | Cancelada antes da conclusão |
| `archived` | Histórico (após conclusão/cancelamento) |

**Cálculo de Situação**:
- `on_track`: percentual >= 80% da meta até o momento
- `at_risk`: percentual entre 50-79%
- `off_track`: percentual < 50%
- `blocked`: dependência não foi concluída

### 3.3 Progressão de Iniciativa

```
Criação (draft)
    ↓
Ativação (active)
    ↓
Meta atingida (completed)
    ↓
Arquivo (archived)
```

- Transição para `completed` é automática quando meta é atingida
- Pode ser revertida manualmente para `active` se necessário
- Uma vez `archived`, é apenas leitura

### 3.4 Dependências entre Iniciativas

- Uma iniciativa pode ser bloqueada por outra
- Iniciativa A bloqueada por B: só sai do bloqueio após B ser `completed`
- Dependências cíclicas são impedidas (validação ao criar/editar)
- Status `blocked` aparece na situação se alguma dependência não foi concluída

**Exemplo**:
```json
{
  "id": "init-456",
  "nome": "Criar Conteúdo",
  "dependencias": []  // Esta é a primeira
},
{
  "id": "init-789",
  "nome": "Publicar Posts",
  "dependencias": ["init-456"]  // Depende da primeira
}
```

### 3.5 Edição de Iniciativa

- **draft**: todos os campos editáveis
- **active**: apenas `nome`, `meta` (se não passou do valor anterior), `prioridade`, `responsavel`
- **completed/cancelled/archived**: somente leitura
- Edições geram eventos na Timeline

### 3.6 Exclusão

- Apenas iniciativas `draft` podem ser deletadas
- Usar Soft Delete (campo `deletedAt`)
- Se uma iniciativa `active` é deletada, seu histórico é preservado

---

## 4. TIMELINE (Feed de Atividades)

### 4.1 Regras de Publicação

- **Tipos de conteúdo**:
  - Texto (com ou sem mídia)
  - Fotos (até 10 por post)
  - Vídeos (até 3 minutos, máx 500MB)
  - PDF (máx 10MB)
  - Links (com preview)

- **Quem pode publicar**: usuários com role >= Manager
- **Conteúdo mínimo**: obrigatório ter texto ou mídia
- **Tamanho máximo**: 50MB total por post
- **Formatos aceitos**:
  - Imagem: JPG, PNG, WebP (máx 10MB cada)
  - Vídeo: MP4, WebM (máx 500MB total)
  - PDF: PDF only (máx 10MB)

### 4.2 Ciclo de Vida da Publicação

| Status | Descrição |
|--------|-----------|
| `draft` | Rascunho, não visível |
| `scheduled` | Agendada para publicação futura |
| `published` | Publicada, visível |
| `edited` | Publicada mas já sofreu edição |
| `deleted` | Soft delete, oculta |
| `archived` | Histórico após 90 dias |

### 4.3 Quem Edita

- **Autor do post**: pode editar até 5 minutos após publicação
- **Admin/Owner**: pode editar a qualquer momento
- **Outros usuários**: não podem editar
- Edições aparecem com indicativo "[editado]" e timestamp

### 4.4 Quem Remove

- **Autor do post**: pode remover até 24h após publicação
- **Admin/Owner**: pode remover a qualquer momento
- Remoção usa Soft Delete (campo `deletedAt`)
- Historicamente preservado por 90 dias, depois hard-delete automático

### 4.5 Ordem Cronológica

- Timeline ordena por `publishedAt` DESC (mais recente no topo)
- Sticky posts (fixados) aparecem sempre no topo
- Agendados mostram como "próximas publicações"
- Filtros por data, autor, tipo de conteúdo, iniciativa

### 4.6 Associação com Iniciativas

- Cada post pode ser associado a 0 ou mais iniciativas
- Contar post como progresso: contabilizar para meta da iniciativa
- Relacionamento: post → iniciativa (many-to-many)

**Exemplo**:
```json
{
  "id": "post-123",
  "conteudo": "Novo video sobre...",
  "tipo": "video",
  "iniciativos": ["init-456", "init-789"],
  "publishedAt": "2024-07-20T10:00:00Z",
  "status": "published"
}
```

### 4.7 Validações de Timeline

- Conteúdo não pode estar vazio (pelo menos 1 caractere ou 1 arquivo)
- URLs devem ser válidas e acessíveis
- Hashtags máximo 30 por post
- Menciones devem ser de usuários válidos da organização

---

## 5. PRESTAÇÃO DE CONTAS (Financeiro)

### 5.1 Estrutura de Movimentações

**Tipos de Movimentação**:
- `entrada`: dinheiro que entra (investimento aprovado, resgate)
- `saida`: dinheiro que sai (gasto com campanha, reembolso)
- `ajuste`: correção de erro anterior

**Categorias de Gasto**:
- Publicidade (Facebook, Instagram, Google, etc)
- Criação de Conteúdo (designer, copywriter, fotógrafo)
- Ferramentas e Softwares
- Influenciadores e Parcerias
- Outras

### 5.2 Registro de Movimentação

**Campos obrigatórios**:
- `tipo`: entrada / saida / ajuste
- `categoria`: conforme acima
- `valor`: número > 0, até 2 casas decimais
- `descricao`: máx 500 caracteres
- `data_movimentacao`: quando o dinheiro moveu
- `usuario_responsavel`: quem registrou

**Campos opcionais**:
- `comprovante`: URL ou referência do comprovante
- `anexo`: arquivo até 10MB (PDF, imagem)
- `iniciativa_id`: qual iniciativa gerou esse gasto

**Exemplo**:
```json
{
  "tipo": "saida",
  "categoria": "Publicidade",
  "valor": 250.50,
  "descricao": "Investimento em anúncio Facebook - Campanha Verão",
  "data_movimentacao": "2024-07-20",
  "usuario_responsavel": "user-123",
  "iniciativa_id": "init-456",
  "anexo": "https://...comprovante.pdf"
}
```

### 5.3 Saldo

- **Saldo = Entradas - Saídas**
- Calculado em tempo real
- Histórico de saldos por data
- Alertas quando saldo fica negativo

### 5.4 Rastreabilidade Financeira

- Toda movimentação registra: `usuário`, `timestamp`, `IP`
- Não é permitido editar movimentações (apenas cancelar)
- Cancelar: marca como `cancelledAt` e `cancelledBy`
- Histórico completo preservado por 5 anos (lei)

### 5.5 Publicação de Contas

- Relatório financeiro pode ser publicado no Portal Público
- Mostra: entradas, saídas, saldo por período
- Dados sensíveis (usuários, descrição detalhada) não são expostos

---

## 6. PORTAL PÚBLICO

### 6.1 Informações Públicas vs Privadas

**Públicas** (visíveis sem login):
- Nome e descrição do projeto
- Meta e progresso (percentual apenas)
- Timeline de posts públicos
- Logomarca e identidade visual
- Relatório financeiro resumido (opcional)

**Privadas** (apenas usuários logados):
- Nomes dos responsáveis
- Detalhes de despesas
- Contatos e dados pessoais
- Métricas internas

### 6.2 Privacidade LGPD

- Nunca expor: emails de usuários, telefones, endereços completos
- Consentimento deve ser obtido para qualquer contato via Portal
- Direito ao esquecimento: deletar conta remove todos os dados LGPD

### 6.3 URL Pública

- Formato: `gestaocompanha.com/org/{org_slug}/{project_slug}`
- Slug: gerado automaticamente, editável
- Exemplo: `gestaocompanha.com/org/prefeitura-sp/campanha-saude`

### 6.4 Compartilhamento

- Gerar link compartilhável único por projeto
- Link pode expiar após X dias (configurável)
- Tracking de acessos ao link (quem clicou, quando)

### 6.5 QR Code

- QR code gerado automaticamente para URL pública
- Tamanho: SVG + PNG
- Pode ser baixado e impresso

**Exemplo**:
```
https://gestaocompanha.com/org/prefeitura-sp/campanha-saude
↓
QR Code → código visual
```

### 6.6 Métricas Públicas

- Mostrar: progresso em %, data inicio/fim
- Não mostrar: números absolutos (segurança)
- Atualizar a cada 30 minutos

---

## 7. DASHBOARD

### 7.1 Indicadores Principais

**Por Projeto**:
- Progresso geral (% de iniciativas em on_track)
- Saldo atual (entrada - saída)
- Número de posts publicados
- Data de término

**Por Iniciativa**:
- Percentual da meta (realizado / meta)
- Situação (on_track / at_risk / off_track / blocked)
- Responsável
- Datas de início e fim

**Agregado (Organização)**:
- Total investido (soma saídas)
- Total de projetos ativos
- Número de usuários
- Posts publicados este mês

### 7.2 Cálculos

```
Progresso Projeto = (iniciativas completed / iniciativas total) * 100

Situação Iniciativa = 
  - blocked: se dependência ativa não concluída
  - on_track: se % >= 80% até hoje
  - at_risk: se % >= 50% e < 80%
  - off_track: se % < 50%
  - completed: se % >= 100%

Saldo Financeiro = SUM(entradas) - SUM(saidas)
```

### 7.3 Filtros

- Por status do projeto
- Por responsável
- Por período (data inicio / fim)
- Por prioridade (iniciativa)
- Por categoria de gasto (financeiro)

### 7.4 Ordenações

- Padrão: por data criação DESC
- Por progresso (ASC/DESC)
- Por situação (blocked → off_track → at_risk → on_track → completed)
- Por data fim (próximos vencimentos primeiro)
- Por responsável (A-Z)

---

## 8. AUDITORIA

### 8.1 Eventos Registrados

**Projeto**:
- Criação
- Mudança de status
- Edição de campos
- Exclusão (soft delete)

**Iniciativa**:
- Criação
- Mudança de meta
- Mudança de responsável
- Mudança de status
- Alteração de progresso

**Timeline**:
- Criação de post
- Edição de post
- Publicação
- Exclusão (soft delete)

**Financeiro**:
- Criação de movimentação
- Cancelamento de movimentação
- Alteração de categoria

### 8.2 Informações por Evento

Cada evento registra:
- `evento_tipo`: o que aconteceu (criação, edição, etc)
- `usuario_id`: quem fez
- `timestamp`: quando (YYYY-MM-DD HH:mm:ss UTC)
- `antes`: estado anterior (JSON)
- `depois`: estado novo (JSON)
- `ip_address`: de onde foi feito
- `entidade_tipo`: Projeto / Iniciativa / Post / etc
- `entidade_id`: ID do objeto afetado

**Exemplo de Evento**:
```json
{
  "evento_tipo": "campo_editado",
  "entidade_tipo": "iniciativa",
  "entidade_id": "init-456",
  "usuario_id": "user-123",
  "timestamp": "2024-07-20T14:30:00Z",
  "antes": {
    "meta": 10000,
    "prioridade": "media"
  },
  "depois": {
    "meta": 15000,
    "prioridade": "alta"
  },
  "ip_address": "192.168.1.1"
}
```

### 8.3 Retenção de Auditoria

- Mínimo 12 meses de logs
- Padrão: 24 meses
- Compliance: 5 anos para dados financeiros
- Hard delete automático após período

---

## 9. MULTI-TENANCY

### 9.1 Isolamento entre Organizações

- Cada organização tem seu próprio espaço
- Dados de ORG A nunca são visíveis para ORG B
- Mesmo admin de ORG A não acessa dados de ORG B

**Implementação**:
- Filtro automático: `WHERE organizacao_id = :org_id` em toda query
- Usuário pertence a 1 ou mais organizações
- Token JWT inclui `organizacao_id_atual`
- Mudança de org requer re-autenticação

### 9.2 Usuários Multi-Org

- Usuário pode ser membro de múltiplas organizações
- Role pode variar por organização (admin em A, analyst em B)
- Switch de organização é transparente na UI
- Dashboard mostra dados apenas da org atual

**Exemplo**:
```json
{
  "usuario_id": "user-123",
  "nome": "João Silva",
  "organizacoes": [
    {
      "org_id": "org-456",
      "nome": "Prefeitura SP",
      "role": "admin"
    },
    {
      "org_id": "org-789",
      "nome": "Empresa XYZ",
      "role": "manager"
    }
  ]
}
```

### 9.3 Dados Compartilhados vs Isolados

**Isolados por organização**:
- Projetos
- Iniciativas
- Timeline (posts)
- Prestação de contas
- Usuários da org

**Compartilhados globalmente**:
- Tipos de conteúdo (template)
- Configurações de sistema
- Versão do software

---

## 10. REGRAS DE PROCESSAMENTO AUTOMÁTICO

### 10.1 Transições Automáticas

- **Status de Iniciativa**: quando `realizado >= meta`, automáticamente → `completed`
- **Status de Projeto**: quando TODAS as iniciativas estão `completed` → sugerir → `completed`
- **Arquivo automático**: soft-deleted após 90 dias → hard-delete automático

### 10.2 Cálculos Automáticos

- **Percentual**: (realizado / meta) * 100, atualiza em tempo real
- **Saldo**: SUM(entradas) - SUM(saidas), recalcula a cada movimentação
- **Situação**: reavalia a cada mudança de dados

### 10.3 Notificações Automáticas

- Meta atingida: notificar responsável
- Situação muda para off_track: notificar gerente
- Data fim projeto está próxima (< 7 dias): notificar responsável

---

## 11. VALIDAÇÕES CRÍTICAS

### 11.1 Integridade de Dados

- Projeto não pode estar sem organização
- Iniciativa não pode estar sem projeto
- Post não pode estar vazio
- Responsável deve estar ativo

### 11.2 Constraints de Banco

```sql
ALTER TABLE projetos 
  ADD CONSTRAINT fk_proj_org FOREIGN KEY (organizacao_id) 
  REFERENCES organizacoes(id);

ALTER TABLE iniciativas 
  ADD CONSTRAINT fk_init_proj FOREIGN KEY (projeto_id) 
  REFERENCES projetos(id);

ALTER TABLE iniciativas 
  ADD CONSTRAINT check_meta CHECK (meta > 0);

ALTER TABLE timeline 
  ADD CONSTRAINT check_conteudo 
  CHECK (conteudo != '' OR media_count > 0);
```

---

## 12. Exemplos Práticos

### 12.1 Fluxo Completo: Criação de Projeto

```
1. Admin cria projeto "Campanha Verão 2024"
   Status: draft
   
2. Define 3 iniciativas:
   - Gerar 10k downloads (prioridade: alta)
   - Aumentar seguidores em 5k (prioridade: média)
   - Atingir 50k impressões (prioridade: média)
   
3. Investe R$ 5.000 em publicidade
   Movimentação: tipo=saida, categoria=Publicidade, valor=5000
   
4. Projeto vai para status: scheduled
   
5. Data inicio chega, status automático: active
   
6. Posts começam a ser publicados, progresso aumenta
   
7. Primeira iniciativa atinge meta (10k downloads)
   Status automático: completed
   
8. Depois de 30 dias, todas as iniciativas concluídas
   Projeto marcado como completed
   
9. Pode ir para archived para histórico
```

### 12.2 Fluxo de Auditoria

```
20/07 14:30 - Usuario admin-123 criou projeto "Campanha Verão"
20/07 15:45 - Usuario manager-456 editou meta da iniciativa 789 (10000 → 15000)
20/07 16:00 - Usuario manager-456 publicou post sobre atividade
20/07 16:30 - Sistema automático moveu iniciativa para "on_track"
20/07 17:00 - Usuario admin-123 deletou post (soft delete, pode ser recuperado)
```

### 12.3 Fluxo de Deslindamento Financeiro

```
Projeto "Campanha Verão" - Período Jul-Ago 2024

ENTRADAS:
- 15/07 - Orçamento aprovado: R$ 10.000,00
  Total Entradas: R$ 10.000,00

SAÍDAS:
- 16/07 - Anúncio Facebook: R$ 2.500,00 (Publicidade)
- 18/07 - Pagamento Designer: R$ 1.500,00 (Conteúdo)
- 20/07 - Anúncio Instagram: R$ 1.200,00 (Publicidade)
  Total Saídas: R$ 5.200,00

SALDO: R$ 4.800,00 (48% do orçamento consumido)

Relatório: Dentro do orçamento, no caminho certo
```

---

## 13. Documentação Oficial

Este documento representa as **Regras de Negócio Oficiais** do sistema de Gestão de Campanha.

**Status**: Versão 1.0 - Aprovado  
**Data**: 14 de Julho de 2024  
**Próxima Revisão**: 14 de Outubro de 2024  
**Responsável**: Arquitetura de Software