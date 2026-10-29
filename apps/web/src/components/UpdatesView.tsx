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
  X,
  Check,
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
      <div className="p-4 rounded border border-border bg-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] font-bold text-[#F06435] uppercase tracking-wider">
              [DISCOVERY // WINGET REPOSITORY]
            </span>
            <h2 className="text-sm font-mono font-bold uppercase tracking-wide text-foreground">
              Verified Upgrade Center
            </h2>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Software packages with newer verified releases in the Windows Package Manager catalog. All updates require explicit user confirmation.
          </p>
        </div>
        <button
          onClick={fetchUpdates}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold uppercase rounded border border-border bg-background hover:bg-muted text-foreground transition-colors shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>QUERY WINGET</span>
        </button>
      </div>

      {/* Updates Cards Grid */}
      {loading ? (
        <div className="py-20 text-center text-muted-foreground font-mono text-xs">
          [SCANNING REPOSITORIES FOR COMPATIBLE PACKAGES...]
        </div>
      ) : updates.length === 0 ? (
        <div className="p-12 text-center rounded border border-border bg-card">
          <div className="w-10 h-10 rounded border border-[#34785A] bg-[#34785A]/10 text-[#34785A] dark:text-[#4AA880] mx-auto flex items-center justify-center mb-3">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-foreground">
            System Up to Date
          </h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto font-mono">
            All detected WinGet packages match or exceed upstream release versions.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {updates.map((app) => (
            <div
              key={app.id}
              className="p-4 rounded border border-border bg-card hover:border-[#F06435]/60 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 border-b border-border pb-2">
                  <h3 className="font-bold text-sm text-foreground leading-snug truncate" title={app.name}>
                    {app.name}
                  </h3>
                  <StatusBadge status="UPDATE_AVAILABLE" size="sm" />
                </div>
                <p className="text-xs text-muted-foreground mt-1 font-mono">{app.publisher || 'Verified Package'}</p>

                {/* Monospace Version Comparison Matrix */}
                <div className="mt-3 p-3 rounded border border-border bg-background grid grid-cols-2 gap-2 text-xs font-mono">
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">
                      INSTALLED
                    </span>
                    <p className="font-medium text-foreground truncate mt-0.5">{app.installedVersion}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#F06435] font-bold uppercase tracking-wider block">
                      TARGET UPGRADE
                    </span>
                    <p className="font-bold text-[#F06435] truncate mt-0.5">{app.availableVersion}</p>
                  </div>
                </div>

                <div className="mt-2.5 flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                  <span>SRC: <strong className="uppercase text-foreground">{app.source}</strong></span>
                  <span className="truncate max-w-[140px]">{app.packageId}</span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                {app.publisherUrl ? (
                  <a
                    href={app.publisherUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-mono text-[#F06435] hover:underline inline-flex items-center gap-1"
                  >
                    Release Notes <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <span />
                )}
                <button
                  onClick={() => handleOpenPreview(app)}
                  className="px-3 py-1.5 text-xs font-mono font-bold uppercase rounded bg-[#F06435] hover:bg-[#D95528] text-white shadow-sm transition-colors"
                >
                  REVIEW & UPDATE
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirmation & Execution Modal: Swiss Engineering Industrial Control */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded border border-border bg-card shadow-2xl overflow-hidden animate-in fade-in duration-100">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-background/80">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded border border-[#F06435] bg-[#F06435]/10 text-[#F06435]">
                  <ArrowUpCircle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground font-mono uppercase tracking-wide">
                    Confirm Software Update
                  </h3>
                  <p className="font-mono text-[9px] text-muted-foreground uppercase tracking-widest">
                    [DISPATCH // VERIFICATION GATE]
                  </p>
                </div>
              </div>
              {!isExecuting && (
                <button
                  onClick={handleCloseModal}
                  className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                  aria-label="Close dialog"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 text-xs font-mono">
              {jobError && (
                <div className="p-3 rounded border border-[#B8433D]/40 bg-[#B8433D]/10 text-[#B8433D] dark:text-[#D95F59] text-xs flex items-center gap-2">
                  <XCircle className="w-4 h-4 shrink-0" />
                  <span>{jobError}</span>
                </div>
              )}

              {/* Version Comparison Card */}
              <div className="p-3.5 rounded border border-border bg-background space-y-2.5">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <span className="font-bold text-sm text-foreground">{selectedApp.name}</span>
                  <span className="px-1.5 py-0.5 rounded bg-muted border border-border uppercase text-[9px] text-muted-foreground">
                    {selectedApp.source}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <span className="text-muted-foreground text-[10px] uppercase tracking-wider">
                      CURRENT INSTALLED
                    </span>
                    <p className="text-sm font-semibold text-foreground mt-0.5">
                      {selectedApp.installedVersion}
                    </p>
                  </div>
                  <div>
                    <span className="text-[#F06435] text-[10px] font-bold uppercase tracking-wider">
                      TARGET VERSION
                    </span>
                    <p className="text-sm font-bold text-[#F06435] mt-0.5">
                      {previewData?.targetVersion || selectedApp.availableVersion}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-border/60 text-[11px] text-muted-foreground flex items-center justify-between">
                  <span>WINGET IDENTIFIER:</span>
                  <span className="font-semibold text-foreground">{selectedApp.packageId}</span>
                </div>
              </div>

              {/* Safety Information Box */}
              <div className="p-3.5 rounded border border-[#C88B24]/30 bg-[#C88B24]/5 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-[#C88B24] dark:text-[#E0A238] uppercase tracking-wide text-[11px]">
                  <AlertTriangle className="w-4 h-4" />
                  <span>EXECUTION PROTOCOL & PRECAUTIONS</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground text-[11px] pl-1 font-sans">
                  <li>The installer will be executed via Windows Package Manager (<code className="font-mono">winget upgrade</code>).</li>
                  <li>Please save unsaved work in {selectedApp.name} prior to proceeding.</li>
                  <li>Certain packages may require administrative elevation or a system reboot to finalize.</li>
                </ul>
              </div>

              {/* Active Execution Status View */}
              {activeJob && (
                <div className="p-3.5 rounded border border-border bg-background space-y-3">
                  <div className="flex items-center justify-between border-b border-border pb-2">
                    <span className="font-bold text-foreground">EXECUTION MONITOR</span>
                    <StatusBadge status={activeJob.status} size="sm" />
                  </div>

                  {isExecuting && (
                    <div className="w-full bg-muted rounded h-2 overflow-hidden border border-border">
                      <div className="bg-[#F06435] h-2 w-2/3 animate-pulse" />
                    </div>
                  )}

                  {activeJob.verificationResult && (
                    <p className="text-[11px] text-muted-foreground bg-card p-2 rounded border border-border">
                      {activeJob.verificationResult}
                    </p>
                  )}

                  {activeJob.status === 'COMPLETED' && (
                    <div className="flex items-center gap-2 text-[#34785A] dark:text-[#4AA880] font-bold">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Update completed and verified successfully!</span>
                    </div>
                  )}

                  {activeJob.status === 'REBOOT_REQUIRED' && (
                    <div className="flex items-center gap-2 text-[#2A7488] dark:text-[#4FB2CC] font-bold">
                      <RotateCcw className="w-4 h-4" />
                      <span>Update installed. System restart is required to finish.</span>
                    </div>
                  )}

                  {activeJob.status === 'FAILED' && (
                    <div className="flex items-center gap-2 text-[#B8433D] dark:text-[#D95F59] font-bold">
                      <XCircle className="w-4 h-4" />
                      <span>Update failed. Review diagnostics in History.</span>
                    </div>
                  )}
                </div>
              )}

              {/* User Explicit Confirmation Checkbox */}
              {!activeJob && (
                <label className="flex items-start gap-3 p-3 rounded border border-border bg-background hover:bg-muted/40 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={confirmedByUser}
                    onChange={(e) => setConfirmedByUser(e.target.checked)}
                    className="mt-0.5 rounded border-border text-[#F06435] focus:ring-[#F06435]"
                  />
                  <span className="text-xs text-foreground font-semibold leading-relaxed font-sans">
                    I confirm that I want to execute this software update on this Windows machine now.
                  </span>
                </label>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2 p-3.5 border-t border-border bg-background/50 font-mono">
              {isExecuting && activeJob && (
                <button
                  onClick={handleCancelActiveJob}
                  className="px-3.5 py-1.5 text-xs font-bold uppercase rounded bg-[#B8433D]/10 text-[#B8433D] dark:text-[#D95F59] border border-[#B8433D]/30 hover:bg-[#B8433D]/20"
                >
                  ABORT JOB
                </button>
              )}

              <button
                onClick={handleCloseModal}
                disabled={isExecuting}
                className="px-3.5 py-1.5 text-xs font-semibold uppercase rounded border border-border hover:bg-muted disabled:opacity-40 text-foreground"
              >
                {activeJob ? 'DONE' : 'CANCEL'}
              </button>

              {!activeJob && (
                <button
                  onClick={handleConfirmAndExecute}
                  disabled={!confirmedByUser || isExecuting}
                  className="px-4 py-1.5 text-xs font-bold uppercase rounded bg-[#F06435] text-white hover:bg-[#D95528] disabled:opacity-30 disabled:cursor-not-allowed shadow-sm transition-all"
                >
                  EXECUTE UPDATE
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
