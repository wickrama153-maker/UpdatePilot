import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { recordAuditEvent } from './auditService';
import { createNotification } from './notificationService';
import { isUpdateAvailable } from '@updatepilot/shared';

export async function createScanJob(deviceId: string) {
  const device = await prisma.device.findUnique({ where: { id: deviceId } });
  if (!device) throw new Error('Device not found');

  const job = await prisma.scanJob.create({
    data: {
      deviceId,
      status: 'PENDING',
      progressPercent: 0,
    },
  });

  await recordAuditEvent({
    actor: 'user',
    deviceId,
    eventType: 'SCAN_INITIATED',
    target: job.id,
    details: { deviceName: device.name },
  });

  logger.info('Created scan job', { jobId: job.id, deviceId });
  return job;
}

export async function processScanReport(data: {
  deviceId: string;
  jobId?: string;
  applications: Array<{
    name: string;
    publisher?: string | null;
    installedVersion: string;
    packageId?: string | null;
    source?: string;
    availableVersion?: string | null;
    updateStatus?: string;
    publisherUrl?: string | null;
    changelogUrl?: string | null;
    releaseDate?: string | null;
  }>;
  errorSummary?: string | null;
}) {
  const { deviceId, jobId, applications, errorSummary } = data;

  let updatesFoundCount = 0;
  const now = new Date();

  for (const app of applications) {
    let updateStatus = app.updateStatus || 'UNKNOWN';

    // Verify update status with our version comparator if availableVersion exists
    if (app.availableVersion) {
      if (isUpdateAvailable(app.installedVersion, app.availableVersion)) {
        updateStatus = 'UPDATE_AVAILABLE';
        updatesFoundCount++;
      } else {
        updateStatus = 'UP_TO_DATE';
      }
    } else if (!app.packageId) {
      updateStatus = 'UNMATCHED';
    }

    // Upsert application
    await prisma.application.upsert({
      where: {
        deviceId_name_installedVersion: {
          deviceId,
          name: app.name,
          installedVersion: app.installedVersion,
        },
      },
      update: {
        publisher: app.publisher ?? undefined,
        packageId: app.packageId ?? undefined,
        source: app.source || 'winget',
        updateStatus,
        availableVersion: app.availableVersion ?? undefined,
        publisherUrl: app.publisherUrl ?? undefined,
        changelogUrl: app.changelogUrl ?? undefined,
        releaseDate: app.releaseDate ?? undefined,
        lastScannedAt: now,
      },
      create: {
        deviceId,
        name: app.name,
        publisher: app.publisher ?? null,
        installedVersion: app.installedVersion,
        packageId: app.packageId ?? null,
        source: app.source || 'winget',
        updateStatus,
        availableVersion: app.availableVersion ?? null,
        publisherUrl: app.publisherUrl ?? null,
        changelogUrl: app.changelogUrl ?? null,
        releaseDate: app.releaseDate ?? null,
        lastScannedAt: now,
      },
    });

    // Cache release metadata if available
    if (app.packageId && app.availableVersion) {
      await prisma.releaseMetadata.upsert({
        where: {
          packageId_version: {
            packageId: app.packageId,
            version: app.availableVersion,
          },
        },
        update: {
          releaseDate: app.releaseDate ?? undefined,
          changelogUrl: app.changelogUrl ?? undefined,
          publisherUrl: app.publisherUrl ?? undefined,
          source: app.source || 'winget',
          fetchedAt: now,
        },
        create: {
          packageId: app.packageId,
          version: app.availableVersion,
          releaseDate: app.releaseDate ?? null,
          changelogUrl: app.changelogUrl ?? null,
          publisherUrl: app.publisherUrl ?? null,
          source: app.source || 'winget',
          fetchedAt: now,
        },
      });
    }
  }

  // Update ScanJob if jobId was provided
  if (jobId) {
    await prisma.scanJob.update({
      where: { id: jobId },
      data: {
        status: errorSummary ? 'FAILED' : 'COMPLETED',
        progressPercent: 100,
        totalFound: applications.length,
        updatesFound: updatesFoundCount,
        errorSummary: errorSummary ?? null,
        completedAt: now,
      },
    });
  }

  // Update device status and heartbeat
  await prisma.device.update({
    where: { id: deviceId },
    data: {
      status: 'ONLINE',
      lastSeenAt: now,
    },
  });

  await recordAuditEvent({
    actor: 'agent',
    deviceId,
    eventType: 'SCAN_COMPLETED',
    target: jobId || 'ad-hoc',
    details: {
      totalFound: applications.length,
      updatesFound: updatesFoundCount,
      hasError: !!errorSummary,
    },
  });

  // Check notification settings and trigger notification if updates found
  try {
    const settings = await prisma.userSettings.findUnique({ where: { id: 'default' } });
    if (settings?.notifyOnUpdate && updatesFoundCount > 0) {
      await createNotification({
        title: 'New Software Updates Available',
        message: `Discovered ${updatesFoundCount} available software update(s) during scan.`,
        type: 'UPDATE',
        link: '/updates',
      });
    }
  } catch (err: any) {
    logger.warn('Failed to emit scan notification', { error: err.message });
  }

  logger.info('Processed scan report', {
    deviceId,
    total: applications.length,
    updatesFound: updatesFoundCount,
  });

  return {
    success: true,
    totalDiscovered: applications.length,
    updatesFound: updatesFoundCount,
  };
}
