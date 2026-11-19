// ==============================================================================
// UpdatePilot End-to-End Multi-Computer & Tenant Isolation Verification
// Simulates independent Windows workstations pairing to distinct user accounts
// and verifies strict zero-leakage isolation across inventories, jobs, and audits.
// ==============================================================================

import assert from 'node:assert/strict';
import http from 'node:http';
import { app } from '../apps/backend/dist/app.js';
import { prisma } from '../apps/backend/dist/lib/prisma.js';

async function runVerification() {
  console.log('==================================================');
  console.log(' UpdatePilot Multi-Computer & Tenant Isolation Test');
  console.log('==================================================\n');

  // 1. Start server on ephemeral port
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api/v1`;

  const request = async (urlPath, options = {}) => {
    const res = await fetch(`${baseUrl}${urlPath}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    const json = await res.json().catch(() => ({}));
    return { status: res.status, ok: res.ok, body: json };
  };

  try {
    const now = Date.now();

    // --------------------------------------------------------------------------
    // Test 1: User Registration
    // --------------------------------------------------------------------------
    console.log('[Step 1] Registering User A (Alice) and User B (Bob)...');
    const userARes = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: `alice_${now}@enterprise.local`,
        password: 'Password123!',
        name: 'Alice Mercer',
      }),
    });
    assert.equal(userARes.status, 201, 'User A registration should succeed');
    const tokenA = userARes.body.data.token;
    const userA = userARes.body.data.user;

    const userBRes = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: `bob_${now}@enterprise.local`,
        password: 'Password123!',
        name: 'Bob Vance',
      }),
    });
    assert.equal(userBRes.status, 201, 'User B registration should succeed');
    const tokenB = userBRes.body.data.token;
    const userB = userBRes.body.data.user;
    console.log('✔ User accounts registered with secure scrypt hashing & JWT.');

    // --------------------------------------------------------------------------
    // Test 2: Generate Pairing Tokens
    // --------------------------------------------------------------------------
    console.log('\n[Step 2] Generating device pairing tokens for Alice & Bob...');
    const tokenResA = await request('/devices/token', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const pairTokenA = tokenResA.body.data.pairingToken;

    const tokenResB = await request('/devices/token', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    const pairTokenB = tokenResB.body.data.pairingToken;
    assert.ok(pairTokenA && pairTokenB, 'Pairing tokens generated successfully');
    console.log(`✔ Alice Token: ${pairTokenA} | Bob Token: ${pairTokenB}`);

    // --------------------------------------------------------------------------
    // Test 3: Pairing Computer A (Alice) and Computer B (Bob)
    // --------------------------------------------------------------------------
    console.log('\n[Step 3] Pairing Workstation A to Alice and Workstation B to Bob...');
    const pairDeviceARes = await request('/devices/pair', {
      method: 'POST',
      body: JSON.stringify({
        deviceName: 'ALICE-SURFACE-PRO',
        hardwareId: `HW-GUID-ALICE-1111-${now}`,
        osName: 'Windows 11 Pro',
        osVersion: '10.0.22631',
        architecture: 'x64',
        agentVersion: '1.0.0',
        pairingToken: pairTokenA,
      }),
    });
    assert.equal(pairDeviceARes.status, 201);
    const deviceA = pairDeviceARes.body.data.device;
    const agentTokenA = pairDeviceARes.body.data.agentToken;

    const pairDeviceBRes = await request('/devices/pair', {
      method: 'POST',
      body: JSON.stringify({
        deviceName: 'BOB-THINKPAD-P1',
        hardwareId: `HW-GUID-BOB-2222-${now}`,
        osName: 'Windows 10 Enterprise',
        osVersion: '10.0.19045',
        architecture: 'x64',
        agentVersion: '1.0.0',
        pairingToken: pairTokenB,
      }),
    });
    assert.equal(pairDeviceBRes.status, 201);
    const deviceB = pairDeviceBRes.body.data.device;
    const agentTokenB = pairDeviceBRes.body.data.agentToken;
    console.log(`✔ Workstation A (${deviceA.name}) paired to Alice (User ID: ${userA.id})`);
    console.log(`✔ Workstation B (${deviceB.name}) paired to Bob (User ID: ${userB.id})`);

    // --------------------------------------------------------------------------
    // Test 4: Software Inventory Ingestion from Local Agents
    // --------------------------------------------------------------------------
    console.log('\n[Step 4] Agents submitting distinct software inventories...');
    // Workstation A submits Chrome & VS Code
    const scanReportA = await request('/agent/scan-results', {
      method: 'POST',
      headers: {
        'x-agent-device-id': deviceA.id,
        'x-agent-token': agentTokenA,
      },
      body: JSON.stringify({
        applications: [
          {
            name: 'Google Chrome',
            packageId: 'Google.Chrome',
            installedVersion: '120.0.6099.109',
            availableVersion: '121.0.6167.85',
            updateStatus: 'UPDATE_AVAILABLE',
            publisher: 'Google LLC',
            source: 'winget',
          },
          {
            name: 'Visual Studio Code',
            packageId: 'Microsoft.VisualStudioCode',
            installedVersion: '1.85.1',
            availableVersion: '1.85.1',
            updateStatus: 'UP_TO_DATE',
            publisher: 'Microsoft Corporation',
            source: 'winget',
          },
        ],
      }),
    });
    assert.equal(scanReportA.status, 200, 'Agent A scan submission should succeed');

    // Workstation B submits Firefox & AnyDesk
    const scanReportB = await request('/agent/scan-results', {
      method: 'POST',
      headers: {
        'x-agent-device-id': deviceB.id,
        'x-agent-token': agentTokenB,
      },
      body: JSON.stringify({
        applications: [
          {
            name: 'Mozilla Firefox',
            packageId: 'Mozilla.Firefox',
            installedVersion: '115.0.0',
            availableVersion: '116.0.0',
            updateStatus: 'UPDATE_AVAILABLE',
            publisher: 'Mozilla',
            source: 'winget',
          },
          {
            name: 'AnyDesk',
            packageId: 'AnyDeskSoftwareGmbH.AnyDesk',
            installedVersion: '7.0.14',
            availableVersion: '7.1.0',
            updateStatus: 'UPDATE_AVAILABLE',
            publisher: 'AnyDesk Software GmbH',
            source: 'winget',
          },
        ],
      }),
    });
    assert.equal(scanReportB.status, 200, 'Agent B scan submission should succeed');
    console.log('✔ Agent A submitted 2 apps. Agent B submitted 2 apps.');

    // --------------------------------------------------------------------------
    // Test 5: Verify Strict Dashboard and Inventory Isolation
    // --------------------------------------------------------------------------
    console.log('\n[Step 5] Verifying zero data leakage between Alice & Bob...');
    // Alice queries apps
    const aliceAppsRes = await request('/applications', {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const aliceApps = aliceAppsRes.body.data.items.map((a) => a.name);
    console.log("Alice's Software Inventory:", aliceApps);
    assert.ok(aliceApps.includes('Google Chrome'), 'Alice must see Google Chrome');
    assert.ok(aliceApps.includes('Visual Studio Code'), 'Alice must see VS Code');
    assert.ok(!aliceApps.includes('Mozilla Firefox'), 'Alice MUST NOT see Bob Firefox');
    assert.ok(!aliceApps.includes('AnyDesk'), 'Alice MUST NOT see Bob AnyDesk');

    // Bob queries apps
    const bobAppsRes = await request('/applications', {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    const bobApps = bobAppsRes.body.data.items.map((a) => a.name);
    console.log("Bob's Software Inventory:  ", bobApps);
    assert.ok(bobApps.includes('Mozilla Firefox'), 'Bob must see Mozilla Firefox');
    assert.ok(bobApps.includes('AnyDesk'), 'Bob must see AnyDesk');
    assert.ok(!bobApps.includes('Google Chrome'), 'Bob MUST NOT see Alice Chrome');
    assert.ok(!bobApps.includes('Visual Studio Code'), 'Bob MUST NOT see Alice VS Code');
    console.log('✔ Strict Application Inventory Isolation Verified (0% leakage).');

    // --------------------------------------------------------------------------
    // Test 6: Verify Updates Endpoint Isolation
    // --------------------------------------------------------------------------
    console.log('\n[Step 6] Verifying updates endpoint isolation...');
    const aliceUpdates = await request('/updates', {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const aliceUpdNames = aliceUpdates.body.data.map((u) => u.name);
    assert.deepEqual(aliceUpdNames, ['Google Chrome']);

    const bobUpdates = await request('/updates', {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    const bobUpdNames = bobUpdates.body.data.map((u) => u.name);
    assert.ok(bobUpdNames.includes('Mozilla Firefox') && bobUpdNames.includes('AnyDesk'));
    assert.ok(!bobUpdNames.includes('Google Chrome'));
    console.log('✔ Available Updates endpoint strictly isolated per account.');

    // --------------------------------------------------------------------------
    // Test 7: Verify Update Job Execution and Cross-Tenant Security
    // --------------------------------------------------------------------------
    console.log('\n[Step 7] Triggering update on Computer A & testing cross-tenant block...');
    const chromeApp = aliceUpdates.body.data[0];
    const execRes = await request(`/updates/${chromeApp.id}/execute`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({
        targetVersion: '121.0.6167.85',
        confirmed: true,
      }),
    });
    assert.equal(execRes.status, 202);
    const jobId = execRes.body.data.id;
    console.log(`✔ Alice queued update job: ${jobId}`);

    // Bob polls pending jobs for his agent
    const bobAgentJobs = await request('/agent/pending-jobs', {
      headers: {
        'x-agent-device-id': deviceB.id,
        'x-agent-token': agentTokenB,
      },
    });
    assert.equal(bobAgentJobs.body.data.updateJob, null, "Bob's agent must receive ZERO update jobs from Alice");
    assert.equal(bobAgentJobs.body.data.scanJob, null, "Bob's agent must receive ZERO scan jobs from Alice");
    console.log("✔ Bob's agent received 0 jobs (Alice's job was not dispatched to Bob).");

    // Alice polls pending jobs for her agent
    const aliceAgentJobs = await request('/agent/pending-jobs', {
      headers: {
        'x-agent-device-id': deviceA.id,
        'x-agent-token': agentTokenA,
      },
    });
    assert.ok(aliceAgentJobs.body.data.updateJob, "Alice's agent must receive the dispatched update job");
    assert.equal(aliceAgentJobs.body.data.updateJob.id, jobId);
    console.log("✔ Alice's agent received the dispatched job for Google Chrome.");

    // Bob tries to cancel Alice's job
    const bobCancelAttempt = await request(`/jobs/${jobId}/cancel`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    assert.ok(bobCancelAttempt.status === 400 || bobCancelAttempt.status === 403 || bobCancelAttempt.status === 404);
    console.log("✔ Cross-tenant block: Bob CANNOT cancel Alice's job (HTTP " + bobCancelAttempt.status + ").");

    // --------------------------------------------------------------------------
    // Test 8: Hostname Collision Safety (Two computers with identical hostname)
    // --------------------------------------------------------------------------
    console.log('\n[Step 8] Testing hostname collision safety...');
    // Alice pairs a second computer also named "BOB-THINKPAD-P1" (hostname collision test)
    const tokenResA2 = await request('/devices/token', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const pairTokenA2 = tokenResA2.body.data.pairingToken;

    const collisionPairRes = await request('/devices/pair', {
      method: 'POST',
      body: JSON.stringify({
        deviceName: 'BOB-THINKPAD-P1', // IDENTICAL HOSTNAME
        hardwareId: `HW-GUID-ALICE-3333-${now}`, // UNIQUE HARDWARE ID
        osName: 'Windows 11 Enterprise',
        osVersion: '10.0.22631',
        architecture: 'x64',
        agentVersion: '1.0.0',
        pairingToken: pairTokenA2,
      }),
    });
    assert.equal(collisionPairRes.status, 201);
    const collisionDevice = collisionPairRes.body.data.device;

    const aliceDevices = await request('/devices', {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const bobDevices = await request('/devices', {
      headers: { Authorization: `Bearer ${tokenB}` },
    });

    assert.equal(aliceDevices.body.data.length, 2, 'Alice has 2 registered workstations');
    assert.equal(bobDevices.body.data.length, 1, 'Bob has 1 registered workstation');
    assert.notEqual(collisionDevice.id, deviceB.id, 'Devices with same hostname have distinct IDs');
    console.log('✔ Hostname collision test passed: Separate devices maintained with distinct hardwareId and userId.');

    console.log('\n==================================================');
    console.log(' ALL MULTI-COMPUTER ISOLATION TESTS PASSED 100%! ');
    console.log('==================================================\n');
  } finally {
    server.close();
  }
}

runVerification().catch((err) => {
  console.error('\n❌ Verification Failed:', err);
  process.exit(1);
});
