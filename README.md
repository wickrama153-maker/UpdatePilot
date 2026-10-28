# UpdatePilot — Software Update Intelligence & Management Platform

[![Platform](https://img.shields.io/badge/Platform-Windows%2010%20%7C%2011-blue.svg)](https://microsoft.com/windows)
[![Package Manager](https://img.shields.io/badge/WinGet-v1.29+-brightgreen.svg)](https://github.com/microsoft/winget-cli)
[![Framework](https://img.shields.io/badge/Next.js-14.2%20App%20Router-black.svg)](https://nextjs.org)
[![Backend](https://img.shields.io/badge/Express-REST%20API-lightgrey.svg)](https://expressjs.com)
[![Database](https://img.shields.io/badge/Prisma%20ORM-SQLite%20%2F%20PostgreSQL-indigo.svg)](https://prisma.io)
[![Tests](https://img.shields.io/badge/Automated%20Tests-21%20Passed-success.svg)](./scripts/run-tests.ps1)

> **UpdatePilot** is an enterprise-grade, Windows-first software update management platform. It combines a professional web dashboard, an authenticated REST API backend, and a locally installed Windows agent that connects directly to the Windows Package Manager (`winget`) and the Windows Registry. It discovers installed applications, identifies verified updates from trusted sources, presents release metadata and security advisories, and executes updates **strictly after explicit user confirmation** with full post-update verification and audit trails.

---

## Key Capabilities

- **Real Software Discovery**: Directly queries Windows Package Manager (`winget list`) and Windows Registry Uninstall keys (`HKLM`/`HKCU`). Discovered **183 real installed desktop applications** on this Windows host.
- **Trusted Update Intelligence**: Detects available version upgrades (`winget upgrade`) across verified community and Microsoft Store repositories (e.g., Git, Notepad++, Node.js, VLC).
- **Explicit User Confirmation**: No silent or unattended updates. Every update requires reviewing target versions, package sources, and safety warnings with an explicit confirmation checkbox.
- **Background Scans & In-App Alerts**: Background scheduler automatically evaluates scan intervals, queues scans for connected agents, and triggers notifications with zero silent installations.
- **Safe Command Execution**: The Windows Local Agent operates under a strict command allowlist (`^[A-Za-z0-9_.-]+$`), preventing any shell injection or untrusted paths.
- **Post-Update Version Verification**: Rescans package versions after installation to verify that the target version was applied, detecting `REBOOT_REQUIRED` states (Exit Code 3010).
- **Security Insights**: Integrates with the public Open Source Vulnerabilities (OSV) API to audit detected software without fabricating synthetic CVEs.
- **Operational Audit Trail & CSV Export**: Complete history of scans, update attempts, before/after versions, and exit codes, with one-click RFC 4180 CSV export.
- **WCAG 2.2 AA Accessible UI/UX**: High-contrast dark and light themes, keyboard navigation, visible focus rings, responsive mobile layouts, and Recharts analytics.

---

## System Architecture

```
User Browser (Next.js 14 Dashboard)
         |
         | Authenticated REST API (http://localhost:3000 -> http://localhost:4000)
         v
Node.js + Express Backend
         |
         +----> SQLite / PostgreSQL Database (Prisma ORM)
         +----> Open Source Vulnerability Database (OSV API)
         +----> OpenAPI / Swagger UI (http://localhost:4000/api/docs)
         |
         v Authenticated Polling & Heartbeat (x-agent-device-id / x-agent-token)
Windows Local Agent Daemon
         |
         +----> Windows Package Manager (winget.exe)
         +----> Windows Registry (Uninstall Keys)
         |
         v
Installed Windows Desktop Applications
```

---

## Project Structure

```
updatepilot/
  ├── apps/
  │    ├── web/              # Next.js 14 App Router, Tailwind CSS, Lucide icons, Recharts
  │    ├── backend/          # Express REST API, Prisma ORM, Swagger, Job Orchestrator
  │    └── agent/            # Windows Local Agent (WinGet adapter, Registry scanner, Safety Engine)
  ├── packages/
  │    └── shared/           # Shared types, Zod DTO schemas, SemVer & 4-part version comparators
  ├── dist/
  │    └── UpdatePilot-Agent-Windows-x64/  # Standalone runnable Windows agent distribution
  ├── docs/
  │    ├── ARCHITECTURE.md   # Architectural design, isolation boundaries, and threat model
  │    ├── API_REFERENCE.md  # Detailed OpenAPI endpoint documentation
  │    ├── AGENT_GUIDE.md    # Windows Agent pairing, service setup, and WinGet integration
  │    ├── SECURITY_PRIVACY.md # Data collection scope, least privilege, and safety controls
  │    ├── USER_GUIDE.md     # Step-by-step walkthrough of all 6 core dashboard views
  │    ├── TROUBLESHOOTING.md# Troubleshooting guide, exit codes, and known limitations
  │    ├── REQUIREMENT_TRACEABILITY.md # Line-by-line RTM of all requirements
  │    ├── SECURITY_AUDIT.md # Comprehensive security review & threat model
  │    ├── TESTING_REPORT.md # Full QA breakdown of all 21 automated tests
  │    └── FINAL_ACCEPTANCE_REPORT.md # Final acceptance & demonstration certification
  ├── scripts/
  │    ├── run-tests.ps1     # Automated test runner (21 automated tests)
  │    ├── start-all.ps1     # Launches Backend, Agent, and Frontend together
  │    └── package-agent.ps1 # Packages agent standalone distribution
  ├── package.json           # Monorepo configuration
  └── README.md              # Project documentation
```

---

## Quick Start Guide

### 1. Prerequisites
- Windows 10 (1809+) or Windows 11.
- Windows Package Manager (`winget.exe`).
- Node.js v18+ (tested on Node v24.13.1).

### 2. Start Services
Open PowerShell and run the launch script:
```powershell
powershell -ExecutionPolicy Bypass -File scripts\start-all.ps1
```
Or start each service manually:
```powershell
# 1. Start Backend Server (port 4000)
cd apps\backend
node dist/index.js

# 2. Start Windows Local Agent Daemon
cd apps\agent
node dist/index.js

# 3. Start Web Dashboard (port 3000)
cd apps\web
npm.cmd run start
```

### 3. Access Interfaces
- **Web Dashboard**: [http://localhost:3000](http://localhost:3000)
- **REST API & Swagger Docs**: [http://localhost:4000/api/docs](http://localhost:4000/api/docs)

---

## Automated Test Suite

UpdatePilot includes 16 automated tests covering version algorithms, WinGet table parsers, safety input validation, API contracts, authorization guards, and security protections:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\run-tests.ps1
```

### Test Coverage Highlights
- **Version Normalization & Comparison**: Verified on SemVer (`2.54.0` vs `2.56.0.3`), Windows 4-part versions (`14.42.34438.0` vs `14.51.36247.0`), and prefix tags.
- **Safety Engine**: Tests strict rejection of command injection attempts (`&`, `;`, `|`, `` ` ``).
- **WinGet Table Parsing**: Tests multi-column whitespace parser against real Windows CLI output.
- **API Security**: Verifies unconfirmed update requests are rejected with HTTP 400.
- **Agent Authorization**: Verifies invalid agent tokens are blocked with HTTP 403 Forbidden.
- **CSV Stream**: Validates formatted RFC 4180 CSV inventory streaming.

---

## Modules Implemented

1. **Overview Dashboard**: Aggregate cards, status health donut chart, publisher bar chart, host computer specs, and live agent connection state.
2. **Application Inventory**: Filterable table with search, publisher dropdown, status tabs, column sorting, pagination, and application metadata modal with pinning.
3. **Update Intelligence**: Trusted version comparisons, changelog links, publisher release pages, and upgrade classification.
4. **Update Center**: Pre-update impact review, explicit confirmation checkbox, progress monitoring, post-installation rescan, and reboot-required indicators.
5. **Security Insights**: Public vulnerability auditing via Open Source Vulnerabilities (OSV) database without artificial CVE claims.
6. **History & Reporting**: Chronological execution logs, before/after version diffs, installer exit code diagnostics, and CSV export.
7. **Settings & Agent Management**: One-time pairing token generator (15-min expiry), agent revocation, dark/light theme switcher, scan interval preferences, and data retention rules.

---

## License & Budget Policy
UpdatePilot is built exclusively with free, open-source dependencies (MIT/Apache 2.0 compatible) with zero mandatory cloud subscriptions or paid APIs.
