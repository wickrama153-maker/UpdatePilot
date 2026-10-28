import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { verifyAgentToken, recordHeartbeat } from '../services/deviceService';
import { processScanReport } from '../services/scanService';
import { processJobReport } from '../services/updateService';
import { ScanReportSchema, UpdateJobReportSchema } from '@updatepilot/shared';

const router = Router();

// Middleware: Authenticate Agent using deviceId and token
async function authenticateAgent(req: Request, res: Response, next: NextFunction) {
  const deviceId = req.headers['x-agent-device-id'] as string;
  const token = req.headers['x-agent-token'] as string;

  if (!deviceId || !token) {
    return res.status(401).json({ success: false, error: 'Missing x-agent-device-id or x-agent-token header' });
  }

  const isValid = await verifyAgentToken(deviceId, token);
  if (!isValid) {
    return res.status(403).json({ success: false, error: 'Invalid or revoked agent credentials' });
  }

  (req as any).agentDeviceId = deviceId;
  next();
}

router.use(authenticateAgent);

// Agent Heartbeat
router.post('/heartbeat', async (req: Request, res: Response) => {
  try {
    const deviceId = (req as any).agentDeviceId;
    const { agentVersion, status } = req.body;
    await recordHeartbeat(deviceId, agentVersion, status || 'ONLINE');
    res.json({ success: true, timestamp: new Date().toISOString() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Fetch pending jobs for this agent
router.get('/pending-jobs', async (req: Request, res: Response) => {
  try {
    const deviceId = (req as any).agentDeviceId;

    // Check for pending scan jobs
    const pendingScan = await prisma.scanJob.findFirst({
      where: { deviceId, status: 'PENDING' },
      orderBy: { startedAt: 'asc' },
    });

    // Check for approved update jobs
    const pendingUpdate = await prisma.updateJob.findFirst({
      where: { deviceId, status: 'APPROVED' },
      orderBy: { startedAt: 'asc' },
      include: { application: true },
    });

    res.json({
      success: true,
      data: {
        scanJob: pendingScan,
        updateJob: pendingUpdate,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Submit discovered application scan report
router.post('/scan-results', async (req: Request, res: Response) => {
  try {
    const deviceId = (req as any).agentDeviceId;
    const parsed = ScanReportSchema.safeParse({ ...req.body, deviceId });

    if (!parsed.success) {
      return res.status(400).json({ success: false, errors: parsed.error.errors });
    }

    const result = await processScanReport(parsed.data);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Submit update execution progress and verification status
router.post('/job-status', async (req: Request, res: Response) => {
  try {
    const deviceId = (req as any).agentDeviceId;
    const parsed = UpdateJobReportSchema.safeParse({ ...req.body, deviceId });

    if (!parsed.success) {
      return res.status(400).json({ success: false, errors: parsed.error.errors });
    }

    const result = await processJobReport(parsed.data);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
