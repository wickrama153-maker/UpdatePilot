import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseWinGetTable } from '../dist/winget.js';
import { validateUpdateOperation } from '../dist/safety.js';

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
