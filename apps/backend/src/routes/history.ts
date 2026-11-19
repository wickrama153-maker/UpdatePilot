import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateUser, AuthenticatedRequest } from '../lib/authMiddleware';

const router = Router();

router.use(authenticateUser);

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    const { deviceId, type } = req.query;

    const jobWhere: any = {};
    if (deviceId) {
      jobWhere.deviceId = String(deviceId);
      if (userId) jobWhere.device = { userId };
    } else if (userId) {
      jobWhere.device = { userId };
    }

    const auditWhere: any = {};
    if (deviceId) {
      auditWhere.deviceId = String(deviceId);
      if (userId) auditWhere.device = { userId };
    } else if (userId) {
      auditWhere.device = { userId };
    }

    const [scans, updates, auditEvents] = await Promise.all([
      (!type || type === 'scans')
        ? prisma.scanJob.findMany({
            where: jobWhere,
            orderBy: { startedAt: 'desc' },
            take: 50,
            include: { device: { select: { id: true, name: true } } },
          })
        : [],
      (!type || type === 'updates')
        ? prisma.updateJob.findMany({
            where: jobWhere,
            orderBy: { startedAt: 'desc' },
            take: 50,
            include: { device: { select: { id: true, name: true } } },
          })
        : [],
      (!type || type === 'audit')
        ? prisma.auditEvent.findMany({
            where: auditWhere,
            orderBy: { timestamp: 'desc' },
            take: 50,
            include: { device: { select: { id: true, name: true } } },
          })
        : [],
    ]);

    res.json({
      success: true,
      data: {
        scans,
        updates,
        auditEvents,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/export', async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    const { deviceId, format } = req.query;
    const expFormat = format || 'csv';

    const where: any = {};
    if (deviceId) {
      where.deviceId = String(deviceId);
      if (userId) where.device = { userId };
    } else if (userId) {
      where.device = { userId };
    }

    const applications = await prisma.application.findMany({
      where,
      include: { device: { select: { name: true } } },
      orderBy: { name: 'asc' },
    });

    if (expFormat === 'csv') {
      const headers = ['"Application Name"', '"Publisher"', '"Installed Version"', '"Available Version"', '"Package ID"', '"Status"', '"Source"', '"Device"', '"Last Scanned"'];
      const rows = applications.map((app) => [
        `"${(app.name || '').replace(/"/g, '""')}"`,
        `"${(app.publisher || '').replace(/"/g, '""')}"`,
        `"${(app.installedVersion || '').replace(/"/g, '""')}"`,
        `"${(app.availableVersion || '').replace(/"/g, '""')}"`,
        `"${(app.packageId || '').replace(/"/g, '""')}"`,
        `"${app.updateStatus}"`,
        `"${app.source}"`,
        `"${app.device.name}"`,
        `"${app.lastScannedAt.toISOString()}"`,
      ]);

      const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="updatepilot-inventory-${new Date().toISOString().slice(0, 10)}.csv"`);
      return res.send(csvContent);
    }

    res.json({ success: true, data: applications });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
