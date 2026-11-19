import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { createScanJob } from './scanService';
import { createNotification } from './notificationService';
import { recordAuditEvent } from './auditService';

let schedulerInterval: NodeJS.Timeout | null = null;
const CHECK_INTERVAL_MS = 30000; // Check every 30 seconds
const STALE_JOB_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutes timeout for hung jobs
const DEVICE_OFFLINE_THRESHOLD_MS = 45 * 1000; // 45s without heartbeat -> mark OFFLINE

export function startScheduler() {
  if (schedulerInterval) return;

  logger.info('Starting UpdatePilot Background Scheduler & Job Reaper...');

  schedulerInterval = setInterval(async () => {
    try {
      await checkScheduledScans();
      await reapStaleJobs();
    } catch (err: any) {
      logger.error('Error in scheduler cycle', { error: err.message });
    }
  }, CHECK_INTERVAL_MS);
}

export function stopScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    logger.info('UpdatePilot Background Scheduler stopped.');
  }
}

/**
 * Checks if any connected device has exceeded the configured scanIntervalHours
 */
export async function checkScheduledScans() {
  const settings = await prisma.userSettings.findUnique({ where: { id: 'default' } });
  if (!settings || !settings.autoCheckUpdates) return;

  const intervalMs = settings.scanIntervalHours * 60 * 60 * 1000;
  const now = Date.now();

  // Find all online devices
  const devices = await prisma.device.findMany({
    where: { status: 'ONLINE' },
  });

  for (const dev of devices) {
    // Check if there is already an active/pending scan job
    const activeScan = await prisma.scanJob.findFirst({
      where: {
        deviceId: dev.id,
        status: { in: ['PENDING', 'RUNNING'] },
      },
    });

    if (activeScan) continue; // Scan already in progress

    // Get latest completed scan
    const latestScan = await prisma.scanJob.findFirst({
      where: { deviceId: dev.id, status: 'COMPLETED' },
      orderBy: { completedAt: 'desc' },
    });

    const lastScanTime = latestScan?.completedAt ? new Date(latestScan.completedAt).getTime() : 0;
    const isDue = (now - lastScanTime) >= intervalMs;

    if (isDue) {
      logger.info('Scheduled scan interval triggered for device', { deviceId: dev.id, name: dev.name });

      const job = await createScanJob(dev.id);

      await recordAuditEvent({
        actor: 'scheduler',
        deviceId: dev.id,
        eventType: 'SCHEDULED_SCAN_TRIGGERED',
        target: job.id,
        details: { deviceName: dev.name, intervalHours: settings.scanIntervalHours },
      });

      if (settings.notifyOnUpdate) {
        await createNotification({
          title: 'Scheduled Scan Triggered',
          message: `Automatic background scan initiated for ${dev.name}.`,
          type: 'SCAN',
          link: '/history',
        });
      }
    }
  }
}

/**
 * Detects interrupted or hung jobs and transitions them to FAILED
 */
export async function reapStaleJobs() {
  const threshold = new Date(Date.now() - STALE_JOB_THRESHOLD_MS);

  // 0. Detect disconnected agents whose heartbeats stopped
  const offlineThreshold = new Date(Date.now() - DEVICE_OFFLINE_THRESHOLD_MS);
  const disconnectedDevices = await prisma.device.findMany({
    where: {
      status: { in: ['ONLINE', 'BUSY'] },
      lastSeenAt: { lt: offlineThreshold },
    },
  });

  for (const dev of disconnectedDevices) {
    await prisma.device.update({
      where: { id: dev.id },
      data: { status: 'OFFLINE' },
    });
    logger.warn('Marked stale device offline after missed heartbeats', { deviceId: dev.id, name: dev.name });
  }

  // 1. Reaping hung scan jobs
  const staleScans = await prisma.scanJob.findMany({
    where: {
      status: { in: ['PENDING', 'RUNNING'] },
      startedAt: { lt: threshold },
    },
  });

  for (const s of staleScans) {
    logger.warn('Reaping stale scan job', { jobId: s.id, deviceId: s.deviceId });
    await prisma.scanJob.update({
      where: { id: s.id },
      data: {
        status: 'FAILED',
        errorSummary: 'Job timed out: no response from agent within 15 minutes threshold.',
        completedAt: new Date(),
      },
    });

    await recordAuditEvent({
      actor: 'system',
      deviceId: s.deviceId,
      eventType: 'SCAN_JOB_TIMED_OUT',
      target: s.id,
    });
  }

  // 2. Reaping hung or agent-disconnected update jobs
  const staleUpdates = await prisma.updateJob.findMany({
    where: {
      status: { in: ['PENDING', 'QUEUED', 'APPROVED', 'DISPATCHED', 'RUNNING', 'EXECUTING', 'VERIFYING'] },
      startedAt: { lt: threshold },
    },
    include: { device: true },
  });

  for (const u of staleUpdates) {
    const isOffline = u.device?.status !== 'ONLINE';
    const msg = isOffline
      ? 'Update job timed out: Windows Agent is offline or disconnected before completing.'
      : 'Update job timed out: WinGet installer exceeded maximum execution window (15 minutes).';

    logger.warn('Reaping timed-out update job', { jobId: u.id, packageId: u.packageId, status: u.status });
    await prisma.updateJob.update({
      where: { id: u.id },
      data: {
        status: 'TIMED_OUT',
        stage: 'Execution timed out',
        errorSummary: msg,
        verificationResult: msg,
        completedAt: new Date(),
      },
    });

    await recordAuditEvent({
      actor: 'system',
      deviceId: u.deviceId,
      eventType: 'UPDATE_JOB_TIMED_OUT',
      target: u.applicationName,
      details: { jobId: u.id, previousStatus: u.status, agentStatus: u.device?.status },
    });
  }
}
