# Painel de Decisão — Design Spec
**Data:** 2026-07-26

## Contexto

O AlertsPanel do dashboard já lista iniciativas com prazo vencendo em 30 dias. Falta a camada de decisão: o usuário precisa poder agir sobre essas iniciativas sem navegar para outra tela.

## Objetivo

Permitir que ADMIN e MANAGER tomem decisões rápidas sobre iniciativas críticas (próximas do prazo ou vencidas) diretamente do dashboard e em uma página dedicada.

## Escopo

### Fora do escopo
- Notificações por e-mail ou push
- Histórico de decisões por iniciativa
- Filtros avançados na página `/decisoes`

---

## Arquitetura

### APIs — nenhuma nova

| Endpoint | Uso |
|---|---|
| `GET /api/v1/dashboard/alerts` | Leitura para AlertsPanel e `/decisoes` |
| `PUT /api/v1/projects/[id]/initiatives/[initId]` | Escrita das 3 ações |

### Componentes novos

**`DecisaoDialog`** (`src/components/shared/decisao-dialog.tsx`)
- Props: `initiative: Alert`, `open: boolean`, `onOpenChange`, `onSuccess()`
- Usa `Dialog` do base-ui (padrão do projeto)
- Exibe: nome, projeto, dias restantes / vencida há X dias
- 3 ações:
  - **Concluir** → `PUT { status: "COMPLETED" }` → fecha dialog → `onSuccess()`
  - **Prorrogar** → expande `<input type="date">` inline abaixo do botão; data mínima = amanhã; confirma com `PUT { endDate }` → fecha → `onSuccess()`
  - **Cancelar** → `PUT { status: "CANCELLED" }` → fecha → `onSuccess()`
- Loading: botão ativo exibe `Spinner`, demais desabilitados
- Erro: mensagem inline abaixo dos botões

**`/decisoes`** (`src/app/(app)/decisoes/page.tsx`)
- Busca `/api/v1/dashboard/alerts`
- Tabela: nome · projeto · prazo · urgência (badge) · botão "Decidir"
- Skeleton durante carregamento
- Estado vazio: "Nenhuma iniciativa crítica no momento"
- Cada "Decidir" abre `DecisaoDialog`

### Componentes modificados

**`AlertsPanel`**
- Header: adiciona link "Ver todas →" → `/decisoes`
- Cada linha: adiciona botão "Decidir" (visível apenas para `can(role, "initiative:write")`)
- `onSuccess`: chama `load()` para rebuscar alertas

**`Sidebar`**
- Adiciona `{ href: "/decisoes", label: "Decisões", Icon: Scale }` na seção Principal
- Visível apenas para `can(role, "initiative:write")`

---

## Permissões

| Elemento | Condição |
|---|---|
| Botão "Decidir" no AlertsPanel | `can(role, "initiative:write")` |
| Página `/decisoes` | `can(role, "initiative:write")` |
| Link "Decisões" na sidebar | `can(role, "initiative:write")` |

A API já valida `initiative:write` no PUT — nenhuma mudança necessária no backend.

---

## Fluxo completo

```
Usuário vê AlertsPanel → clica "Decidir"
  → DecisaoDialog abre
  → escolhe Concluir / Prorrogar / Cancelar
    → Prorrogar: expande input date inline, usuário escolhe data → Confirmar
  → PUT na API
  → sucesso: dialog fecha, AlertsPanel rebusca
  → erro: mensagem inline no dialog
```

---

## Decisões de design

- `DecisaoDialog` é compartilhado entre AlertsPanel e `/decisoes` — zero duplicação
- Tipo `Alert` exportado de `alerts-panel.tsx` para ser reutilizado em `DecisaoDialog` e `/decisoes`
- Nenhuma nova API — endpoint de alertas e PUT de iniciativa já cobrem tudo
- `<input type="date">` nativo — sem lib de datepicker
- Sidebar só mostra "Decisões" para quem pode agir — VIEWER e AUDITOR nunca veem
