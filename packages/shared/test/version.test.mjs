import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeVersionString,
  compareVersions,
  isUpdateAvailable,
  isValidPackageId,
  isValidVersionString,
} from '../dist/index.js';

test('Version Normalization with prefixes and build metadata', () => {
  assert.equal(normalizeVersionString('v1.2.3'), '1.2.3');
  assert.equal(normalizeVersionString('ad 9.0.14'), '9.0.14');
  assert.equal(normalizeVersionString('5.16.10 (26186)'), '5.16.10');
  assert.equal(normalizeVersionString('1.0.0+build.491'), '1.0.0');
  assert.equal(normalizeVersionString('2.54.0'), '2.54.0');
  assert.equal(normalizeVersionString(''), '0.0.0');
});

test('Semantic and Windows 4-Part Version Comparison', () => {
  // Standard semver
  assert.equal(compareVersions('2.54.0', '2.56.0.3'), -1);
  assert.equal(compareVersions('2.56.0.3', '2.54.0'), 1);
  assert.equal(compareVersions('1.2.3', '1.2.3'), 0);

  // 4-part Windows redistributable versions
  assert.equal(compareVersions('14.42.34438.0', '14.51.36247.0'), -1);
  assert.equal(compareVersions('14.51.36247.0', '14.42.34438.0'), 1);

  // Varying segment lengths
  assert.equal(compareVersions('3.4.2', '4.0.1.262721353'), -1);
  assert.equal(compareVersions('8.8.3', '8.9.8.1'), -1);
  assert.equal(compareVersions('9.0.0.810', '9.0.0.810'), 0);
  assert.equal(compareVersions('1.0', '1.0.0'), 0);
});

test('Prerelease Version Precedence (SemVer 2.0.0)', () => {
  // Core release is newer than its prerelease
  assert.equal(compareVersions('1.2.3', '1.2.3-rc.1'), 1);
  assert.equal(compareVersions('1.2.3-rc.1', '1.2.3'), -1);

  // Prerelease comparison
  assert.equal(compareVersions('1.2.3-rc.2', '1.2.3-rc.1'), 1);
  assert.equal(compareVersions('1.2.3-alpha', '1.2.3-beta'), -1);

  // Higher core version always beats lower core version regardless of prerelease tag
  assert.equal(compareVersions('2.0.0-alpha', '1.9.9'), 1);
});

test('isUpdateAvailable Logic', () => {
  assert.equal(isUpdateAvailable('2.54.0', '2.56.0.3'), true);
  assert.equal(isUpdateAvailable('2.56.0.3', '2.54.0'), false);
  assert.equal(isUpdateAvailable('1.2.3', '1.2.3'), false);
  // Special prefix '< 3.1.25'
  assert.equal(isUpdateAvailable('< 3.1.25', '3.1.32'), true);
  // Prerelease to release upgrade
  assert.equal(isUpdateAvailable('1.2.3-rc.1', '1.2.3'), true);
});

test('Package Identifier Safety and Injection Prevention', () => {
  assert.equal(isValidPackageId('Git.Git'), true);
  assert.equal(isValidPackageId('Google.AntigravityIDE'), true);
  assert.equal(isValidPackageId('OpenJS.NodeJS.LTS'), true);
  assert.equal(isValidPackageId('Microsoft.VisualStudio.2022.Community'), true);

  // Shell injection attempts must be strictly rejected
  assert.equal(isValidPackageId('Git.Git; rm -rf /'), false);
  assert.equal(isValidPackageId('Git.Git & calc.exe'), false);
  assert.equal(isValidPackageId('Git.Git | powershell'), false);
  assert.equal(isValidPackageId('Git.Git`whoami`'), false);
  assert.equal(isValidPackageId('Git.Git$()'), false);
  assert.equal(isValidPackageId('Git" && echo hi'), false);
  assert.equal(isValidPackageId(''), false);
});

test('Target Version Safety Validation', () => {
  assert.equal(isValidVersionString('2.56.0.3'), true);
  assert.equal(isValidVersionString('14.51.36247.0'), true);
  assert.equal(isValidVersionString('v3.0.24-preview'), true);

  // Unsafe metacharacters
  assert.equal(isValidVersionString('1.0; cmd.exe'), false);
  assert.equal(isValidVersionString('1.0 & notepad'), false);
  assert.equal(isValidVersionString('1.0`dir`'), false);
  assert.equal(isValidVersionString(''), false);
});
