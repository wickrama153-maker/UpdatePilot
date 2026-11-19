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

test('Multi-User Registration, Authentication, and Account Isolation', async () => {
  const timestamp = Date.now();
  const emailA = `user_a_${timestamp}@example.com`;
  const emailB = `user_b_${timestamp}@example.com`;
  const password = 'StrongPassword123!';

  // 1. Register User A
  const regResA = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: emailA, password, name: 'Alice Test' }),
  });
  assert.equal(regResA.status, 201);
  const dataA = (await regResA.json()).data;
  assert.ok(dataA.token);
  assert.equal(dataA.user.email, emailA);
  const tokenA = dataA.token;

  // 2. Register User B
  const regResB = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: emailB, password, name: 'Bob Test' }),
  });
  assert.equal(regResB.status, 201);
  const dataB = (await regResB.json()).data;
  assert.ok(dataB.token);
  assert.equal(dataB.user.email, emailB);
  const tokenB = dataB.token;

  // 3. User A generates pairing token and pairs Computer A
  const tokResA = await fetch(`${BASE_URL}/devices/token`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  assert.equal(tokResA.status, 200);
  const pairTokA = (await tokResA.json()).data.pairingToken;

  const pairResA = await fetch(`${BASE_URL}/devices/pair`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      deviceName: `Alice-Workstation-${timestamp}`,
      hardwareId: `HW-A-${timestamp}`,
      pairingToken: pairTokA,
      agentVersion: '1.0.0',
    }),
  });
  assert.equal(pairResA.status, 201);
  const deviceA = (await pairResA.json()).data.device;

  // 4. User B generates pairing token and pairs Computer B
  const tokResB = await fetch(`${BASE_URL}/devices/token`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  assert.equal(tokResB.status, 200);
  const pairTokB = (await tokResB.json()).data.pairingToken;

  const pairResB = await fetch(`${BASE_URL}/devices/pair`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      deviceName: `Bob-Laptop-${timestamp}`,
      hardwareId: `HW-B-${timestamp}`,
      pairingToken: pairTokB,
      agentVersion: '1.0.0',
    }),
  });
  assert.equal(pairResB.status, 201);
  const deviceB = (await pairResB.json()).data.device;

  // 5. User A queries devices: MUST see only Computer A, NEVER Computer B
  const listA = await fetch(`${BASE_URL}/devices`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  assert.equal(listA.status, 200);
  const devicesForA = (await listA.json()).data;
  const idsForA = devicesForA.map((d) => d.id);
  assert.ok(idsForA.includes(deviceA.id), 'User A must see Computer A');
  assert.ok(!idsForA.includes(deviceB.id), 'User A must NEVER see Computer B');

  // 6. User B queries devices: MUST see only Computer B, NEVER Computer A
  const listB = await fetch(`${BASE_URL}/devices`, {
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  assert.equal(listB.status, 200);
  const devicesForB = (await listB.json()).data;
  const idsForB = devicesForB.map((d) => d.id);
  assert.ok(idsForB.includes(deviceB.id), 'User B must see Computer B');
  assert.ok(!idsForB.includes(deviceA.id), 'User B must NEVER see Computer A');

  // 7. Cross-tenant revocation attempt: User A tries to revoke User B's device -> MUST FAIL
  const crossRevokeRes = await fetch(`${BASE_URL}/devices/${deviceB.id}/revoke`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  assert.equal(crossRevokeRes.status, 400);

  // 8. User A dashboard: MUST list only User A devices and scoped metrics
  const dashA = await fetch(`${BASE_URL}/dashboard`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  });
  assert.equal(dashA.status, 200);
  const dashDataA = (await dashA.json()).data;
  assert.equal(dashDataA.devices.length, 1);
  assert.equal(dashDataA.devices[0].id, deviceA.id);

  // 9. User B dashboard: MUST list only User B devices and scoped metrics
  const dashB = await fetch(`${BASE_URL}/dashboard`, {
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  assert.equal(dashB.status, 200);
  const dashDataB = (await dashB.json()).data;
  assert.equal(dashDataB.devices.length, 1);
  assert.equal(dashDataB.devices[0].id, deviceB.id);
});

test('Pairing Token Single-Use and Expiration Security Enforcement', async () => {
  const timestamp = Date.now();
  const email = `pairing_test_${timestamp}@example.com`;

  // Register user
  const regRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'StrongPassword123!', name: 'Pairing Tester' }),
  });
  assert.equal(regRes.status, 201);
  const token = (await regRes.json()).data.token;

  // Generate pairing token
  const tokRes = await fetch(`${BASE_URL}/devices/token`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(tokRes.status, 200);
  const { pairingToken, expiresInSeconds } = (await tokRes.json()).data;
  assert.ok(pairingToken.startsWith('UP-'));
  assert.equal(expiresInSeconds, 600, 'Pairing token must expire in exactly 10 minutes (600s)');

  // First consumption: MUST succeed
  const pair1 = await fetch(`${BASE_URL}/devices/pair`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      deviceName: `Test-PC-First-${timestamp}`,
      pairingToken,
      agentVersion: '1.0.0',
    }),
  });
  assert.equal(pair1.status, 201);
  const pair1Data = (await pair1.json()).data;
  assert.ok(pair1Data.agentToken.startsWith('agt_'));

  // Second consumption with same token: MUST FAIL (Single-use enforcement)
  const pair2 = await fetch(`${BASE_URL}/devices/pair`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      deviceName: `Test-PC-Replay-${timestamp}`,
      pairingToken,
      agentVersion: '1.0.0',
    }),
  });
  assert.equal(pair2.status, 400, 'Replay of consumed pairing token must be rejected with HTTP 400');
});

test('Agent Token SHA-256 Hashing & Device Revocation Flow', async () => {
  const timestamp = Date.now();
  const email = `revoke_test_${timestamp}@example.com`;

  // Register user
  const regRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'StrongPassword123!', name: 'Revoke Tester' }),
  });
  const token = (await regRes.json()).data.token;

  // Generate pairing token and pair agent
  const tokRes = await fetch(`${BASE_URL}/devices/token`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  const { pairingToken } = (await tokRes.json()).data;

  const pairRes = await fetch(`${BASE_URL}/devices/pair`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      deviceName: `Revocable-PC-${timestamp}`,
      pairingToken,
      agentVersion: '1.0.0',
    }),
  });
  assert.equal(pairRes.status, 201);
  const { device, agentToken } = (await pairRes.json()).data;
  assert.ok(agentToken);

  // 1. Agent sends heartbeat: MUST succeed (200 OK)
  const hb1 = await fetch(`${BASE_URL}/agent/heartbeat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-agent-device-id': device.id,
      'x-agent-token': agentToken,
    },
    body: JSON.stringify({ agentVersion: '1.0.0', status: 'ONLINE' }),
  });
  assert.equal(hb1.status, 200, 'Active agent heartbeat must succeed with 200 OK');

  // 2. User revokes the device
  const revokeRes = await fetch(`${BASE_URL}/devices/${device.id}/revoke`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(revokeRes.status, 200);

  // 3. Agent sends heartbeat again: MUST be rejected with HTTP 403 Forbidden
  const hb2 = await fetch(`${BASE_URL}/agent/heartbeat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-agent-device-id': device.id,
      'x-agent-token': agentToken,
    },
    body: JSON.stringify({ agentVersion: '1.0.0', status: 'ONLINE' }),
  });
  assert.equal(hb2.status, 403, 'Revoked agent must be rejected with HTTP 403 Forbidden');
});

test('Windows Agent Installer Metadata Endpoint', async () => {
  const res = await fetch(`${BASE_URL}/devices/installer/info`);
  assert.equal(res.status, 200);
  const data = (await res.json()).data;
  assert.equal(data.version, '1.0.0');
  assert.equal(data.filename, 'UpdatePilot-Agent-Setup-1.0.0.exe');
  assert.ok(data.downloadUrl);
  assert.ok(data.targetOs.includes('Windows'));
});
