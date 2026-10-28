import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const desktopRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(desktopRoot, '../..');

test('Desktop Package: Configuration and manifest integrity', () => {
  const pkgPath = path.join(desktopRoot, 'package.json');
  assert.ok(fs.existsSync(pkgPath), 'package.json must exist in apps/desktop');

  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  assert.equal(pkg.name, '@updatepilot/desktop');
  assert.equal(pkg.version, '1.0.0');
  assert.equal(pkg.main, 'dist/main.js');
  assert.ok(pkg.scripts.desktop, 'desktop script must exist');
  assert.ok(pkg.scripts.dist, 'dist script must exist');
  assert.ok(pkg.devDependencies.electron, 'electron must be a dependency');
  assert.ok(pkg.devDependencies['electron-builder'], 'electron-builder must be a dependency');
});

test('Desktop Installer: electron-builder NSIS configuration integrity', () => {
  const configPath = path.join(desktopRoot, 'electron-builder.json');
  assert.ok(fs.existsSync(configPath), 'electron-builder.json must exist');

  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  assert.equal(config.productName, 'UpdatePilot');
  assert.equal(config.appId, 'com.updatepilot.desktop');

  // Verify NSIS settings
  assert.ok(config.win, 'Windows target config must exist');
  assert.equal(config.win.target[0].target, 'nsis');
  assert.deepEqual(config.win.target[0].arch, ['x64']);
  assert.equal(config.win.icon, 'assets/icon.ico');

  assert.ok(config.nsis, 'NSIS config must exist');
  assert.equal(config.nsis.createDesktopShortcut, true, 'Must create desktop shortcut by default');
  assert.equal(config.nsis.createStartMenuShortcut, true, 'Must create Start Menu shortcut');
  assert.equal(config.nsis.shortcutName, 'UpdatePilot');
  assert.equal(config.nsis.uninstallDisplayName, 'UpdatePilot');
  assert.equal(config.nsis.runAfterFinish, true);
  assert.equal(config.nsis.installerIcon, 'assets/icon.ico');
  assert.equal(config.nsis.uninstallerIcon, 'assets/icon.ico');
});

test('Desktop Icon: Windows Multi-Resolution ICO specification compliance', () => {
  const icoPath = path.join(desktopRoot, 'assets', 'icon.ico');
  assert.ok(fs.existsSync(icoPath), 'icon.ico must exist in assets');

  const buf = fs.readFileSync(icoPath);
  assert.ok(buf.length > 5000, 'icon.ico must not be empty or truncated');

  // Validate ICONDIR header
  const reserved = buf.readUInt16LE(0);
  const type = buf.readUInt16LE(2);
  const count = buf.readUInt16LE(4);

  assert.equal(reserved, 0, 'ICO header reserved must be 0');
  assert.equal(type, 1, 'ICO header type must be 1');
  assert.ok(count >= 4, `ICO must contain at least 4 frame sizes, found: ${count}`);

  const requiredSizes = [16, 32, 48, 256];
  const foundSizes = [];

  for (let i = 0; i < count; i++) {
    const offset = 6 + i * 16;
    const w = buf[offset] === 0 ? 256 : buf[offset];
    const h = buf[offset + 1] === 0 ? 256 : buf[offset + 1];
    const bpp = buf.readUInt16LE(offset + 6);
    const bytes = buf.readUInt32LE(offset + 8);
    foundSizes.push(w);
    assert.equal(w, h, `Frame ${i} must be square (${w}x${h})`);
    assert.ok(bytes > 100, `Frame ${i} data must be valid PNG payload`);
  }

  for (const s of requiredSizes) {
    assert.ok(foundSizes.includes(s), `ICO must include size ${s}x${s}`);
  }
});

test('Desktop Security: Context isolation and secure preload bridge', () => {
  const preloadSourcePath = path.join(desktopRoot, 'src', 'preload.ts');
  assert.ok(fs.existsSync(preloadSourcePath), 'preload.ts source must exist');

  const content = fs.readFileSync(preloadSourcePath, 'utf8');

  // Must use contextBridge.exposeInMainWorld
  assert.ok(content.includes('contextBridge.exposeInMainWorld'), 'Must use contextBridge');
  assert.ok(content.includes('electronAPI'), 'Must expose electronAPI namespace');

  // Must NOT expose dangerous APIs
  assert.ok(!content.includes('child_process'), 'Preload must never expose child_process');
  assert.ok(!content.includes('process.env'), 'Preload must not leak process.env');
  assert.ok(!content.includes('exec(') && !content.includes('spawn('), 'Preload must not expose command execution');

  // Must expose window controls
  assert.ok(content.includes('minimize'), 'Must expose minimize');
  assert.ok(content.includes('maximize'), 'Must expose maximize');
  assert.ok(content.includes('close'), 'Must expose close');
});

test('Desktop Main Process: Architecture and lifecycle verification', () => {
  const mainSourcePath = path.join(desktopRoot, 'src', 'main.ts');
  assert.ok(fs.existsSync(mainSourcePath), 'main.ts source must exist');

  const content = fs.readFileSync(mainSourcePath, 'utf8');

  // Process lifecycle and single instance lock
  assert.ok(content.includes('requestSingleInstanceLock'), 'Must enforce single instance lock');
  assert.ok(content.includes('contextIsolation: true'), 'Must enforce context isolation');
  assert.ok(content.includes('nodeIntegration: false'), 'Must disable node integration');
  assert.ok(content.includes('sandbox: true'), 'Must enable sandbox');

  // Persistent user data path for SQLite database
  assert.ok(content.includes('app.getPath(\'userData\')'), 'Must store SQLite database in Windows user data');
  assert.ok(content.includes('updatepilot.db'), 'Must use updatepilot.db in userData');
  assert.ok(!content.includes('Program Files'), 'Must not store writable data in Program Files');

  // Clean shutdown
  assert.ok(content.includes('before-quit') || content.includes('window-all-closed'), 'Must handle clean shutdown');
  assert.ok(content.includes('killChild') || content.includes('taskkill'), 'Must terminate child process tree on shutdown');
});

test('Desktop Static Frontend: Static export builds successfully', () => {
  const outHtmlPath = path.join(repoRoot, 'apps', 'web', 'out', 'index.html');
  assert.ok(fs.existsSync(outHtmlPath), 'Static HTML export must exist at apps/web/out/index.html');

  const html = fs.readFileSync(outHtmlPath, 'utf8');
  assert.ok(html.includes('UpdatePilot'), 'Static HTML must include UpdatePilot title/metadata');
  assert.ok(html.includes('_next'), 'Static HTML must link to Next.js bundles');
});

test('Desktop Distribution: NSIS Installer and unpacked executable verification', () => {
  const installerPath = path.join(repoRoot, 'dist', 'installer', 'UpdatePilot-Setup-1.0.0.exe');
  assert.ok(fs.existsSync(installerPath), 'UpdatePilot-Setup-1.0.0.exe installer must exist');

  const stat = fs.statSync(installerPath);
  assert.ok(stat.size > 50 * 1024 * 1024, `Installer size must exceed 50MB (found ${Math.round(stat.size / (1024 * 1024))}MB)`);

  const unpackedExePath = path.join(repoRoot, 'dist', 'installer', 'win-unpacked', 'UpdatePilot.exe');
  assert.ok(fs.existsSync(unpackedExePath), 'Standalone UpdatePilot.exe must exist in win-unpacked');

  const unpackedAsarPath = path.join(repoRoot, 'dist', 'installer', 'win-unpacked', 'resources', 'app.asar');
  assert.ok(fs.existsSync(unpackedAsarPath), 'app.asar package must exist in unpacked resources');
});
