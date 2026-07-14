# ROADMAP.md — Versão 1.0

Plano de evolução do produto "Gestão de Projetos Financiados por Comunidades" dividido em versões e sprints.

---

## Foundation (Sprints 0-1)

**Duração**: 4 semanas | **Objetivo**: Estabelecer base técnica e segurança

### Funcionalidades Principais

- Infraestrutura completa (monorepo, banco, cache, storage)
- Autenticação e autorização (JWT, RBAC)
- Organização e gerenciamento de usuários
- Scaffolding de componentes UI

### Tarefas Incluídas

```
INF-001, INF-002, INF-003, INF-004, INF-005, INF-006, INF-007
AUTH-001, AUTH-002, AUTH-003, AUTH-004, AUTH-005, AUTH-006
ORG-001, ORG-002, ORG-003
TEST-001
```

### Story Points

**Total**: ~76 pontos | **Sprints**: 2 × 38 pontos

### Critérios de Aceite

- [ ] Infraestrutura rodando localmente (Docker Compose)
- [ ] Login funcionando end-to-end
- [ ] RBAC testado com múltiplos roles
- [ ] Organização e usuários CRUD completos
- [ ] Testes unitários básicos passando
- [ ] CI/CD pipeline configurado

### Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Configuração de banco de dados complexa | Média | Alto | Usar template Prisma pronto |
| Atrasos em setup Docker | Baixa | Médio | Documentação passo-a-passo |
| Problemas com RBAC | Média | Alto | Prototipagem rápida da autenticação |

### Dependências

- Nenhuma dependência externa crítica

---

## V1.0 — MVP (Sprints 2-6)

**Duração**: 10 semanas | **Objetivo**: Produto funcionando end-to-end, pronto para beta

### Funcionalidades Principais

- Gestão completa de projetos (CRUD, estados, filtros)
- Iniciativas com cálculo automático de progresso
- Timeline com posts (texto, foto)
- Prestação de contas (receitas, despesas, comprovantes)
- Dashboard com KPIs
- Portal público com página por projeto
- Serviço de uploads

### Tarefas Incluídas

```
PROJ-001, PROJ-002, PROJ-003, PROJ-004
INIT-001, INIT-002, INIT-004
TML-001, TML-002, TML-005
FIN-001, FIN-002, FIN-003, FIN-004, FIN-005
DASH-001, DASH-002
PUB-001, PUB-002, PUB-003
UPL-001, UPL-002, UPL-003
TEST-003, TEST-004
ORG-004
```

### Story Points

**Total**: ~142 pontos | **Sprints**: 5 × 28 pontos

### Objetivos Técnicos

1. Sistema de upload robusto (validação, segurança)
2. Cálculo de progresso eficiente (sem queries N+1)
3. Portal público otimizado (SSR/Static)
4. Dashboard em tempo real (Redis cache)

### Critérios de Aceite

- [ ] Usuário pode criar projeto completo (dados básicos, capa, datas)
- [ ] Projeto tem múltiplas iniciativas com progresso visível
- [ ] Timeline funciona: posts com texto e foto
- [ ] Financeiro: registrar entradas/saídas com comprovantes
- [ ] Dashboard exibe KPIs corretos
- [ ] Portal público é acessível sem login
- [ ] Uploads validados (tipo, tamanho)
- [ ] 80% cobertura de testes em serviços críticos
- [ ] Performance: página pública carrega < 2s (CLS < 0.1)

### Benefícios

- Organizações conseguem gerenciar projetos completos
- Comunidades veem progresso e financeiro transparente
- Interface intuitiva e responsiva

### Impacto

- Entrada no mercado com MVP sólido
- Base de usuários Beta (5-10 organizações)
- Feedback para V1.1

### Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Cálculo de progresso não escala | Média | Alto | Design com índices de BD, cache Redis |
| Portal público indexação fraca | Média | Médio | SEO structure antes de launch |
| Upload de arquivo quebra em produção | Baixa | Alto | Testes E2E de upload, retry logic |

### Dependências

- Foundation deve estar 100% concluída
- PostgreSQL, Redis, R2/MinIO em produção

---

## V1.1 — Estabilização (Sprints 7-8)

**Duração**: 4 semanas | **Objetivo**: Robustez, performance, confiabilidade

### Funcionalidades Principais

- Testes E2E completos (Playwright)
- SEO e meta tags dinâmicas
- Otimização de performance
- Bug fixes críticos
- Monitoring e alertas

### Tarefas Incluídas

```
TEST-002, TEST-005
PUB-004
DEP-003, DEP-004
INF-006 (melhorias)
PROJ-005 (melhorias de imagem)
```

### Story Points

**Total**: ~32 pontos | **Sprints**: 2 × 16 pontos

### Critérios de Aceite

- [ ] Testes E2E cobrindo fluxos críticos (criar projeto → publicar → transação)
- [ ] Todas as páginas com Open Graph e schema.org
- [ ] Core Web Vitals: LCP < 2.5s, FID < 100ms, CLS < 0.1
- [ ] 99.5% uptime em staging
- [ ] Logs centralizados e alertas configurados
- [ ] Zero erros 5xx em produção por 7 dias

### Mitigações

- Staging idêntico à produção
- Backup automático testado mensalmente
- Rollback automático em falhas críticas

---

## V1.2 — Refinamento (Sprints 9-10)

**Duração**: 4 semanas | **Objetivo**: UX polish, acessibilidade, features menores

### Funcionalidades Principais

- Dark mode
- Acessibilidade WCAG 2.1 AA
- QR code do projeto
- Melhorias de UX (onboarding, tooltips)
- Suporte mobile aprimorado

### Tarefas Incluídas

```
PUB-005
Acessibilidade em todos os componentes
Dark mode toggle
Mobile responsiveness audit
```

### Story Points

**Total**: ~24 pontos | **Sprints**: 2 × 12 pontos

### Critérios de Aceite

- [ ] WCAG 2.1 AA compliance
- [ ] Dark mode implementado e funcionando
- [ ] QR code gerável para cada projeto
- [ ] Mobile: sem horizontal scroll, 320px+
- [ ] Lighthouse: 90+ em Performance, Accessibility, Best Practices

---

## V2.0 — Expansão (Futuro)

**Duração**: ~12 semanas | **Objetivo**: Novos fluxos de monetização e doação

### Funcionalidades Principais

1. **PIX Integration**
   - QR code dinâmico para doações imediatas
   - Webhook para pagamentos
   - Saldo em tempo real

2. **Área do Doador**
   - Login doador (sem org necessária)
   - Dashboard de doações (histórico, recibos)
   - Campanhas seguidas
   - Notificações de atualizações

3. **Compromissos (Pledges)**
   - Doador promete valor mensal
   - Automação de cobranças recorrentes
   - Status de compromisso (ativo, pausado, cancelado)

4. **Comentários**
   - Discussão em posts da timeline
   - Moderação
   - Notificações

5. **Uploads Avançados**
   - Vídeos (transcode automático)
   - Galeria com paginação
   - Compressão inteligente

### Tarefas Estimadas

```
~80-100 pontos totais
PIX Integration: 13 pontos
Doador CMS: 21 pontos
Compromissos: 13 pontos
Comentários: 8 pontos
Uploads Avançados: 21 pontos
Testes + Deploy: 16 pontos
```

### Critérios de Aceite

- [ ] PIX integrado e funcionando com webhook
- [ ] Doador vê histórico completo de doações
- [ ] Compromissos recorrentes configuráveis
- [ ] Comentários moderados por admin
- [ ] Vídeos fazem transcode automaticamente

### Riscos

- Integração PIX (verificar documentação Banco Central)
- Escalabilidade com mais doadores
- LGPD compliance para dados doadores

---

## V3.0 — Plataforma (Futuro Distante)

**Duração**: ~16 semanas | **Objetivo**: Transformar em plataforma integrada

### Funcionalidades Principais

1. **Integrações**
   - Slack notifications
   - Google Drive para documentos
   - Zapier/Make automation

2. **IA**
   - Geração automática de resumos de projeto
   - Recomendações de similares
   - Chat support básico

3. **Workflow e Automações**
   - Builder visual de workflows
   - Triggers (novo post, transação acima de X)
   - Actions (notificar, arquivar, criar tarefa)

4. **API Pública**
   - REST API com documentação
   - GraphQL opcional
   - Webhooks customizáveis

5. **Aplicativo Mobile**
   - React Native / Flutter
   - Funcionalidades principais do web
   - Push notifications

### Tarefas Estimadas

```
~130-150 pontos totais
Integrações: 21 pontos
IA Module: 34 pontos
Workflow Engine: 34 pontos
API Pública: 34 pontos
Mobile App: 55 pontos
```

### Critérios de Aceite

- [ ] API documentada com OpenAPI/Swagger
- [ ] 5+ integrações disponíveis
- [ ] Workflow builder não precisa código
- [ ] App mobile: 80%+ feature parity com web
- [ ] IA resume projetos em < 10s

---

## Timeline Visual

```
Week  1-2    |  Foundation
Week  3-4    |  Foundation (cont.)
Week  5-12   |  V1.0 MVP
Week 13-14   |  V1.1 Estabilização
Week 15-16   |  V1.2 Refinamento
Week 17-28   |  V2.0 Expansão
Week 29-44   |  V3.0 Plataforma (depende sucesso V2)
```

---

## Métricas de Sucesso

### V1.0 (MVP)

- 10+ organizações usando
- 50+ projetos criados
- Taxa de retenção 7 dias > 70%
- NPS > 40

### V1.1

- 99.5% uptime
- Core Web Vitals verdes
- Sem erros 5xx

### V1.2

- WCAG AA compliance
- 95+ Lighthouse score
- Mobile traffic > 40%

### V2.0

- Doações recorrentes > 20% do volume
- 500+ doadores registrados
- Engagement em comentários > 30%

### V3.0

- API com 1000+ calls/mês
- 2+ integrações com > 100 usuários
- App mobile com 5000+ instalações

---

## Decisões de Produto

1. **Público primeiro, privado depois**: MVP focus em transparência pública
2. **Pagamentos simples**: PIX antes de cartão de crédito
3. **Sem taxa na V1**: Monetização via premium features em V2
4. **Open por design**: API pública desde V3
5. **Mobile-first UI**: Responsivo desde V1

---

## Próximas Etapas

1. Kickoff Foundation (semana 1)
2. Daily standups 30min, retrospectivas 1h2s
3. Validação com 2-3 orgs piloto ao final V1.0
4. Revisão de roadmap pós V1.1 (feedback real)
5. Decision point V2 vs V3 baseado em traction
