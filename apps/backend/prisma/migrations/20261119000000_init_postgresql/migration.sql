-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Device" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "hardwareId" TEXT,
    "name" TEXT NOT NULL,
    "osName" TEXT NOT NULL DEFAULT 'Windows',
    "osVersion" TEXT NOT NULL DEFAULT 'Windows 10/11',
    "architecture" TEXT NOT NULL DEFAULT 'x64',
    "agentVersion" TEXT NOT NULL DEFAULT '1.0.0',
    "status" TEXT NOT NULL DEFAULT 'ONLINE',
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentCredential" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "hashedToken" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rotatedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "AgentCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "publisher" TEXT,
    "installedVersion" TEXT NOT NULL,
    "packageId" TEXT,
    "source" TEXT NOT NULL DEFAULT 'winget',
    "updateStatus" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "availableVersion" TEXT,
    "releaseDate" TEXT,
    "changelogUrl" TEXT,
    "publisherUrl" TEXT,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "lastScannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReleaseMetadata" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "channel" TEXT DEFAULT 'stable',
    "releaseDate" TEXT,
    "changelogUrl" TEXT,
    "publisherUrl" TEXT,
    "source" TEXT NOT NULL DEFAULT 'winget',
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReleaseMetadata_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScanJob" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "progressPercent" INTEGER NOT NULL DEFAULT 0,
    "totalFound" INTEGER NOT NULL DEFAULT 0,
    "updatesFound" INTEGER NOT NULL DEFAULT 0,
    "errorSummary" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ScanJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UpdateJob" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "applicationName" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "installedVersion" TEXT NOT NULL,
    "targetVersion" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "initiator" TEXT NOT NULL DEFAULT 'local_user',
    "exitCode" INTEGER,
    "stage" TEXT,
    "progressPercent" INTEGER,
    "command" TEXT,
    "stdoutLog" TEXT,
    "stderrLog" TEXT,
    "verificationResult" TEXT,
    "errorSummary" TEXT,
    "requiresReboot" BOOLEAN NOT NULL DEFAULT false,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "UpdateJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "actor" TEXT NOT NULL DEFAULT 'user',
    "deviceId" TEXT,
    "eventType" TEXT NOT NULL,
    "target" TEXT,
    "details" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SecurityFinding" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "applicationName" TEXT NOT NULL,
    "advisoryId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "affectedVersionRange" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'OSV',
    "advisoryUrl" TEXT,
    "publishedAt" TEXT,
    "lastVerifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecurityFinding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "theme" TEXT NOT NULL DEFAULT 'dark',
    "scanIntervalHours" INTEGER NOT NULL DEFAULT 24,
    "autoCheckUpdates" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnUpdate" BOOLEAN NOT NULL DEFAULT true,
    "telemetryEnabled" BOOLEAN NOT NULL DEFAULT false,
    "retentionDays" INTEGER NOT NULL DEFAULT 90,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'INFO',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "link" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Device_userId_idx" ON "Device"("userId");

-- CreateIndex
CREATE INDEX "Device_status_idx" ON "Device"("status");

-- CreateIndex
CREATE INDEX "AgentCredential_deviceId_idx" ON "AgentCredential"("deviceId");

-- CreateIndex
CREATE INDEX "Application_deviceId_updateStatus_idx" ON "Application"("deviceId", "updateStatus");

-- CreateIndex
CREATE INDEX "Application_packageId_idx" ON "Application"("packageId");

-- CreateIndex
CREATE UNIQUE INDEX "Application_deviceId_name_installedVersion_key" ON "Application"("deviceId", "name", "installedVersion");

-- CreateIndex
CREATE INDEX "ReleaseMetadata_packageId_idx" ON "ReleaseMetadata"("packageId");

-- CreateIndex
CREATE UNIQUE INDEX "ReleaseMetadata_packageId_version_key" ON "ReleaseMetadata"("packageId", "version");

-- CreateIndex
CREATE INDEX "ScanJob_deviceId_status_idx" ON "ScanJob"("deviceId", "status");

-- CreateIndex
CREATE INDEX "UpdateJob_deviceId_status_idx" ON "UpdateJob"("deviceId", "status");

-- CreateIndex
CREATE INDEX "AuditEvent_eventType_idx" ON "AuditEvent"("eventType");

-- CreateIndex
CREATE INDEX "AuditEvent_timestamp_idx" ON "AuditEvent"("timestamp");

-- CreateIndex
CREATE INDEX "SecurityFinding_packageId_idx" ON "SecurityFinding"("packageId");

-- CreateIndex
CREATE UNIQUE INDEX "SecurityFinding_packageId_advisoryId_key" ON "SecurityFinding"("packageId", "advisoryId");

-- CreateIndex
CREATE INDEX "Notification_isRead_idx" ON "Notification"("isRead");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentCredential" ADD CONSTRAINT "AgentCredential_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScanJob" ADD CONSTRAINT "ScanJob_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UpdateJob" ADD CONSTRAINT "UpdateJob_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UpdateJob" ADD CONSTRAINT "UpdateJob_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE SET NULL ON UPDATE CASCADE;
