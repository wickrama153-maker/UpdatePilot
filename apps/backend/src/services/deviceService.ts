import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { recordAuditEvent } from './auditService';

// In-memory active pairing tokens with expiry (15 minutes)
interface PairingToken {
  token: string;
  userId?: string;
  expiresAt: number;
}
const activeTokens: Map<string, PairingToken> = new Map();

export async function generatePairingToken(userId?: string): Promise<string> {
  // Generate a clean cryptographically random pairing code for easy user entry
  const token = `UP-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  activeTokens.set(token, {
    token,
    userId,
    expiresAt: Date.now() + 10 * 60 * 1000, // Exactly 10 minutes
  });
  logger.info('Generated new device pairing token', { token, userId, expiresInSeconds: 600 });
  return token;
}

export function consumePairingToken(token: string): { userId?: string } | null {
  // In development/test mode only, allow default pairing secret for automated test suites
  if (process.env.NODE_ENV !== 'production') {
    const defaultSecret = process.env.PAIRING_SECRET || 'updatepilot_pair_token_default_12345';
    if (token === defaultSecret) return { userId: undefined };
  }

  const found = activeTokens.get(token);
  if (!found) return null;
  if (Date.now() > found.expiresAt) {
    activeTokens.delete(token);
    return null;
  }
  // Token is valid and consumed immediately (single-use)
  activeTokens.delete(token);
  return { userId: found.userId };
}

export function validatePairingToken(token: string): boolean {
  return consumePairingToken(token) !== null;
}

export async function pairDevice(data: {
  deviceName: string;
  hardwareId?: string;
  osName: string;
  osVersion: string;
  architecture: string;
  agentVersion: string;
  pairingToken: string;
}) {
  const tokenInfo = consumePairingToken(data.pairingToken);
  if (!tokenInfo) {
    throw new Error('Invalid or expired pairing token');
  }

  const userId = tokenInfo.userId || null;

  // Find existing device for this user (matching hardwareId or deviceName)
  let device = await prisma.device.findFirst({
    where: {
      AND: [
        userId ? { userId } : {},
        data.hardwareId
          ? { OR: [{ hardwareId: data.hardwareId }, { name: data.deviceName }] }
          : { name: data.deviceName },
      ],
    },
  });

  if (device) {
    device = await prisma.device.update({
      where: { id: device.id },
      data: {
        userId: userId || device.userId,
        hardwareId: data.hardwareId || device.hardwareId,
        osName: data.osName,
        osVersion: data.osVersion,
        architecture: data.architecture,
        agentVersion: data.agentVersion,
        status: 'ONLINE',
        lastSeenAt: new Date(),
      },
    });
  } else {
    device = await prisma.device.create({
      data: {
        userId,
        hardwareId: data.hardwareId || null,
        name: data.deviceName,
        osName: data.osName,
        osVersion: data.osVersion,
        architecture: data.architecture,
        agentVersion: data.agentVersion,
        status: 'ONLINE',
      },
    });
  }

  // Generate a permanent API token for this agent
  const rawAgentToken = `agt_${crypto.randomBytes(32).toString('hex')}`;
  const hashedToken = crypto.createHash('sha256').update(rawAgentToken).digest('hex');

  // Deactivate previous credentials
  await prisma.agentCredential.updateMany({
    where: { deviceId: device.id },
    data: { isActive: false, rotatedAt: new Date() },
  });

  // Store new credential
  await prisma.agentCredential.create({
    data: {
      deviceId: device.id,
      hashedToken,
      isActive: true,
    },
  });

  await recordAuditEvent({
    actor: 'agent',
    deviceId: device.id,
    eventType: 'DEVICE_PAIRED',
    target: device.name,
    details: { os: `${data.osName} ${data.osVersion} (${data.architecture})`, agentVersion: data.agentVersion },
  });

  return {
    device,
    agentToken: rawAgentToken,
  };
}

export async function verifyAgentToken(deviceId: string, rawToken: string): Promise<boolean> {
  const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
  const credential = await prisma.agentCredential.findFirst({
    where: {
      deviceId,
      hashedToken,
      isActive: true,
    },
  });
  return !!credential;
}

export async function recordHeartbeat(deviceId: string, agentVersion?: string, status: string = 'ONLINE') {
  return prisma.device.update({
    where: { id: deviceId },
    data: {
      status,
      lastSeenAt: new Date(),
      ...(agentVersion ? { agentVersion } : {}),
    },
  });
}

export async function getDevices(userId?: string) {
  const where = userId ? { userId } : {};
  const devices = await prisma.device.findMany({
    where,
    orderBy: { lastSeenAt: 'desc' },
    include: {
      _count: {
        select: { applications: true },
      },
    },
  });

  // Check for devices that haven't been seen in > 3 minutes and mark OFFLINE in memory
  const now = Date.now();
  return devices.map((d) => {
    const diffMs = now - new Date(d.lastSeenAt).getTime();
    const isStale = diffMs > 3 * 60 * 1000;
    return {
      ...d,
      status: isStale && d.status === 'ONLINE' ? 'OFFLINE' : d.status,
    };
  });
}

export async function revokeDevice(deviceId: string, userId?: string) {
  const where: any = { id: deviceId };
  if (userId) {
    where.userId = userId;
  }

  const existing = await prisma.device.findFirst({ where });
  if (!existing) {
    throw new Error('Device not found or not authorized for this account');
  }

  await prisma.agentCredential.updateMany({
    where: { deviceId },
    data: { isActive: false, revokedAt: new Date() },
  });

  const device = await prisma.device.update({
    where: { id: deviceId },
    data: { status: 'REVOKED' },
  });

  await recordAuditEvent({
    actor: 'user',
    deviceId,
    eventType: 'DEVICE_REVOKED',
    target: device.name,
  });

  return device;
}
