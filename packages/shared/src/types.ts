export type DeviceStatus = 'ONLINE' | 'OFFLINE' | 'BUSY' | 'REVOKED';

export type UpdateStatus = 
  | 'UP_TO_DATE' 
  | 'UPDATE_AVAILABLE' 
  | 'UNKNOWN' 
  | 'UNSUPPORTED' 
  | 'UNMATCHED';

export type JobStatus = 
  | 'PENDING' 
  | 'RUNNING' 
  | 'COMPLETED' 
  | 'FAILED' 
  | 'CANCELLED';

export type UpdateJobStatus = 
  | 'PENDING' 
  | 'PREVIEWED' 
  | 'APPROVED' 
  | 'EXECUTING' 
  | 'VERIFYING' 
  | 'COMPLETED' 
  | 'FAILED' 
  | 'REBOOT_REQUIRED'
  | 'CANCELLED';

export type PackageSource = 'winget' | 'msstore' | 'registry' | 'custom' | 'unknown';

export interface Device {
  id: string;
  name: string;
  osName: string;
  osVersion: string;
  architecture: string;
  agentVersion: string;
  status: DeviceStatus;
  lastSeenAt: string;
  createdAt: string;
}

export interface Application {
  id: string;
  deviceId: string;
  name: string;
  publisher?: string | null;
  installedVersion: string;
  packageId?: string | null;
  source: PackageSource;
  updateStatus: UpdateStatus;
  availableVersion?: string | null;
  releaseDate?: string | null;
  changelogUrl?: string | null;
  publisherUrl?: string | null;
  isPinned?: boolean;
  lastScannedAt: string;
}

export interface ReleaseMetadata {
  id: string;
  packageId: string;
  version: string;
  channel?: string | null;
  releaseDate?: string | null;
  changelogUrl?: string | null;
  publisherUrl?: string | null;
  source: string;
  fetchedAt: string;
}

export interface ScanJob {
  id: string;
  deviceId: string;
  status: JobStatus;
  progressPercent: number;
  totalFound: number;
  updatesFound: number;
  errorSummary?: string | null;
  startedAt: string;
  completedAt?: string | null;
}

export interface UpdateJob {
  id: string;
  deviceId: string;
  applicationId: string;
  applicationName: string;
  packageId: string;
  installedVersion: string;
  targetVersion: string;
  status: UpdateJobStatus;
  initiator: string;
  exitCode?: number | null;
  verificationResult?: string | null;
  errorSummary?: string | null;
  requiresReboot: boolean;
  startedAt: string;
  completedAt?: string | null;
}

export interface AuditEvent {
  id: string;
  actor: string;
  deviceId?: string | null;
  eventType: string;
  target?: string | null;
  details?: Record<string, any> | null;
  timestamp: string;
}

export interface SecurityFinding {
  id: string;
  packageId: string;
  applicationName: string;
  advisoryId: string;
  title: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';
  affectedVersionRange: string;
  source: string;
  advisoryUrl?: string | null;
  publishedAt?: string | null;
  lastVerifiedAt: string;
}

export interface DashboardMetrics {
  totalApplications: number;
  updatesAvailable: number;
  upToDate: number;
  unsupportedOrUnknown: number;
  lastScanTimestamp: string | null;
  agentConnected: boolean;
  activeDevice: Device | null;
  agentVersion: string | null;
  recentScans: ScanJob[];
  recentUpdates: UpdateJob[];
  securityAdvisoriesCount: number;
}
