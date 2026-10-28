import { app, BrowserWindow, ipcMain, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as http from 'http';
import * as os from 'os';
import { spawn, ChildProcess } from 'child_process';

let mainWindow: BrowserWindow | null = null;
let backendProcess: ChildProcess | null = null;
let agentProcess: ChildProcess | null = null;

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;
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
function startBackend(): Promise<void> {
  return new Promise((resolve) => {
    const backendScript = isPackaged
      ? path.join(process.resourcesPath, 'backend', 'dist', 'index.js')
      : path.resolve(__dirname, '../../backend/dist/index.js');

    const staticWebDir = isPackaged
      ? path.join(process.resourcesPath, 'web', 'out')
      : path.resolve(__dirname, '../../web/out');

    const nodeExecutable = isPackaged ? process.execPath : 'node';
    const backendEnv: NodeJS.ProcessEnv = {
      ...process.env,
      PORT: String(PORT),
      DATABASE_URL: `file:${dbFilePath.replace(/\\/g, '/')}`,
      STATIC_WEB_DIR: staticWebDir,
      NODE_ENV: 'production',
      ELECTRON_RUN_AS_NODE: '1',
    };

    console.log(`[Main] Launching backend from ${backendScript} using ${nodeExecutable}...`);
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
function startAgent(): void {
  const agentScript = isPackaged
    ? path.join(process.resourcesPath, 'agent', 'dist', 'index.js')
    : path.resolve(__dirname, '../../agent/dist/index.js');

  const nodeExecutable = isPackaged ? process.execPath : 'node';
  const agentEnv: NodeJS.ProcessEnv = {
    ...process.env,
    API_BASE_URL: `http://localhost:${PORT}/api/v1`,
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

// Splash HTML while services initialize
function getSplashHtml(): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <title>UpdatePilot</title>
      <style>
        body {
          margin: 0;
          background: #0b1120;
          color: #f8fafc;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          user-select: none;
        }
        .container {
          text-align: center;
        }
        .logo {
          width: 72px;
          height: 72px;
          margin-bottom: 20px;
          animation: pulse 2s infinite ease-in-out;
        }
        h1 {
          margin: 0 0 8px;
          font-size: 24px;
          font-weight: 700;
          letter-spacing: -0.5px;
        }
        p {
          margin: 0 0 24px;
          color: #94a3b8;
          font-size: 14px;
        }
        .spinner {
          width: 32px;
          height: 32px;
          border: 3px solid rgba(56, 189, 248, 0.2);
          border-top-color: #38bdf8;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin: 0 auto;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { transform: scale(1); opacity: 0.95; } 50% { transform: scale(1.05); opacity: 1; } }
      </style>
    </head>
    <body>
      <div class="container">
        <svg class="logo" viewBox="0 0 256 256" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="256" height="256" rx="52" fill="#1e293b"/>
          <path d="M128 64L192 184L128 156L64 184L128 64Z" fill="url(#grad)"/>
          <circle cx="176" cy="68" r="10" fill="#10b981"/>
          <defs>
            <linearGradient id="grad" x1="64" y1="64" x2="192" y2="184" gradientUnits="userSpaceOnUse">
              <stop stop-color="#2563eb"/>
              <stop offset="1" stop-color="#06b6d4"/>
            </linearGradient>
          </defs>
        </svg>
        <h1>UpdatePilot</h1>
        <p>Initializing Windows Software Update Intelligence Services...</p>
        <div class="spinner"></div>
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
    backgroundColor: '#0b1120',
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
    if (!url.startsWith(`http://localhost:${PORT}`) && !url.startsWith('data:')) {
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

  // Launch backend and agent
  await startBackend();
  startAgent();

  // Wait for backend to be ready
  const isHealthy = await waitForBackend(`http://localhost:${PORT}/api/v1/health`, 25000);
  if (isHealthy && mainWindow) {
    console.log(`[Main] Backend online. Navigating window to http://localhost:${PORT}...`);
    mainWindow.loadURL(`http://localhost:${PORT}`);
  } else if (mainWindow) {
    console.error('[Main] Backend failed to report healthy status within timeout.');
    mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`
      <div style="background:#0b1120;color:#f8fafc;font-family:sans-serif;padding:40px;text-align:center;">
        <h2 style="color:#ef4444;">Service Startup Error</h2>
        <p>Unable to connect to UpdatePilot Backend API on port ${PORT}.</p>
        <p style="color:#94a3b8;font-size:12px;">Logs are located at: ${path.join(logsDir, 'backend.log')}</p>
        <button onclick="location.reload()" style="background:#2563eb;color:#fff;border:none;padding:10px 20px;border-radius:6px;cursor:pointer;margin-top:16px;">
          Retry Startup
        </button>
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
