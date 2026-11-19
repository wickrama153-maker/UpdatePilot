'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { api } from '@/lib/api';
import { StatusBadge } from './StatusBadge';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import { Button } from './ui/Button';
import { ProgressBar } from './ui/ProgressBar';
import { Modal } from './ui/Modal';
import { EmptyState } from './ui/EmptyState';
import {
  Activity,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Ban,
  ArrowRight,
  Clock,
  Terminal,
  ShieldAlert,
  Info,
  RotateCcw,
} from 'lucide-react';

interface UpdateManagementViewProps {
  onRefreshMetrics?: () => void;
  onNavigateTab?: (tab: 'updates' | 'history' | 'overview') => void;
}

const ACTIVE_STATUSES = ['PENDING', 'QUEUED', 'PREVIEWED', 'APPROVED', 'DISPATCHED', 'RUNNING', 'EXECUTING', 'VERIFYING'];
const CANCELLABLE_STATUSES = ['PENDING', 'QUEUED', 'PREVIEWED', 'APPROVED', 'DISPATCHED', 'RUNNING', 'EXECUTING', 'VERIFYING'];

function getJobProgress(job: any): { value?: number; tone: 'primary' | 'success' | 'warning' | 'error'; stepLabel: string } {
  const status = job.status;
  const pct = typeof job.progressPercent === 'number' ? job.progressPercent : undefined;
  const stage = job.stage;

  switch (status) {
    case 'PENDING':
    case 'QUEUED':
    case 'APPROVED':
      return { value: undefined, tone: 'warning', stepLabel: stage || 'Waiting for Windows Agent' };
    case 'PREVIEWED':
      return { value: undefined, tone: 'primary', stepLabel: stage || 'Pre-flight check completed' };
    case 'DISPATCHED':
      return { value: pct, tone: 'primary', stepLabel: stage || 'Job dispatched to Windows Agent' };
    case 'RUNNING':
    case 'EXECUTING':
      return { value: pct, tone: 'primary', stepLabel: stage || 'Executing upgrade via WinGet' };
    case 'VERIFYING':
      return { value: undefined, tone: 'primary', stepLabel: stage || 'Verifying installed version' };
    case 'COMPLETED':
      return { value: 100, tone: 'success', stepLabel: stage || 'Upgrade verified and complete' };
    case 'REBOOT_REQUIRED':
    case 'REQUIRES_RESTART':
      return { value: 100, tone: 'warning', stepLabel: stage || 'System restart required (Exit 3010)' };
    case 'TIMED_OUT':
      return { value: 0, tone: 'error', stepLabel: stage || 'Execution timed out' };
    case 'FAILED':
      return { value: 0, tone: 'error', stepLabel: stage || 'Execution failed' };
    case 'CANCELLED':
      return { value: 0, tone: 'warning', stepLabel: stage || 'Cancelled by operator' };
    default:
      return { value: undefined, tone: 'primary', stepLabel: stage || status };
  }
}

export const UpdateManagementView: React.FC<UpdateManagementViewProps> = ({
  onRefreshMetrics,
  onNavigateTab,
}) => {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'COMPLETED' | 'FAILED' | 'CANCELLED'>('ALL');
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<any | null>(null);

  const loadJobs = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.getHistory('updates');
      setJobs(res.updates || []);
    } catch (err) {
      console.error('Failed to load update jobs:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const hasActiveJobs = useMemo(
    () => jobs.some((j) => ACTIVE_STATUSES.includes(j.status)),
    [jobs]
  );

  // Live poll while any job is running or queued
  useEffect(() => {
    if (!hasActiveJobs) return;
    const timer = setInterval(() => {
      loadJobs(true);
      onRefreshMetrics?.();
      if (selectedJob && ACTIVE_STATUSES.includes(selectedJob.status)) {
        api
          .getUpdateJob(selectedJob.id)
          .then((fresh) => setSelectedJob(fresh))
          .catch(() => {});
      }
    }, 2500);
    return () => clearInterval(timer);
  }, [hasActiveJobs, loadJobs, onRefreshMetrics, selectedJob]);

  const handleCancelJob = async (jobId: string) => {
    setCancellingId(jobId);
    setActionError(null);
    try {
      const updated = await api.cancelUpdateJob(jobId);
      await loadJobs(true);
      onRefreshMetrics?.();
      if (selectedJob?.id === jobId) {
        setSelectedJob(updated);
      }
    } catch (err: any) {
      setActionError(err.message || 'Unable to cancel update job');
    } finally {
      setCancellingId(null);
    }
  };

  const counts = useMemo(() => {
    const active = jobs.filter((j) => ACTIVE_STATUSES.includes(j.status)).length;
    const completed = jobs.filter((j) => j.status === 'COMPLETED').length;
    const failed = jobs.filter((j) => j.status === 'FAILED' || j.status === 'TIMED_OUT').length;
    const reboot = jobs.filter(
      (j) => j.status === 'REBOOT_REQUIRED' || j.status === 'REQUIRES_RESTART' || j.requiresReboot
    ).length;
    const cancelled = jobs.filter((j) => j.status === 'CANCELLED').length;
    return { active, completed, failed, reboot, cancelled };
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    return jobs.filter((j) => {
      if (filter === 'ACTIVE') return ACTIVE_STATUSES.includes(j.status);
      if (filter === 'COMPLETED')
        return j.status === 'COMPLETED' || j.status === 'REBOOT_REQUIRED' || j.status === 'REQUIRES_RESTART';
      if (filter === 'FAILED') return j.status === 'FAILED' || j.status === 'TIMED_OUT';
      if (filter === 'CANCELLED') return j.status === 'CANCELLED';
      return true;
    });
  }, [jobs, filter]);

  const activeJobsList = useMemo(
    () => jobs.filter((j) => ACTIVE_STATUSES.includes(j.status)),
    [jobs]
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">Update Orchestration & Job Queue</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Monitor live execution pipelines, exit codes, verification outcomes, and cancel pending operations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadJobs(false)}
            isLoading={loading}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh Queue
          </Button>
          {onNavigateTab && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => onNavigateTab('updates')}
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              Select Updates
            </Button>
          )}
        </div>
      </div>

      {/* Reboot Warning Banner */}
      {counts.reboot > 0 && (
        <div className="rounded-xl border border-[#F5B942]/40 bg-[#F5B942]/10 p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-[#B45309] dark:text-[#F5B942] shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <h3 className="text-xs font-semibold text-[#B45309] dark:text-[#F5B942]">
              System Restart Required ({counts.reboot} {counts.reboot === 1 ? 'package' : 'packages'})
            </h3>
            <p className="text-xs text-foreground/80 mt-0.5">
              One or more installers completed with Windows Installer exit code 3010 (soft reboot required). Save your work and restart Windows to finalize updated binaries.
            </p>
          </div>
        </div>
      )}

      {actionError && (
        <div className="rounded-xl border border-[#EF5350]/40 bg-[#EF5350]/10 p-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-[#B91C1C] dark:text-[#EF5350]">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button
            onClick={() => setActionError(null)}
            className="text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-medium text-muted-foreground">Active / Queued</span>
              <div className="text-2xl font-bold text-foreground mt-1 tabular-nums">{counts.active}</div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-[#60A5FA]/10 text-[#1D4ED8] dark:text-[#60A5FA] flex items-center justify-center">
              <Activity className={`w-5 h-5 ${counts.active > 0 ? 'animate-pulse' : ''}`} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-medium text-muted-foreground">Completed Verified</span>
              <div className="text-2xl font-bold text-[#15803D] dark:text-[#22C55E] mt-1 tabular-nums">{counts.completed}</div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-[#22C55E]/10 text-[#15803D] dark:text-[#22C55E] flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-medium text-muted-foreground">Reboot Pending</span>
              <div className="text-2xl font-bold text-[#B45309] dark:text-[#F5B942] mt-1 tabular-nums">{counts.reboot}</div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-[#F5B942]/15 text-[#B45309] dark:text-[#F5B942] flex items-center justify-center">
              <RotateCcw className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-medium text-muted-foreground">Failed / Cancelled</span>
              <div className="text-2xl font-bold text-[#B91C1C] dark:text-[#EF5350] mt-1 tabular-nums">
                {counts.failed + counts.cancelled}
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-[#EF5350]/10 text-[#B91C1C] dark:text-[#EF5350] flex items-center justify-center">
              <XCircle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Live Executing Jobs Spotlight */}
      {activeJobsList.length > 0 && (
        <Card className="border-[#009F91]/40 dark:border-[#19C6B4]/40">
          <CardHeader className="py-3.5 bg-[#009F91]/5 dark:bg-[#19C6B4]/5">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#19C6B4] animate-ping" />
              <CardTitle>Live Execution Pipeline ({activeJobsList.length})</CardTitle>
            </div>
            <span className="text-[11px] text-muted-foreground">Auto-polling every 2.5s</span>
          </CardHeader>
          <CardContent className="divide-y divide-border p-0">
            {activeJobsList.map((job) => {
              const prog = getJobProgress(job);
              return (
                <div key={job.id} className="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="text-sm font-semibold text-foreground truncate">
                        {job.applicationName || job.application?.name || 'Application Update'}
                      </span>
                      <StatusBadge status={job.status} size="sm" />
                      <span className="text-xs font-mono text-muted-foreground">
                        {job.installedVersion || job.previousVersion || '—'} <ArrowRight className="inline w-3 h-3 mx-0.5" /> {job.targetVersion || 'Latest'}
                      </span>
                    </div>
                    <ProgressBar value={prog.value} tone={prog.tone} label={prog.stepLabel} />
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button variant="outline" size="sm" onClick={() => setSelectedJob(job)}>
                      Inspect
                    </Button>
                    {CANCELLABLE_STATUSES.includes(job.status) && (
                      <Button
                        variant="danger"
                        size="sm"
                        isLoading={cancellingId === job.id}
                        onClick={() => handleCancelJob(job.id)}
                        leftIcon={<Ban className="w-3.5 h-3.5" />}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Filter Bar + Job Queue Table */}
      <Card>
        <CardHeader className="flex-col sm:flex-row sm:items-center items-start gap-3">
          <div>
            <CardTitle>Update Job Ledger</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Showing {filteredJobs.length} of {jobs.length} recent update operations
            </p>
          </div>
          <div className="flex items-center gap-1 bg-secondary/60 p-1 rounded-lg border border-border flex-wrap">
            {(
              [
                { id: 'ALL', label: `All (${jobs.length})` },
                { id: 'ACTIVE', label: `Active (${counts.active})` },
                { id: 'COMPLETED', label: `Completed (${counts.completed + counts.reboot})` },
                { id: 'FAILED', label: `Failed (${counts.failed})` },
                { id: 'CANCELLED', label: `Cancelled (${counts.cancelled})` },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  filter === tab.id
                    ? 'bg-card text-foreground shadow-sm border border-border/60'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </CardHeader>

        {loading ? (
          <div className="p-8 text-center text-xs text-muted-foreground">Loading update job queue...</div>
        ) : filteredJobs.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={<Terminal className="w-5 h-5" />}
              title="No matching update jobs"
              description={
                jobs.length === 0
                  ? 'No software updates have been executed or queued yet. Head to Available Updates to inspect and approve upgrades.'
                  : 'Try switching the status filter above to inspect other execution states.'
              }
              action={
                jobs.length === 0 && onNavigateTab ? (
                  <Button variant="primary" size="sm" onClick={() => onNavigateTab('updates')}>
                    View Available Updates
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-secondary/35 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="py-3 px-4">Application</th>
                  <th className="py-3 px-4">Version Transition</th>
                  <th className="py-3 px-4">Stage / Status</th>
                  <th className="py-3 px-4">Exit / Verification</th>
                  <th className="py-3 px-4">Started</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-xs">
                {filteredJobs.map((job) => (
                  <tr key={job.id} className="hover:bg-secondary/30 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-foreground">
                        {job.applicationName || job.application?.name || job.applicationId}
                      </div>
                      <div className="text-[11px] font-mono text-muted-foreground truncate max-w-[220px]">
                        {job.packageId || job.application?.packageId || job.id.slice(0, 12)}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono">
                      <span className="text-muted-foreground">{job.installedVersion || job.previousVersion || '—'}</span>
                      <span className="mx-1.5 text-[#009F91] dark:text-[#19C6B4]">→</span>
                      <span className="font-medium text-foreground">{job.targetVersion || 'Latest'}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={job.status} size="sm" />
                    </td>
                    <td className="py-3.5 px-4 max-w-[260px]">
                      {job.exitCode !== null && job.exitCode !== undefined && (
                        <span className="inline-block font-mono text-[11px] px-1.5 py-0.5 rounded bg-secondary border border-border mr-1.5">
                          Code {job.exitCode}
                        </span>
                      )}
                      <span className="text-muted-foreground truncate inline-block align-middle max-w-[180px]">
                        {job.errorSummary || job.verificationResult || '—'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3" />
                        {new Date(job.startedAt || job.createdAt).toLocaleString()}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedJob(job)}
                          leftIcon={<Info className="w-3.5 h-3.5" />}
                        >
                          Details
                        </Button>
                        {CANCELLABLE_STATUSES.includes(job.status) && (
                          <Button
                            variant="danger"
                            size="sm"
                            isLoading={cancellingId === job.id}
                            onClick={() => handleCancelJob(job.id)}
                          >
                            Cancel
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Job Detail Modal */}
      <Modal
        isOpen={Boolean(selectedJob)}
        onClose={() => setSelectedJob(null)}
        title={selectedJob?.applicationName || selectedJob?.application?.name || 'Update Job Details'}
        subtitle={selectedJob ? `Job ID: ${selectedJob.id}` : undefined}
        icon={<Terminal className="w-4 h-4" />}
        maxWidthClass="max-w-xl"
        footer={
          selectedJob && (
            <div className="flex items-center justify-end gap-2 w-full">
              {CANCELLABLE_STATUSES.includes(selectedJob.status) && (
                <Button
                  variant="danger"
                  size="sm"
                  isLoading={cancellingId === selectedJob.id}
                  onClick={() => handleCancelJob(selectedJob.id)}
                  leftIcon={<Ban className="w-3.5 h-3.5" />}
                >
                  Cancel Update Job
                </Button>
              )}
              <Button variant="secondary" size="sm" onClick={() => setSelectedJob(null)}>
                Close
              </Button>
            </div>
          )
        }
      >
        {selectedJob && (
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <StatusBadge status={selectedJob.status} />
              <span className="text-muted-foreground font-mono">
                Initiator: {selectedJob.initiator || selectedJob.triggeredBy || 'local_user'}
              </span>
            </div>

            <ProgressBar
              value={getJobProgress(selectedJob).value}
              tone={getJobProgress(selectedJob).tone}
              label={getJobProgress(selectedJob).stepLabel}
            />

            <div className="grid grid-cols-2 gap-3 bg-secondary/40 rounded-lg p-3.5 border border-border">
              <div>
                <span className="text-[11px] text-muted-foreground block">Previous Version</span>
                <span className="font-mono font-medium text-foreground">{selectedJob.installedVersion || selectedJob.previousVersion || 'Unknown'}</span>
              </div>
              <div>
                <span className="text-[11px] text-muted-foreground block">Target Version</span>
                <span className="font-mono font-medium text-[#009F91] dark:text-[#19C6B4]">{selectedJob.targetVersion || 'Latest'}</span>
              </div>
              <div>
                <span className="text-[11px] text-muted-foreground block">Started At</span>
                <span className="text-foreground">{selectedJob.startedAt ? new Date(selectedJob.startedAt).toLocaleString() : 'Queued'}</span>
              </div>
              <div>
                <span className="text-[11px] text-muted-foreground block">Completed At</span>
                <span className="text-foreground">{selectedJob.completedAt ? new Date(selectedJob.completedAt).toLocaleString() : '—'}</span>
              </div>
              <div>
                <span className="text-[11px] text-muted-foreground block">Exit Code</span>
                <span className="font-mono text-foreground">{selectedJob.exitCode ?? 'Pending'}</span>
              </div>
              <div>
                <span className="text-[11px] text-muted-foreground block">Reboot Required</span>
                <span className="text-foreground">{selectedJob.requiresReboot ? 'Yes (Reboot advised)' : 'No'}</span>
              </div>
            </div>

            {selectedJob.verificationResult && (
              <div className="rounded-lg border border-[#22C55E]/30 bg-[#22C55E]/10 p-3">
                <span className="font-semibold text-[#15803D] dark:text-[#22C55E] block mb-1">Verification Output</span>
                <p className="text-foreground font-mono text-[11px] whitespace-pre-wrap">{selectedJob.verificationResult}</p>
              </div>
            )}

            {selectedJob.command && (
              <div className="rounded-lg border border-border bg-secondary/40 p-3">
                <span className="font-semibold text-foreground block mb-1">Executed Command</span>
                <code className="text-[11px] font-mono text-muted-foreground break-all">{selectedJob.command}</code>
              </div>
            )}

            {selectedJob.stdoutLog && (
              <div className="rounded-lg border border-border bg-secondary/30 p-3">
                <span className="font-semibold text-foreground block mb-1">WinGet Standard Output</span>
                <pre className="text-[10px] font-mono text-muted-foreground whitespace-pre-wrap max-h-40 overflow-y-auto">
                  {selectedJob.stdoutLog}
                </pre>
              </div>
            )}

            {(selectedJob.errorSummary || selectedJob.stderrLog) && (
              <div className="rounded-lg border border-[#EF5350]/30 bg-[#EF5350]/10 p-3">
                <span className="font-semibold text-[#B91C1C] dark:text-[#EF5350] block mb-1">Diagnostic Summary</span>
                <p className="text-foreground font-mono text-[11px] whitespace-pre-wrap">
                  {selectedJob.errorSummary}
                  {selectedJob.stderrLog && selectedJob.stderrLog !== selectedJob.errorSummary
                    ? `\n\n${selectedJob.stderrLog}`
                    : ''}
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};
