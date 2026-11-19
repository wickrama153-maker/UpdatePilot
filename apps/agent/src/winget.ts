import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { DiscoveredApp } from './types';

const execFileAsync = promisify(execFile);

let cachedWinGetPath: string | null = null;

/**
 * Resolves the full path to winget.exe so execution succeeds even in constrained PATH environments.
 */
export async function resolveWinGetExecutable(): Promise<string | null> {
  if (cachedWinGetPath && fs.existsSync(cachedWinGetPath)) {
    return cachedWinGetPath;
  }

  // 1. Standard Windows App Execution Alias path
  const localAppData = process.env.LOCALAPPDATA;
  if (localAppData) {
    const candidate = path.join(localAppData, 'Microsoft', 'WindowsApps', 'winget.exe');
    if (fs.existsSync(candidate)) {
      try {
        const { stdout } = await execFileAsync(candidate, ['--version'], { timeout: 10000, windowsHide: true });
        if (stdout && stdout.trim().length > 0) {
          cachedWinGetPath = candidate;
          return candidate;
        }
      } catch {
        // Fallback to PATH search
      }
    }
  }

  // 2. Locate via where.exe
  try {
    const { stdout } = await execFileAsync('where.exe', ['winget'], { timeout: 5000, windowsHide: true });
    const firstPath = stdout.split(/\r?\n/).map((s) => s.trim()).find((s) => s.length > 0);
    if (firstPath && fs.existsSync(firstPath)) {
      cachedWinGetPath = firstPath;
      return firstPath;
    }
  } catch {
    // Fallback to bare executable name
  }

  // 3. Direct invocation attempt
  try {
    const { stdout } = await execFileAsync('winget', ['--version'], { timeout: 10000, windowsHide: true });
    if (stdout && stdout.trim().length > 0) {
      cachedWinGetPath = 'winget';
      return 'winget';
    }
  } catch {
    return null;
  }

  return null;
}

export async function isWinGetAvailable(): Promise<boolean> {
  const exe = await resolveWinGetExecutable();
  return exe !== null;
}

export interface PackageManifestInfo {
  found: boolean;
  availableVersion: string | null;
  installerType: string | null;
  hasTargetVersion: boolean;
  requiresElevationHint: boolean;
}

/**
 * Inspects WinGet manifest metadata and available versions before launching upgrade.
 */
export async function inspectPackageManifest(
  packageId: string,
  targetVersion?: string
): Promise<PackageManifestInfo> {
  const wingetExe = (await resolveWinGetExecutable()) || 'winget';
  let found = false;
  let availableVersion: string | null = null;
  let installerType: string | null = null;
  let hasTargetVersion = false;
  let requiresElevationHint = false;

  try {
    const { stdout } = await execFileAsync(
      wingetExe,
      ['show', '--id', packageId, '--exact', '--accept-source-agreements', '--disable-interactivity'],
      { maxBuffer: 4 * 1024 * 1024, timeout: 30000, windowsHide: true }
    );
    found = stdout.includes('Found ') || stdout.includes('Version:');
    const verMatch = stdout.match(/^Version:\s*(.+)$/m);
    if (verMatch) availableVersion = verMatch[1].trim();
    const typeMatch = stdout.match(/Installer Type:\s*(.+)$/m);
    if (typeMatch) installerType = typeMatch[1].trim().toLowerCase();
    const elevMatch = stdout.match(/Elevation Requirement:\s*(.+)$/m);
    if (elevMatch && /elevationRequired|elevatesSelf/i.test(elevMatch[1])) {
      requiresElevationHint = true;
    }
    if (availableVersion && targetVersion && availableVersion.trim() === targetVersion.trim()) {
      hasTargetVersion = true;
    }
  } catch {
    found = false;
  }

  if (found && targetVersion && !hasTargetVersion) {
    try {
      const { stdout } = await execFileAsync(
        wingetExe,
        ['show', '--id', packageId, '--versions', '--exact', '--accept-source-agreements', '--disable-interactivity'],
        { maxBuffer: 2 * 1024 * 1024, timeout: 20000, windowsHide: true }
      );
      const versions = stdout.split(/\r?\n/).map((l) => l.trim());
      hasTargetVersion = versions.includes(targetVersion.trim());
    } catch {
      // Non-fatal
    }
  }

  return {
    found,
    availableVersion,
    installerType,
    hasTargetVersion,
    requiresElevationHint,
  };
}

/**
 * Parses WinGet fixed-width or whitespace-delimited table output.
 */
export function parseWinGetTable(output: string): DiscoveredApp[] {
  const lines = output.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const results: DiscoveredApp[] = [];

  const headerIndex = lines.findIndex((l) =>
    l.includes('Name') && l.includes('Id') && l.includes('Version')
  );

  if (headerIndex === -1 || headerIndex + 2 > lines.length) {
    return results;
  }

  const headerLine = lines[headerIndex];
  const nameIdx = headerLine.indexOf('Name');
  const idIdx = headerLine.indexOf('Id');
  const versionIdx = headerLine.indexOf('Version');
  const availableIdx = headerLine.indexOf('Available');
  const sourceIdx = headerLine.indexOf('Source');

  const dataLines = lines.slice(headerIndex + 2);

  for (const line of dataLines) {
    if (/^\s*\d+\s+upgrades? available/i.test(line) || line.startsWith('---')) {
      continue;
    }
    if (/^\s*<.*>/.test(line)) continue;

    let name = '';
    let id = '';
    let version = '';
    let available = '';
    let source = 'winget';

    if (idIdx > 0 && versionIdx > 0) {
      name = line.substring(nameIdx, idIdx).trim();

      if (availableIdx > 0) {
        id = line.substring(idIdx, versionIdx).trim();
        version = line.substring(versionIdx, availableIdx).trim();
        if (sourceIdx > 0) {
          available = line.substring(availableIdx, sourceIdx).trim();
          source = line.substring(sourceIdx).trim() || 'winget';
        } else {
          available = line.substring(availableIdx).trim();
        }
      } else if (sourceIdx > 0) {
        id = line.substring(idIdx, versionIdx).trim();
        version = line.substring(versionIdx, sourceIdx).trim();
        source = line.substring(sourceIdx).trim() || 'winget';
      } else {
        id = line.substring(idIdx, versionIdx).trim();
        version = line.substring(versionIdx).trim();
      }
    }

    if (name && version) {
      results.push({
        name,
        packageId: id || null,
        installedVersion: version,
        availableVersion: available || null,
        source: (source.toLowerCase().includes('msstore') ? 'msstore' : 'winget'),
        updateStatus: available ? 'UPDATE_AVAILABLE' : 'UP_TO_DATE',
      });
    }
  }

  return results;
}

export async function getWinGetUpgrades(): Promise<DiscoveredApp[]> {
  const wingetExe = (await resolveWinGetExecutable()) || 'winget';
  try {
    const { stdout } = await execFileAsync(
      wingetExe,
      ['upgrade', '--accept-source-agreements', '--disable-interactivity'],
      { maxBuffer: 10 * 1024 * 1024, timeout: 60000, windowsHide: true }
    );
    return parseWinGetTable(stdout);
  } catch (err: any) {
    if (err.stdout) {
      return parseWinGetTable(err.stdout);
    }
    console.warn('[WinGet] Upgrade check error:', err.message);
    return [];
  }
}

export async function getWinGetInstalledApps(): Promise<DiscoveredApp[]> {
  const wingetExe = (await resolveWinGetExecutable()) || 'winget';
  try {
    const { stdout } = await execFileAsync(
      wingetExe,
      ['list', '--accept-source-agreements', '--disable-interactivity'],
      { maxBuffer: 15 * 1024 * 1024, timeout: 90000, windowsHide: true }
    );
    return parseWinGetTable(stdout);
  } catch (err: any) {
    if (err.stdout) {
      return parseWinGetTable(err.stdout);
    }
    console.error('[WinGet] List installed apps error:', err.message);
    return [];
  }
}

export async function verifyPackageVersion(packageId: string): Promise<string | null> {
  const wingetExe = (await resolveWinGetExecutable()) || 'winget';
  try {
    const { stdout } = await execFileAsync(
      wingetExe,
      ['list', '--id', packageId, '--exact', '--accept-source-agreements', '--disable-interactivity'],
      { timeout: 30000, windowsHide: true }
    );

    const apps = parseWinGetTable(stdout);
    const matched = apps.find((a) => a.packageId?.toLowerCase() === packageId.toLowerCase());
    return matched ? matched.installedVersion : null;
  } catch (err: any) {
    if (err.stdout) {
      const apps = parseWinGetTable(err.stdout);
      const matched = apps.find((a) => a.packageId?.toLowerCase() === packageId.toLowerCase());
      return matched ? matched.installedVersion : null;
    }
    return null;
  }
}
