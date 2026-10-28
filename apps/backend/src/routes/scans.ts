import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const scan = await prisma.scanJob.findUnique({
      where: { id: req.params.id },
      include: { device: { select: { id: true, name: true } } },
    });

    if (!scan) {
      return res.status(404).json({ success: false, error: 'Scan job not found' });
    }

    res.json({ success: true, data: scan });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
