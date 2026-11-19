import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { getDevices } from '../services/deviceService';
import { authenticateUser, AuthenticatedRequest } from '../lib/authMiddleware';

const router = Router();

router.use(authenticateUser);

/**
 * @openapi
 * /api/v1/dashboard:
 *   get:
 *     summary: Retrieve overview dashboard statistics and recent operations scoped to authenticated user
 *     responses:
 *       200:
 *         description: Dashboard metrics
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    const deviceId = req.query.deviceId ? String(req.query.deviceId) : undefined;

    // Build application scope
    const appWhere: any = {};
    if (deviceId) {
      appWhere.deviceId = deviceId;
      if (userId) appWhere.device = { userId };
    } else if (userId) {
      appWhere.device = { userId };
    }

    const jobWhere: any = {};
    if (deviceId) {
      jobWhere.deviceId = deviceId;
      if (userId) jobWhere.device = { userId };
    } else if (userId) {
      jobWhere.device = { userId };
    }

    const [
      totalApplications,
      updatesAvailable,
      upToDate,
      unmatchedCount,
      unsupportedCount,
      recentScans,
      recentUpdates,
      securityFindingsCount,
      devices,
    ] = await Promise.all([
      prisma.application.count({ where: appWhere }),
      prisma.application.count({ where: { ...appWhere, updateStatus: 'UPDATE_AVAILABLE' } }),
      prisma.application.count({ where: { ...appWhere, updateStatus: 'UP_TO_DATE' } }),
      prisma.application.count({ where: { ...appWhere, updateStatus: 'UNMATCHED' } }),
      prisma.application.count({ where: { ...appWhere, updateStatus: 'UNSUPPORTED' } }),
      prisma.scanJob.findMany({
        where: jobWhere,
        take: 5,
        orderBy: { startedAt: 'desc' },
        include: { device: { select: { id: true, name: true } } },
      }),
      prisma.updateJob.findMany({
        where: jobWhere,
        take: 5,
        orderBy: { startedAt: 'desc' },
        include: { device: { select: { id: true, name: true } } },
      }),
      prisma.securityFinding.count(),
      getDevices(userId),
    ]);

    const activeDevice = deviceId
      ? devices.find((d) => d.id === deviceId) || null
      : devices.find((d) => d.status === 'ONLINE') || (devices.length > 0 ? devices[0] : null);

    const isOnline = activeDevice ? activeDevice.status === 'ONLINE' : false;

    // Get latest scan timestamp
    const latestScan = await prisma.scanJob.findFirst({
      where: {
        status: 'COMPLETED',
        ...jobWhere,
      },
      orderBy: { completedAt: 'desc' },
    });

    res.json({
      success: true,
      data: {
        totalApplications,
        updatesAvailable,
        upToDate,
        unmatched: unmatchedCount,
        unsupported: unsupportedCount,
        lastScanTimestamp: latestScan?.completedAt?.toISOString() || null,
        agentConnected: isOnline,
        activeDevice,
        devices,
        agentVersion: activeDevice?.agentVersion || null,
        recentScans,
        recentUpdates,
        securityAdvisoriesCount: securityFindingsCount,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
