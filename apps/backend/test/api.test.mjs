import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../dist/app.js';

const BASE_URL = 'http://localhost:4000/api/v1';
let localServer = null;

before(async () => {
  try {
    const res = await fetch(`${BASE_URL}/health`);
    if (res.ok) return;
  } catch {
    await new Promise((resolve) => {
      localServer = app.listen(4000, resolve);
    });
  }
});

after(() => {
  if (localServer) {
    localServer.close();
  }
});

test('API Healthcheck', async () => {
  const res = await fetch(`${BASE_URL}/health`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.status, 'ok');
  assert.equal(data.service, 'UpdatePilot Backend API');
});

test('Dashboard Endpoint Returns Live Operational Metrics', async () => {
  const res = await fetch(`${BASE_URL}/dashboard`);
  assert.equal(res.status, 200);
  const json = await res.json();

  assert.equal(json.success, true);
  assert.ok(typeof json.data.totalApplications === 'number');
  assert.ok(typeof json.data.updatesAvailable === 'number');
  assert.ok(typeof json.data.upToDate === 'number');
  assert.ok(typeof json.data.agentConnected === 'boolean');
});

test('Applications Endpoint Supports Search, Status Filtering, and Pagination', async () => {
  // 1. List with pagination
  const resAll = await fetch(`${BASE_URL}/applications?page=1&pageSize=5`);
  assert.equal(resAll.status, 200);
  const jsonAll = await resAll.json();
  assert.equal(jsonAll.success, true);
  assert.equal(jsonAll.data.items.length, 5);
  assert.ok(jsonAll.data.total >= 5);

  // 2. Filter by status: UPDATE_AVAILABLE
  const resUpdates = await fetch(`${BASE_URL}/applications?status=UPDATE_AVAILABLE`);
  assert.equal(resUpdates.status, 200);
  const jsonUpdates = await resUpdates.json();
  assert.equal(jsonUpdates.success, true);
  for (const item of jsonUpdates.data.items) {
    assert.equal(item.updateStatus, 'UPDATE_AVAILABLE');
  }

  // 3. Search query
  const resSearch = await fetch(`${BASE_URL}/applications?search=Git`);
  assert.equal(resSearch.status, 200);
  const jsonSearch = await resSearch.json();
  assert.equal(jsonSearch.success, true);
  assert.ok(jsonSearch.data.items.some((app) => app.name.toLowerCase().includes('git')));
});

test('Updates Endpoint Lists Available Updates with Package Identifiers', async () => {
  const res = await fetch(`${BASE_URL}/updates`);
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.success, true);
  assert.ok(Array.isArray(json.data));
  assert.ok(json.data.length > 0);

  const first = json.data[0];
  assert.ok(first.id);
  assert.ok(first.name);
  assert.ok(first.installedVersion);
  assert.ok(first.availableVersion);
});

test('Update Execution Rejects Unconfirmed Requests (Security Guarantee)', async () => {
  const updatesRes = await fetch(`${BASE_URL}/updates`);
  const updatesJson = await updatesRes.json();
  const sample = updatesJson.data[0];

  // Request execution with confirmed: false
  const execRes = await fetch(`${BASE_URL}/updates/${sample.id}/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      targetVersion: sample.availableVersion,
      confirmed: false, // NOT confirmed!
    }),
  });

  assert.equal(execRes.status, 400);
  const errJson = await execRes.json();
  assert.equal(errJson.success, false);
  assert.match(errJson.error, /Explicit user confirmation is required/);
});

test('Pairing Token Generation and Expiration Parameters', async () => {
  const res = await fetch(`${BASE_URL}/devices/token`, { method: 'POST' });
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.success, true);
  assert.match(json.data.pairingToken, /^UP-[A-F0-9]{8}$/);
  assert.equal(json.data.expiresInSeconds, 900);
});

test('Agent Endpoint Blocks Requests With Invalid Credentials (Authentication & Authorization)', async () => {
  const res = await fetch(`${BASE_URL}/agent/pending-jobs`, {
    headers: {
      'x-agent-device-id': '00000000-0000-0000-0000-000000000000',
      'x-agent-token': 'fake_malicious_token',
    },
  });

  assert.equal(res.status, 403);
  const json = await res.json();
  assert.equal(json.success, false);
});

test('Inventory CSV Export Returns Formatted RFC 4180 CSV with UTF-8 BOM', async () => {
  const res = await fetch(`${BASE_URL}/history/export?format=csv`);
  assert.equal(res.status, 200);
  const contentType = res.headers.get('content-type');
  assert.match(contentType, /text\/csv/);

  // 1. Verify binary stream starts with UTF-8 BOM (0xEF, 0xBB, 0xBF)
  const arrayBuffer = await res.arrayBuffer();
  const bytes = Buffer.from(arrayBuffer);
  assert.equal(bytes[0], 0xEF);
  assert.equal(bytes[1], 0xBB);
  assert.equal(bytes[2], 0xBF);

  // 2. Verify decoded text contains RFC 4180 compliant quoted headers
  const text = bytes.toString('utf-8');
  assert.ok(text.includes('"Application Name"'));
  assert.ok(text.includes('"Publisher"'));
  assert.ok(text.includes('"Installed Version"'));
});

test('Notifications API Lists In-App Alerts and Supports Read Marking', async () => {
  // 1. Fetch notifications
  const res = await fetch(`${BASE_URL}/notifications`);
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.success, true);
  assert.ok(Array.isArray(json.data.items));
  assert.ok(typeof json.data.unreadCount === 'number');

  // 2. Mark all as read
  const markRes = await fetch(`${BASE_URL}/notifications/read-all`, { method: 'POST' });
  assert.equal(markRes.status, 200);
  const markJson = await markRes.json();
  assert.equal(markJson.success, true);

  // 3. Verify unread count is now 0
  const checkRes = await fetch(`${BASE_URL}/notifications?unread=true`);
  const checkJson = await checkRes.json();
  assert.equal(checkJson.data.unreadCount, 0);
});

test('Job Cancellation Lifecycle and Safe State Transitions', async () => {
  // 1. Create a confirmed update job
  const updatesRes = await fetch(`${BASE_URL}/updates`);
  const updatesJson = await updatesRes.json();
  const sample = updatesJson.data[0];

  const execRes = await fetch(`${BASE_URL}/updates/${sample.id}/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      targetVersion: sample.availableVersion,
      confirmed: true,
      initiator: 'test_runner',
    }),
  });

  assert.equal(execRes.status, 202);
  const job = (await execRes.json()).data;
  assert.equal(job.status, 'APPROVED');

  // 2. Cancel the job
  const cancelRes = await fetch(`${BASE_URL}/jobs/${job.id}/cancel`, { method: 'POST' });
  assert.equal(cancelRes.status, 200);
  const cancelledJob = (await cancelRes.json()).data;
  assert.equal(cancelledJob.status, 'CANCELLED');
  assert.equal(cancelledJob.errorSummary, 'Job cancelled by user request.');

  // 3. Trying to cancel an already cancelled job must be rejected with 400
  const reCancelRes = await fetch(`${BASE_URL}/jobs/${job.id}/cancel`, { method: 'POST' });
  assert.equal(reCancelRes.status, 400);
  const errJson = await reCancelRes.json();
  assert.match(errJson.error, /Cannot cancel a job that is already in 'CANCELLED'/);
});

test('Security Audit Endpoint Returns Structured Findings & Verified Status', async () => {
  const res = await fetch(`${BASE_URL}/security/scan`, { method: 'POST' });
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.success, true);
  assert.ok(typeof json.data.scannedCount === 'number');
  assert.ok(typeof json.data.cleanCount === 'number');
  assert.ok(typeof json.data.advisoriesFound === 'number');
  assert.ok(['CLEAN', 'VERIFIED_FINDINGS_FOUND', 'PARTIAL_NETWORK_FAILURE'].includes(json.data.status));
});
