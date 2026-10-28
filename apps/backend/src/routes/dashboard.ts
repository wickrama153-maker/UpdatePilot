import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { getDevices } from '../services/deviceService';

const router = Router();

/**
 * @openapi
 * /api/v1/dashboard:
 *   get:
 *     summary: Retrieve overview dashboard statistics and recent operations
 *     responses:
 *       200:
 *         description: Dashboard metrics
 */
router.get('/', async (req: Request, res: Response) => {
  try {
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
      prisma.application.count(),
      prisma.application.count({ where: { updateStatus: 'UPDATE_AVAILABLE' } }),
      prisma.application.count({ where: { updateStatus: 'UP_TO_DATE' } }),
      prisma.application.count({ where: { updateStatus: 'UNMATCHED' } }),
      prisma.application.count({ where: { updateStatus: 'UNSUPPORTED' } }),
      prisma.scanJob.findMany({
        take: 5,
        orderBy: { startedAt: 'desc' },
        include: { device: { select: { name: true } } },
      }),
      prisma.updateJob.findMany({
        take: 5,
        orderBy: { startedAt: 'desc' },
        include: { device: { select: { name: true } } },
      }),
      prisma.securityFinding.count(),
      getDevices(),
    ]);

    const activeDevice = devices.length > 0 ? devices[0] : null;
    const isOnline = activeDevice ? activeDevice.status === 'ONLINE' : false;

    // Get latest scan timestamp
    const latestScan = await prisma.scanJob.findFirst({
      where: { status: 'COMPLETED' },
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
