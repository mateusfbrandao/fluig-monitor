# Fluig Monitor

![Banner](./docs/img/banner.png)

<div align="center">

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg?style=flat-square)](https://github.com/mateusfbrandao/fluig-monitor/releases)
[![License: GPL-3.0](https://img.shields.io/badge/license-GPL--3.0-green.svg?style=flat-square)](./LICENSE)
[![Rust](https://img.shields.io/badge/Rust-1.99-orange.svg?style=flat-square&logo=rust&logoColor=white)](https://www.rust-lang.org/)
[![Tauri](https://img.shields.io/badge/Tauri-v2-24C8D8.svg?style=flat-square&logo=tauri&logoColor=white)](https://tauri.app/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![SQLite](https://img.shields.io/badge/SQLite-WAL-2D3748?style=flat-square&logo=sqlite&logoColor=white)](https://www.sqlite.org/)
[![PT-BR](https://img.shields.io/badge/Language-PT--BR-10b981?style=flat-square)](./README.md)
[![ENG](https://img.shields.io/badge/Language-ENG-38bdf8?style=flat-square)](./README.en.md)

**Native Rust & React desktop observability, telemetry, and real-time monitoring suite for TOTVS Fluig platforms.**

[Download](#-download--installers) •
[Features](#-key-features) •
[Installation & Setup](#-running-the-project-in-development-mode) •
[Architecture](#-project-structure) •
[Usage Guide](#-usage-guide) •
[License](#-licensing)

</div>

---

## 📌 About the Project

**Fluig Monitor** is a native cross-platform desktop application powered by **Rust (Tauri v2)** and modern **React 18**, **TypeScript**, and a local **SQLite database**, designed to provide comprehensive observability and real-time operational visibility over **TOTVS Fluig** instances (on-premise or cloud).

Telemetry is gathered directly and securely through official public REST APIs (`/monitoring`, `/license`, `/environment/api/v2/monitors`), allowing IT and DevOps teams to inspect network latency, application server availability, resource utilization (CPU cores, JVM Heap/Non-Heap memory, disk storage), JDBC connection pool saturation (`FluigDS` / `FluigDSRO`), relational database metrics, and concurrent license utilization.

### 🛡️ Engineering Principles
- **Zero Vendor Lock-in & 100% On-Premise Data:** All historical telemetry and metrics are stored locally in your SQLite database. No monitoring data or cryptographic keys ever leave your machine.
- **Native Rust Backend:** Concurrency managed by Tokio, async networking via Reqwest with native TLS, and an ultralight memory footprint (< 45MB RAM idle).
- **Enterprise-Grade Security:** OAuth 1.0a API credentials encrypted via AES-CBC with a self-healing mathematical recovery algorithm (`AuthKeysDecoder`).
- **Observability Mission Control:** NOC-grade central dashboard with global health KPIs, an interactive 28-block Uptime Strip, and instant toggle between Bento cards and dense table view.
- **Dual-Theme & Native Internationalization:** Clean interface with *Bento Grid* aesthetics, dynamic support for Dark and Light themes, and full i18n (Portuguese and English).

> [!NOTE]
> **Disclaimer:** Fluig Monitor is an independent open-source observability project. It is not affiliated with, endorsed by, or officially associated with TOTVS S.A.

---

## 📦 Download & Installers

The current stable release is **v1.0.0**. Download the installer for your platform from the [releases page](https://github.com/mateusfbrandao/fluig-monitor/releases/tag/v1.0.0):

| Platform | Package | File |
| --- | --- | --- |
| Linux (Debian/Ubuntu) | `.deb` | [fluig-monitor_1.0.0_amd64.deb](https://github.com/mateusfbrandao/fluig-monitor/releases/download/v1.0.0/fluig-monitor_1.0.0_amd64.deb) |
| Linux (Fedora/RHEL) | `.rpm` | [fluig-monitor-1.0.0-1.x86_64.rpm](https://github.com/mateusfbrandao/fluig-monitor/releases/download/v1.0.0/fluig-monitor-1.0.0-1.x86_64.rpm) |
| Linux (universal) | `.AppImage` | [fluig-monitor_1.0.0_amd64.AppImage](https://github.com/mateusfbrandao/fluig-monitor/releases/download/v1.0.0/fluig-monitor_1.0.0_amd64.AppImage) |
| Windows (x64) | NSIS installer | [fluig-monitor_1.0.0_x64-setup.exe](https://github.com/mateusfbrandao/fluig-monitor/releases/download/v1.0.0/fluig-monitor_1.0.0_x64-setup.exe) |

### Quick install

```bash
# Debian / Ubuntu
sudo apt install ./fluig-monitor_1.0.0_amd64.deb

# Fedora / RHEL
sudo rpm -i fluig-monitor-1.0.0-1.x86_64.rpm

# AppImage
chmod +x fluig-monitor_1.0.0_amd64.AppImage
./fluig-monitor_1.0.0_amd64.AppImage
```

On Windows, run `fluig-monitor_1.0.0_x64-setup.exe` and complete the installer wizard.

> [!TIP]
> Official releases are published at [github.com/mateusfbrandao/fluig-monitor/releases](https://github.com/mateusfbrandao/fluig-monitor/releases).

---

## 🚀 Key Features

- **Command Center (Mission Control / NOC):**
  - Global KPI strip: total online environments, average network latency, latency peak, and environment distribution (`PROD`, `HML`, `DEV`).
  - Instant search and filtering by release name, URL, or favorite tags.
  - View switcher between **Card Grid** and **Dense NOC Table**.
  - Environment cards with response trend charts (`AreaChart`) and a 28-block *Uptime Strip* heatmap.

- **Environment Cockpit & Specialized Tabs:**
  - **Summary:** Identity banner, server status with 36-block heatmap strip, storage/memory gauges, and 24-hour latency graph.
  - **Database & JDBC Pool Health:**
    - RDBMS detection (SQL Server, Oracle, MySQL, PostgreSQL), JDBC driver versions, storage size, and volumetry.
    - **Connection Pool Health Panel (`FluigDS` & `FluigDSRO`):** Real-time saturation percentage gauges with automated risk indicators (Green < 60%, Yellow 60-85%, Red > 85%), active vs available connections, max configured limit (`max-pool-size`), and historic peak utilization (`max-used-count`).
  - **Detailed Memory:** JVM Heap, Non-Heap pools, and garbage collection behavior.
  - **Runtime Stats:** WildFly cluster info, active threads, and Java runtime details.
  - **Artifacts:** Deployments, WCM components, and deployed services with robust array/object parsing.
  - **Services & Monitor v2:** Health checks for subsystems (Analytics, License Server, Solr, OpenOffice, Fluig Viewer, Realtime) with SLA success rate display and technical exception inspection modals.
  - **Insights:** Automated health diagnostics and proactive recommendations.

- **Data Reliability & Performance:**
  - Local SQLite database with WAL mode and high-performance composite indexes.
  - Automated, configurable **Data Retention and Pruning Job** with 1-click manual cleanup from settings.
  - Concurrency protection on ping and sync background jobs using per-environment locks.

---

## 💻 Running the Project in Development Mode

### Prerequisites
- **Node.js** 18.x or 20.x+ (LTS recommended)
- **Yarn** (v1.22+) or **npm**
- **Rust** 1.80+ (with `cargo` and `rustup`)
- On Linux (Ubuntu/Debian): `sudo apt install libwebkit2gtk-4.1-dev libgtk-3-dev librsvg2-dev`

### Step by Step

1. **Clone the repository:**
   ```bash
   git clone https://github.com/mateusfbrandao/fluig-monitor.git
   cd fluig-monitor
   ```

2. **Install dependencies:**
   ```bash
   yarn install
   ```

3. **Start development mode:**
   ```bash
   yarn dev
   # or
   yarn tauri:dev
   ```
   The React dev server starts with hot-reloading and the native Rust binary opens the application window.

4. **Run unit tests:**
   ```bash
   yarn test
   ```

5. **Check code quality (Linting):**
   ```bash
   yarn lint
   ```

6. **Build production packages:**
   ```bash
   yarn package
   # or
   yarn tauri:build
   ```
   Lightweight native installers (.deb, .appimage, .msi, etc.) will be output to `src-tauri/target/release/bundle`.

---

## 🏗️ Project Structure

```text
fluig-monitor/
├── assets/                  # Multi-resolution application icons (.ico, .png)
├── docs/img/                # Screenshots and project banners
├── data/                    # Local SQLite database (dev)
├── src-tauri/               # Native Rust Backend (Tauri v2)
│   ├── src/                 # Rust IPC commands, SQLite driver, models, and services
│   │   ├── commands.rs      # Frontend-callable Rust handlers
│   │   ├── db.rs            # SQLite database manager and table DDL
│   │   ├── models.rs        # Strongly typed Rust data structures
│   │   ├── lib.rs           # Application bootstrap and setup
│   │   └── main.rs          # Executable entry point
│   ├── Cargo.toml           # Rust manifest and dependencies
│   └── tauri.conf.json      # Tauri compiler and native window configurations
└── src/
    ├── common/              # Shared resources
    │   ├── classes/         # AuthKeysDecoder with AES self-healing recovery
    │   ├── i18n/            # Internationalization bundles (pt.json, en.json)
    │   └── interfaces/      # TypeScript models and unified contracts
    │
    └── renderer/            # Interface Layer (React Front-end)
        ├── assets/          # SCSS stylesheets, design tokens, SVGs, and logos
        ├── components/      # Modular components (base, container, layout)
        ├── contexts/        # Context APIs (Environments, Notifications, Theme)
        ├── ipc/             # Native Rust shim for frontend IPC
        └── pages/           # React Router route views
```

---

## 📖 Usage Guide

### Monitoring a Fluig Instance

1. **Launch the application:** The local SQLite database is provisioned automatically on first launch.
2. **Add an environment:** Click `+ New Environment` in the Sidebar or the top button in the Command Center.
3. **Fill in the connection details:**
   - **Name:** Friendly identifier for the instance (e.g., `Production`, `Staging`).
   - **URL:** Base HTTP/HTTPS URL without trailing slash (e.g., `https://fluig.company.com`).
   - **Environment Kind:** Choose `PROD`, `HML`, or `DEV`.
   - **OAuth 1.0a Credentials:** Enter `Consumer Key`, `Consumer Secret`, `Access Token`, and `Token Secret` from your Fluig OAuth Application.
   - Use the **Test Connection** button to verify access to `/monitoring` and `/license` APIs.
4. **Monitoring Intervals:**
   - **Ping (Availability):** From 15 seconds to 5 minutes.
   - **Full Sync:** From 15 minutes (Fluig API refresh cycle) to 1 hour.
5. **View Telemetry:** The environment begins collecting latency and metrics immediately.

---

## 📜 Licensing

Distributed under the **GNU General Public License v3.0** (`GPL-3.0-or-later`). See [`LICENSE`](./LICENSE) for full details.

---

<div align="center">
Independently developed by the open-source community.
</div>
