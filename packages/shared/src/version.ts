/**
 * Cleans a version string by stripping leading non-digits (e.g., 'v', 'ver', 'ad ')
 * and trailing build metadata in parentheses like (26186) or with plus sign `+...`.
 */
export function normalizeVersionString(ver: string): string {
  if (!ver) return '0.0.0';
  let cleaned = ver.trim();
  // Strip leading non-digits/periods like 'v', 'ver', 'ad '
  cleaned = cleaned.replace(/^[a-zA-Z\s]+/, '');
  // Remove build metadata in parentheses like (26186)
  cleaned = cleaned.replace(/\s*\([^)]*\)/g, '');
  // Remove SemVer build metadata starting with '+'
  cleaned = cleaned.replace(/\+.*$/, '');
  return cleaned.trim() || '0.0.0';
}

/**
 * Splits a version string into core numeric segments and optional prerelease tag.
 * E.g. "2.54.0-beta.1" -> { core: [2, 54, 0], prerelease: "beta.1" }
 */
function parseVersionSegments(ver: string) {
  const norm = normalizeVersionString(ver);
  const dashIndex = norm.indexOf('-');

  let coreStr = norm;
  let prereleaseStr: string | null = null;

  if (dashIndex !== -1) {
    coreStr = norm.slice(0, dashIndex);
    prereleaseStr = norm.slice(dashIndex + 1);
  }

  const coreParts = coreStr
    .split(/[._]/)
    .map((part) => {
      const n = parseInt(part, 10);
      return isNaN(n) ? part : n;
    });

  return {
    coreParts,
    prerelease: prereleaseStr,
  };
}

/**
 * Compares two version strings according to SemVer 2.0.0 & Windows multi-part version rules.
 * Returns:
 *   1 if v1 > v2 (v1 is newer)
 *  -1 if v1 < v2 (v2 is newer)
 *   0 if v1 == v2
 */
export function compareVersions(v1: string, v2: string): number {
  if (v1 === v2) return 0;
  if (!v1) return -1;
  if (!v2) return 1;

  const parsed1 = parseVersionSegments(v1);
  const parsed2 = parseVersionSegments(v2);

  const maxLen = Math.max(parsed1.coreParts.length, parsed2.coreParts.length);

  for (let i = 0; i < maxLen; i++) {
    const rawA = parsed1.coreParts[i] ?? 0;
    const rawB = parsed2.coreParts[i] ?? 0;

    const isNumA = typeof rawA === 'number';
    const isNumB = typeof rawB === 'number';

    if (isNumA && isNumB) {
      if (rawA > rawB) return 1;
      if (rawA < rawB) return -1;
    } else {
      const cmp = String(rawA).localeCompare(String(rawB), undefined, {
        numeric: true,
        sensitivity: 'base',
      });
      if (cmp !== 0) return cmp > 0 ? 1 : -1;
    }
  }

  // Core versions are equal. Handle Prerelease precedence:
  // A version with NO prerelease tag has higher precedence than one with a prerelease tag.
  // E.g., 1.2.3 > 1.2.3-beta.1
  if (!parsed1.prerelease && parsed2.prerelease) {
    return 1;
  }
  if (parsed1.prerelease && !parsed2.prerelease) {
    return -1;
  }
  if (parsed1.prerelease && parsed2.prerelease) {
    // Both are prereleases: compare prerelease strings
    const cmp = parsed1.prerelease.localeCompare(parsed2.prerelease, undefined, {
      numeric: true,
      sensitivity: 'base',
    });
    if (cmp !== 0) return cmp > 0 ? 1 : -1;
  }

  return 0;
}

/**
 * Checks whether an available version is strictly newer than installed version.
 */
export function isUpdateAvailable(installedVersion: string, availableVersion: string): boolean {
  if (!installedVersion || !availableVersion) return false;
  if (installedVersion.trim() === availableVersion.trim()) return false;
  // If installed has special '< ' prefix (like Microsoft.DotNet.Runtime: '< 3.1.25')
  if (installedVersion.startsWith('<')) {
    return true;
  }
  return compareVersions(availableVersion, installedVersion) > 0;
}

/**
 * Validates package ID format for WinGet to prevent command injection and malformed identifiers.
 * WinGet package IDs typically follow `Publisher.Application` or alphanumeric tokens with dots/hyphens.
 */
const PACKAGE_ID_REGEX = /^[A-Za-z0-9_.-]{3,128}$/;

export function isValidPackageId(packageId: string): boolean {
  if (!packageId) return false;
  // Reject any shell metacharacters
  if (/[;&|`$><!\\"'\r\n\t]/.test(packageId)) return false;
  return PACKAGE_ID_REGEX.test(packageId.trim());
}

/**
 * Validates version string for safe execution.
 */
const VERSION_REGEX = /^[A-Za-z0-9_.\-+() ]{1,64}$/;

export function isValidVersionString(version: string): boolean {
  if (!version) return false;
  if (/[;&|`$><!\\"'\r\n\t]/.test(version)) return false;
  return VERSION_REGEX.test(version.trim());
}
