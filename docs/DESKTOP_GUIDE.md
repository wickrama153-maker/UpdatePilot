# UpdatePilot — Windows Desktop Software Guide

## 1. Overview

**UpdatePilot** is packaged as a native, installable Windows desktop software application for **Windows 10** and **Windows 11**.

The desktop software integrates:
1. **Electron Desktop Shell** (`apps/desktop`): Secure, context-isolated Chromium and Node.js desktop environment.
2. **Embedded Backend API Engine** (`apps/backend`): Local Express server managing SQLite persistence, schema migrations, REST endpoints, and OpenAPI documentation.
3. **Native Windows Local Agent** (`apps/agent`): Local Windows daemon executing real package discovery (`winget` + Registry), update intelligence, safety validations, and post-update verifications.
4. **Rich Desktop Interface** (`apps/web/out`): Next.js React client application running offline inside the native desktop window.

---

## 2. Windows Desktop Specifications

| Feature | Specification |
|---|---|
| **Target OS** | Windows 10 & Windows 11 (64-bit, x64) |
| **Application Name** | UpdatePilot |
| **Executable Name** | `UpdatePilot.exe` |
| **Installer Name** | `UpdatePilot-Setup-1.0.0.exe` |
| **Installer Technology** | NSIS (Nullsoft Scriptable Install System) via `electron-builder` |
| **Install Directory** | `%LOCALAPPDATA%\Programs\UpdatePilot` (Per-user, no admin prompt required for installation) |
| **Database Directory** | `%LOCALAPPDATA%\UpdatePilot\updatepilot.db` (Persistent SQLite, preserved across updates) |
| **Log Directory** | `%LOCALAPPDATA%\UpdatePilot\logs` |
| **Application Icons** | Multi-resolution `.ico` containing 16×16, 32×32, 48×48, 256×256 pixels |
| **Desktop Shortcut** | Created automatically on Desktop during installation |
| **Start Menu Shortcut** | Created in Start Menu under `UpdatePilot` |
| **Uninstaller** | Registered in Windows Settings ("Installed apps") & Control Panel ("Programs and Features") |

---

## 3. Architecture & Security Model

```
+-----------------------------------------------------------------------------------+
|                           UpdatePilot Desktop Application                         |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|  +-----------------------------------------------------------------------------+  |
|  |                        Electron Main Process (main.ts)                      |  |
|  |  - Single Instance Lock (requestSingleInstanceLock)                         |  |
|  |  - Windows Lifecycle & Auto-shutdown (before-quit, window-all-closed)        |  |
|  |  - Spawns & monitors Local Backend Service (child_process)                  |  |
|  |  - Spawns & monitors Windows Local Agent (child_process)                     |  |
|  |  - Preloads Secure Context Bridge (preload.ts)                              |  |
|  +-----------------------------------------------------------------------------+  |
|         |                                                             |           |
|         | Context Isolation (No Node Integration in UI)               | IPC       |
|         v                                                             v           |
|  +-------------------------------------+             +-------------------------+  |
|  |      Desktop Renderer Window        |             |  Electron IPC Handlers  |  |
|  |  - Next.js UI (apps/web/out)        |             |  - window-minimize      |  |
|  |  - 6 Functional Views               |             |  - window-maximize      |  |
|  |  - Dark/Light Theme                 |             |  - window-close         |  |
|  |  - Direct calls to http://127.0.0.1 |             |  - get-system-info      |  |
|  +-------------------------------------+             |  - open-external (safe) |  |
|                     |                                +-------------------------+  |
|                     | HTTP / REST (port 4000)                                     |
|                     v                                                             |
|  +-----------------------------------------------------------------------------+  |
|  |                         UpdatePilot Backend API                             |  |
|  |  - Express REST API (apps/backend)                                          |  |
|  |  - SQLite Database: %LOCALAPPDATA%\UpdatePilot\updatepilot.db               |  |
|  |  - Serves Static Web UI from bundled assets                                 |  |
|  |  - Job Cancellation & Scheduler Engine                                      |  |
|  +-----------------------------------------------------------------------------+  |
|         ^                                                                         |
|         | Secure Device Pairing & Heartbeat                                       |
|         v                                                                         |
|  +-----------------------------------------------------------------------------+  |
|  |                        Windows Local Agent Daemon                           |  |
|  |  - WinGet Package Engine (winget list, winget upgrade, winget show)         |  |
|  |  - Windows Registry Scanner (HKLM & HKCU Uninstall keys)                   |  |
|  |  - Independent Safety Guard (Package ID & Target Version validation)       |  |
|  |  - Post-Update Verification Engine                                          |  |
|  +-----------------------------------------------------------------------------+  |
|                                                                                   |
+-----------------------------------------------------------------------------------+
```

### Security Guarantees:
1. **Context Isolation**: Enabled (`contextIsolation: true`). The renderer cannot access `process`, `require`, `Buffer`, or `child_process`.
2. **Node Integration Disabled**: Renderer runs in a strictly sandboxed Chromium environment (`nodeIntegration: false`, `sandbox: true`).
3. **Safe Navigation Handler**: External URLs clicked in the UI (e.g. publisher release notes, GitHub changelogs) are intercepted and opened in the user's default system browser via `shell.openExternal()`. The desktop window cannot be hijacked or navigated away from the application.
4. **Data Isolation**: Persistent application state (discovered applications, scan history, update logs, settings) is stored in the standard Windows per-user AppData directory (`%LOCALAPPDATA%\UpdatePilot\updatepilot.db`). The app never attempts to write persistent state into `Program Files`, preventing permission errors and preserving data across software updates.

---

## 4. Building the Desktop Installer

### Prerequisites
- Node.js `v18+` or `v20+` or `v24+`
- Windows 10 or Windows 11 (64-bit)

### Build Commands

```powershell
# 1. From repository root, compile all workspaces and assemble build resources
npm.cmd run build

# 2. Package electron desktop application and generate NSIS installer
npm.cmd run dist
```

Alternatively, from the `apps/desktop` folder:
```powershell
cd "apps\desktop"
npm.cmd run dist
```

### Generated Artifacts
The NSIS Windows installer is written to:
`dist\installer\UpdatePilot-Setup-1.0.0.exe`

Alongside the unpacked standalone application folder:
`dist\installer\win-unpacked\`

---

## 5. Installing and Launching UpdatePilot

1. **Run Installer**: Double-click `dist\installer\UpdatePilot-Setup-1.0.0.exe`.
2. **Setup Wizard**:
   - The installer displays the UpdatePilot installation wizard.
   - Choose install location (defaults to `%LOCALAPPDATA%\Programs\UpdatePilot`).
   - Check **Create Desktop Shortcut** (selected by default).
   - Check **Create Start Menu Shortcut** (selected by default).
   - Click **Install**.
3. **Launch**:
   - Double-click the **UpdatePilot** shortcut on your Desktop or search for **UpdatePilot** in the Start Menu.
   - The desktop application launches immediately with a branded splash screen while background services initialize.
   - Within seconds, the full UpdatePilot dashboard appears with all 6 operational views.
4. **Uninstall**:
   - Open **Windows Settings** > **Apps** > **Installed apps** (or Control Panel > **Programs and Features**).
   - Locate **UpdatePilot**, click **Uninstall**.
   - The uninstaller cleanly removes all application binaries and shortcuts.
