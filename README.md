# UpdatePilot — Software Update Intelligence & Management Platform

[![Platform](https://img.shields.io/badge/Platform-Windows%2010%20%7C%2011-blue.svg)](https://microsoft.com/windows)
[![Package Manager](https://img.shields.io/badge/WinGet-v1.29+-brightgreen.svg)](https://github.com/microsoft/winget-cli)
[![Framework](https://img.shields.io/badge/Next.js-14.2%20App%20Router-black.svg)](https://nextjs.org)
[![Backend](https://img.shields.io/badge/Express-REST%20API-lightgrey.svg)](https://expressjs.com)
[![Database](https://img.shields.io/badge/Prisma%20ORM-SQLite%20%2F%20PostgreSQL-indigo.svg)](https://prisma.io)
[![Tests](https://img.shields.io/badge/Automated%20Tests-28%20Passed-success.svg)](./scripts/run-tests.ps1)

> **UpdatePilot** is an enterprise-grade, Windows-first software update management platform. It combines a professional web dashboard, an authenticated REST API backend, and a standalone Windows local agent that connects directly to the Windows Package Manager (`winget`) and the Windows Registry. It discovers installed applications, identifies verified updates from trusted sources, presents release metadata and security advisories, and executes updates **strictly after explicit user confirmation** with full post-update verification and audit trails.

---

## Key Capabilities

- **Real Software Discovery**: Directly queries Windows Package Manager (`winget list`) and Windows Registry Uninstall keys (`HKLM`/`HKCU`).
- **Trusted Update Intelligence**: Detects available version upgrades (`winget upgrade`) across verified community and Microsoft Store repositories (e.g., Git, Notepad++, Node.js, AnyDesk, VLC).
- **Multi-Tenant User Isolation**: Secure registration, login, and JWT authentication. Multiple users can manage multiple registered Windows computers with strict zero-leakage isolation.
- **Hardware GUID Protection**: Devices are permanently paired via Windows Registry Machine GUID (`HKLM\SOFTWARE\Microsoft\Cryptography\MachineGuid`), preventing duplicate device registration or hostname collisions.
- **Standalone Windows Agent Installer**: Lightweight NSIS native installer (`UpdatePilot-Agent-Setup-1.0.0.exe`, 22 MB) with embedded Node.js runtime, autostart via Windows Registry (`HKCU\...\Run`), and silent install support (`/S`).
- **Explicit User Confirmation**: No silent or unattended updates. Every update requires reviewing target versions, package sources, and safety warnings with an explicit confirmation checkbox.
- **Background Scans & In-App Alerts**: Background scheduler automatically evaluates scan intervals, queues scans for connected agents, and triggers notifications with zero silent installations.
- **Safe Command Execution**: The Windows Local Agent operates under a strict command allowlist (`^[A-Za-z0-9_.-]+$`), preventing shell injection or untrusted path execution.
- **Post-Update Version Verification**: Rescans package versions after installation to verify that the target version was applied, detecting `REBOOT_REQUIRED` states (Exit Code 3010).
- **Security Insights**: Integrates with the public Open Source Vulnerabilities (OSV) API to audit detected software without fabricating synthetic CVEs.
- **Operational Audit Trail & CSV Export**: Complete history of scans, update attempts, before/after versions, and exit codes, with one-click RFC 4180 CSV export.
- **Clean Database Template**: Release packages unpack a pristine, empty schema template (`clean.db`), never bundling development machines' applications.

---

## System Architecture

```
User Web Browser (Next.js 14 Dashboard)
         │
         │ Authenticated REST API (JWT Bearer Token)
         ▼
Node.js + Express Backend Server
         │
         ├────► Database (SQLite file or Railway PostgreSQL via Prisma ORM)
         ├────► Open Source Vulnerability Database (OSV API)
         ├────► OpenAPI / Swagger UI (http://localhost:4000/api/docs)
         │
         ▼ Authenticated Heartbeat & Job Dispatch (x-agent-device-id / x-agent-token)
Windows Local Agent Daemon (Standalone Service)
         │
         ├────► Windows Package Manager (winget.exe)
         ├────► Windows Registry (HKLM/HKCU Uninstall Keys)
         │
         ▼
Installed Windows Desktop Applications
```

---

## Project Structure

```
updatepilot/
  ├── apps/
  │    ├── web/              # Next.js 14 App Router, Tailwind CSS, Lucide icons, Recharts
  │    ├── backend/          # Express REST API, Prisma ORM, Swagger, Job Orchestrator, JWT Auth
  │    ├── agent/            # Windows Local Agent (WinGet adapter, Registry scanner, Safety Engine)
  │    └── desktop/          # Electron desktop wrapper with secure IPC bridge and window frame
  ├── packages/
  │    └── shared/           # Shared types, Zod DTO schemas, SemVer & 4-part version comparators
  ├── dist/
  │    └── installer/        # Standalone UpdatePilot-Agent-Setup-1.0.0.exe installer
  ├── scripts/
  │    ├── run-tests.ps1     # Automated test suite (all workspaces and integration tests)
  │    ├── start-production.ps1 # Starts unified production server (static web + API)
  │    ├── build-agent-installer.ps1 # Builds NSIS standalone Windows Agent installer
  │    ├── generate-clean-db.mjs     # Generates pristine schema database template
  │    └── verify-multi-computer-isolation.mjs # Multi-workstation tenant isolation test
  ├── Dockerfile             # Unified production container (Backend + Static Web + SQLite/Postgres)
  ├── package.json           # Monorepo configuration
  └── README.md              # Project documentation
```

---

## Quick Start Guide

### 1. Prerequisites
- Windows 10 (1809+) or Windows 11.
- Windows Package Manager (`winget.exe`).
- Node.js v18+ (tested on Node v20/v24).

### 2. Installation
```powershell
# Clone the repository
git clone https://github.com/YOUR_USERNAME/UpdatePilot.git
cd UpdatePilot

# Install monorepo dependencies
npm install

# Build shared library, backend, and agent
npm run build --workspace=packages/shared
npm run build --workspace=apps/backend
npm run build --workspace=apps/agent
```

### 3. Start Production Server
```powershell
powershell -ExecutionPolicy Bypass -File scripts\start-production.ps1
```
- **Web Dashboard**: [http://localhost:4000](http://localhost:4000)
- **REST API & Swagger Docs**: [http://localhost:4000/api/docs](http://localhost:4000/api/docs)
- **Agent Installer Download**: [http://localhost:4000/downloads/UpdatePilot-Agent-Setup-1.0.0.exe](http://localhost:4000/downloads/UpdatePilot-Agent-Setup-1.0.0.exe)

---

## Environment Variables

Copy `.env.example` to `.env` or set these in your hosting environment (e.g., Railway):

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `PORT` | HTTP Server port | `4000` |
| `NODE_ENV` | Runtime environment | `production` |
| `DATABASE_URL` | Database connection URL | `file:./apps/backend/prisma/dev.db` (SQLite) or `postgresql://...` |
| `JWT_SECRET` | Secret key for signing user auth tokens | *Generate a 32+ character random string* |
| `CORS_ORIGIN` | Allowed CORS origins | `http://localhost:3000,http://localhost:4000` |
| `PAIRING_SECRET` | Fallback pairing token for testing | `updatepilot_pair_token_default_12345` |
| `STATIC_WEB_DIR` | Path to static frontend export | `./apps/web/out` |

---

## Automated Test Suite

UpdatePilot includes 28 automated tests across unit logic, WinGet parsers, backend APIs, multi-user isolation, desktop packaging, and multi-workstation isolation:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\run-tests.ps1
```

---

## Cloud Deployment (Railway)

UpdatePilot is packaged for single-service deployment on Railway using Docker:

1. Create a new project in [Railway.app](https://railway.app).
2. Provision a **PostgreSQL** database service (optional, or use persistent volume with SQLite).
3. Connect your GitHub repository (`UpdatePilot`).
4. Set Environment Variables:
   - `JWT_SECRET`: Generate a secure random string.
   - `DATABASE_URL`: Set to Railway's PostgreSQL connection string (or use persistent SQLite).
5. Deploy. Railway builds from the root `Dockerfile` and serves both the web frontend and API.

---

## GitHub Setup & Privacy Guidelines

- **Recommended Visibility**: **Private** repository.
- Ensure personal development databases (`dev.db`), `.env` secrets, and agent runtime configurations (`agent-config.json`) are excluded by `.gitignore`.
- Use `git push -u origin master` (or `main`) after creating the remote repository on GitHub.
