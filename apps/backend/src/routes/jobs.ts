import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { recordAuditEvent } from '../services/auditService';

const router = Router();

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const job = await prisma.updateJob.findUnique({
      where: { id: req.params.id },
      include: {
        device: { select: { id: true, name: true } },
        application: true,
      },
    });

    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    res.json({ success: true, data: job });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/:id/cancel', async (req: Request, res: Response) => {
  try {
    const job = await prisma.updateJob.findUnique({
      where: { id: req.params.id },
    });

    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    if (['COMPLETED', 'FAILED', 'CANCELLED'].includes(job.status)) {
      return res.status(400).json({
        success: false,
        error: `Cannot cancel a job that is already in '${job.status}' status.`,
      });
    }

    const updated = await prisma.updateJob.update({
      where: { id: req.params.id },
      data: {
        status: 'CANCELLED',
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
