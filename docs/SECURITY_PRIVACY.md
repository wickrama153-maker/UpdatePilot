# UpdatePilot — Security, Privacy, and Data Governance

## 1. Security Architecture Principles

### 1.1 Least Privilege & Safe Execution
- **Constrained Interface**: The Windows Local Agent operates under a strict command allowlist. It cannot execute arbitrary commands, format drives, or access user folders.
- **Zero Shell Injection**: Package IDs and version numbers are sanitized with strict regular expressions.
- **Digital Signatures**: The agent delegates all package downloads and installations to Windows Package Manager (`winget.exe`), which enforces Microsoft Store and WinGet Community catalog digital signature and SHA256 hash verifications.

### 1.2 Explicit Confirmation Model
- Unattended silent background updates are strictly blocked by default.
- Users must review a dedicated update preview showing the package name, package source, current version, target version, and warnings.
- The confirmation button is only enabled when the user explicitly checks the confirmation checkbox.

### 1.3 Audit Logging & Accountability
- Every operational action (pairing, scan start, scan complete, update preview, update confirmation, execution result, revocation) is recorded in the immutable `AuditEvent` table.
- Logs include actor identity, timestamps, exit codes, and verification notes.

---

## 2. Privacy Policy & Data Collection Scope

### 2.1 What UpdatePilot Collects
- Detected application name and publisher.
- Installed software version and available version.
- Package Manager identifier (e.g. `Git.Git`, `Mozilla.Firefox`).
- Machine host name, OS name, version, and architecture.
- Timestamps of scan and update jobs.

### 2.2 What UpdatePilot NEVER Collects
- Personal documents, photos, or files.
- Browser history, passwords, or session cookies.
- Keystrokes, screen recordings, or audio.
- Personally identifiable information (PII) beyond local device identifiers.

---

## 3. Data Retention & Revocation

- **Retention Preferences**: Configurable via Settings (30, 90, 180, or 365 days).
- **Revocation**: If a device is revoked in Settings, all agent credentials are immediately invalidated. Reconnecting requires generating a new pairing token.
