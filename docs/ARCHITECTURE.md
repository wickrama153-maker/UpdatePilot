# UpdatePilot — System Architecture & Design Specification

## 1. High-Level Architecture Overview

UpdatePilot is engineered around a secure three-tier architecture:
1. **Frontend Web Dashboard**: Next.js 14 App Router, TypeScript, Tailwind CSS, Lucide icons, and Recharts. Operates in user space without direct OS privileges.
2. **Backend API Server**: Node.js & Express REST API with Prisma ORM, OpenAPI/Swagger specifications, and strict schema validation. Manages job queues, state persistence, release cache, and device access control.
3. **Windows Local Agent**: A dedicated local service running on the Windows host machine. Connects directly to the Windows Package Manager (`winget`) and Windows Registry. Communicates with the backend exclusively via an authenticated, least-privilege API channel.

```
+-------------------------------------------------------------+
|                     Next.js Web Client                      |
|           http://localhost:3000 (React + Tailwind)          |
+-------------------------------------------------------------+
                              |
                     REST API / JSON
                              v
+-------------------------------------------------------------+
|                UpdatePilot Express API Server               |
|            http://localhost:4000 (OpenAPI/Swagger)          |
+-------------------------------------------------------------+
      |                       |                       |
      v                       v                       v
[ SQLite / Postgres ]   [ OSV Security API ]   [ Auth & Audit Logs ]
(Prisma ORM Database)   (Vulnerability Feeds)  (Operational History)
                              ^
                              | Authenticated Polling & Heartbeat
                              v
+-------------------------------------------------------------+
|                 UpdatePilot Windows Agent                   |
|               (Local Node.js / CLI Daemon)                  |
+-------------------------------------------------------------+
      |                                               |
      v                                               v
[ WinGet CLI (v1.29+) ]                     [ Windows Registry ]
(winget list, upgrade)                      (HKLM / HKCU Uninstall)
      |                                               |
      +-----------------------+-----------------------+
                              v
            [ Local Installed Desktop Applications ]
```

---

## 2. Core Security & Isolation Boundaries

- **No Arbitrary Shell Execution**: The web dashboard and backend never receive or execute raw command-line strings.
- **Fixed Operation Allowlist**: The Windows Local Agent only executes allowlisted operations (`winget list`, `winget upgrade --id <packageId> --version <targetVersion>`).
- **Independent Agent Validation**: Even though the backend validates update proposals, the agent independently re-validates the package identifier against strict regex bounds (`^[A-Za-z0-9_.-]{3,128}$`) and rejects any shell injection characters.
- **User-Confirmed Updates Only**: Silent or unattended updates are disallowed by design. Every update requires an explicit preview and user confirmation checkbox.
- **Post-Update Rescan & Verification**: An update job is never marked as `COMPLETED` based merely on process launch. The agent rescans the installed application version and compares it with the target version before certifying success.
- **Reboot Detection**: Return codes `3010` (ERROR_SUCCESS_REBOOT_REQUIRED) and `1641` (ERROR_SUCCESS_REBOOT_INITIATED) are explicitly classified as `REBOOT_REQUIRED` instead of failure or premature completion.
