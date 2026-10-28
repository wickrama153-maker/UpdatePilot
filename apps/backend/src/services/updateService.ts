import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { recordAuditEvent } from './auditService';
import { isValidPackageId, isUpdateAvailable } from '@updatepilot/shared';

export async function generateUpdatePreview(applicationId: string, targetVersion?: string) {
  const app = await prisma.application.findUnique({
    where: { id: applicationId },
    include: { device: true },
  });

  if (!app) {
    throw new Error('Application not found');
  }

  if (!app.packageId) {
    throw new Error('Application does not have a matched package ID and cannot be updated automatically.');
  }

  if (!isValidPackageId(app.packageId)) {
    throw new Error(`Invalid or disallowed package identifier: "${app.packageId}"`);
  }

  const effectiveTarget = targetVersion || app.availableVersion;
  if (!effectiveTarget) {
    throw new Error('No available target version specified or detected for this application.');
  }

  const isNewer = isUpdateAvailable(app.installedVersion, effectiveTarget);

  // Retrieve cached release metadata
  const releaseMeta = await prisma.releaseMetadata.findUnique({
    where: {
      packageId_version: {
        packageId: app.packageId,
        version: effectiveTarget,
      },
    },
  });

  return {
    applicationId: app.id,
    applicationName: app.name,
    packageId: app.packageId,
    installedVersion: app.installedVersion,
    targetVersion: effectiveTarget,
    isUpgrade: isNewer,
    source: app.source,
    releaseDate: releaseMeta?.releaseDate ?? app.releaseDate ?? null,
    changelogUrl: releaseMeta?.changelogUrl ?? app.changelogUrl ?? null,
    publisherUrl: releaseMeta?.publisherUrl ?? app.publisherUrl ?? null,
    device: {
      id: app.device.id,
      name: app.device.name,
      status: app.device.status,
    },
    warnings: [
      'The application will be updated using Windows Package Manager (WinGet).',
      'Please save open files before proceeding to avoid loss of unsaved work.',
      'Some installers may require elevation or a system reboot.',
    ],
  };
}

export async function executeUpdateJob(data: {
  applicationId: string;
  targetVersion: string;
  confirmed: boolean;
  initiator?: string;
}) {
  if (!data.confirmed) {
    throw new Error('Explicit confirmation is required before executing any update operation.');
  }

  const app = await prisma.application.findUnique({
    where: { id: data.applicationId },
    include: { device: true },
  });

  if (!app) throw new Error('Application not found');
  if (!app.packageId || !isValidPackageId(app.packageId)) {
    throw new Error('Application package identifier is invalid or missing.');
  }

  // Create UpdateJob in APPROVED state
  const job = await prisma.updateJob.create({
    data: {
      deviceId: app.deviceId,
      applicationId: app.id,
      applicationName: app.name,
      packageId: app.packageId,
      installedVersion: app.installedVersion,
      targetVersion: data.targetVersion,
      status: 'APPROVED',
      initiator: data.initiator ?? 'user',
    },
  });

  await recordAuditEvent({
    actor: data.initiator ?? 'user',
    deviceId: app.deviceId,
    eventType: 'UPDATE_CONFIRMED',
    target: app.name,
    details: {
      jobId: job.id,
      packageId: app.packageId,
      fromVersion: app.installedVersion,
      toVersion: data.targetVersion,
    },
  });

  logger.info('Update job approved and queued', { jobId: job.id, packageId: app.packageId });
  return job;
}

export async function processJobReport(data: {
  jobId: string;
  deviceId: string;
  status: 'EXECUTING' | 'VERIFYING' | 'COMPLETED' | 'FAILED' | 'REBOOT_REQUIRED';
  exitCode?: number | null;
  verificationResult?: string | null;
  errorSummary?: string | null;
  requiresReboot?: boolean;
  resultingVersion?: string | null;
}) {
  const job = await prisma.updateJob.findUnique({
    where: { id: data.jobId },
    include: { application: true },
  });

  if (!job) throw new Error('Update job not found');

  const now = new Date();
  const isFinished = ['COMPLETED', 'FAILED', 'REBOOT_REQUIRED'].includes(data.status);

  // If completed or verified, check if resulting version matches target
  let finalStatus = data.status;
  let verificationNote = data.verificationResult;

  if (data.status === 'COMPLETED' && data.resultingVersion) {
    if (data.resultingVersion === job.targetVersion || !isUpdateAvailable(data.resultingVersion, job.targetVersion)) {
      verificationNote = `Verified: Application updated to version ${data.resultingVersion}`;
    } else {
      finalStatus = 'FAILED';
      verificationNote = `Verification failed: Rescanned version is ${data.resultingVersion}, expected ${job.targetVersion}`;
    }

    // Update the application record with the new installed version
    await prisma.application.update({
      where: { id: job.applicationId },
      data: {
        installedVersion: data.resultingVersion,
        updateStatus: 'UP_TO_DATE',
        availableVersion: null,
        lastScannedAt: now,
      },
    });
  }

  const updatedJob = await prisma.updateJob.update({
    where: { id: data.jobId },
    data: {
      status: finalStatus,
      exitCode: data.exitCode ?? undefined,
      verificationResult: verificationNote ?? undefined,
      errorSummary: data.errorSummary ?? undefined,
      requiresReboot: data.requiresReboot ?? false,
      completedAt: isFinished ? now : undefined,
    },
  });

  await recordAuditEvent({
    actor: 'agent',
    deviceId: data.deviceId,
    eventType: `UPDATE_JOB_${finalStatus}`,
    target: job.applicationName,
    details: {
      jobId: job.id,
      exitCode: data.exitCode,
      resultingVersion: data.resultingVersion,
      requiresReboot: data.requiresReboot,
      verificationNote,
    },
  });

  return updatedJob;
}
