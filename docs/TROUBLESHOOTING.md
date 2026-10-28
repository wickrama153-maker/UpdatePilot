# UpdatePilot — Troubleshooting & Known Limitations

## 1. Common Troubleshooting Steps

### Agent Disconnected (Offline)
- **Symptom**: The navbar displays `Agent: Disconnected` or the device card shows `Offline`.
- **Cause**: The agent daemon is not running, or more than 3 minutes have passed since the last heartbeat.
- **Resolution**:
  1. Open a PowerShell terminal in `apps\agent`.
  2. Check status: `node dist/index.js --status`.
  3. Start the daemon: `node dist/index.js`.
  4. If credentials expired, generate a new pairing token in the dashboard Settings and run:
     `node dist/index.js --pair <token>`

### WinGet CLI Not Detected
- **Symptom**: Agent logs say `WinGet CLI is not detected on this machine. Falling back to Registry discovery.`
- **Cause**: Windows Package Manager is not in the system `PATH` or needs App Installer update.
- **Resolution**:
  1. Open Microsoft Store and ensure **App Installer** is up to date.
  2. Open PowerShell and run: `winget --version`.
  3. WinGet is installed natively on Windows 10 (1809+) and Windows 11.

### Installer Requires Reboot (Exit Code 3010)
- **Symptom**: Update job reports `Reboot Required` status.
- **Explanation**: This is expected behavior for kernel drivers, VC++ runtimes, and system components. The installer succeeded (`ERROR_SUCCESS_REBOOT_REQUIRED`). Restart your PC to finalize the installation.

### Installer Blocked by User Account Control (UAC)
- **Symptom**: Update job times out or fails with an elevation error.
- **Explanation**: Certain desktop installers require administrative elevation. Launch the agent or run the terminal as Administrator if you intend to update system-wide software packages.

---

## 2. Known Limitations

1. **Windows Platform Only (MVP)**: This release targets Windows 10/11. Linux and macOS support are out of scope for the MVP.
2. **Registry Software Update Detection**: Applications discovered strictly through the Windows Registry without a matching WinGet package ID are marked as `UNMATCHED`. Automatic one-click updates cannot be performed for unmatched packages to ensure system stability.
3. **Third-Party Changelog Availability**: Release notes and changelogs depend on package publishers publishing release manifests to the WinGet Community repository. If not published, UpdatePilot displays direct links to the official publisher website.
