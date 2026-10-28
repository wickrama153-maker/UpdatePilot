import { execFile } from 'child_process';
import { promisify } from 'util';
import { DiscoveredApp } from './types';

const execFileAsync = promisify(execFile);

/**
 * Discovers legacy installed desktop applications from Windows Registry Uninstall keys.
 */
export async function getRegistryApps(): Promise<DiscoveredApp[]> {
  const psScript = `
    $paths = @(
      "HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*",
      "HKLM:\\Software\\Wow6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*",
      "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*"
    )
    Get-ItemProperty $paths -ErrorAction SilentlyContinue |
      Where-Object { $_.DisplayName -and -not $_.SystemComponent } |
      Select-Object DisplayName, Publisher, DisplayVersion, HelpLink, URLInfoAbout |
      ConvertTo-Json -Compress
  `;

  try {
    const { stdout } = await execFileAsync(
      'powershell.exe',
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', psScript],
      { maxBuffer: 10 * 1024 * 1024, timeout: 30000 }
    );

    if (!stdout || !stdout.trim()) return [];

    const raw = JSON.parse(stdout);
    const list = Array.isArray(raw) ? raw : [raw];

    const apps: DiscoveredApp[] = [];
    for (const item of list) {
      if (item.DisplayName && item.DisplayName.trim()) {
        apps.push({
          name: item.DisplayName.trim(),
          publisher: item.Publisher?.trim() || null,
          installedVersion: item.DisplayVersion?.trim() || '1.0.0',
          packageId: null, // Registry apps don't have a winget packageId by default
          source: 'registry',
          updateStatus: 'UNMATCHED',
          publisherUrl: item.URLInfoAbout?.trim() || item.HelpLink?.trim() || null,
          availableVersion: null,
        });
      }
    }
    return apps;
  } catch (err: any) {
    console.warn('[Registry Scanner] Non-critical warning reading Windows registry:', err.message);
    return [];
  }
}
