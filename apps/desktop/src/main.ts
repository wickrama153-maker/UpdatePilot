import { app, BrowserWindow, ipcMain, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as http from 'http';
import * as net from 'net';
import * as os from 'os';
import { spawn, ChildProcess } from 'child_process';

let mainWindow: BrowserWindow | null = null;
let backendProcess: ChildProcess | null = null;
let agentProcess: ChildProcess | null = null;
let activePort = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;

const isPackaged = app.isPackaged;

// Request single-instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

// Find a free TCP port starting from preferredPort
function getAvailablePort(preferredPort: number = 4000): Promise<number> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => {
      // If port is occupied by another process, try the next port
      resolve(getAvailablePort(preferredPort + 1));
    });
    server.once('listening', () => {
      const addr = server.address() as net.AddressInfo;
      const port = addr.port;
      server.close(() => resolve(port));
    });
    server.listen(preferredPort, '127.0.0.1');
  });
}

// Prepare userData directories and persistent SQLite DB
const userDataPath = app.getPath('userData');
const logsDir = path.join(userDataPath, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const dbFilePath = path.join(userDataPath, 'updatepilot.db');
const templateDbPath = isPackaged
  ? path.join(process.resourcesPath, 'backend', 'prisma', 'dev.db')
  : path.resolve(__dirname, '../../backend/prisma/dev.db');

if (!fs.existsSync(dbFilePath)) {
  try {
    if (fs.existsSync(templateDbPath)) {
      fs.copyFileSync(templateDbPath, dbFilePath);
      console.log(`[Main] Initialized database from template at ${dbFilePath}`);
    } else {
      console.warn(`[Main] Template DB not found at ${templateDbPath}. Backend will create it.`);
    }
  } catch (err) {
    console.error('[Main] Failed to copy template DB:', err);
  }
}

// Helper: Kill child processes safely (including Windows process tree)
function killChild(proc: ChildProcess | null, name: string) {
  if (!proc || !proc.pid) return;
  try {
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', String(proc.pid), '/t', '/f'], { windowsHide: true });
    } else {
      proc.kill('SIGTERM');
    }
    console.log(`[Main] Sent terminate signal to ${name} (PID ${proc.pid})`);
  } catch (err) {
    console.error(`[Main] Error terminating ${name}:`, err);
  }
}

// Start backend Express server as a child process
function startBackend(port: number): Promise<void> {
  return new Promise((resolve) => {
    const backendScript = isPackaged
      ? path.join(process.resourcesPath, 'backend', 'dist', 'index.js')
      : path.resolve(__dirname, '../../backend/dist/index.js');

    const staticWebDir = isPackaged
      ? path.join(process.resourcesPath, 'web', 'out')
      : path.resolve(__dirname, '../../web/out');

    const nodeExecutable = isPackaged ? process.execPath : 'node';
    const resourcesNodeModules = isPackaged
      ? path.join(process.resourcesPath, 'node_modules')
      : path.resolve(__dirname, '../../../node_modules');

    const backendEnv: NodeJS.ProcessEnv = {
      ...process.env,
      PORT: String(port),
      DATABASE_URL: `file:${dbFilePath.replace(/\\/g, '/')}`,
      STATIC_WEB_DIR: staticWebDir,
      NODE_PATH: resourcesNodeModules,
      NODE_ENV: 'production',
      ELECTRON_RUN_AS_NODE: '1',
    };

    console.log(`[Main] Launching backend from ${backendScript} on port ${port}...`);
    const backendLogStream = fs.createWriteStream(path.join(logsDir, 'backend.log'), { flags: 'a' });

    backendProcess = spawn(nodeExecutable, [backendScript], {
      env: backendEnv,
      cwd: isPackaged ? path.join(process.resourcesPath, 'backend') : path.resolve(__dirname, '../../backend'),
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    backendProcess.stdout?.pipe(backendLogStream);
    backendProcess.stderr?.pipe(backendLogStream);

    backendProcess.on('error', (err) => {
      console.error('[Main] Backend process error:', err);
    });

    backendProcess.on('exit', (code, signal) => {
      console.log(`[Main] Backend process exited with code ${code}, signal ${signal}`);
      backendProcess = null;
    });

    resolve();
  });
}

// Start native Windows Local Agent as a child process
function startAgent(port: number): void {
  const agentScript = isPackaged
    ? path.join(process.resourcesPath, 'agent', 'dist', 'index.js')
    : path.resolve(__dirname, '../../agent/dist/index.js');

  const nodeExecutable = isPackaged ? process.execPath : 'node';
  const resourcesNodeModules = isPackaged
    ? path.join(process.resourcesPath, 'node_modules')
    : path.resolve(__dirname, '../../../node_modules');

  const agentEnv: NodeJS.ProcessEnv = {
    ...process.env,
    API_BASE_URL: `http://127.0.0.1:${port}/api/v1`,
    NODE_PATH: resourcesNodeModules,
    NODE_ENV: 'production',
    ELECTRON_RUN_AS_NODE: '1',
  };

  console.log(`[Main] Launching Windows Local Agent from ${agentScript}...`);
  const agentLogStream = fs.createWriteStream(path.join(logsDir, 'agent.log'), { flags: 'a' });

  agentProcess = spawn(nodeExecutable, [agentScript], {
    env: agentEnv,
    cwd: isPackaged ? path.join(process.resourcesPath, 'agent') : path.resolve(__dirname, '../../agent'),
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  agentProcess.stdout?.pipe(agentLogStream);
  agentProcess.stderr?.pipe(agentLogStream);

  agentProcess.on('error', (err) => {
    console.error('[Main] Agent process error:', err);
  });

  agentProcess.on('exit', (code, signal) => {
    console.log(`[Main] Agent process exited with code ${code}, signal ${signal}`);
    agentProcess = null;
  });
}

// Poll backend health endpoint until it is ready
function waitForBackend(url: string, timeoutMs: number = 25000): Promise<boolean> {
  const startTime = Date.now();
  return new Promise((resolve) => {
    const check = () => {
      const req = http.get(url, (res) => {
        if (res.statusCode === 200) {
          resolve(true);
        } else if (Date.now() - startTime < timeoutMs) {
          setTimeout(check, 300);
        } else {
          resolve(false);
        }
      });

      req.on('error', () => {
        if (Date.now() - startTime < timeoutMs) {
          setTimeout(check, 300);
        } else {
          resolve(false);
        }
      });
      req.end();
    };
    check();
  });
}

// Splash HTML while services initialize (Swiss Engineering Interface)
function getSplashHtml(): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <title>UpdatePilot</title>
      <style>
        * { box-sizing: border-box; }
        body {
          margin: 0;
          background-color: #1B1C1A;
          background-image: 
            linear-gradient(to right, rgba(56, 58, 53, 0.4) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(56, 58, 53, 0.4) 1px, transparent 1px);
          background-size: 24px 24px;
          color: #F3EFE5;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          user-select: none;
        }
        .container {
          background: #242623;
          border: 1px solid #383A35;
          border-radius: 4px;
          padding: 36px 44px;
          text-align: center;
          max-width: 440px;
          width: 90%;
          box-shadow: 0 20px 40px rgba(0,0,0,0.4);
        }
        .glyph {
          width: 52px;
          height: 52px;
          margin: 0 auto 20px;
          border: 1px solid #F06435;
          background: rgba(240, 100, 53, 0.1);
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .glyph svg {
          width: 32px;
          height: 32px;
          stroke: #F06435;
        }
        .tag {
          font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.15em;
          color: #F06435;
          text-transform: uppercase;
          margin-bottom: 6px;
        }
        h1 {
          margin: 0 0 6px;
          font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
          font-size: 20px;
          font-weight: 900;
          letter-spacing: 0.12em;
          color: #F3EFE5;
          text-transform: uppercase;
        }
        p {
          margin: 0 0 22px;
          color: #9E9F97;
          font-size: 12px;
          line-height: 1.5;
        }
        .progress-bar {
          width: 100%;
          height: 3px;
          background: #2D302C;
          border-radius: 1px;
          overflow: hidden;
          position: relative;
        }
        .progress-indicator {
          width: 40%;
          height: 100%;
          background: #F06435;
          position: absolute;
          animation: slide 1.4s ease-in-out infinite;
        }
        @keyframes slide {
          0% { left: -40%; width: 30%; }
          50% { left: 40%; width: 50%; }
          100% { left: 100%; width: 30%; }
        }
        .status-feed {
          margin-top: 18px;
          padding-top: 14px;
          border-top: 1px solid #383A35;
          font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
          font-size: 10px;
          color: #77786F;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="glyph">
          <svg viewBox="0 0 24 24" fill="none" stroke-width="2.5">
            <path d="M12 3L20 19H4L12 3Z" stroke-linejoin="miter" />
            <path d="M12 9V15" stroke-linecap="square" />
            <circle cx="12" cy="18" r="0.5" fill="#F06435" stroke-width="1" />
          </svg>
        </div>
        <div class="tag">[SUBSYSTEM BOOT]</div>
        <h1>UpdatePilot</h1>
        <p>Initializing Windows Software Update Intelligence & Management Platform...</p>
        <div class="progress-bar">
          <div class="progress-indicator"></div>
        </div>
        <div class="status-feed">
          CONNECTING PERSISTENCE // WINGET IPC BRIDGE
        </div>
      </div>
    </body>
    </html>
  `;
}

// Create the primary application window
function createWindow() {
  const iconPath = path.resolve(__dirname, '../assets/icon.ico');

  mainWindow = new BrowserWindow({
    width: 1366,
    height: 860,
    minWidth: 1024,
    minHeight: 680,
    title: 'UpdatePilot',
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    backgroundColor: '#1B1C1A',
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.resolve(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });

  // Keep title as UpdatePilot
  mainWindow.on('page-title-updated', (event) => {
    event.preventDefault();
  });

  // Display window once styled content is loaded
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Load splash while backend boots
  mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(getSplashHtml())}`);

  // Restrict navigation and external links safely
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://') || url.startsWith('http://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(`http://127.0.0.1:${activePort}`) && !url.startsWith(`http://localhost:${activePort}`) && !url.startsWith('data:')) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Setup IPC handlers for renderer
function setupIpcHandlers() {
  ipcMain.handle('get-app-version', () => app.getVersion());

  ipcMain.handle('get-system-info', () => ({
    platform: process.platform,
    arch: process.arch,
    osRelease: os.release(),
    hostname: os.hostname(),
  }));

  ipcMain.handle('window-minimize', () => {
    mainWindow?.minimize();
  });

  ipcMain.handle('window-maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });

  ipcMain.handle('window-close', () => {
    mainWindow?.close();
  });

  ipcMain.handle('window-is-maximized', () => mainWindow?.isMaximized() ?? false);

  ipcMain.handle('open-external', async (_event, url: string) => {
    if (typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'))) {
      await shell.openExternal(url);
    }
  });
}

// App lifecycle
app.whenReady().then(async () => {
  setupIpcHandlers();
  createWindow();

  // Determine available port
  activePort = await getAvailablePort(activePort);
  console.log(`[Main] UpdatePilot binding to active port ${activePort}`);

  // Launch backend and agent
  await startBackend(activePort);
  startAgent(activePort);

  // Wait for backend to be ready
  const isHealthy = await waitForBackend(`http://127.0.0.1:${activePort}/api/v1/health`, 25000);
  if (isHealthy && mainWindow) {
    console.log(`[Main] Backend online. Navigating window to http://127.0.0.1:${activePort}...`);
    mainWindow.loadURL(`http://127.0.0.1:${activePort}`);
  } else if (mainWindow) {
    console.error('[Main] Backend failed to report healthy status within timeout.');
    mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`
      <div style="background:#1B1C1A;color:#F3EFE5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;padding:48px;height:100vh;display:flex;align-items:center;justify-content:center;box-sizing:border-box;">
        <div style="background:#242623;border:1px solid #383A35;border-radius:4px;padding:36px 44px;max-width:480px;text-align:center;box-shadow:0 20px 40px rgba(0,0,0,0.5);">
          <div style="font-family:ui-monospace,monospace;font-size:10px;font-weight:700;letter-spacing:0.15em;color:#B8433D;text-transform:uppercase;margin-bottom:8px;">[SYSTEM FAULT // TIME-OUT]</div>
          <h2 style="font-family:ui-monospace,monospace;font-size:18px;font-weight:900;letter-spacing:0.08em;color:#F3EFE5;margin:0 0 12px;text-transform:uppercase;">Service Startup Timeout</h2>
          <p style="color:#9E9F97;font-size:12px;line-height:1.5;margin:0 0 16px;">Unable to establish communication with UpdatePilot Backend API on active port ${activePort}.</p>
          <div style="background:#1B1C1A;border:1px solid #383A35;border-radius:3px;padding:10px 12px;font-family:ui-monospace,monospace;font-size:10px;color:#77786F;word-break:break-all;text-align:left;margin-bottom:20px;">
            LOG: ${path.join(logsDir, 'backend.log')}
          </div>
          <button onclick="location.reload()" style="background:#F06435;color:#fff;border:none;padding:10px 24px;border-radius:3px;font-family:ui-monospace,monospace;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;cursor:pointer;transition:background 0.2s;">
            RETRY INITIALIZATION
          </button>
        </div>
      </div>
    `)}`);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Clean shutdown
let isQuitting = false;
function shutdownServices() {
  if (isQuitting) return;
  isQuitting = true;
  console.log('[Main] Shutting down UpdatePilot background services...');
  killChild(agentProcess, 'Agent');
  killChild(backendProcess, 'Backend');
}

app.on('before-quit', () => {
  shutdownServices();
});

app.on('window-all-closed', () => {
  shutdownServices();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
