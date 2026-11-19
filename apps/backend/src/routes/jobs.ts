import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { recordAuditEvent } from '../services/auditService';
import { authenticateUser, AuthenticatedRequest } from '../lib/authMiddleware';

const router = Router();

router.use(authenticateUser);

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    const where: any = { id: req.params.id };
    if (userId) {
      where.device = { userId };
    }

    const job = await prisma.updateJob.findFirst({
      where,
      include: {
        device: { select: { id: true, name: true } },
        application: true,
      },
    });

    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found or not authorized' });
    }

    res.json({ success: true, data: job });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/:id/cancel', async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    const where: any = { id: req.params.id };
    if (userId) {
      where.device = { userId };
    }

    const job = await prisma.updateJob.findFirst({ where });

    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found or not authorized' });
    }

    if (['COMPLETED', 'FAILED', 'CANCELLED', 'TIMED_OUT', 'REBOOT_REQUIRED', 'REQUIRES_RESTART'].includes(job.status)) {
      return res.status(400).json({
        success: false,
        error: `Cannot cancel a job that is already in '${job.status}' status.`,
      });
    }

    const updated = await prisma.updateJob.update({
      where: { id: req.params.id },
      data: {
        status: 'CANCELLED',
        stage: 'Cancelled by user',
        errorSummary: 'Job cancelled by user request.',
        completedAt: new Date(),
      },
    });

    await recordAuditEvent({
      actor: 'user',
      deviceId: job.deviceId,
      eventType: 'UPDATE_JOB_CANCELLED',
      target: job.applicationName,
      details: { jobId: job.id },
    });

    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
