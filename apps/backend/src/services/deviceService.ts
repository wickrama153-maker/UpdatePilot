import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { recordAuditEvent } from './auditService';

// In-memory active pairing tokens with expiry (15 minutes)
interface PairingToken {
  token: string;
  expiresAt: number;
}
const activeTokens: Map<string, PairingToken> = new Map();

export async function generatePairingToken(): Promise<string> {
  // Generate a clean 6-segment or alphanumeric code for easy user entry
  const token = `UP-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  activeTokens.set(token, {
    token,
    expiresAt: Date.now() + 15 * 60 * 1000, // 15 mins
  });
  logger.info('Generated new device pairing token', { token });
  return token;
}

export function validatePairingToken(token: string): boolean {
  // Allow default environment secret for quick automated pairing or the generated token
  const defaultSecret = process.env.PAIRING_SECRET || 'updatepilot_pair_token_default_12345';
  if (token === defaultSecret) return true;

  const found = activeTokens.get(token);
  if (!found) return false;
  if (Date.now() > found.expiresAt) {
    activeTokens.delete(token);
    return false;
  }
  // Token is valid and consumed
  activeTokens.delete(token);
  return true;
}

export async function pairDevice(data: {
  deviceName: string;
  osName: string;
  osVersion: string;
  architecture: string;
  agentVersion: string;
  pairingToken: string;
}) {
  if (!validatePairingToken(data.pairingToken)) {
    throw new Error('Invalid or expired pairing token');
  }

  // Find or create device by deviceName
  let device = await prisma.device.findFirst({
    where: { name: data.deviceName },
  });

  if (device) {
    device = await prisma.device.update({
      where: { id: device.id },
      data: {
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

export async function getDevices() {
  const devices = await prisma.device.findMany({
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

export async function revokeDevice(deviceId: string) {
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
