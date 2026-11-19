import { isWinGetAvailable, getWinGetInstalledApps, getWinGetUpgrades } from './winget';
import { getRegistryApps } from './registry';
import { DiscoveredApp } from './types';

export async function performFullDiscovery(): Promise<DiscoveredApp[]> {
  console.log('[Scanner] Starting full system software discovery...');

  const wingetReady = await isWinGetAvailable();
  if (!wingetReady) {
    console.warn('[Scanner] WinGet CLI is not detected on this machine. Falling back to Registry discovery.');
  }

  // 1. Gather WinGet Upgrades
  const upgrades = wingetReady ? await getWinGetUpgrades() : [];
  console.log(`[Scanner] Discovered ${upgrades.length} packages with available upgrades via WinGet.`);

  // Map upgrades by Package ID and Name for fast matching
  const upgradeMap = new Map<string, string>();
  for (const u of upgrades) {
    if (u.packageId && u.availableVersion) {
      upgradeMap.set(u.packageId.toLowerCase(), u.availableVersion);
    }
    if (u.name && u.availableVersion) {
      upgradeMap.set(u.name.toLowerCase(), u.availableVersion);
    }
  }

  // 2. Gather All WinGet Installed Applications
  const wingetApps = wingetReady ? await getWinGetInstalledApps() : [];
  console.log(`[Scanner] Discovered ${wingetApps.length} installed packages via WinGet.`);

  // 3. Gather Windows Registry Desktop Applications
  const registryApps = await getRegistryApps();
  console.log(`[Scanner] Discovered ${registryApps.length} desktop applications from Windows Registry.`);

  // Combine and deduplicate
  const appMap = new Map<string, DiscoveredApp>();

  // Process WinGet apps first (trusted package identities)
  for (const app of wingetApps) {
    const key = (app.packageId || app.name).toLowerCase();
    const available = (app.packageId && upgradeMap.get(app.packageId.toLowerCase())) ||
                      upgradeMap.get(app.name.toLowerCase()) ||
                      app.availableVersion;

    appMap.set(key, {
      ...app,
      availableVersion: available || null,
      updateStatus: available ? 'UPDATE_AVAILABLE' : 'UP_TO_DATE',
    });
  }

  // Overlay registry apps if not already matched
  for (const regApp of registryApps) {
    const key = regApp.name.toLowerCase();
    // Check if name is already present
    let exists = false;
    for (const [k, existing] of appMap.entries()) {
      if (k.includes(key) || key.includes(k) || existing.name.toLowerCase() === key) {
        exists = true;
        break;
      }
    }

    if (!exists) {
      appMap.set(`reg_${key}`, regApp);
    }
  }

  const finalApps = Array.from(appMap.values());
  console.log(`[Scanner] Discovery complete. Total unified applications: ${finalApps.length}`);
  return finalApps;
}
