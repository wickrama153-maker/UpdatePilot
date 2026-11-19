import { Router, Request, Response } from 'express';
import { registerUser, loginUser, getUserProfile } from '../services/authService';
import { authenticateUser, AuthenticatedRequest } from '../lib/authMiddleware';
import { UserRegisterSchema, UserLoginSchema } from '@updatepilot/shared';

const router = Router();

router.post('/register', async (req: Request, res: Response) => {
  try {
    const parsed = UserRegisterSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: parsed.error.errors.map((e) => e.message).join(', '),
      });
    }

    const result = await registerUser(parsed.data);
    res.status(201).json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const parsed = UserLoginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: parsed.error.errors.map((e) => e.message).join(', '),
      });
    }

    const result = await loginUser(parsed.data);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(401).json({ success: false, error: err.message });
  }
});

router.get('/me', authenticateUser, async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'User not authenticated' });
    }

    const user = await getUserProfile(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({ success: true, data: user });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
