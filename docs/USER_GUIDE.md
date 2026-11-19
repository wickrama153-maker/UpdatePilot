# UpdatePilot — User Guide

Welcome to **UpdatePilot — Software Update Intelligence & Management Platform**!
This guide walks you through setup, software inventory discovery, previewing updates, executing safe updates, and reviewing audit history.

---

## 1. Quick Launch

1. Start the Backend API Server:
   ```powershell
   cd "apps\backend"
   node dist/index.js
   ```
2. Start the Windows Local Agent:
   ```powershell
   cd "apps\agent"
   node dist/index.js
   ```
3. Open the Web Dashboard:
   Navigate your browser to [http://localhost:3000](http://localhost:3000).

---

## 2. Navigating the Web Dashboard

### Module 1: Overview Dashboard
- **Health Indicators**: Check total applications discovered, updates available, and the live status of your Windows Agent (`Online` or `Offline`).
- **Interactive Visualizations**: Hover over the Update Status Health donut chart and the Publisher Distribution bar chart.
- **Scan Applications**: Click the blue **Scan Applications** button at the top right to start a full discovery scan at any time.

### Module 2: Application Inventory
- **Search**: Search for any application by name, publisher, or WinGet package ID.
- **Filter Tabs**: Toggle between *All Packages*, *Updates Available*, *Up to Date*, and *Unmatched / Registry*.
- **Publisher Dropdown**: Narrow results by specific software vendors.
- **Details Modal**: Click **Details** on any application row to view package metadata, source, and publisher links.
- **Pinning**: Click the pin icon next to any software to bookmark critical tools.

### Module 3 & 4: Update Center
- Dedicated view of all software packages with available upgrades.
- **Review & Update**: Click to open the update preview modal.
- Inspect the version comparison (Current Installed $\rightarrow$ Available Target).
- Read safety warnings.
- Check the confirmation box: *"I confirm that I want to execute this software update on this Windows machine now."*
- Click **Confirm & Execute Update**.
- Monitor the live installer progress, post-update rescan, and version verification.

### Module 5: Security Insights
- Review public vulnerability disclosures from the OSV database.
- Click **Audit Packages** to perform an on-demand audit.
- Inspect severity ratings (Critical, High, Medium, Low) and affected version ranges.

### Module 6: History & Logs
- Filter by *Update Executions*, *Discovery Scans*, or *Security Audit Events*.
- Inspect installer exit codes and verification diagnostics.
- Click **Export Inventory CSV** to download an inventory spreadsheet of your software.

### Module 7: Settings & Agent Management
- Generate new one-time agent pairing tokens.
- Revoke compromised or decommissioned agents.
- Switch between **Dark Mode** and **Light Mode**.
- Set automatic background scan frequencies and log retention limits.
