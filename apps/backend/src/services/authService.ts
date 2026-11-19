import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';

const DEV_JWT_FALLBACK = 'updatepilot_dev_fallback_secret_do_not_use_in_prod';

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  const isProd = process.env.NODE_ENV === 'production';

  if (isProd) {
    if (!secret || secret.trim() === '' || secret === DEV_JWT_FALLBACK || secret.includes('fallback') || secret.length < 32) {
      throw new Error(
        'FATAL SECURITY ERROR: JWT_SECRET environment variable is mandatory in production and must be at least 32 characters long. Set a secure random JWT_SECRET in Railway or server environment.'
      );
    }
    return secret.trim();
  }

  return secret && secret.trim().length >= 16 ? secret.trim() : DEV_JWT_FALLBACK;
}

const JWT_EXPIRES_IN = '30d';

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString('hex')}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const parts = storedHash.split(':');
    if (parts.length !== 2) return false;
    const [salt, key] = parts;
    const keyBuffer = Buffer.from(key, 'hex');
    const derivedKey = crypto.scryptSync(password, salt, 64);
    return crypto.timingSafeEqual(keyBuffer, derivedKey);
  } catch {
    return false;
  }
}

export function generateToken(payload: { userId: string; email: string; name: string; role: string }): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): { userId: string; email: string; name: string; role: string } | null {
  try {
    return jwt.verify(token, getJwtSecret()) as { userId: string; email: string; name: string; role: string };
  } catch {
    return null;
  }
}

export async function registerUser(data: { email: string; password: string; name: string }) {
  const email = data.email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new Error('An account with this email address already exists.');
  }

  const passwordHash = hashPassword(data.password);
  const user = await prisma.user.create({
    data: {
      email,
      name: data.name.trim(),
      passwordHash,
      role: 'USER',
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
    },
  });

  const token = generateToken({
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });

  logger.info('Registered new user account', { userId: user.id, email: user.email });
  return { user, token };
}

export async function loginUser(data: { email: string; password: string }) {
  const email = data.email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new Error('Invalid email or password.');
  }

  const isValid = verifyPassword(data.password, user.passwordHash);
  if (!isValid) {
    throw new Error('Invalid email or password.');
  }

  const token = generateToken({
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });

  logger.info('User logged in', { userId: user.id, email: user.email });
  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    token,
  };
}

export async function getUserProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      _count: {
        select: { devices: true },
      },
    },
  });
  return user;
}

export async function ensureDefaultAdminUser() {
  const userCount = await prisma.user.count();
  let defaultUser;

  if (userCount === 0) {
    const isProd = process.env.NODE_ENV === 'production';
    const emailEnv = process.env.ADMIN_INITIAL_EMAIL?.trim().toLowerCase();
    const passwordEnv = process.env.ADMIN_INITIAL_PASSWORD?.trim();

    if (isProd && (!emailEnv || !passwordEnv)) {
      logger.warn(
        'Production mode active: ADMIN_INITIAL_EMAIL and/or ADMIN_INITIAL_PASSWORD not configured. Skipping default admin user creation for security.'
      );
      return null;
    }

    const email = emailEnv || 'admin@updatepilot.io';
    const password = passwordEnv || 'UpdatePilot2026!';

    if (password.length < 8) {
      throw new Error('Initial admin password must be at least 8 characters long.');
    }

    defaultUser = await prisma.user.create({
      data: {
        email,
        name: 'Administrator',
        passwordHash: hashPassword(password),
        role: 'ADMIN',
      },
    });
    logger.info('Created initial default admin user', { email: defaultUser.email });
  } else {
    defaultUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } }) || await prisma.user.findFirst({ orderBy: { createdAt: 'asc' } });
  }

  if (defaultUser) {
    // Associate any existing unassigned devices with default admin user
    const unassigned = await prisma.device.updateMany({
      where: { userId: null },
      data: { userId: defaultUser.id },
    });
    if (unassigned.count > 0) {
      logger.info(`Assigned ${unassigned.count} legacy device(s) to default admin user`);
    }
  }

  return defaultUser;
}
