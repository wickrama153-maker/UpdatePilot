import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { recordAuditEvent } from '../services/auditService';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    let settings = await prisma.userSettings.findUnique({ where: { id: 'default' } });
    if (!settings) {
      settings = await prisma.userSettings.create({
        data: { id: 'default' },
      });
    }
    res.json({ success: true, data: settings });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.patch('/', async (req: Request, res: Response) => {
  try {
    const { theme, scanIntervalHours, autoCheckUpdates, notifyOnUpdate, telemetryEnabled, retentionDays } = req.body;

    const updateData = {
      ...(theme ? { theme } : {}),
      ...(scanIntervalHours !== undefined ? { scanIntervalHours: Number(scanIntervalHours) } : {}),
      ...(autoCheckUpdates !== undefined ? { autoCheckUpdates: Boolean(autoCheckUpdates) } : {}),
      ...(notifyOnUpdate !== undefined ? { notifyOnUpdate: Boolean(notifyOnUpdate) } : {}),
      ...(telemetryEnabled !== undefined ? { telemetryEnabled: Boolean(telemetryEnabled) } : {}),
      ...(retentionDays !== undefined ? { retentionDays: Number(retentionDays) } : {}),
      updatedAt: new Date(),
    };

    const updated = await prisma.userSettings.upsert({
      where: { id: 'default' },
      update: updateData,
      create: {
        id: 'default',
        theme: theme || 'dark',
        scanIntervalHours: scanIntervalHours !== undefined ? Number(scanIntervalHours) : 24,
        autoCheckUpdates: autoCheckUpdates !== undefined ? Boolean(autoCheckUpdates) : true,
        notifyOnUpdate: notifyOnUpdate !== undefined ? Boolean(notifyOnUpdate) : true,
        telemetryEnabled: telemetryEnabled !== undefined ? Boolean(telemetryEnabled) : false,
        retentionDays: retentionDays !== undefined ? Number(retentionDays) : 90,
      },
    });

    await recordAuditEvent({
      actor: 'user',
      eventType: 'SETTINGS_UPDATED',
      details: req.body,
    });

    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

export default router;
