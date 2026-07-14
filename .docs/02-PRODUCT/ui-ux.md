# UI-UX.md — Versão 1.0

Documentação de interface e experiência do usuário para a plataforma **Gestão de Projetos Financiados por Comunidades**.

---

## 1. Visão Geral

A plataforma é um SaaS de transparência e gestão voltado para projetos comunitários (Igrejas, ONGs, Associações). O design prioriza clareza, acessibilidade e confiança através de uma interface intuitiva e moderna.

**Stack de UI:**
- Next.js (framework)
- TailwindCSS (estilo)
- shadcn/ui (componentes base)
- Lucide Icons (ícones)

**Referências inspiradoras:**
- Stripe (dashboard limpo e profissional)
- Linear (navegação lateral intuitiva)
- Vercel (tipografia clara e hierarquizada)
- Notion (organização flexível)

**Princípios:**
- Mobile First
- WCAG AA (acessibilidade)
- Dark Mode suportado
- Performance antes de efeito visual

---

## 2. Layout Global

### 2.1 Desktop

**Estrutura:**
```
┌─────────────────────────────────────────────────────┐
│ Header (breadcrumb, search, notificações, avatar)   │
├─────────────┬───────────────────────────────────────┤
│             │                                       │
│  Sidebar    │        Content Area                   │
│  Fixa       │        (max-w, padding)               │
│  Esquerda   │                                       │
│             │                                       │
└─────────────┴───────────────────────────────────────┘
```

**Sidebar (fixa à esquerda):**
- Logo e nome da organização no topo
- Navegação por módulo (Dashboard, Projetos, Configurações)
- User menu no rodapé (perfil, sair)
- Largura: ~280px
- Fundo: cor de fundo secundária (tema claro/escuro)
- Ícones + texto na navegação

**Header:**
- Breadcrumb navegável
- Search global com Command (Cmd+K / Ctrl+K)
- Notificações (bell icon com badge)
- Avatar do usuário com menu (dropdown)
- Height: ~64px
- Sticky (fica no topo ao scroll)

**Content Area:**
- max-w-7xl (1280px)
- Padding horizontal: 32px (desktop), 16px (tablet)
- Padding vertical: 24px
- Fundo consistente

### 2.2 Mobile

**Transformações:**
- Sidebar vira Sheet (drawer) deslizante da esquerda
- Hamburguer (Menu icon) no header para abrir/fechar drawer
- Header mantém breadcrumb simplificado + search + avatar
- Drawer com navegação completa
- Toda a navegação em touch-friendly (altura mínima 44px)

**Header Mobile:**
- Height: ~56px
- Hamburguer à esquerda
- Logo/título no centro
- Avatar à direita

---

## 3. Telas Principais

### 3.1 Dashboard

**Propósito:** Visão consolidada de todos os projetos e atividades.

**Layout:**

1. **Seção de KPIs (4 cards em grid)**
   - Componentes: Card do shadcn/ui
   - Grid: 4 colunas (desktop), 2 colunas (tablet), 1 coluna (mobile)
   - Cards mostram:
     - Total de Projetos (número grande + ícone)
     - Total Arrecadado (valor em BRL)
     - % da Meta Geral (percentual + barra)
     - Projetos Ativos (contador)
   - Spacing: 16px entre cards
   - Hover: scale(1.01) + sombra aumentada

2. **Gráfico de Progresso por Projeto**
   - Chart library (Recharts ou Nivo)
   - Tipo: barra horizontal ou radar
   - Mostra top 5 projetos com % atingido da meta
   - Altura: 300px (desktop)
   - Legenda abaixo ou lateral

3. **Tabela de Projetos Recentes**
   - Componentes: Table do shadcn/ui
   - Colunas: Projeto | Status | % Meta | Última Atualização
   - Linhas: máx 5 (com link "Ver Todos")
   - Status: badges com cores (Ativo, Pausado, Concluído, Arquivado)
   - Hover em linha: bg-muted

4. **Feed de Atividades Recentes**
   - Timeline vertical resumida
   - Itens: "Nome da Organização atualizou iniciativa XYZ" + timestamp relativo
   - Ícones de tipo (câmera, documento, link)
   - Máx 8 itens com scroll interno
   - Componente customizado baseado em componentes shadcn/ui

**Empty State:**
- Se não há projetos: ilustração + "Nenhum projeto criado" + botão "Criar Projeto"

---

### 3.2 Lista de Projetos

**Propósito:** Visualizar todos os projetos da organização com filtros.

**Layout:**

1. **Header**
   - Título "Projetos"
   - Botão "Novo Projeto" (Button primário, tamanho lg)
   - Alignment: space-between

2. **Toolbar de Filtros**
   - Search input (placeholder: "Buscar projetos...")
   - Dropdown Status (Todos, Ativo, Pausado, Concluído, Arquivado)
   - Componentes: Input + Select do shadcn/ui
   - Sticky abaixo do header

3. **Grid de Cards**
   - Layout: 3 colunas (desktop), 2 (tablet), 1 (mobile)
   - Card com:
     - Imagem de cover (aspect-ratio 16:9, lazy-loaded)
     - Nome do projeto (h3, font-semibold)
     - Descrição truncada (2 linhas, text-sm, text-muted-foreground)
     - Status badge (Ativo/Pausado/etc)
     - Valor arrecadado / Meta
     - Progress bar (shadcn/ui Progress)
     - Hover: scale(1.01) + shadow
   - Spacing: 20px entre cards

4. **Empty State**
   - Ilustração
   - Título: "Nenhum projeto encontrado"
   - Subtítulo: "Crie seu primeiro projeto para começar"
   - CTA: "Novo Projeto"

---

### 3.3 Detalhe do Projeto

**Propósito:** Gerenciar um projeto específico com visão completa de iniciativas, timeline e prestação de contas.

**Layout:**

1. **Header do Projeto**
   - Imagem de cover (full-width, height: 300px, background-size: cover)
   - Overlay com gradient (bottom)
   - Sobre a imagem:
     - Nome do projeto (h1, text-white, font-bold)
     - Status badge (posicionado absolute, top-right)
     - Descrição breve (text-white/muted)
   - Ações (editar, arquivar): botões à direita, semi-transparentes

2. **Navegação (Tabs)**
   - Tabs do shadcn/ui abaixo do header
   - Abas: Resumo | Iniciativas | Timeline | Prestação de Contas
   - Scroll horizontal em mobile

3. **Tab: Resumo**
   - KPIs do projeto (3-4 cards):
     - Total Arrecadado
     - Meta do Projeto
     - Percentual Atingido
     - Dias Restantes (se aplicável)
   - Mapa de Iniciativas (grid 2-3 colunas):
     - Cada card exibe nome, % atingido, status
     - Clicável para detalhe da iniciativa
   - Estatísticas (tabela):
     - Histórico de doações/entrada por período

4. **Tab: Iniciativas**
   - Toolbar: Botão "Adicionar Iniciativa"
   - Lista/Grid de iniciativas:
     - Nome | Meta | Arrecadado | % | Status | Ações
   - Componentes: Table ou Cards dependendo de UX
   - Status badge em cada linha
   - Progress bar visual
   - Hover: ações aparecem (editar, deletar)

5. **Tab: Timeline**
   - Feed cronológico vertical
   - Itens: foto, vídeo, PDF, link, texto
   - Cada item mostra:
     - Data/hora
     - Tipo (com ícone)
     - Título/descrição
     - Preview de mídia (imagem thumbnail)
     - Informações de quem postou
   - Ordenado por data (mais recente primeiro)
   - Scroll infinito ou paginação

6. **Tab: Prestação de Contas**
   - Tabela com entradas/saídas
   - Colunas: Data | Descrição | Tipo | Valor | Saldo
   - Tipo: cores diferentes (verde entrada, vermelho saída)
   - Total no rodapé (sticky)
   - Filtros: período (data picker range)
   - Botão "Exportar (CSV/PDF)"

**Componentes globais:**
- Alert para avisos importantes (projeto pausado, meta atingida)
- Loading: Skeleton enquanto carrega dados

---

### 3.4 Portal Público (sem login)

**Propósito:** Divulgar o projeto para o público doador, com transparência completa.

**Layout:**

1. **Hero Section**
   - Imagem de fundo (cover, gradient overlay)
   - Logo da organização (topo-esquerdo, pequeno)
   - Nome do projeto (h1, center, text-white, font-bold)
   - Descrição breve (subtitle, center, text-white/muted)
   - Progress bar horizontal:
     - "R$ XXX de R$ YYY arrecadado"
     - Barra preenchida com cor primária
     - Percentual exibido
   - CTA principal: "Contribuir" (botão lg, cor destaque)

2. **Seção Iniciativas**
   - Título: "Nossas Iniciativas"
   - Grid de cards (2-3 colunas):
     - Ícone/imagem
     - Nome da iniciativa
     - % atingido (com cor: verde ≥100%, amarelo 50-99%, vermelho <50%)
     - Botão "Contribuir para esta iniciativa"

3. **Timeline Pública**
   - Seção: "Atualizações"
   - Feed vertical (máx 10 itens visíveis)
   - Cada item:
     - Avatar da organização
     - Nome da organização
     - Data (relativa, ex: "há 2 dias")
     - Conteúdo (texto, imagem, vídeo)
     - Preview de mídia
   - Botão "Carregar mais"

4. **Galeria de Fotos**
   - Grid de imagens (3-4 colunas desktop, 2 mobile)
   - Lightbox ao clicar
   - Lazy-loaded

5. **Prestação de Contas Pública**
   - Tabela resumida (últimas N transações)
   - Columns: Data | Descrição | Valor
   - Tipo cor-codificado
   - Botão "Ver Prestação Completa"

6. **Footer**
   - Logo organização
   - Informações: endereço, telefone, email
   - Links úteis (política privacidade, termos)
   - Redes sociais (links)
   - "© 2024 [Nome Organização]"

**Mobile:**
- Hero: height reduzido (200px)
- Grid cards: 1-2 colunas
- CTA sticky no bottom (botão full-width)

---

## 4. Diretrizes de UX

### 4.1 Loading States

- **Nunca usar spinner global** que bloqueia interface
- Usar Skeleton loading (shimmer):
  - Cards: skeletons do tamanho dos cards
  - Tabelas: skeletons de linhas
  - Gráficos: skeleton de barra
- Componentes da biblioteca shadcn/ui (criar Skeleton se não existir)

### 4.2 Empty States

- Ilustração simples e relacionada (ícone ou graphic)
- Título descritivo (h3, font-semibold)
- Subtítulo explicativo (text-sm, text-muted-foreground)
- CTA principal (link ou botão)
- Exemplo:
  ```
  [Ícone de pasta vazia]
  Nenhum projeto encontrado
  Comece criando seu primeiro projeto para divulgar sua iniciativa.
  [Botão] Criar Projeto
  ```

### 4.3 Error States

- Alert component (vermelho, shadcn/ui Alert)
- Ícone de alerta + mensagem clara
- Descrever o que deu errado (não: "Erro 500", sim: "Não conseguimos carregar os dados. Tente novamente.")
- Botão "Retry" ou "Tentar Novamente"
- Exemplo:
  ```
  ⚠️ Erro ao carregar projetos
  Ocorreu um erro na conexão. Verifique sua internet e tente novamente.
  [Botão] Tentar Novamente  [Botão] Voltar
  ```

### 4.4 Success Messages

- Toast (Sonner library):
  - Posição: bottom-right (inferior direito)
  - Duração: 3 segundos (auto-close)
  - Ícone: checkmark (verde)
  - Mensagem: "Projeto criado com sucesso" (breve, afirmativa)
  - Sem botão de ação (close automático)

### 4.5 Confirmações Destrutivas

- Dialog component (shadcn/ui):
- Sempre exibir antes de deletar/arquivar
- Estrutura:
  ```
  [Dialog Title] Confirmar Ação
  [Dialog Description]
  Tem certeza que deseja arquivar o projeto "Nome"?
  Os dados serão mantidos mas o projeto não aparecerá na lista.
  
  [Cancel] [Arquivar]
  ```
- Botão destrutivo (vermelho) à direita
- Botão cancel à esquerda (cinzento)

### 4.6 Validação de Formulários

- **Inline validation** ao perder foco (onBlur):
  - Campo fica com border vermelho se inválido
  - Mensagem de erro aparece abaixo do input
  - Não esperar submit para validar
- **Submit:**
  - Desabilitar botão se houver erros
  - Mostrar loading state enquanto submete
  - Redirecionar ou mostrar sucesso ao completar

---

## 5. Acessibilidade (WCAG AA)

### 5.1 Contraste

- Texto: mínimo 4.5:1 contra fundo
- Componentes interativos: mínimo 3:1
- Usar ferramentas de teste (WAVE, Lighthouse)
- Dark mode deve respeitar contraste também

### 5.2 Focus Visible

- Todo elemento interativo (button, input, link, card clicável) deve ter:
  - Focus ring visível (outline em torno do elemento)
  - Cor: cor primária ou accent
  - Largura: 2px minimum
  - offset: 2px

### 5.3 ARIA Labels

- Ícones sem texto: `aria-label="Abrir menu"`
- Inputs: `<label htmlFor="id">` ou `aria-label`
- Buttons: texto visible ou `aria-label`
- Abbreviations: `<abbr title="...">` se muito breve
- Images: `alt="descrição"` ou `alt=""` se decorativa

### 5.4 Navegação por Teclado

- Tab order lógico (document flow)
- Enter/Space ativa buttons
- Arrow keys em menus/tabs
- Escape fecha modals/menus
- Nunca desabilitar focus

### 5.5 Screen Reader

- Usar `sr-only` class para conteúdo adicional para screen readers:
  ```html
  <span class="sr-only">Você tem 3 notificações novas</span>
  ```
- Estrutura semântica (h1-h6, nav, main, section)
- ARIA live regions para atualizações dinâmicas

---

## 6. Animações

### 6.1 Transições de Página

- Fade simples ao trocar de rota
- Duração: 150ms
- Easing: ease-in-out
- Exemplo CSS:
  ```css
  .page-transition {
    animation: fadeIn 0.15s ease-in-out;
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  ```

### 6.2 Hover Effects

- Cards: `scale(1.01)` + shadow aumentada
  - Duração: 150ms
  - Easing: ease-out
- Buttons: subtle darken or color shift (não scale)
- Links: underline appear com fade

### 6.3 Toast Animations

- Slide-in da direita (100px → 0)
- Duração: 300ms
- Easing: ease-out
- Fade-out ao desaparecer (3s depois)

### 6.4 Regra de Ouro

- **Sem animações complexas** (parallax, morphing, complex curves)
- Performance > efeito visual
- Respeitar `prefers-reduced-motion` (media query)
- Tempo máximo: 400ms (animação muito longa prejudica UX)

---

## 7. Mobile First

### 7.1 Breakpoints (TailwindCSS)

```
sm: 640px
md: 768px
lg: 1024px
xl: 1280px
2xl: 1536px
```

### 7.2 Layout Responsivo

**Grid de KPIs:**
- 1 coluna: mobile
- 2 colunas: tablet (md)
- 4 colunas: desktop (lg+)

**Tabelas:**
- Mobile: converter para cards empilhados
- Exemplo:
  ```
  ┌─────────────┐
  │ Projeto: X  │
  │ Status: ✓  │
  │ Meta: 50%   │
  └─────────────┘
  ```

**Botões de Ação:**
- Desktop: inline (horizontal)
- Mobile: sticky footer (botão full-width no bottom)
- Height mínima: 48px (touch target)

### 7.3 Touch Friendliness

- Botões: mín 44x44px (recomendado 48x48px)
- Espaçamento entre elementos: mín 8px
- Inputs: altura mín 44px
- Avoidar hover-only interações
- Drawer em vez de sidebar

---

## 8. Componentes da Biblioteca

**shadcn/ui** é a base. Componentes esperados:

| Componente     | Uso                           |
|----------------|-------------------------------|
| Button         | CTAs, ações                   |
| Card           | Containers de conteúdo        |
| Input          | Campos de texto               |
| Select         | Dropdowns de seleção          |
| Checkbox       | Múltiplas seleções            |
| Radio          | Seleção única                 |
| Textarea       | Texto longo                   |
| Alert          | Avisos, erros                 |
| Dialog         | Confirmações, forms          |
| Dropdown Menu  | Menus com opções              |
| Tabs           | Navegação por abas            |
| Table          | Dados tabulares               |
| Progress       | Barras de progresso           |
| Tooltip        | Hints ao hover                |
| Badge          | Labels, status                |
| Skeleton       | Loading states                |
| Sheet          | Drawer mobile                 |
| Toast          | Notificações (via Sonner)     |

**Ícones:** Lucide Icons (npm: lucide-react)

---

## 9. Paleta de Cores

**Referência:** usar variáveis CSS do TailwindCSS com tema claro/escuro.

**Core:**
- Primary: azul (confiance, autoridade)
- Accent: verde (sucesso, afirmativo)
- Destructive: vermelho (alerta, deletar)
- Warning: laranja (atenção)
- Success: verde (completado)

**Neutros:**
- Background: branco (claro) / preto (escuro)
- Foreground: preto (claro) / branco (escuro)
- Muted: cinzento (desabilitado, secundário)
- Border: cinzento claro (linha de separação)

---

## 10. Tipografia

**Font Stack:**
```
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif;
```

**Hierarquia:**

| Nível       | Size  | Weight | Uso                    |
|-------------|-------|--------|------------------------|
| h1          | 2rem  | bold  | Títulos de página      |
| h2          | 1.5rem| semibold| Títulos de seção      |
| h3          | 1.25rem| semibold| Subtítulos           |
| body        | 1rem  | normal | Texto corpo            |
| small       | 0.875rem| normal | Labels, hints          |
| xsmall      | 0.75rem| normal | Metadata, timestamps   |

**Line Height:**
- Títulos: 1.2
- Corpo: 1.5
- Form labels: 1.4

---

## 11. Spacing

**Escala (baseada em 4px):**

```
xs: 4px (0.25rem)
sm: 8px (0.5rem)
md: 16px (1rem)
lg: 24px (1.5rem)
xl: 32px (2rem)
2xl: 48px (3rem)
```

**Uso:**
- Padding interno de cards: 16-24px
- Margin entre seções: 24-32px
- Padding de página: 16px (mobile), 32px (desktop)
- Spacing entre form fields: 16px

---

## 12. Exemplo de Componente (Card de Projeto)

```jsx
// ProjectCard.jsx
export function ProjectCard({ project }) {
  return (
    <Card className="hover:shadow-lg transition-all duration-150 hover:scale-101 cursor-pointer">
      <div className="relative w-full aspect-video bg-muted">
        <img 
          src={project.coverImage} 
          alt={project.name}
          className="w-full h-full object-cover"
        />
        <Badge className="absolute top-3 right-3">
          {project.status}
        </Badge>
      </div>
      
      <CardContent className="pt-4">
        <h3 className="font-semibold text-lg line-clamp-2 mb-2">
          {project.name}
        </h3>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
          {project.description}
        </p>
        
        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-sm">
            <span className="font-medium">R$ {project.raised.toLocaleString('pt-BR')}</span>
            <span className="text-muted-foreground">de R$ {project.goal.toLocaleString('pt-BR')}</span>
          </div>
          <Progress value={project.percentage} className="h-2" />
        </div>
        
        <Button variant="outline" className="w-full">
          Ver Projeto
        </Button>
      </CardContent>
    </Card>
  );
}
```

---

## 13. Dark Mode

**Suporte obrigatório** via CSS variables (TailwindCSS dark mode).

**Implementação:**
```html
<!-- No root (layout.jsx) -->
<html className="dark">
```

**Variáveis automáticas:**
- TailwindCSS gerencia via class `dark:`
- Colors ajustam automaticamente via CSS variables
- Sem hardcoding de cores

**Testing:**
- Testar toda interface em modo claro e escuro
- Garantir contraste em ambos

---

## 14. Performance

### 14.1 Imagens

- Lazy loading (`loading="lazy"`)
- Responsive images (`srcset`)
- WebP com fallback
- Aspect ratio preservado (evitar CLS)

### 14.2 Código

- Code splitting por rota (Next.js automatic)
- Avoid bundle bloat (chart library otimizada)
- Memoization de componentes caros (React.memo)

### 14.3 Lighthouse

Meta: Lighthouse score ≥ 90 em Performance, Accessibility.

---

## 15. Changelog

| Versão | Data       | Mudanças                 |
|--------|------------|--------------------------|
| 1.0    | 2024-07-14 | Versão inicial           |

---

## Contato & Suporte

Para dúvidas sobre UI/UX, refira-se a este documento ou crie uma issue com a tag `ui-ux`.