import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { listSecurityFindings, checkPackageVulnerabilities } from '../services/securityService';

const router = Router();

router.get('/findings', async (req: Request, res: Response) => {
  try {
    const findings = await listSecurityFindings();
    res.json({ success: true, data: findings });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/scan', async (req: Request, res: Response) => {
  try {
    const apps = await prisma.application.findMany({
      where: {
        packageId: { not: null },
      },
      take: 25,
    });

    const results = [];
    let cleanCount = 0;
    let failedCount = 0;

    for (const app of apps) {
      if (app.packageId) {
        const audit = await checkPackageVulnerabilities(app.packageId, app.installedVersion);
        if (audit.status === 'FOUND') {
          results.push(...audit.findings);
        } else if (audit.status === 'CLEAN') {
          cleanCount++;
        } else if (audit.status === 'FAILED') {
          failedCount++;
        }
      }
    }

    const overallStatus =
      failedCount > 0 && results.length === 0
        ? 'PARTIAL_NETWORK_FAILURE'
        : results.length > 0
        ? 'VERIFIED_FINDINGS_FOUND'
        : 'CLEAN';

    res.json({
      success: true,
      data: {
        scannedCount: apps.length,
        cleanCount,
        failedCount,
        advisoriesFound: results.length,
        status: overallStatus,
        findings: results,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
