# UpdatePilot — System Architecture & Design Specification

## 1. High-Level Architecture Overview

UpdatePilot is engineered around a secure multi-tier desktop architecture:

1. **Windows Desktop Shell (Electron)**: Native Windows desktop host with context isolation, secure preload bridge, and process orchestration.
2. **Frontend UI (Next.js React Client)**: Pre-rendered static single-page application running locally inside the desktop shell.
3. **Backend API Server (Express + Prisma ORM)**: Local microservice managing job state, SQLite database persistence in `%LOCALAPPDATA%\UpdatePilot`, and REST APIs.
4. **Windows Local Agent (Node.js Daemon)**: Dedicated Windows agent connecting directly to the Windows Package Manager (`winget`) and the Windows Registry (`HKLM` & `HKCU`).

```
+-----------------------------------------------------------------------------------+
|                         UpdatePilot Windows Desktop Host                          |
|                                                                                   |
|  +-----------------------------------------------------------------------------+  |
|  |                    Electron Main Process (apps/desktop)                     |  |
|  |  - Single-Instance Lock                                                     |  |
|  |  - Windows Lifecycle & Auto-shutdown (before-quit)                          |  |
|  |  - Process Spawner: Backend API & Windows Agent                             |  |
|  |  - Preload Context Bridge (apps/desktop/dist/preload.js)                    |  |
|  +-----------------------------------------------------------------------------+  |
|         |                                                             |           |
|         | Context Isolation (No Node Integration in UI)               | IPC       |
|         v                                                             v           |
|  +-------------------------------------+             +-------------------------+  |
|  |     Desktop Interface Window        |             |  Electron IPC Handlers  |  |
|  |     (Next.js Client / Recharts)     |             |  - Window Controls      |  |
|  +-------------------------------------+             |  - System Info          |  |
|                     |                                +-------------------------+  |
|                     | HTTP REST / JSON (127.0.0.1:4000)                           |
|                     v                                                             |
|  +-----------------------------------------------------------------------------+  |
|  |                    UpdatePilot Express API Server                           |  |
|  |  - Port 4000 (OpenAPI / Swagger at /api/docs)                               |  |
|  |  - SQLite Database: %LOCALAPPDATA%\UpdatePilot\updatepilot.db               |  |
|  |  - In-App Notifications & Job Cancellation Engine                           |  |
|  +-----------------------------------------------------------------------------+  |
|         ^                                                                         |
|         | Authenticated Polling & Heartbeat                                       |
|         v                                                                         |
|  +-----------------------------------------------------------------------------+  |
|  |                    UpdatePilot Windows Agent                                |  |
|  |  - WinGet Package Integration (winget list, winget upgrade)                |  |
|  |  - Windows Registry Scanner (HKLM & HKCU Uninstall keys)                   |  |
|  |  - Independent Package ID & Version Injection Guards                        |  |
|  |  - Post-Update Verification Engine                                          |  |
|  +-----------------------------------------------------------------------------+  |
|                                                                                   |
+-----------------------------------------------------------------------------------+
```

---

## 2. Core Security & Isolation Boundaries

- **Context Isolation & Sandbox**: Electron BrowserWindow runs with `contextIsolation: true`, `nodeIntegration: false`, and `sandbox: true`. No Node.js runtime or `child_process` is accessible to frontend JavaScript.
- **Safe External Navigation**: All external hyperlinks (e.g. publisher websites, release notes, GitHub repos) are intercepted and opened exclusively in the default system browser via `shell.openExternal()`.
- **No Arbitrary Shell Execution**: The UI and backend never construct or execute raw shell strings.
- **Fixed Operation Allowlist**: The Windows Local Agent only executes allowlisted operations (`winget list`, `winget upgrade --id <packageId> --version <targetVersion>`).
- **Independent Agent Validation**: The agent independently re-validates the package identifier against strict regex bounds (`^[A-Za-z0-9_.-]{3,128}$`) and rejects any shell injection characters.
- **User-Confirmed Updates Only**: Silent or unattended updates are disallowed by design. Every update requires an explicit preview and user confirmation checkbox.
- **Post-Update Rescan & Verification**: An update job is never marked as `COMPLETED` based merely on process launch. The agent rescans the installed application version and compares it with the target version before certifying success.
- **Reboot Detection**: Return codes `3010` (ERROR_SUCCESS_REBOOT_REQUIRED) and `1641` (ERROR_SUCCESS_REBOOT_INITIATED) are explicitly classified as `REBOOT_REQUIRED`.

---

## 3. Data Storage & Windows Compliance

In accordance with Windows software certification standards:
- **Persistent Data**: SQLite database (`updatepilot.db`) and log files are stored strictly in `%LOCALAPPDATA%\UpdatePilot\`.
- **Binaries & Resources**: The application executable, Electron dependencies, and embedded scripts are located in `%LOCALAPPDATA%\Programs\UpdatePilot\`.
- **No Writes to Program Files**: The application never writes writable application state into `Program Files` or the installation directory, avoiding Windows UAC virtualization issues and permission errors.
