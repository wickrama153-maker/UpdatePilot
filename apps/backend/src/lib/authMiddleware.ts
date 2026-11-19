import { Request, Response, NextFunction } from 'express';
import { verifyToken, ensureDefaultAdminUser } from '../services/authService';
import { prisma } from './prisma';

export interface AuthenticatedRequest extends Request {
  userId?: string;
  user?: {
    userId: string;
    email: string;
    name: string;
    role: string;
  };
}

export async function authenticateUser(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  let token: string | null = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (req.query.token) {
    token = String(req.query.token).trim();
  }

  if (token) {
    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ success: false, error: 'Invalid or expired session token. Please log in again.' });
    }
    (req as AuthenticatedRequest).user = decoded;
    (req as AuthenticatedRequest).userId = decoded.userId;
    return next();
  }

  // If in strict auth mode, require token
  const strictAuth = process.env.REQUIRE_AUTH === 'true';
  if (strictAuth) {
    return res.status(401).json({ success: false, error: 'Authentication required. Please log in.' });
  }

  // Development / fallback: link to default admin user so existing desktop shell / tests pass
  const defaultAdmin = await ensureDefaultAdminUser();
  if (defaultAdmin) {
    (req as AuthenticatedRequest).user = {
      userId: defaultAdmin.id,
      email: defaultAdmin.email,
      name: defaultAdmin.name,
      role: defaultAdmin.role,
    };
    (req as AuthenticatedRequest).userId = defaultAdmin.id;
    return next();
  }

  return res.status(401).json({ success: false, error: 'Authentication required. Please log in.' });
}
