import path from 'path';
import fs from 'fs';
import { Readable } from 'stream';
import { Router, Request, Response } from 'express';
import { getDevices, generatePairingToken, pairDevice, revokeDevice } from '../services/deviceService';
import { createScanJob } from '../services/scanService';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { DevicePairRequestSchema } from '@updatepilot/shared';
import { authenticateUser, AuthenticatedRequest } from '../lib/authMiddleware';

const router = Router();

// Rate limiting for pairing attempts: max 10 failed attempts per 5 minutes per IP
const failedPairingAttempts = new Map<string, { count: number; resetAt: number }>();

function checkPairingRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = failedPairingAttempts.get(ip);
  if (!record || now > record.resetAt) {
    return true; // Not rate limited
  }
  return record.count < 10;
}

function recordFailedPairing(ip: string) {
  const now = Date.now();
  const record = failedPairingAttempts.get(ip);
  if (!record || now > record.resetAt) {
    failedPairingAttempts.set(ip, { count: 1, resetAt: now + 5 * 60 * 1000 });
  } else {
    record.count += 1;
  }
}

function resetFailedPairing(ip: string) {
  failedPairingAttempts.delete(ip);
}

// Windows Agent Installer candidate paths
function getInstallerPath(): string | null {
  const candidatePaths = [
    path.resolve(process.cwd(), 'apps/web/public/downloads/UpdatePilot-Agent-Setup-1.0.0.exe'),
    path.resolve(process.cwd(), 'apps/web/out/downloads/UpdatePilot-Agent-Setup-1.0.0.exe'),
    path.resolve(process.cwd(), 'dist/installer/UpdatePilot-Agent-Setup-1.0.0.exe'),
    path.resolve(__dirname, '../../../web/public/downloads/UpdatePilot-Agent-Setup-1.0.0.exe'),
    '/data/downloads/UpdatePilot-Agent-Setup-1.0.0.exe',
  ];
  for (const p of candidatePaths) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

// Windows Agent Installer Information
router.get('/installer/info', (_req: Request, res: Response) => {
  const installerPath = getInstallerPath();
  const fileExists = installerPath !== null && fs.existsSync(installerPath);
  const cloudAvailable = Boolean(
    process.env.INSTALLER_DOWNLOAD_URL ||
    (process.env.GITHUB_TOKEN && process.env.GITHUB_REPO) ||
    process.env.GITHUB_RELEASE_TOKEN
  );
  let sizeBytes = 0;
  let sizeFormatted = '22.06 MB';

  if (fileExists && installerPath) {
    try {
      const stat = fs.statSync(installerPath);
      sizeBytes = stat.size;
      sizeFormatted = `${(sizeBytes / (1024 * 1024)).toFixed(2)} MB`;
    } catch {
      // fallback
    }
  }

  res.json({
    success: true,
    data: {
      version: '1.0.0',
      filename: 'UpdatePilot-Agent-Setup-1.0.0.exe',
      targetOs: 'Windows 10 / Windows 11 (x64)',
      architecture: 'x64',
      sizeBytes: sizeBytes || 23130863,
      sizeFormatted,
      releaseDate: '2026-11-18',
      downloadUrl: '/api/v1/devices/installer/download',
      available: fileExists || cloudAvailable,
    },
  });
});

// Windows Agent Installer Direct Binary Download (Local disk or GitHub Private Release stream)
router.get('/installer/download', async (_req: Request, res: Response) => {
  // 1. Check local file on disk (development, desktop, or persistent volume)
  const installerPath = getInstallerPath();
  if (installerPath && fs.existsSync(installerPath)) {
    res.setHeader('Content-Type', 'application/vnd.microsoft.portable-executable');
    return res.download(installerPath, 'UpdatePilot-Agent-Setup-1.0.0.exe', (err) => {
      if (err && !res.headersSent) {
        res.status(500).json({ success: false, error: 'Failed to stream installer download' });
      }
    });
  }

  // 2. Check for direct static storage URL (e.g. S3 / Cloudflare R2 / CDN)
  if (process.env.INSTALLER_DOWNLOAD_URL) {
    return res.redirect(process.env.INSTALLER_DOWNLOAD_URL);
  }

  // 3. Check for GitHub Release in Private/Public repository using GITHUB_TOKEN
  const ghToken = process.env.GITHUB_TOKEN || process.env.GITHUB_RELEASE_TOKEN;
  const ghRepo = process.env.GITHUB_REPO;
  const ghTag = process.env.GITHUB_RELEASE_TAG || 'v1.0.0';

  if (ghToken && ghRepo) {
    try {
      logger.info('Querying private GitHub Release for installer binary', { repo: ghRepo, tag: ghTag });
      const relRes = await fetch(`https://api.github.com/repos/${ghRepo}/releases/tags/${ghTag}`, {
        headers: {
          Authorization: `Bearer ${ghToken}`,
          Accept: 'application/vnd.github+json',
          'User-Agent': 'UpdatePilot-Backend',
        },
      });

      if (relRes.ok) {
        const relData = (await relRes.json()) as any;
        const asset = relData.assets?.find(
          (a: any) => a.name.toLowerCase().endsWith('.exe') || a.name.includes('UpdatePilot-Agent-Setup')
        );

        if (asset && asset.url) {
          logger.info('Streaming installer asset from GitHub Release API', { assetName: asset.name });
          const streamRes = await fetch(asset.url, {
            headers: {
              Authorization: `Bearer ${ghToken}`,
              Accept: 'application/octet-stream',
              'User-Agent': 'UpdatePilot-Backend',
            },
            redirect: 'follow',
          });

          if (streamRes.ok && streamRes.body) {
            res.setHeader('Content-Type', 'application/vnd.microsoft.portable-executable');
            res.setHeader(
              'Content-Disposition',
              `attachment; filename="${asset.name || 'UpdatePilot-Agent-Setup-1.0.0.exe'}"`
            );
            if (asset.size) {
              res.setHeader('Content-Length', String(asset.size));
            }

            // @ts-ignore
            return Readable.fromWeb(streamRes.body).pipe(res);
          }
        }
      }
      logger.warn('Could not locate or stream asset from GitHub Release');
    } catch (err: any) {
      logger.error('Error fetching installer from GitHub release:', { error: err.message });
    }
  }

  // 4. Fallback if binary is not available
  return res.status(404).json({
    success: false,
    error:
      'Windows Agent installer binary not found. In production, configure GITHUB_TOKEN + GITHUB_REPO or INSTALLER_DOWNLOAD_URL in Railway environment variables.',
  });
});

// Device list (scoped to authenticated user)
router.get('/', authenticateUser, async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    const devices = await getDevices(userId);
    res.json({ success: true, data: devices });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Generate pairing token linked to authenticated user (10 minutes expiry)
router.post('/token', authenticateUser, async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    const token = await generatePairingToken(userId);
    res.json({ success: true, data: { pairingToken: token, expiresInSeconds: 600 } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Agent pairing endpoint (authenticated via pairingToken in payload)
router.post('/pair', async (req: Request, res: Response) => {
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
  if (!checkPairingRateLimit(clientIp)) {
    return res.status(429).json({
      success: false,
      error: 'Too many failed pairing attempts. Please wait 5 minutes before trying again.',
    });
  }

  try {
    const parsed = DevicePairRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      recordFailedPairing(clientIp);
      return res.status(400).json({ success: false, errors: parsed.error.errors });
    }

    const result = await pairDevice(parsed.data);
    resetFailedPairing(clientIp);
    res.status(201).json({ success: true, data: result });
  } catch (err: any) {
    recordFailedPairing(clientIp);
    res.status(400).json({ success: false, error: err.message });
  }
});

// Revoke device (scoped to authenticated user)
router.post('/:id/revoke', authenticateUser, async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    const device = await revokeDevice(req.params.id, userId);
    res.json({ success: true, data: device });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Trigger remote scan for device (scoped to authenticated user)
router.post('/:id/scans', authenticateUser, async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    if (userId) {
      const dev = await prisma.device.findFirst({
        where: { id: req.params.id, userId },
      });
      if (!dev) {
        return res.status(404).json({ success: false, error: 'Device not found or not authorized' });
      }
    }

    const scanJob = await createScanJob(req.params.id);
    res.status(202).json({ success: true, data: scanJob });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

export default router;
