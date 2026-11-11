# Fluig Monitor

![Banner](./docs/img/banner.png)

<div align="center">

[![Versão](https://img.shields.io/badge/versão-1.0.0-blue.svg?style=flat-square)](https://github.com/mateusfbrandao/fluig-monitor/releases)
[![Licença: GPL-3.0](https://img.shields.io/badge/licença-GPL--3.0-green.svg?style=flat-square)](./LICENSE)
[![Rust](https://img.shields.io/badge/Rust-1.99-orange.svg?style=flat-square&logo=rust&logoColor=white)](https://www.rust-lang.org/)
[![Tauri](https://img.shields.io/badge/Tauri-v2-24C8D8.svg?style=flat-square&logo=tauri&logoColor=white)](https://tauri.app/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![SQLite](https://img.shields.io/badge/SQLite-WAL-2D3748?style=flat-square&logo=sqlite&logoColor=white)](https://www.sqlite.org/)
[![PT-BR](https://img.shields.io/badge/Idioma-PT--BR-10b981?style=flat-square)](./README.md)
[![ENG](https://img.shields.io/badge/Language-ENG-38bdf8?style=flat-square)](./README.en.md)

**Suíte desktop nativa em Rust e React para observabilidade, telemetria e monitoramento de ambientes TOTVS Fluig em tempo real.**

[Download](#-download--instaladores) •
[Recursos](#-principais-recursos) •
[Instalação & Execução](#-executando-o-projeto-em-modo-de-desenvolvimento) •
[Arquitetura](#-estrutura-do-projeto) •
[Instruções de Uso](#-instruções-de-uso) •
[Licença](#-licenciamento)

</div>

---

## 📌 Sobre o Projeto

O **Fluig Monitor** é uma aplicação desktop nativa desenvolvida com **Rust (Tauri v2)** e frontend moderno em **React 18**, **TypeScript** e **SQLite local**, projetada para fornecer controle e visibilidade completa sobre instâncias da plataforma **TOTVS Fluig** (on-premise ou TOTVS Cloud).

A telemetria é obtida de forma direta e segura através das **APIs REST públicas da plataforma** (`/monitoring`, `/license`, `/environment/api/v2/monitors`), permitindo inspecionar latência de rede, status do servidor de aplicação, utilização de recursos (CPU, memória JVM Heap/Non-Heap, storage de disco), saturação de pools JDBC (`FluigDS` / `FluigDSRO`), métricas de banco e consumo de licenças simultâneas.

### 🛡️ Princípios de Engenharia
- **Zero Vendor Lock-in & 100% On-Premise Data:** Todos os dados históricos e métricas ficam armazenados localmente no seu SQLite. Nenhuma informação de telemetria ou chave criptografada sai da sua máquina.
- **Backend Nativo em Rust:** Concorrência com Tokio, chamadas assíncronas via Reqwest com TLS nativo e consumo ultrabaixo de memória (< 45MB de RAM em repouso).
- **Segurança de Nível Corporativo:** Credenciais de API OAuth 1.0a salvas com criptografia AES-CBC e mecanismo inteligente de auto-recuperação (`AuthKeysDecoder`).
- **Observability Mission Control:** Dashboard central estilo NOC com KPIs globais de saúde, Uptime Strip com mapa de calor e alternância instantânea entre cartões e visualização em tabela.
- **Dual-Theme & Internacionalização Nativa:** Interface moderna com estética *Bento Grid*, suporte dinâmico a Tema Claro / Tema Escuro e i18n completo (Português e Inglês).

> [!NOTE]
> **Aviso de Isenção de Responsabilidade:** Fluig Monitor é um projeto independente de código aberto desenvolvido para fins de observabilidade. Não possui vínculo, afiliação, homologação ou suporte oficial da TOTVS S.A.

---

## 📦 Download & Instaladores

A versão estável atual é a **v1.0.0**. Baixe o instalador da sua plataforma na [página de releases](https://github.com/mateusfbrandao/fluig-monitor/releases/tag/v1.0.0):

| Plataforma | Pacote | Arquivo |
| --- | --- | --- |
| Linux (Debian/Ubuntu) | `.deb` | [fluig-monitor_1.0.0_amd64.deb](https://github.com/mateusfbrandao/fluig-monitor/releases/download/v1.0.0/fluig-monitor_1.0.0_amd64.deb) |
| Linux (Fedora/RHEL) | `.rpm` | [fluig-monitor-1.0.0-1.x86_64.rpm](https://github.com/mateusfbrandao/fluig-monitor/releases/download/v1.0.0/fluig-monitor-1.0.0-1.x86_64.rpm) |
| Linux (universal) | `.AppImage` | [fluig-monitor_1.0.0_amd64.AppImage](https://github.com/mateusfbrandao/fluig-monitor/releases/download/v1.0.0/fluig-monitor_1.0.0_amd64.AppImage) |
| Windows (x64) | Instalador NSIS | [fluig-monitor_1.0.0_x64-setup.exe](https://github.com/mateusfbrandao/fluig-monitor/releases/download/v1.0.0/fluig-monitor_1.0.0_x64-setup.exe) |

### Instalação rápida

```bash
# Debian / Ubuntu
sudo apt install ./fluig-monitor_1.0.0_amd64.deb

# Fedora / RHEL
sudo rpm -i fluig-monitor-1.0.0-1.x86_64.rpm

# AppImage
chmod +x fluig-monitor_1.0.0_amd64.AppImage
./fluig-monitor_1.0.0_amd64.AppImage
```

No Windows, execute `fluig-monitor_1.0.0_x64-setup.exe` e conclua o assistente de instalação.

> [!TIP]
> As releases oficiais ficam em [github.com/mateusfbrandao/fluig-monitor/releases](https://github.com/mateusfbrandao/fluig-monitor/releases).

---

## 🚀 Principais Recursos

- **Central de Comando (Mission Control / NOC):**
  - Faixa superior de KPIs globais: total de ambientes online, latência média ponderada, pico de latência e distribuição por tipo de ambiente (`PROD`, `HML`, `DEV`).
  - Busca rápida e filtros imediatos por release, URL ou tags de favoritos.
  - Alternância entre **Grade de Cartões** e **Tabela NOC densa**.
  - Cartões de ambiente com mini-gráfico de tendência de resposta (`AreaChart`) e régua de disponibilidade de 28 blocos (*Uptime Strip*).

- **Cockpit do Ambiente & Abas Especializadas:**
  - **Resumo:** Banner compacto de identificação, status do servidor com régua de 36 blocos de calor, medidores de disco, memória, banco e gráfico de histórico de latência de 24 horas.
  - **Banco de Dados & Pool JDBC:**
    - Identificação de SGBD (SQL Server, Oracle, MySQL, PostgreSQL), versão do driver JDBC, tamanho da base e volumetria de tráfego.
    - **Painel de Saúde do Pool de Conexões (`FluigDS` e `FluigDSRO`):** Medidores de saturação percentual com faixas de risco (Verde < 60%, Amarelo 60-85%, Vermelho > 85%), conexões ativas vs disponíveis, limite máximo configurado (`max-pool-size`) e pico histórico de utilização (`max-used-count`).
  - **Memória Detalhada:** Separação entre JVM Heap, Non-Heap, Pools e comportamento de coleta de lixo (GC).
  - **Estatísticas de Runtime:** Informações do cluster WildFly, threads ativas e versão do Java.
  - **Artefatos:** Deployments, componentes WCM e serviços implantados com parser robusto de artefatos.
  - **Serviços & Monitor v2:** Health check de subsistemas (Analytics, License Server, Solr, OpenOffice, Fluig Viewer, Realtime) com exibição de taxa de sucesso (SLA) e modal de detalhes técnicos para inspeção de falhas e exceções.
  - **Insights:** Diagnósticos automáticos de integridade e recomendações preventivas.

- **Confiabilidade & Performance de Dados:**
  - Backend Rust com SQLite WAL mode e índices compostos de alta velocidade.
  - Job automático e configurável de **Retenção e Expurgo de Dados** com limpeza manual em um clique na tela de configurações.
  - Proteção contra concorrência nos jobs de ping e sync com bloqueio por ambiente.

---

## 💻 Executando o Projeto em Modo de Desenvolvimento

### Pré-requisitos
- **Node.js** 18.x ou 20.x+ (recomendado LTS)
- **Yarn** (v1.22+) ou **npm**
- **Rust** 1.80+ (com `cargo` e `rustup`)
- No Linux (Ubuntu/Debian): `sudo apt install libwebkit2gtk-4.1-dev libgtk-3-dev librsvg2-dev`

### Passo a Passo

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/mateusfbrandao/fluig-monitor.git
   cd fluig-monitor
   ```

2. **Instale as dependências frontend:**
   ```bash
   yarn install
   ```

3. **Inicie o ambiente de desenvolvimento:**
   ```bash
   yarn dev
   # ou
   yarn tauri:dev
   ```
   O servidor de desenvolvimento do React iniciará automaticamente com hot-reload e o binário Rust abrirá a janela nativa do aplicativo.

4. **Executando os testes unitários:**
   ```bash
   yarn test
   ```

5. **Verificando a conformidade de código (Lint):**
   ```bash
   yarn lint
   ```

6. **Gerando os pacotes de distribuição (Build de Produção):**
   ```bash
   yarn package
   # ou
   yarn tauri:build
   ```
   Os instaladores nativos enxutos (.deb, .appimage, .msi, etc.) serão gerados no diretório `src-tauri/target/release/bundle`.

---

## 🏗️ Estrutura do Projeto

```text
fluig-monitor/
├── assets/                  # Ícones nativos multi-resolução (.ico, .png)
├── docs/img/                # Capturas de tela e banners do projeto
├── data/                    # Banco de dados local SQLite (dev)
├── src-tauri/               # Backend Nativo em Rust (Tauri v2)
│   ├── src/                 # Comandos IPC Rust, SQLite nativo, modelos e serviços
│   │   ├── commands.rs      # Handlers invocados pelo frontend
│   │   ├── db.rs            # Gerenciamento SQLite e DDL das tabelas
│   │   ├── models.rs        # Estruturas de dados tipadas em Rust
│   │   ├── lib.rs           # Bootstrap e inicialização do app
│   │   └── main.rs          # Ponto de entrada do executável Rust
│   ├── Cargo.toml           # Dependências e manifesto do crate Rust
│   └── tauri.conf.json      # Configurações de compilação e janelas nativas
└── src/
    ├── common/              # Recursos compartilhados
    │   ├── classes/         # AuthKeysDecoder com auto-recuperação de chaves AES
    │   ├── i18n/            # Catálogos de internacionalização (pt.json, en.json)
    │   └── interfaces/      # Modelos de dados e contratos TypeScript unificados
    │
    └── renderer/            # Processo de Interface (Front-end React)
        ├── assets/          # Estilos SCSS, tokens de design, SVGs e logotipos
        ├── components/      # Componentes modulares (base, container, layout)
        ├── contexts/        # Context APIs (Ambientes, Notificações, Tema)
        ├── ipc/             # Shim de comunicação nativa com comandos Rust
        └── pages/           # Visualizações de rotas do React Router
```

---

## 📖 Instruções de Uso

### Monitorando um Novo Ambiente Fluig

1. **Abra o aplicativo:** Na primeira inicialização, o banco de dados SQLite local é provisionado automaticamente.
2. **Adicione um ambiente:** Clique em `+ Incluir um novo ambiente` na Sidebar ou no botão superior da Central de Comando.
3. **Preencha os dados de conexão:**
   - **Nome:** Apelido amigável para identificar a instância (ex: `Produção`, `Homologação`).
   - **URL:** Endereço base HTTP/HTTPS sem barra no final (ex: `https://fluig.suaempresa.com.br`).
   - **Tipo do Ambiente:** Selecione entre `PROD`, `HML` ou `DEV`.
   - **Credenciais OAuth 1.0a:** Forneça a `Consumer Key`, `Consumer Secret`, `Access Token` e `Token Secret` do Usuário Aplicativo cadastrado no Fluig.
   - Utilize o botão **Testar Conexão** para validar as permissões de acesso às APIs `/monitoring` e `/license`.
4. **Frequência de Monitoramento:**
   - **Ping (Disponibilidade):** De 15 segundos a 5 minutos.
   - **Sincronização Completa:** De 15 minutos (tempo de refresh da API do Fluig) a 1 hora.
5. **Acompanhe a Telemetria:** O ambiente começará a registrar latências e estatísticas instantaneamente.

---

## 📜 Licenciamento

Distribuído sob a licença **GNU General Public License v3.0** (`GPL-3.0-or-later`). Consulte o arquivo [`LICENSE`](./LICENSE) para mais detalhes.

---

<div align="center">
Desenvolvido de forma independente pela comunidade open-source.
</div>
