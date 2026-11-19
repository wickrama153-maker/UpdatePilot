import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';

export async function recordAuditEvent(params: {
  actor?: string;
  deviceId?: string | null;
  eventType: string;
  target?: string | null;
  details?: Record<string, any> | null;
}) {
  try {
    const event = await prisma.auditEvent.create({
      data: {
        actor: params.actor ?? 'user',
        deviceId: params.deviceId ?? null,
        eventType: params.eventType,
        target: params.target ?? null,
        details: params.details ? JSON.stringify(params.details) : null,
      },
    });
    return event;
  } catch (err: any) {
    logger.error('Failed to write audit event', { error: err.message, eventType: params.eventType });
  }
}
