import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { recordAuditEvent } from './auditService';
import { createNotification } from './notificationService';
import {
  isValidPackageId,
  isValidVersionString,
  isUpdateAvailable,
  compareVersions,
} from '@updatepilot/shared';

const TERMINAL_JOB_STATUSES = [
  'COMPLETED',
  'FAILED',
  'CANCELLED',
  'TIMED_OUT',
  'REBOOT_REQUIRED',
  'REQUIRES_RESTART',
];

function sanitizeLogSnippet(input?: string | null, maxLen = 8000): string | undefined {
  if (!input) return undefined;
  const cleaned = String(input)
    .replace(/(agt_[a-f0-9]{16,})/gi, '[REDACTED_TOKEN]')
    .replace(/(UP-[A-F0-9]{8})/g, '[REDACTED_PAIR_TOKEN]');
  return cleaned.length > maxLen ? `${cleaned.slice(0, maxLen)}\n...[truncated]` : cleaned;
}

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

  const releaseMeta = await prisma.releaseMetadata.findUnique({
    where: {
      packageId_version: {
        packageId: app.packageId,
        version: effectiveTarget,
      },
    },
  });

  const warnings: string[] = [
    'The application will be updated using Windows Package Manager (WinGet).',
    'Please save open files before proceeding to avoid loss of unsaved work.',
    'Some installers may trigger Windows UAC elevation or require a system restart.',
  ];

  if (app.device.status !== 'ONLINE') {
    warnings.unshift(
      `Warning: Paired Windows Agent on "${app.device.name}" is currently ${app.device.status}. The update cannot execute until the agent is online.`
    );
  }

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
    warnings,
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

  const effectiveTarget = (data.targetVersion || app.availableVersion || '').trim();
  if (!effectiveTarget || !isValidVersionString(effectiveTarget)) {
    throw new Error('Target version is missing or contains invalid characters.');
  }

  // Guard against unintended downgrades or updating already current software
  if (!app.installedVersion.startsWith('<')) {
    const versionCmp = compareVersions(effectiveTarget, app.installedVersion);
    if (versionCmp < 0) {
      throw new Error(
        `Safety check blocked downgrade: target ${effectiveTarget} is older than installed ${app.installedVersion}.`
      );
    }
    if (versionCmp === 0) {
      throw new Error(`${app.name} is already at version ${app.installedVersion}.`);
    }
  }

  // Prevent concurrent execution for the exact same application
  const activeExisting = await prisma.updateJob.findFirst({
    where: {
      applicationId: app.id,
      status: { in: ['DISPATCHED', 'RUNNING', 'EXECUTING', 'VERIFYING'] },
    },
  });
  if (activeExisting) {
    throw new Error(`An update job for ${app.name} is already active (status: ${activeExisting.status}).`);
  }

  const isAgentOnline = app.device?.status === 'ONLINE';
  const initialStage = isAgentOnline
    ? 'Waiting for Windows Agent'
    : 'Queued (Windows Agent is offline)';

  // Create UpdateJob in APPROVED state (initial authorized queue status)
  const job = await prisma.updateJob.create({
    data: {
      deviceId: app.deviceId,
      applicationId: app.id,
      applicationName: app.name,
      packageId: app.packageId,
      installedVersion: app.installedVersion,
      targetVersion: effectiveTarget,
      status: 'APPROVED',
      stage: initialStage,
      progressPercent: null,
      verificationResult: isAgentOnline
        ? 'Authorized and queued. Waiting for Windows Agent poll...'
        : 'Authorized and queued, but the Windows Agent is currently offline.',
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
      toVersion: effectiveTarget,
      agentStatus: app.device?.status,
    },
  });

  logger.info('Update job approved and queued', { jobId: job.id, packageId: app.packageId });
  return job;
}

export async function processJobReport(data: {
  jobId: string;
  deviceId: string;
  status:
    | 'QUEUED'
    | 'DISPATCHED'
    | 'RUNNING'
    | 'EXECUTING'
    | 'VERIFYING'
    | 'COMPLETED'
    | 'FAILED'
    | 'REBOOT_REQUIRED'
    | 'REQUIRES_RESTART'
    | 'TIMED_OUT'
    | 'CANCELLED';
  stage?: string | null;
  progressPercent?: number | null;
  command?: string | null;
  stdoutLog?: string | null;
  stderrLog?: string | null;
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

  // Preserve operator cancellation: do not allow late agent status updates to resurrect a cancelled job
  if (job.status === 'CANCELLED' && data.status !== 'CANCELLED') {
    logger.info('Ignoring late agent report for already-cancelled job', {
      jobId: job.id,
      reportedStatus: data.status,
    });
    return job;
  }

  const now = new Date();
  const isFinished = TERMINAL_JOB_STATUSES.includes(data.status);
  const normalizedExitCode =
    typeof data.exitCode === 'number' && Number.isFinite(data.exitCode)
      ? (data.exitCode | 0)
      : undefined;

  let finalStatus: string = data.status;
  let finalStage = data.stage ?? undefined;
  let verificationNote = data.verificationResult ?? undefined;
  let finalError = data.errorSummary ?? undefined;
  let finalProgress: number | null | undefined = data.progressPercent;

  // Verify version strictly ONLY when installer reports completion or restart required
  if (data.status === 'COMPLETED' || data.status === 'REQUIRES_RESTART' || data.status === 'REBOOT_REQUIRED') {
    const resVer = (data.resultingVersion || '').trim();
    const isRestart =
      data.status === 'REQUIRES_RESTART' ||
      data.status === 'REBOOT_REQUIRED' ||
      Boolean(data.requiresReboot);

    const meetsTarget = resVer.length > 0 && compareVersions(resVer, job.targetVersion) >= 0;
    const improvedOverInstalled =
      resVer.length > 0 &&
      !job.installedVersion.startsWith('<') &&
      compareVersions(resVer, job.installedVersion) > 0;

    if (resVer && (meetsTarget || improvedOverInstalled)) {
      finalStatus = isRestart ? 'REQUIRES_RESTART' : 'COMPLETED';
      finalStage = isRestart ? 'Requires Windows restart' : 'Completed and verified';
      finalProgress = 100;
      verificationNote = isRestart
        ? `Update installed (version verified: ${resVer}, Exit Code ${normalizedExitCode ?? 3010}). System restart required to finish.`
        : `Verified installed version: ${resVer} (previous: ${job.installedVersion}).`;

      await prisma.application.update({
        where: { id: job.applicationId },
        data: {
          installedVersion: resVer,
          updateStatus: meetsTarget ? 'UP_TO_DATE' : 'UPDATE_AVAILABLE',
          availableVersion: meetsTarget ? null : job.targetVersion,
          lastScannedAt: now,
        },
      });
    } else if (isRestart && (!resVer || normalizedExitCode === 3010 || normalizedExitCode === 1641)) {
      // Soft reboot exit codes often lock new version replacement until Windows restarts
      finalStatus = 'REQUIRES_RESTART';
      finalStage = 'Requires Windows restart';
      finalProgress = 100;
      verificationNote =
        data.verificationResult ||
        `Installer returned reboot code ${normalizedExitCode ?? 3010}. Restart Windows to finalize upgrade to ${job.targetVersion}.`;
    } else {
      // Version verification failed: refuse false COMPLETED state and preserve honest Application status
      finalStatus = 'FAILED';
      finalStage = 'Version verification failed';
      finalProgress = null;
      verificationNote = resVer
        ? `Verification failed: installed version remained ${resVer} (expected ${job.targetVersion}).`
        : `Verification failed: unable to confirm installed version ${job.targetVersion} after WinGet exited with code ${normalizedExitCode ?? 'unknown'}.`;
      finalError = finalError || verificationNote;
    }
  } else if (data.status === 'FAILED' || data.status === 'TIMED_OUT') {
    finalProgress = null;
    if (!finalStage) {
      finalStage = data.status === 'TIMED_OUT' ? 'Execution timed out' : 'Update failed';
    }
  } else if (data.status === 'CANCELLED') {
    finalProgress = null;
    finalStage = finalStage || 'Cancelled by user';
  }

  const updatedJob = await prisma.updateJob.update({
    where: { id: data.jobId },
    data: {
      status: finalStatus,
      stage: finalStage,
      progressPercent: finalProgress !== undefined ? finalProgress : undefined,
      command: data.command ?? undefined,
      stdoutLog: sanitizeLogSnippet(data.stdoutLog) ?? undefined,
      stderrLog: sanitizeLogSnippet(data.stderrLog) ?? undefined,
      exitCode: normalizedExitCode,
      verificationResult: verificationNote,
      errorSummary: finalError,
      requiresReboot:
        Boolean(data.requiresReboot) ||
        finalStatus === 'REQUIRES_RESTART' ||
        finalStatus === 'REBOOT_REQUIRED',
      completedAt: isFinished ? now : undefined,
    },
  });

  if (isFinished) {
    await recordAuditEvent({
      actor: 'agent',
      deviceId: data.deviceId,
      eventType: `UPDATE_JOB_${finalStatus}`,
      target: job.applicationName,
      details: {
        jobId: job.id,
        packageId: job.packageId,
        previousVersion: job.installedVersion,
        targetVersion: job.targetVersion,
        resultingVersion: data.resultingVersion,
        exitCode: normalizedExitCode,
        requiresReboot: updatedJob.requiresReboot,
        verificationNote,
      },
    });

    await createNotification({
      title:
        finalStatus === 'COMPLETED'
          ? `${job.applicationName} Updated`
          : finalStatus === 'REQUIRES_RESTART'
          ? `${job.applicationName} Updated (Restart Required)`
          : finalStatus === 'TIMED_OUT'
          ? `${job.applicationName} Update Timed Out`
          : finalStatus === 'CANCELLED'
          ? `${job.applicationName} Update Cancelled`
          : `${job.applicationName} Update Failed`,
      message: verificationNote || finalError || `Job ${job.id} finished with status ${finalStatus}.`,
      type:
        finalStatus === 'COMPLETED'
          ? 'UPDATE'
          : finalStatus === 'REQUIRES_RESTART'
          ? 'WARNING'
          : 'WARNING',
      link: '/management',
    });
  }

  return updatedJob;
}
