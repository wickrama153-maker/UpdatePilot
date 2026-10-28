# UpdatePilot — Windows Local Agent Guide

The **UpdatePilot Windows Local Agent** is a secure, lightweight local service that interfaces directly with Windows Package Manager (`winget`) and the Windows Registry. It discovers installed applications, identifies package updates, and executes approved updates with rigorous post-installation verification.

---

## 1. Prerequisites

- **Operating System**: Windows 10 (version 1809+) or Windows 11 (build 22000+).
- **Package Manager**: Windows Package Manager (`winget.exe`). WinGet is preinstalled on modern Windows 10/11. Run `winget --version` in PowerShell to verify.
- **Runtime**: Node.js v18+ (tested with Node v24).

---

## 2. Installation & Quick Start

### Step 1: Install Dependencies & Build
```powershell
cd "apps\agent"
npm.cmd install
npm.cmd run build
```

### Step 2: Pair Agent with UpdatePilot Backend
In the UpdatePilot web dashboard under **Settings & Agent**, click **Generate Pairing Token**, then run:
```powershell
node dist/index.js --pair <PAIRING_TOKEN>
```
*Note: For local automated setup, the default token `updatepilot_pair_token_default_12345` pairs immediately.*

### Step 3: Run Ad-hoc Software Discovery
```powershell
node dist/index.js --scan
```
The agent scans all WinGet packages and Registry uninstall entries, reporting the unified inventory to the backend.

### Step 4: Run Background Daemon
```powershell
node dist/index.js
```
The daemon runs continuously, dispatching heartbeats every 5 seconds, picking up scan requests triggered from the dashboard, and executing approved update jobs.

---

## 3. Command Reference

| Flag | Description |
|---|---|
| *(none)* | Starts the background polling daemon and heartbeat. |
| `--pair <token>` | Securely pairs the agent with the backend and saves credentials to `agent-config.json`. |
| `--scan` | Performs an immediate local discovery scan and uploads the inventory. |
| `--status` | Displays device hostname, OS version, architecture, and current pairing status. |

---

## 4. Agent Safety & Security Architecture

1. **Independent Validation**: The agent never trusts the backend blindly. Every job received is checked against strict regular expressions:
   - Package IDs must match `^[A-Za-z0-9_.-]{3,128}$`.
   - Versions must match `^[A-Za-z0-9_.\-+() ]{1,64}$`.
   - Shell metacharacters (`;&|`$><!\\"'\r\n\t`) cause immediate job termination.
2. **Fixed WinGet Upgrade Parameters**:
   `winget upgrade --id <packageId> --version <targetVersion> --exact --accept-source-agreements --accept-package-agreements --disable-interactivity`
3. **Exit Code & Reboot Handling**:
   - Exit Code `0`: Success.
   - Exit Code `3010` / `1641`: Success with Reboot Required.
   - Other exit codes: Failed with captured error diagnostics.
4. **Post-Update Version Rescan**:
   After installer termination, the agent executes `winget list --id <packageId>` to verify that the reported installed version matches the expected target.
