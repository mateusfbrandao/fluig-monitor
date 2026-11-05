---
name: Fluig Monitor
description: Suíte desktop nativa em Rust e React para observabilidade, telemetria e monitoramento de ambientes TOTVS Fluig em tempo real.
colors:
  command-indigo: "#4f46e5"
  command-indigo-hover: "#4338ca"
  command-indigo-dark: "#6366f1"
  telemetry-cyan: "#0ea5e9"
  telemetry-cyan-dark: "#38bdf8"
  status-online: "#10b981"
  status-online-bg: "rgba(16, 185, 129, 0.14)"
  status-warning: "#f59e0b"
  status-warning-bg: "rgba(245, 158, 11, 0.16)"
  status-offline: "#ef4444"
  status-offline-dark: "#f43f5e"
  status-offline-bg: "rgba(239, 68, 68, 0.14)"
  canvas-bg: "#f8fafc"
  canvas-bg-dark: "#0b0f19"
  card-bg: "#ffffff"
  card-bg-dark: "#111827"
  surface-subtle: "#f1f5f9"
  surface-subtle-dark: "#1e293b"
  border-structural: "#cbd5e1"
  border-structural-dark: "#334155"
  border-hairline: "#e2e8f0"
  border-hairline-dark: "rgba(148, 163, 184, 0.14)"
  font-primary: "#0f172a"
  font-primary-dark: "#f8fafc"
  font-secondary: "#334155"
  font-secondary-dark: "#cbd5e1"
  font-muted: "#64748b"
typography:
  display:
    fontFamily: "Plus Jakarta Sans, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Plus Jakarta Sans, sans-serif"
    fontSize: "1.3rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "1.05rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "15px"
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: "0em"
  label:
    fontFamily: "JetBrains Mono, monospace"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.02em"
rounded:
  sm: "0.35rem"
  md: "0.5rem"
  lg: "0.65rem"
  full: "999px"
spacing:
  xs: "0.25rem"
  sm: "0.5rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2rem"
components:
  button-primary:
    backgroundColor: "{colors.command-indigo}"
    textColor: "#ffffff"
    rounded: "{rounded.sm}"
    padding: "0.5rem 0.75rem"
  button-primary-hover:
    backgroundColor: "{colors.command-indigo-hover}"
  button-secondary:
    backgroundColor: "{colors.card-bg}"
    textColor: "{colors.font-secondary}"
    rounded: "{rounded.sm}"
    padding: "0.5rem 0.75rem"
  card-container:
    backgroundColor: "{colors.card-bg}"
    rounded: "{rounded.lg}"
    padding: "1rem"
  input-field:
    backgroundColor: "{colors.card-bg}"
    textColor: "{colors.font-secondary}"
    rounded: "{rounded.sm}"
    padding: "0.5rem"
---

# Design System: Fluig Monitor

## Overview

**Creative North Star: "The Mission Control Bento"**

Fluig Monitor adota a metáfora de uma central de comando de observabilidade e NOC de alta densidade técnica. Sua interface é estruturada em blocos modulares Bento, desenhados para apresentar volumetria, tendências temporais e diagnósticos profundos de infraestrutura sem fadiga cognitiva e sem dispersão visual. O design prioriza a legibilidade instantânea de métricas críticas — latência de rede, saturação de pools JDBC, limites de JVM Heap e saúde de subsistemas —, permitindo que operadores tomem decisões em frações de segundo.

O sistema visual rejeita deliberadamente ornamentos cosméticos, sombras pesadas, ilustrações decorativas e gradientes ruidosos típicos de dashboards corporativos genéricos. A sobriedade analítica é sustentada por dois mundos contrastantes e perfeitamente equilibrados: um modo claro nítido para salas iluminadas e um modo escuro Obsidian NOC para operações noturnas e postos de monitoramento contínuo.

**Key Characteristics:**
- **Modularidade Bento Grid:** Painéis com limites nítidos, proporções racionais e hierarquia limpa de dados.
- **Soberania Semafórica:** A cor cromática vibrante é recurso escasso, reservado exclusivamente para expressar o estado operacional dos sistemas.
- **Micro-telemetria Embutida:** Mini-gráficos de tendência (*sparklines*), réguas de disponibilidade de 28/36 blocos (*Uptime Strips*) e indicadores numéricos tabulares.
- **Tipografia Dual-Role:** Tipografia sem serifa geométrica humanista para rótulos e interface (`Inter` e `Plus Jakarta Sans`) combinada a números monoespaçados (`JetBrains Mono`) para escaneabilidade de métricas.

## Colors

A paleta combina uma base neutra de alta fidelidade com acentos funcionais de telemetria e um trio semafórico estrito de status.

### Primary
- **Command Indigo** (#4f46e5 em Light / #6366f1 em Dark): Acento primário de comando e controle, utilizado para botões de ação principal, estados de foco acessíveis (`outline: 2px solid var(--purple)`), itens ativos na navegação e indicadores de destaque na marca.

### Secondary
- **Telemetry Cyan** (#0ea5e9 em Light / #38bdf8 em Dark): Tom de apoio analítico, empregado em anéis de hover, gráficos de rede, destaques de métricas secundárias e gradientes discretos de cabeçalho.
- **Signal Emerald** (#10b981): Verde esmeralda de telemetria, utilizado na marca e como âncora de integridade saudável.

### Neutral
- **Canvas Background** (#f8fafc em Light / #0b0f19 em Dark): Superfície base da janela. O dark mode utiliza um preto obsidiana profundo característico de monitores de NOC.
- **Raised Card** (#ffffff em Light / #111827 em Dark): Superfície dos módulos Bento, cartões de ambiente e painéis de dados.
- **Subtle Inset** (#f1f5f9 em Light / #1e293b em Dark): Superfície interna para áreas secundárias, cabeçalhos de tabela e blocos de código.
- **Structural Border** (#cbd5e1 em Light / #334155 em Dark): Delimitador primário de containers, divisores e bordas ativas.
- **Hairline Border** (#e2e8f0 em Light / rgba(148, 163, 184, 0.14) em Dark): Linha ultrafina para isolamento de células e linhas de tabela.
- **Deep Ink Text** (#0f172a em Light / #f8fafc em Dark): Tipografia primária de alta legibilidade para títulos e valores chave.
- **Slate Text** (#334155 em Light / #cbd5e1 em Dark): Tipografia secundária para rótulos e descrições.
- **Muted Label** (#64748b): Tipografia suave para timestamps, unidades de medida e legendas secundárias.

### Named Rules
**The Status Exclusivity Rule.** As cores cromáticas saturadas (verde #10b981, amarelo #f59e0b, vermelho #ef4444/#f43f5e) são propriedade exclusiva do status dos ambientes e componentes monitorados. Nenhum botão decorativo, fundo neutro ou badge administrativo pode apropriar-se dessas cores para finalidades não semafóricas.

**The Translucent Tint Rule.** Badges e recipientes de alerta semafóricos utilizam um fundo com transparência entre 12% e 18% (ex: `rgba(16, 185, 129, 0.14)`) com borda ou texto em tom pleno correspondente, preservando o contraste e evitando poluição visual em dashboards densos.

## Typography

**Display Font:** Plus Jakarta Sans (com fallback `-apple-system, BlinkMacSystemFont, sans-serif`)  
**Body Font:** Inter (com fallback `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`)  
**Label/Mono Font:** JetBrains Mono (com fallback `monospace`)

**Character:** Uma união assertiva entre a clareza técnica contemporânea da família `Inter` e o rigor analítico da `JetBrains Mono`, garantindo que tabelas de dezenas de linhas permaneçam confortáveis e instantaneamente decodificáveis.

### Hierarchy
- **Display** (Bold 700, 1.5rem / 24px, line-height 1.2, letter-spacing -0.02em): Títulos de seções globais e cabeçalho principal da janela.
- **Headline** (Bold 700, 1.3rem / 20.8px, line-height 1.25, letter-spacing -0.02em): Nomes de ambientes em foco e títulos de painéis centrais.
- **Title** (Semi-bold 600, 1.05rem / 16.8px, line-height 1.3, letter-spacing -0.01em): Títulos de cartões Bento, abas de navegação e cabeçalhos de grupos.
- **Body** (Medium 500, 15px, line-height 1.5): Texto padrão de interface, descrições, campos de formulário e valores informativos.
- **Label** (Medium 500, 0.75rem / 12px, line-height 1.4, JetBrains Mono): Métricas de latência em milissegundos, percentuais de saturação de pool, endereços IP/URL e badges de release.

### Named Rules
**The Metric Monospace Rule.** Todo valor numérico dinâmico (latência, conexões ativas, contadores de thread, uso de memória JVM e tempo decorrido) deve ser renderizado com dígitos de largura constante (`JetBrains Mono` ou `font-variant-numeric: tabular-nums`) para evitar oscilações visuais de layout durante atualizações de telemetria.

## Layout

O layout do Fluig Monitor adota uma arquitetura de duas colunas: uma barra lateral de navegação com largura fixa (`Navbar`) e uma janela de trabalho principal (`#mainWindow`) com fluxo vertical contínuo.

- **Bento Grid:** Os painéis internos utilizam um sistema modular com espaçamento padrão de 1rem (16px), ajustando-se a larguras flexíveis em telas widescreen e preservando alinhamentos rigorosos de borda.
- **Breakpoints:**
  - `Desktop Largo (> 1024px)`: Padding do workspace de 1.5rem 2rem, tabelas de telemetria completas e cartões em múltiplas colunas.
  - `Compacto (641px a 1024px)`: Padding de 1.25rem, colapso de colunas secundárias de métricas.
  - `Mobile / Estreito (≤ 640px)`: Padding de 0.85rem 0.75rem, layout em coluna única e cartões simplificados.
- **Ritmo de Espaçamento:** Escala harmônica baseada em potências suaves: `0.25rem (4px)`, `0.5rem (8px)`, `1rem (16px)`, `1.5rem (24px)`, `2rem (32px)`.

## Elevation & Depth

Fluig Monitor opera sob a filosofia de elevação tonal plana (*Flat-by-Default with Hairline Outlines*). As superfícies não flutuam com sombras dramáticas; a separação espacial decorre de variações de cor de fundo entre a tela base (`--background`) e os containers (`--card`), reforçada por bordas sutis de 1px.

### Shadow Vocabulary
- **Card Rest Light** (`box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06), 0 1px 2px rgba(15, 23, 42, 0.04)`): Leve sustentação estrutural em modo claro para desacoplar cartões do fundo cinza claro.
- **Card Rest Dark** (`box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25)`): Profundidade ambiente suave que evita que cards escuros se fundam com o fundo obsidiana.
- **Card Minimal** (`box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04)`): Sombras de micro-elementos internos e tags.

### Named Rules
**The Flat-By-Default Rule.** Superfícies repousam em nível plano com borda definida. Sombras nunca são ornamentos contínuos e não são empilhadas; seu papel é exclusivamente de desacoplamento tonal ou reação a estados de interação e foco.

## Shapes

O vocabulário formal baseia-se em cantos ligeiramente suavizados com escala previsível:

- **Controles e Ações:** `border-radius: 0.35rem` (~5.6px) para botões, inputs, selects e caixas de texto. Cantos compactos que conferem aspecto de ferramenta de precisão.
- **Tags e Blips Informativos:** `border-radius: 0.5rem` (8px) para etiquetas de status, selos de ambiente e balões de aviso.
- **Cartões e Módulos Bento:** `border-radius: 0.65rem` (~10.4px) para grandes agrupadores de dados e modais.
- **Pills e Indicadores Cilíndricos:** `border-radius: 999px` para a barra de rolagem e badges circulares de contagem.

## Components

### Buttons
- **Shape:** Raio compacto (0.35rem / 5.6px) com preenchimento interno de 0.5rem 0.75rem.
- **Primary:** Fundo `var(--purple)` (#4f46e5), texto branco (#ffffff), sem borda. No hover, contorno ativo de 3px com `var(--light-blue)`.
- **Secondary:** Fundo `var(--card)`, texto `var(--font-secondary)`, contorno sutil de `var(--border-light)`.
- **Success / Danger:** Fundo com as cores semafóricas plenas (`var(--green)` ou `var(--red)`), texto em alto contraste e anel de hover translúcido.
- **Subtle / Ghost:** Fundo transparente, sem contorno no repouso, texto herdeiro da cor local com transição de opacidade.

### Chips & Tags
- **SmallTag:** Rótulo compacto com `border-radius: 0.25rem` a `0.5rem`, utilizado para tipos de ambiente (`PROD`, `HML`, `DEV`) e versões de release.
- **Info Blip:** Container de alerta com `border: 2px solid`, fundo translúcido correspondente e ícone alinhado à esquerda.

### Cards / Containers
- **Corner Style:** `0.65rem` (10.4px).
- **Background:** `var(--card)` (#ffffff em Light / #111827 em Dark).
- **Border:** `1px solid var(--border-light)` em repouso.
- **Hover:** Transição suave de 200ms cubic-bezier para realce de borda ou sutil elevação.

### Inputs / Fields
- **Style:** Fundo `var(--card)`, texto `var(--font-secondary)`, padding de 0.5rem, `border-radius: 0.35rem`, com outline inicial de `3px solid var(--border-light)`.
- **Focus:** `outline: 3px solid var(--light-blue)` ou `outline: 2px solid var(--purple)`.

### Navigation
- Barra vertical escura/adaptativa (`#Navbar`) contendo logo superior, lista de ambientes monitorados com indicador visual de status e botões de atalho na extremidade inferior (configurações, alternância de tema, novo ambiente).

### Signature Component: Uptime Strip & JDBC Pool Gauge
- **Uptime Strip:** Régua horizontal de 28 ou 36 blocos de calor sequenciais que registram a disponibilidade temporal de cada ambiente. Blocos verdes (disponível), amarelos (latência alta) e vermelhos (indisponível) com animação suave e tooltip detalhado ao passar o cursor.
- **JDBC Connection Pool Gauge:** Medidor de saturação percentual dos pools `FluigDS` e `FluigDSRO` dividido em faixas de segurança: Normal (< 60%), Atenção (60-85%) e Crítico (> 85%), com exibição do pico histórico e limite configurado.

## Do's and Don'ts

### Do:
- **Do** utilizar `JetBrains Mono` ou fontes numéricas tabulares para todas as métricas de tempo de resposta, volumetria de disco, conexões de pool e contadores.
- **Do** restringir o uso de verde, amarelo e vermelho a indicadores reais de status e telemetria operacional.
- **Do** garantir que todos os componentes ofereçam variantes completas e testadas para o Modo Claro e o Modo Escuro Obsidian.
- **Do** manter a régua de cantos compacta (0.35rem para controles, 0.65rem para cartões) para preservar o aspecto técnico de cockpit.
- **Do** aplicar anéis de foco visíveis (`outline: 2px solid var(--purple)`) em todos os elementos interativos para garantir conformidade de acessibilidade.

### Don't:
- **Don't** aplicar gradientes multicoloridos ou efeitos de vidro com desfoque excessivo (*glassmorphism*) em superfícies de dados analíticos.
- **Don't** utilizar sombras escuras e difusas no modo claro que poluam a separação entre cards adjacentes.
- **Don't** criar novos botões ou controles interativos que utilizem verde ou vermelho como cor de preenchimento quando a ação não for explicitamente de confirmação/sucesso ou exclusão destrutiva.
- **Don't** utilizar fontes genéricas sem teste prévio de legibilidade em números e timestamps.
- **Don't** ocultar informações críticas de falha em tooltips exclusivamente; status com erro ou saturação de pool devem ser visíveis no primeiro nível da interface.
