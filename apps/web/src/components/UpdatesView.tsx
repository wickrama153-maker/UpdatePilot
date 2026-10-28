import React, { useState, useEffect } from 'react';
import {
  ArrowUpCircle,
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ExternalLink,
  Info,
  Clock,
  RotateCcw,
} from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { api } from '../lib/api';

interface UpdatesViewProps {
  initialSelectedAppId?: string | null;
  onClearInitialSelected?: () => void;
  onRefreshMetrics: () => void;
}

export const UpdatesView: React.FC<UpdatesViewProps> = ({
  initialSelectedAppId,
  onClearInitialSelected,
  onRefreshMetrics,
}) => {
  const [updates, setUpdates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
      const data = await api.getUpdates();
      setUpdates(data || []);

      // If an initial application was passed from another view
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

      // Create and dispatch job
      const job = await api.executeUpdate(selectedApp.id, previewData.targetVersion);
      setActiveJob(job);

      // Begin polling job status
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

        if (['COMPLETED', 'FAILED', 'REBOOT_REQUIRED', 'CANCELLED'].includes(updated.status)) {
          clearInterval(interval);
          setIsExecuting(false);
          onRefreshMetrics();
          fetchUpdates();
        }
      } catch (err) {
        console.error('Error polling job status', err);
      }
    }, 2500);
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
    if (isExecuting) return; // Disallow closing while installer is running
    setSelectedApp(null);
    setPreviewData(null);
    setActiveJob(null);
    setConfirmedByUser(false);
    setJobError(null);
  };

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="p-5 rounded-xl border border-border bg-card shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-foreground">Verified Package Updates</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Software updates detected via Windows Package Manager. Every update is previewed and executed only after your explicit confirmation.
          </p>
        </div>
        <button
          onClick={fetchUpdates}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-border bg-background hover:bg-accent text-foreground transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Available
        </button>
      </div>

      {/* Updates Cards Grid */}
      {loading ? (
        <div className="py-20 text-center text-muted-foreground text-xs">
          Loading verified software updates...
        </div>
      ) : updates.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-dashed border-border bg-card">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 mx-auto flex items-center justify-center mb-3">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-foreground">Your Software is Up to Date</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            All detected WinGet packages are currently running the latest verified release versions.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {updates.map((app) => (
            <div
              key={app.id}
              className="p-5 rounded-xl border border-border bg-card hover:border-blue-500/40 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-sm text-foreground leading-snug">{app.name}</h3>
                  <StatusBadge status="UPDATE_AVAILABLE" size="sm" />
                </div>
                <p className="text-xs text-muted-foreground mt-1">{app.publisher || 'Verified Package'}</p>

                {/* Version comparison box */}
                <div className="mt-4 p-3 rounded-lg border border-border bg-background/60 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[11px] text-muted-foreground">Installed</span>
                    <p className="font-mono font-medium text-foreground truncate">{app.installedVersion}</p>
                  </div>
                  <div>
                    <span className="text-[11px] text-amber-500 font-semibold">Available Target</span>
                    <p className="font-mono font-bold text-amber-500 truncate">{app.availableVersion}</p>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Source: <strong className="uppercase font-mono text-foreground">{app.source}</strong></span>
                  <span className="font-mono truncate max-w-[140px]">{app.packageId}</span>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-border flex items-center justify-between">
                {app.publisherUrl ? (
                  <a
                    href={app.publisherUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-blue-500 hover:underline inline-flex items-center gap-1"
                  >
                    Release Page <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <span />
                )}
                <button
                  onClick={() => handleOpenPreview(app)}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white shadow-sm transition-colors"
                >
                  Review & Update
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirmation & Execution Modal */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                  <ArrowUpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Review & Confirm Update</h3>
                  <p className="text-xs text-muted-foreground">Explicit user authorization required</p>
                </div>
              </div>
              {!isExecuting && (
                <button
                  onClick={handleCloseModal}
                  className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 text-xs">
              {jobError && (
                <div className="p-3 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-400 text-xs flex items-center gap-2">
                  <XCircle className="w-4 h-4 shrink-0" />
                  <span>{jobError}</span>
                </div>
              )}

              {/* Version Comparison Card */}
              <div className="p-4 rounded-xl border border-border bg-background space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-foreground">{selectedApp.name}</span>
                  <span className="px-2 py-0.5 rounded bg-muted font-mono uppercase text-[10px] text-muted-foreground">
                    {selectedApp.source}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
                  <div>
                    <span className="text-muted-foreground">Current Installed</span>
                    <p className="font-mono text-sm font-semibold text-foreground mt-0.5">
                      {selectedApp.installedVersion}
                    </p>
                  </div>
                  <div>
                    <span className="text-amber-500 font-semibold">Target Version</span>
                    <p className="font-mono text-sm font-bold text-amber-500 mt-0.5">
                      {previewData?.targetVersion || selectedApp.availableVersion}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-border text-[11px] text-muted-foreground flex items-center justify-between">
                  <span>WinGet Package ID:</span>
                  <span className="font-mono font-medium text-foreground">{selectedApp.packageId}</span>
                </div>
              </div>

              {/* Warnings Box */}
              <div className="p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/5 space-y-1.5">
                <div className="flex items-center gap-2 font-semibold text-amber-500">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Update Safety Information</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground text-[11px] pl-1">
                  <li>The installer will be executed via Windows Package Manager (WinGet).</li>
                  <li>Please save unsaved work in {selectedApp.name} before starting.</li>
                  <li>Certain packages may require elevation or a system reboot to finish.</li>
                </ul>
              </div>

              {/* Active Execution Status View */}
              {activeJob && (
                <div className="p-4 rounded-xl border border-border bg-background space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground">Execution Progress</span>
                    <StatusBadge status={activeJob.status} size="sm" />
                  </div>

                  {isExecuting && (
                    <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                      <div className="bg-blue-600 h-2 rounded-full w-2/3 animate-pulse" />
                    </div>
                  )}

                  {activeJob.verificationResult && (
                    <p className="text-[11px] text-muted-foreground bg-card p-2.5 rounded-lg border border-border">
                      {activeJob.verificationResult}
                    </p>
                  )}

                  {activeJob.status === 'COMPLETED' && (
                    <div className="flex items-center gap-2 text-emerald-400 font-medium">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Update completed and verified successfully!</span>
                    </div>
                  )}

                  {activeJob.status === 'REBOOT_REQUIRED' && (
                    <div className="flex items-center gap-2 text-sky-400 font-medium">
                      <RotateCcw className="w-4 h-4" />
                      <span>Update installed. System restart is required to finish.</span>
                    </div>
                  )}

                  {activeJob.status === 'FAILED' && (
                    <div className="flex items-center gap-2 text-rose-400 font-medium">
                      <XCircle className="w-4 h-4" />
                      <span>Update failed. Review diagnostics in History.</span>
                    </div>
                  )}
                </div>
              )}

              {/* User Confirmation Checkbox */}
              {!activeJob && (
                <label className="flex items-start gap-3 p-3 rounded-lg border border-border bg-background hover:bg-accent/30 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={confirmedByUser}
                    onChange={(e) => setConfirmedByUser(e.target.checked)}
                    className="mt-0.5 rounded border-border text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs text-foreground font-medium leading-relaxed">
                    I confirm that I want to execute this software update on this Windows machine now.
                  </span>
                </label>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-4 border-t border-border bg-background/50">
              {isExecuting && activeJob && (
                <button
                  onClick={handleCancelActiveJob}
                  className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-rose-600/10 text-rose-400 border border-rose-500/20 hover:bg-rose-600/20"
                >
                  Cancel In-Progress Job
                </button>
              )}

              <button
                onClick={handleCloseModal}
                disabled={isExecuting}
                className="px-4 py-2 text-xs font-semibold rounded-lg border border-border hover:bg-accent disabled:opacity-50 text-foreground"
              >
                {activeJob ? 'Done' : 'Cancel'}
              </button>

              {!activeJob && (
                <button
                  onClick={handleConfirmAndExecute}
                  disabled={!confirmedByUser || isExecuting}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm transition-all"
                >
                  Confirm & Execute Update
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
