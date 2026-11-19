import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { generateUpdatePreview, executeUpdateJob } from '../services/updateService';
import { authenticateUser, AuthenticatedRequest } from '../lib/authMiddleware';

const router = Router();

router.use(authenticateUser);

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    const deviceId = req.query.deviceId ? String(req.query.deviceId) : undefined;

    const where: any = {
      updateStatus: 'UPDATE_AVAILABLE',
    };

    if (deviceId) {
      where.deviceId = deviceId;
      if (userId) where.device = { userId };
    } else if (userId) {
      where.device = { userId };
    }

    const updates = await prisma.application.findMany({
      where,
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
    const userId = (req as AuthenticatedRequest).userId;
    if (userId) {
      const app = await prisma.application.findFirst({
        where: { id: req.params.id, device: { userId } },
      });
      if (!app) {
        return res.status(404).json({ success: false, error: 'Application not found or not authorized' });
      }
    }

    const targetVersion = req.body.targetVersion ? String(req.body.targetVersion) : undefined;
    const preview = await generateUpdatePreview(req.params.id, targetVersion);
    res.json({ success: true, data: preview });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/:id/execute', async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    if (userId) {
      const app = await prisma.application.findFirst({
        where: { id: req.params.id, device: { userId } },
      });
      if (!app) {
        return res.status(404).json({ success: false, error: 'Application not found or not authorized' });
      }
    }

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
