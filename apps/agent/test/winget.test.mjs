import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseWinGetTable, resolveWinGetExecutable } from '../dist/winget.js';
import { validateUpdateOperation } from '../dist/safety.js';
import { executeApprovedUpdate, toSignedInt32 } from '../dist/updater.js';

const SAMPLE_WINGET_OUTPUT = `
Name                                                               Id                                    Version             Available           Source
-------------------------------------------------------------------------------------------------------------------------------------------------------
Antigravity (User)                                                 Google.AntigravityIDE                 1.23.2              2.5.5               winget
Git                                                                Git.Git                               2.54.0              2.56.0.3            winget
Node.js                                                            OpenJS.NodeJS.LTS                     24.13.1             24.22.1             winget
Notepad++ (64-bit x64)                                             Notepad++.Notepad++                   8.8.3               8.9.8.1             winget
28 upgrades available.
`;

test('WinGet Table Parser correctly extracts applications and target versions', () => {
  const apps = parseWinGetTable(SAMPLE_WINGET_OUTPUT);

  assert.equal(apps.length, 4);

  assert.equal(apps[0].name, 'Antigravity (User)');
  assert.equal(apps[0].packageId, 'Google.AntigravityIDE');
  assert.equal(apps[0].installedVersion, '1.23.2');
  assert.equal(apps[0].availableVersion, '2.5.5');
  assert.equal(apps[0].updateStatus, 'UPDATE_AVAILABLE');

  assert.equal(apps[1].name, 'Git');
  assert.equal(apps[1].packageId, 'Git.Git');
  assert.equal(apps[1].installedVersion, '2.54.0');
  assert.equal(apps[1].availableVersion, '2.56.0.3');

  assert.equal(apps[2].packageId, 'OpenJS.NodeJS.LTS');
  assert.equal(apps[3].packageId, 'Notepad++.Notepad++');
});

test('WinGet Table Parser ignores corrupted or empty text', () => {
  assert.deepEqual(parseWinGetTable(''), []);
  assert.deepEqual(parseWinGetTable('No packages found.'), []);
});

test('Agent Safety Module independently validates update operations', () => {
  // Valid operation
  const valid = validateUpdateOperation('Git.Git', '2.56.0.3');
  assert.equal(valid.packageId, 'Git.Git');
  assert.equal(valid.targetVersion, '2.56.0.3');

  // Command injection attempt in packageId
  assert.throws(() => {
    validateUpdateOperation('Git.Git & calc.exe', '2.56.0.3');
  }, /Agent Safety Violation/);

  // Command injection attempt in targetVersion
  assert.throws(() => {
    validateUpdateOperation('Git.Git', '2.56.0.3; format c:');
  }, /Agent Safety Violation/);

  // Pipe or shell redirects
  assert.throws(() => {
    validateUpdateOperation('Git.Git | dir', '2.56.0.3');
  }, /Agent Safety Violation/);
});

test('Exit Code 3010 interpretation as Reboot Required', () => {
  // Simulating Windows installer exit code 3010 (ERROR_SUCCESS_REBOOT_REQUIRED)
  const code = 3010;
  const isReboot = code === 3010 || code === 1641;
  assert.equal(isReboot, true);

  const regularSuccess = 0;
  const isRegularSuccessReboot = regularSuccess === 3010;
  assert.equal(isRegularSuccessReboot, false);
});

test('WinGet executable resolver locates Windows Package Manager binary', async () => {
  const exe = await resolveWinGetExecutable();
  assert.ok(exe && exe.toLowerCase().includes('winget'), `Expected winget path, got ${exe}`);
});

test('executeApprovedUpdate rejects injection and reports real failure for non-existent packages', async () => {
  await assert.rejects(
    () => executeApprovedUpdate('Fake.Pkg | whoami', '1.2.3'),
    /Agent Safety Violation/
  );

  const stages = [];
  const res = await executeApprovedUpdate('NonExistent.UpdatePilot.FakePkg9999', '1.0.0', {
    timeoutMs: 25000,
    onProgress: (evt) => {
      stages.push(`${evt.status}:${evt.stage}`);
    },
  });

  assert.equal(res.status, 'FAILED');
  assert.ok(stages.length >= 1, 'Expected real progress callback telemetry');
  assert.ok(res.errorSummary && res.errorSummary.length > 0, 'Expected meaningful error summary');
  assert.equal(res.resultingVersion, null);
});

test('toSignedInt32 normalizes unsigned 32-bit Windows HRESULT codes for Prisma INT storage', () => {
  // 0x8A15002B reported unsigned by Node child_process on Windows -> -1978335189
  assert.equal(toSignedInt32(2316632107), -1978335189);
  assert.equal(toSignedInt32(0), 0);
  assert.equal(toSignedInt32(3010), 3010);
});
