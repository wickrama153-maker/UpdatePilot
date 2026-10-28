import { Router, Request, Response } from 'express';
import { getDevices, generatePairingToken, pairDevice, revokeDevice } from '../services/deviceService';
import { createScanJob } from '../services/scanService';
import { DevicePairRequestSchema } from '@updatepilot/shared';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const devices = await getDevices();
    res.json({ success: true, data: devices });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/token', async (req: Request, res: Response) => {
  try {
    const token = await generatePairingToken();
    res.json({ success: true, data: { pairingToken: token, expiresInSeconds: 900 } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/pair', async (req: Request, res: Response) => {
  try {
    const parsed = DevicePairRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, errors: parsed.error.errors });
    }

    const result = await pairDevice(parsed.data);
    res.status(201).json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/:id/revoke', async (req: Request, res: Response) => {
  try {
    const device = await revokeDevice(req.params.id);
    res.json({ success: true, data: device });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/:id/scans', async (req: Request, res: Response) => {
  try {
    const scanJob = await createScanJob(req.params.id);
    res.status(202).json({ success: true, data: scanJob });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

export default router;
