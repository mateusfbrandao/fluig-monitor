# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Público Primário:** Administradores de infraestrutura, engenheiros DevOps, analistas de sustentação e consultores técnicos Fluig.
- **Situação de Uso:** Monitoramento contínuo em tempo real, detecção proativa de incidentes e diagnóstico rápido da saúde de múltiplos ambientes TOTVS Fluig (Produção, Homologação e Desenvolvimento), operando em estilo NOC / Mission Control.

## Product Purpose

Fornecer visibilidade abrangente, telemetria detalhada e observabilidade nativa de instâncias da plataforma TOTVS Fluig (on-premise ou TOTVS Cloud), permitindo diagnosticar latência, saturação de hardware, consumo de memória JVM, saúde dos pools JDBC e disponibilidade de subsistemas sem impactar a performance do servidor monitorado.

## Positioning

Uma suíte desktop nativa com consumo de memória ultra-baixo (< 45MB de RAM em repouso viabilizado por Rust/Tauri v2), privacidade absoluta com dados 100% locais em SQLite WAL (zero vendor lock-in e zero telemetria externa para terceiros) e integração direta com APIs REST públicas oficiais do Fluig com armazenamento seguro de chaves OAuth 1.0a criptografadas em AES-CBC.

## Operating Context

- **Ambiente de Execução:** Desktop multi-plataforma (Linux, Windows, macOS) executado localmente na estação de trabalho do operador ou em telas dedicadas de NOC.
- **Ecossistema Monitorado:** Servidores de aplicação WildFly executando a plataforma TOTVS Fluig, bancos de dados corporativos (SQL Server, Oracle, MySQL, PostgreSQL) e serviços auxiliares (Solr, Realtime, License Server, Fluig Viewer, OpenOffice).
- **Modos de Visualização:** Alternância contínua entre visão geral densa (Tabela NOC / KPIs globais) e cartões Bento Grid ricos com mini-gráficos de tendência (`AreaChart`) e réguas históricas de disponibilidade de 28/36 blocos (*Uptime Strips*).

## Capabilities and Constraints

- **Capacidades Confirmadas:**
  - Descoberta e monitoramento de telemetria via endpoints oficiais `/monitoring`, `/license` e `/environment/api/v2/monitors`.
  - Painel dedicado de saturação de pools JDBC (`FluigDS` e `FluigDSRO`) com indicadores de risco e pico histórico de utilização.
  - Telemetria de JVM Heap, Non-Heap, threads ativas e comportamento de Garbage Collection.
  - Inspeção de artefatos WCM, componentes, serviços e diagnósticos automáticos (Insights).
  - Retenção e expurgo configurável de métricas com motor SQLite local de alto rendimento.
- **Restrições:**
  - Nenhuma telemetria externa enviada para fora da máquina do usuário.
  - Credenciais OAuth salvas exclusivamente criptografadas localmente.
  - Consumo enxuto de recursos para permitir execução ininterrupta em segundo plano.

## Brand Commitments

- **Nome:** Fluig Monitor.
- **Licenciamento:** Código aberto sob licença GPL-3.0-or-later.
- **Vínculo:** Projeto de código aberto independente, sem vínculo institucional com a TOTVS S.A.
- **Tom de Voz & Estética:** Técnico, sóbrio, preciso, orientado a dados e painéis operacionais; interface com Bento Grid, suporte a Dark Mode e Light Mode e internacionalização nativa (PT-BR e EN).

## Evidence on Hand

- Código-fonte completo com backend Rust (Tauri v2) e frontend React 18 + TypeScript + Sass.
- Documentação técnica detalhada no [README.md](file:///home/mateus/Projetos/fluig-monitor/README.md) e [README.en.md](file:///home/mateus/Projetos/fluig-monitor/README.en.md).
- Assets visuais existentes em `assets/` e `docs/img/` (incluindo banner e ícones da aplicação).

## Product Principles

1. **Privacidade e Soberania dos Dados:** Os dados de telemetria pertencem ao usuário e nunca saem do banco SQLite local.
2. **Eficiência e Concorrência Nativa:** O monitor nunca deve ser um peso para a estação de trabalho; o motor nativo em Rust cuida da concorrência e das conexões de rede com uso mínimo de CPU e RAM.
3. **Precisão Operacional Imediata:** As informações críticas de saúde e risco (quedas, saturação de pool de conexões, alertas de SLA) devem ser discerníveis em frações de segundo.
4. **Respeito aos Padrões Abertos:** Uso estrito de APIs públicas da plataforma com autenticação segura e auditável.

## Accessibility & Inclusion

- Conformidade com padrões WCAG para contraste visual e legibilidade em ambientes de monitoramento contínuo (ambientes com baixa iluminação / dark mode e iluminação de escritório / light mode).
- Suporte a navegação por teclado e semântica acessível em tabelas de dados, alertas de status e seletores de ambientes.
