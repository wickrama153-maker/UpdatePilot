import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const { deviceId, type } = req.query;

    const [scans, updates, auditEvents] = await Promise.all([
      (!type || type === 'scans')
        ? prisma.scanJob.findMany({
            where: deviceId ? { deviceId: String(deviceId) } : {},
            orderBy: { startedAt: 'desc' },
            take: 50,
            include: { device: { select: { name: true } } },
          })
        : [],
      (!type || type === 'updates')
        ? prisma.updateJob.findMany({
            where: deviceId ? { deviceId: String(deviceId) } : {},
            orderBy: { startedAt: 'desc' },
            take: 50,
            include: { device: { select: { name: true } } },
          })
        : [],
      (!type || type === 'audit')
        ? prisma.auditEvent.findMany({
            where: deviceId ? { deviceId: String(deviceId) } : {},
            orderBy: { timestamp: 'desc' },
            take: 50,
            include: { device: { select: { name: true } } },
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
    const format = req.query.format || 'csv';
    const applications = await prisma.application.findMany({
      include: { device: { select: { name: true } } },
      orderBy: { name: 'asc' },
    });

    if (format === 'csv') {
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
