import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowUpCircle,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ExternalLink,
  RotateCcw,
  ShieldAlert,
  SlidersHorizontal,
} from 'lucide-react';
import { Card, CardContent } from './ui/Card';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import { ProgressBar } from './ui/ProgressBar';
import { EmptyState } from './ui/EmptyState';
import { Skeleton } from './ui/Skeleton';
import { StatusBadge } from './StatusBadge';
import { api } from '../lib/api';

interface UpdatesViewProps {
  initialSelectedAppId?: string | null;
  onClearInitialSelected?: () => void;
  onRefreshMetrics: () => void;
  securityFindings?: any[];
  upToDateCount?: number;
  onNavigateTab?: (tab: any) => void;
  selectedDeviceId?: string | null;
}

type UpdateSeverityFilter = 'ALL' | 'CRITICAL' | 'IMPORTANT' | 'OPTIONAL';

export const UpdatesView: React.FC<UpdatesViewProps> = ({
  initialSelectedAppId,
  onClearInitialSelected,
  onRefreshMetrics,
  securityFindings = [],
  upToDateCount = 0,
  onNavigateTab,
  selectedDeviceId,
}) => {
  const [updates, setUpdates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState<UpdateSeverityFilter>('ALL');

  // Preview / Confirm State
  const [selectedApp, setSelectedApp] = useState<any | null>(null);
  const [previewData, setPreviewData] = useState<any | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [confirmedByUser, setConfirmedByUser] = useState(false);

  // Execution / Monitoring State
  const [activeJob, setActiveJob] = useState<any | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [jobError, setJobError] = useState<string | null>(null);

  const fetchUpdates = async () => {
    try {
      setLoading(true);
      const data = await api.getUpdates(selectedDeviceId || undefined);
      setUpdates(data || []);

      if (initialSelectedAppId && data) {
        const found = data.find((a: any) => a.id === initialSelectedAppId);
        if (found) {
          handleOpenPreview(found);
        }
        if (onClearInitialSelected) onClearInitialSelected();
      }
    } catch (err) {
      console.error('Failed to fetch updates', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUpdates();
  }, []);

  // Derive transparent, real severity classification from real OSV findings and pinned priority
  const classifiedUpdates = useMemo(() => {
    return updates.map((app) => {
      const matchingFindings = securityFindings.filter(
        (f) => f.packageId && app.packageId && f.packageId.toLowerCase() === app.packageId.toLowerCase()
      );
      const hasCriticalOrHigh = matchingFindings.some(
        (f) => f.severity === 'CRITICAL' || f.severity === 'HIGH'
      );
      const hasMediumOrLow = matchingFindings.length > 0;

      let severity: 'CRITICAL' | 'IMPORTANT' | 'OPTIONAL' = 'OPTIONAL';
      if (hasCriticalOrHigh) severity = 'CRITICAL';
      else if (hasMediumOrLow || app.isPinned) severity = 'IMPORTANT';

      return {
        ...app,
        derivedSeverity: severity,
        advisoryCount: matchingFindings.length,
      };
    });
  }, [updates, securityFindings]);

  const counts = useMemo(() => {
    return {
      ALL: classifiedUpdates.length,
      CRITICAL: classifiedUpdates.filter((u) => u.derivedSeverity === 'CRITICAL').length,
      IMPORTANT: classifiedUpdates.filter((u) => u.derivedSeverity === 'IMPORTANT').length,
      OPTIONAL: classifiedUpdates.filter((u) => u.derivedSeverity === 'OPTIONAL').length,
    };
  }, [classifiedUpdates]);

  const filteredUpdates = useMemo(() => {
    if (severityFilter === 'ALL') return classifiedUpdates;
    return classifiedUpdates.filter((u) => u.derivedSeverity === severityFilter);
  }, [classifiedUpdates, severityFilter]);

  const handleOpenPreview = async (app: any) => {
    try {
      setSelectedApp(app);
      setConfirmedByUser(false);
      setPreviewLoading(true);
      setJobError(null);
      const preview = await api.previewUpdate(app.id, app.availableVersion);
      setPreviewData(preview);
    } catch (err: any) {
      setJobError(err.message || 'Failed to generate update preview.');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleConfirmAndExecute = async () => {
    if (!selectedApp || !previewData || !confirmedByUser) return;

    try {
      setIsExecuting(true);
      setJobError(null);

      const job = await api.executeUpdate(selectedApp.id, previewData.targetVersion);
      setActiveJob(job);
      pollJobStatus(job.id);
    } catch (err: any) {
      setIsExecuting(false);
      setJobError(err.message || 'Failed to dispatch update job.');
    }
  };

  const pollJobStatus = (jobId: string) => {
    const interval = setInterval(async () => {
      try {
        const updated = await api.getUpdateJob(jobId);
        setActiveJob(updated);

        if (
          ['COMPLETED', 'FAILED', 'REBOOT_REQUIRED', 'REQUIRES_RESTART', 'TIMED_OUT', 'CANCELLED'].includes(
            updated.status
          )
        ) {
          clearInterval(interval);
          setIsExecuting(false);
          onRefreshMetrics();
          fetchUpdates();
        }
      } catch (err) {
        console.error('Error polling job status', err);
      }
    }, 1500);
  };

  const handleCancelActiveJob = async () => {
    if (!activeJob) return;
    try {
      const updated = await api.cancelUpdateJob(activeJob.id);
      setActiveJob(updated);
      setIsExecuting(false);
      onRefreshMetrics();
    } catch (err: any) {
      setJobError(err.message || 'Failed to cancel update job.');
    }
  };

  const handleCloseModal = () => {
    if (isExecuting) return;
    setSelectedApp(null);
    setPreviewData(null);
    setActiveJob(null);
    setConfirmedByUser(false);
    setJobError(null);
  };

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <Card className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Available Software Updates</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Verified Windows package updates ready for review. All installations require explicit user confirmation.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {onNavigateTab && (
            <Button
              variant="outline"
              size="md"
              onClick={() => onNavigateTab('management')}
              leftIcon={<SlidersHorizontal className="w-3.5 h-3.5" />}
            >
              Update Queue
            </Button>
          )}
          <Button
            variant="primary"
            size="md"
            onClick={fetchUpdates}
            isLoading={loading}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh List
          </Button>
        </div>
      </Card>

      {/* Severity Differentiation Summary Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          onClick={() => setSeverityFilter('CRITICAL')}
          className={`text-left p-3.5 rounded-xl border transition-all ${
            severityFilter === 'CRITICAL'
              ? 'border-[#EF5350] bg-[#EF5350]/10'
              : 'border-border bg-card hover:border-[#EF5350]/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#B91C1C] dark:text-[#EF5350]">Critical Updates</span>
            <ShieldAlert className="w-4 h-4 text-[#EF5350]" />
          </div>
          <p className="text-2xl font-bold text-foreground mt-1.5 tabular-nums">{counts.CRITICAL}</p>
        </button>

        <button
          onClick={() => setSeverityFilter('IMPORTANT')}
          className={`text-left p-3.5 rounded-xl border transition-all ${
            severityFilter === 'IMPORTANT'
              ? 'border-[#F5B942] bg-[#F5B942]/10'
              : 'border-border bg-card hover:border-[#F5B942]/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#B45309] dark:text-[#F5B942]">Important Updates</span>
            <AlertTriangle className="w-4 h-4 text-[#F5B942]" />
          </div>
          <p className="text-2xl font-bold text-foreground mt-1.5 tabular-nums">{counts.IMPORTANT}</p>
        </button>

        <button
          onClick={() => setSeverityFilter('OPTIONAL')}
          className={`text-left p-3.5 rounded-xl border transition-all ${
            severityFilter === 'OPTIONAL'
              ? 'border-[#60A5FA] bg-[#60A5FA]/10'
              : 'border-border bg-card hover:border-[#60A5FA]/50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#1D4ED8] dark:text-[#60A5FA]">Optional Updates</span>
            <ArrowUpCircle className="w-4 h-4 text-[#60A5FA]" />
          </div>
          <p className="text-2xl font-bold text-foreground mt-1.5 tabular-nums">{counts.OPTIONAL}</p>
        </button>

        <button
          onClick={() => (onNavigateTab ? onNavigateTab('applications') : setSeverityFilter('ALL'))}
          className="text-left p-3.5 rounded-xl border border-border bg-card hover:border-[#22C55E]/50 transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#15803D] dark:text-[#22C55E]">Up-to-Date Software</span>
            <CheckCircle2 className="w-4 h-4 text-[#22C55E]" />
          </div>
          <p className="text-2xl font-bold text-foreground mt-1.5 tabular-nums">{upToDateCount}</p>
        </button>
      </div>

      {/* Filter Pills */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          {(['ALL', 'CRITICAL', 'IMPORTANT', 'OPTIONAL'] as UpdateSeverityFilter[]).map((key) => (
            <button
              key={key}
              onClick={() => setSeverityFilter(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                severityFilter === key
                  ? 'bg-[#009F91] dark:bg-[#19C6B4] text-white dark:text-[#0B141D] font-semibold'
                  : 'bg-card border border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              {key === 'ALL' ? `All Available (${counts.ALL})` : `${key.charAt(0) + key.slice(1).toLowerCase()} (${counts[key]})`}
            </button>
          ))}
        </div>
      </div>

      {/* Updates Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="p-5 space-y-4">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-8 w-full" />
            </Card>
          ))}
        </div>
      ) : filteredUpdates.length === 0 ? (
        <EmptyState
          icon={<CheckCircle2 className="w-6 h-6" />}
          title={updates.length === 0 ? 'All Software is Up to Date' : 'No Updates in Selected Category'}
          description={
            updates.length === 0
              ? 'All detected WinGet packages are currently running the latest verified release versions.'
              : 'Select "All Available" to view updates across all severity levels.'
          }
          action={
            severityFilter !== 'ALL' ? (
              <Button variant="outline" onClick={() => setSeverityFilter('ALL')}>
                Show All Updates
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredUpdates.map((app) => (
            <Card key={app.id} hoverable className="flex flex-col justify-between">
              <CardContent className="space-y-4 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-sm text-foreground truncate" title={app.name}>
                      {app.name}
                    </h3>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {app.publisher || 'Verified Publisher'}
                    </p>
                  </div>
                  <StatusBadge status={app.derivedSeverity} size="sm" />
                </div>

                {/* Version Comparison Box */}
                <div className="p-3 rounded-lg border border-border bg-secondary/40 grid grid-cols-2 gap-3 text-xs">
                  <div className="min-w-0">
                    <span className="text-[11px] text-muted-foreground block">Current Version</span>
                    <p className="font-mono font-medium text-foreground truncate mt-0.5 tabular-nums">
                      {app.installedVersion}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <span className="text-[11px] text-[#009F91] dark:text-[#19C6B4] font-semibold block">
                      Available Version
                    </span>
                    <p className="font-mono font-semibold text-[#B45309] dark:text-[#F5B942] truncate mt-0.5 tabular-nums">
                      {app.availableVersion}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <StatusBadge status={app.updateStatus} size="sm" />
                  <span className="font-mono truncate max-w-[140px]" title={app.packageId}>
                    {app.packageId}
                  </span>
                </div>
              </CardContent>

              <div className="px-5 py-3.5 border-t border-border bg-secondary/20 flex items-center justify-between gap-2 rounded-b-xl">
                {app.publisherUrl ? (
                  <a
                    href={app.publisherUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-[#009F91] dark:text-[#19C6B4] hover:underline inline-flex items-center gap-1 font-medium"
                  >
                    Release Info <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <span className="text-[11px] text-muted-foreground uppercase font-mono">{app.source}</span>
                )}
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleOpenPreview(app)}
                >
                  Review & Update
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Confirmation & Execution Modal */}
      <Modal
        isOpen={Boolean(selectedApp)}
        onClose={handleCloseModal}
        disableClose={isExecuting}
        title="Review & Confirm Update"
        subtitle="Explicit user authorization required before execution"
        icon={<ArrowUpCircle className="w-4 h-4" />}
        footer={
          selectedApp && (
            <>
              {isExecuting && activeJob && (
                <Button variant="danger" onClick={handleCancelActiveJob}>
                  Cancel Job
                </Button>
              )}
              <Button variant="outline" onClick={handleCloseModal} disabled={isExecuting}>
                {activeJob ? 'Done' : 'Cancel'}
              </Button>
              {!activeJob && (
                <Button
                  variant="primary"
                  onClick={handleConfirmAndExecute}
                  disabled={!confirmedByUser || isExecuting || previewLoading}
                  isLoading={isExecuting}
                >
                  Confirm & Execute Update
                </Button>
              )}
            </>
          )
        }
      >
        {selectedApp && (
          <div className="space-y-4 text-xs">
            {jobError && (
              <div className="p-3 rounded-lg border border-[#EF5350]/35 bg-[#EF5350]/10 text-[#B91C1C] dark:text-[#EF5350] flex items-center gap-2">
                <XCircle className="w-4 h-4 shrink-0" />
                <span>{jobError}</span>
              </div>
            )}

            <div className="p-4 rounded-xl border border-border bg-secondary/40 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-sm text-foreground">{selectedApp.name}</span>
                <span className="px-2 py-0.5 rounded bg-card border border-border font-mono uppercase text-[10px] text-muted-foreground">
                  {selectedApp.source}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
                <div>
                  <span className="text-muted-foreground block">Current Version</span>
                  <p className="font-mono text-sm font-semibold text-foreground mt-0.5">
                    {selectedApp.installedVersion}
                  </p>
                </div>
                <div>
                  <span className="text-[#009F91] dark:text-[#19C6B4] font-semibold block">Target Version</span>
                  <p className="font-mono text-sm font-bold text-[#B45309] dark:text-[#F5B942] mt-0.5">
                    {previewLoading ? 'Resolving...' : previewData?.targetVersion || selectedApp.availableVersion}
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-border text-[11px] text-muted-foreground flex items-center justify-between">
                <span>Package Identifier</span>
                <span className="font-mono font-medium text-foreground">{selectedApp.packageId}</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-[#F5B942]/30 bg-[#F5B942]/10 space-y-1.5">
              <div className="flex items-center gap-2 font-semibold text-[#B45309] dark:text-[#F5B942]">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Pre-Update Precautions</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground text-[11px] pl-1">
                <li>Executed securely via Windows Package Manager (<code className="font-mono">winget upgrade</code>).</li>
                <li>Save any unsaved files in {selectedApp.name} prior to confirming.</li>
                <li>Some packages may require UAC elevation or a Windows restart to complete.</li>
              </ul>
            </div>

            {activeJob && (
              <div className="p-4 rounded-xl border border-border bg-secondary/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">Live Execution Status</span>
                  <StatusBadge status={activeJob.status} size="sm" />
                </div>

                {isExecuting && (
                  <ProgressBar
                    value={typeof activeJob.progressPercent === 'number' ? activeJob.progressPercent : undefined}
                    tone="primary"
                    label={
                      activeJob.stage ||
                      (activeJob.status === 'APPROVED' || activeJob.status === 'QUEUED'
                        ? 'Waiting for Windows Agent...'
                        : activeJob.status === 'DISPATCHED'
                        ? 'Job dispatched to Windows Agent...'
                        : activeJob.status === 'VERIFYING'
                        ? 'Verifying installed version...'
                        : 'Preparing package manager...')
                    }
                  />
                )}

                {activeJob.verificationResult && (
                  <p className="text-[11px] text-muted-foreground bg-card p-2.5 rounded-lg border border-border font-mono whitespace-pre-wrap">
                    {activeJob.verificationResult}
                  </p>
                )}

                {activeJob.status === 'COMPLETED' && (
                  <div className="flex items-center gap-2 text-[#15803D] dark:text-[#22C55E] font-medium">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Update installed and version verified successfully.</span>
                  </div>
                )}

                {(activeJob.status === 'REBOOT_REQUIRED' || activeJob.status === 'REQUIRES_RESTART') && (
                  <div className="flex items-center gap-2 text-[#1D4ED8] dark:text-[#60A5FA] font-medium">
                    <RotateCcw className="w-4 h-4 shrink-0" />
                    <span>Update installed (Exit Code {activeJob.exitCode ?? 3010}). Windows restart required to finish.</span>
                  </div>
                )}

                {(activeJob.status === 'FAILED' || activeJob.status === 'TIMED_OUT') && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[#B91C1C] dark:text-[#EF5350] font-medium">
                      <XCircle className="w-4 h-4 shrink-0" />
                      <span>
                        {activeJob.status === 'TIMED_OUT'
                          ? 'Update timed out. Inspect diagnostics in Update Management or History.'
                          : 'Update failed. Inspect diagnostics in Update Management or History.'}
                      </span>
                    </div>
                    {activeJob.errorSummary && (
                      <p className="text-[11px] font-mono text-[#B91C1C] dark:text-[#EF5350] bg-[#EF5350]/10 border border-[#EF5350]/25 rounded-lg p-2.5 whitespace-pre-wrap">
                        {activeJob.errorSummary}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {!activeJob && (
              <label className="flex items-start gap-3 p-3 rounded-lg border border-border bg-secondary/30 hover:bg-secondary/50 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={confirmedByUser}
                  onChange={(e) => setConfirmedByUser(e.target.checked)}
                  className="mt-0.5 rounded border-border text-[#009F91] dark:text-[#19C6B4] focus:ring-primary"
                />
                <span className="text-xs text-foreground font-medium leading-relaxed">
                  I confirm that I want to execute this software update on this Windows machine now.
                </span>
              </label>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};
