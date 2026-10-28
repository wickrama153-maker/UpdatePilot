import { execFile } from 'child_process';
import { promisify } from 'util';
import { DiscoveredApp } from './types';

const execFileAsync = promisify(execFile);

export async function isWinGetAvailable(): Promise<boolean> {
  try {
    const { stdout } = await execFileAsync('winget', ['--version']);
    return Boolean(stdout && stdout.trim().length > 0);
  } catch {
    return false;
  }
}

/**
 * Parses WinGet fixed-width or whitespace-delimited table output.
 */
export function parseWinGetTable(output: string): DiscoveredApp[] {
  const lines = output.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const results: DiscoveredApp[] = [];

  // Find header line
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

  // Rows start after the separator line (e.g. "------")
  const dataLines = lines.slice(headerIndex + 2);

  for (const line of dataLines) {
    // Ignore footer messages like "28 upgrades available." or empty lines
    if (/^\s*\d+\s+upgrades? available/i.test(line) || line.startsWith('---')) {
      continue;
    }
    if (/^\s*<.*>/.test(line)) continue; // skip truncated notices

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

/**
 * Runs `winget upgrade` to obtain apps with available updates.
 */
export async function getWinGetUpgrades(): Promise<DiscoveredApp[]> {
  try {
    const { stdout } = await execFileAsync(
      'winget',
      ['upgrade', '--accept-source-agreements', '--disable-interactivity'],
      { maxBuffer: 10 * 1024 * 1024, timeout: 60000 }
    );
    return parseWinGetTable(stdout);
  } catch (err: any) {
    // winget exit code 0 or partial output
    if (err.stdout) {
      return parseWinGetTable(err.stdout);
    }
    console.warn('[WinGet] Upgrade check error:', err.message);
    return [];
  }
}

/**
 * Runs `winget list` to discover all installed applications on this Windows system.
 */
export async function getWinGetInstalledApps(): Promise<DiscoveredApp[]> {
  try {
    const { stdout } = await execFileAsync(
      'winget',
      ['list', '--accept-source-agreements', '--disable-interactivity'],
      { maxBuffer: 15 * 1024 * 1024, timeout: 90000 }
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

/**
 * Queries the current installed version of a specific package after an update.
 */
export async function verifyPackageVersion(packageId: string): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync(
      'winget',
      ['list', '--id', packageId, '--exact', '--accept-source-agreements', '--disable-interactivity'],
      { timeout: 30000 }
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
