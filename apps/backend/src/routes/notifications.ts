import { Router, Request, Response } from 'express';
import {
  listNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
} from '../services/notificationService';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const onlyUnread = req.query.unread === 'true';
    const result = await listNotifications(onlyUnread);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.patch('/:id/read', async (req: Request, res: Response) => {
  try {
    const notif = await markNotificationAsRead(req.params.id);
    res.json({ success: true, data: notif });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/read-all', async (req: Request, res: Response) => {
  try {
    const result = await markAllNotificationsAsRead();
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await deleteNotification(req.params.id);
    res.json({ success: true, message: 'Notification removed' });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

export default router;
