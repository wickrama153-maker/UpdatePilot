import { z } from 'zod';

export const UserRegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(128),
  name: z.string().min(1).max(128),
});

export const UserLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const DevicePairRequestSchema = z.object({
  deviceName: z.string().min(1).max(128),
  hardwareId: z.string().max(128).optional(),
  osName: z.string().default('Windows'),
  osVersion: z.string().default('Windows 10/11'),
  architecture: z.string().default('x64'),
  agentVersion: z.string().min(1).max(32),
  pairingToken: z.string().min(8).max(128),
});

export const AgentHeartbeatSchema = z.object({
  deviceId: z.string().uuid(),
  agentVersion: z.string(),
  status: z.enum(['ONLINE', 'OFFLINE', 'BUSY']).default('ONLINE'),
});

export const DiscoveredAppSchema = z.object({
  name: z.string().min(1),
  publisher: z.string().nullable().optional(),
  installedVersion: z.string().min(1),
  packageId: z.string().nullable().optional(),
  source: z.enum(['winget', 'msstore', 'registry', 'custom', 'unknown']).default('unknown'),
  availableVersion: z.string().nullable().optional(),
  updateStatus: z.enum(['UP_TO_DATE', 'UPDATE_AVAILABLE', 'UNKNOWN', 'UNSUPPORTED', 'UNMATCHED']).default('UNKNOWN'),
  publisherUrl: z.string().nullable().optional(),
  changelogUrl: z.string().nullable().optional(),
  releaseDate: z.string().nullable().optional(),
});

export const ScanReportSchema = z.object({
  deviceId: z.string().uuid(),
  jobId: z.string().uuid().optional(),
  applications: z.array(DiscoveredAppSchema),
  errorSummary: z.string().nullable().optional(),
});

export const UpdatePreviewRequestSchema = z.object({
  deviceId: z.string().uuid(),
  applicationId: z.string().uuid(),
  targetVersion: z.string().optional(),
});

export const UpdateExecuteRequestSchema = z.object({
  deviceId: z.string().uuid(),
  applicationId: z.string().uuid(),
  targetVersion: z.string(),
  confirmed: z.boolean(),
});

export const UpdateJobReportSchema = z.object({
  jobId: z.string().uuid(),
  deviceId: z.string().uuid(),
  status: z.enum([
    'QUEUED',
    'DISPATCHED',
    'RUNNING',
    'EXECUTING',
    'VERIFYING',
    'COMPLETED',
    'FAILED',
    'REBOOT_REQUIRED',
    'REQUIRES_RESTART',
    'TIMED_OUT',
    'CANCELLED',
  ]),
  stage: z.string().nullable().optional(),
  progressPercent: z.number().int().min(0).max(100).nullable().optional(),
  command: z.string().nullable().optional(),
  stdoutLog: z.string().nullable().optional(),
  stderrLog: z.string().nullable().optional(),
  exitCode: z.number().nullable().optional(),
  verificationResult: z.string().nullable().optional(),
  errorSummary: z.string().nullable().optional(),
  requiresReboot: z.boolean().default(false),
  resultingVersion: z.string().nullable().optional(),
});
