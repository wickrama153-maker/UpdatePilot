import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { generateUpdatePreview, executeUpdateJob } from '../services/updateService';
import { UpdateExecuteRequestSchema } from '@updatepilot/shared';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const deviceId = req.query.deviceId ? String(req.query.deviceId) : undefined;
    const updates = await prisma.application.findMany({
      where: {
        updateStatus: 'UPDATE_AVAILABLE',
        ...(deviceId ? { deviceId } : {}),
      },
      include: {
        device: { select: { id: true, name: true, status: true } },
      },
      orderBy: { name: 'asc' },
    });

    res.json({ success: true, data: updates });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/:id/preview', async (req: Request, res: Response) => {
  try {
    const targetVersion = req.body.targetVersion ? String(req.body.targetVersion) : undefined;
    const preview = await generateUpdatePreview(req.params.id, targetVersion);
    res.json({ success: true, data: preview });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/:id/execute', async (req: Request, res: Response) => {
  try {
    const { targetVersion, confirmed, initiator } = req.body;

    if (!confirmed) {
      return res.status(400).json({
        success: false,
        error: 'Explicit user confirmation is required before executing an update.',
      });
    }

    const job = await executeUpdateJob({
      applicationId: req.params.id,
      targetVersion,
      confirmed: true,
      initiator: initiator ?? 'web_user',
    });

    res.status(202).json({ success: true, data: job });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

export default router;
