# UpdatePilot — REST API Reference

The UpdatePilot Backend API exposes typed REST endpoints documented with OpenAPI 3.0.
Interactive Swagger documentation is available locally at: `http://localhost:4000/api/docs`.

---

## 1. Dashboard & System Metrics

### `GET /api/v1/dashboard`
Returns live aggregate system metrics for the Overview Dashboard.
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "data": {
      "totalApplications": 183,
      "updatesAvailable": 29,
      "upToDate": 151,
      "unmatched": 3,
      "unsupported": 0,
      "lastScanTimestamp": "2026-10-28T08:09:08.773Z",
      "agentConnected": true,
      "activeDevice": {
        "id": "f086362d-1b92-4df3-9b68-86a87da96656",
        "name": "Chamidu",
        "osName": "Windows",
        "osVersion": "Windows_NT 10.0.22621",
        "architecture": "x64",
        "agentVersion": "1.0.0",
        "status": "ONLINE"
      },
      "recentScans": [],
      "recentUpdates": [],
      "securityAdvisoriesCount": 0
    }
  }
  ```

---

## 2. Device Management & Agent Pairing

### `POST /api/v1/devices/token`
Generates a cryptographically random, one-time pairing token valid for 15 minutes.
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "data": {
      "pairingToken": "UP-4B81A02F",
      "expiresInSeconds": 900
    }
  }
  ```

### `POST /api/v1/devices/pair`
Pairs a local Windows Agent with the platform.
- **Request Body**:
  ```json
  {
    "deviceName": "Chamidu",
    "osName": "Windows",
    "osVersion": "Windows 11 (22621)",
    "architecture": "x64",
    "agentVersion": "1.0.0",
    "pairingToken": "UP-4B81A02F"
  }
  ```
- **Response `201 Created`**:
  ```json
  {
    "success": true,
    "data": {
      "device": { "id": "uuid", "name": "Chamidu", "status": "ONLINE" },
      "agentToken": "agt_9f834a..."
    }
  }
  ```

### `POST /api/v1/devices/:id/scans`
Initiates an asynchronous discovery scan job on the specified device.
- **Response `202 Accepted`**:
  ```json
  {
    "success": true,
    "data": {
      "id": "scan-job-uuid",
      "deviceId": "uuid",
      "status": "PENDING"
    }
  }
  ```

---

## 3. Applications Inventory

### `GET /api/v1/applications`
Queries discovered software inventory with filters and pagination.
- **Query Parameters**:
  - `page` (number, default: 1)
  - `pageSize` (number, default: 20)
  - `search` (string)
  - `status` (`ALL` | `UPDATE_AVAILABLE` | `UP_TO_DATE` | `UNMATCHED` | `UNSUPPORTED`)
  - `publisher` (string)
  - `sortBy` (`name` | `publisher` | `installedVersion` | `updateStatus`)
  - `sortOrder` (`asc` | `desc`)

### `GET /api/v1/applications/:id`
Retrieves detailed application metadata, release information, and past update jobs.

### `POST /api/v1/applications/:id/pin`
Toggles pinned state for prioritising critical software.

---

## 4. Update Center

### `GET /api/v1/updates`
Returns all applications with an available upgrade.

### `POST /api/v1/updates/:id/preview`
Generates a pre-update impact preview.
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "data": {
      "applicationId": "uuid",
      "applicationName": "Git",
      "packageId": "Git.Git",
      "installedVersion": "2.54.0",
      "targetVersion": "2.56.0.3",
      "isUpgrade": true,
      "source": "winget",
      "warnings": [
        "The application will be updated using Windows Package Manager (WinGet).",
        "Please save open files before proceeding to avoid loss of unsaved work."
      ]
    }
  }
  ```

### `POST /api/v1/updates/:id/execute`
Executes an update **only** when `confirmed: true`.
- **Request Body**:
  ```json
  {
    "targetVersion": "2.56.0.3",
    "confirmed": true
  }
  ```

---

## 5. History & Reporting

### `GET /api/v1/history`
Returns chronological scan and update execution logs with before/after version diffs.

### `GET /api/v1/history/export?format=csv`
Streams an RFC 4180-compliant CSV export of the entire detected software inventory.

---

## 6. Security & Vulnerability Insights

### `GET /api/v1/security/findings`
Returns verified vulnerability records mapped from the public OSV database.

### `POST /api/v1/security/scan`
Audits detected software packages against the OSV API.
