import { Router, Request, Response } from 'express';
import { listApplications, getApplicationById, togglePinApplication, getPublishersList } from '../services/appService';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const { deviceId, search, status, publisher, sortBy, sortOrder, page, pageSize } = req.query;

    const result = await listApplications({
      deviceId: deviceId ? String(deviceId) : undefined,
      search: search ? String(search) : undefined,
      status: status ? String(status) : undefined,
      publisher: publisher ? String(publisher) : undefined,
      sortBy: sortBy as any,
      sortOrder: sortOrder as any,
      page: page ? parseInt(String(page), 10) : 1,
      pageSize: pageSize ? parseInt(String(pageSize), 10) : 20,
    });

    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/publishers', async (req: Request, res: Response) => {
  try {
    const deviceId = req.query.deviceId ? String(req.query.deviceId) : undefined;
    const publishers = await getPublishersList(deviceId);
    res.json({ success: true, data: publishers });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const app = await getApplicationById(req.params.id);
    if (!app) {
      return res.status(404).json({ success: false, error: 'Application not found' });
    }
    res.json({ success: true, data: app });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/:id/pin', async (req: Request, res: Response) => {
  try {
    const app = await togglePinApplication(req.params.id);
    res.json({ success: true, data: app });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

export default router;
