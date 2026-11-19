import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
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

    const scan = await prisma.scanJob.findFirst({
      where,
      include: { device: { select: { id: true, name: true } } },
    });

    if (!scan) {
      return res.status(404).json({ success: false, error: 'Scan job not found or not authorized' });
    }

    res.json({ success: true, data: scan });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
