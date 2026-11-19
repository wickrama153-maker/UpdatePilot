'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { api } from '@/lib/api';
import { StatusBadge } from './StatusBadge';
import { Card, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { EmptyState } from './ui/EmptyState';
import { Modal } from './ui/Modal';
import {
  History,
  Download,
  FileJson,
  RefreshCw,
  Search,
  Terminal,
  Shield,
  ArrowRight,
  Clock,
  Info,
} from 'lucide-react';

interface HistoryViewProps {
  selectedDeviceId?: string | null;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ selectedDeviceId }) => {
  const [data, setData] = useState<{ scans: any[]; updates: any[]; auditEvents: any[] }>({
    scans: [],
    updates: [],
    auditEvents: [],
  });
  const [activeTab, setActiveTab] = useState<'updates' | 'scans' | 'audit'>('updates');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState<any | null>(null);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const res = await api.getHistory(undefined, selectedDeviceId || undefined);
      setData(res);
    } catch (err) {
      console.error('Failed to fetch history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [selectedDeviceId]);

  const filteredUpdates = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data.updates || []).filter((job) => {
      if (statusFilter !== 'ALL' && job.status !== statusFilter) return false;
      if (!q) return true;
      const appName = (job.applicationName || job.application?.name || '').toLowerCase();
      const pkgId = (job.packageId || job.application?.packageId || '').toLowerCase();
      const errTxt = (job.errorSummary || '').toLowerCase();
      return appName.includes(q) || pkgId.includes(q) || errTxt.includes(q);
    });
  }, [data.updates, search, statusFilter]);

  const filteredScans = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data.scans || []).filter((scan) => {
      if (statusFilter !== 'ALL' && scan.status !== statusFilter) return false;
      if (!q) return true;
      const dev = (scan.device?.name || '').toLowerCase();
      const errTxt = (scan.errorSummary || scan.errorMessage || '').toLowerCase();
      return dev.includes(q) || errTxt.includes(q) || scan.id.toLowerCase().includes(q);
    });
  }, [data.scans, search, statusFilter]);

  const filteredAudit = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data.auditEvents || []).filter((ev) => {
      if (!q) return true;
      return (
        (ev.eventType || ev.action || '').toLowerCase().includes(q) ||
        (ev.actor || '').toLowerCase().includes(q) ||
        (ev.target || ev.targetType || '').toLowerCase().includes(q) ||
        (ev.details || ev.detailsJson || '').toLowerCase().includes(q)
      );
    });
  }, [data.auditEvents, search]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">Update History & Audit Logs</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Immutable operational ledger for WinGet upgrades, inventory discovery scans, and security events.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={loadHistory}
            isLoading={loading}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh
          </Button>
          <a href={api.exportInventoryCsvUrl()} download="updatepilot-inventory.csv">
            <Button variant="outline" size="sm" leftIcon={<Download className="w-3.5 h-3.5" />}>
              CSV Export
            </Button>
          </a>
          <a href={api.exportInventoryJsonUrl()} download="updatepilot-inventory.json">
            <Button variant="primary" size="sm" leftIcon={<FileJson className="w-3.5 h-3.5" />}>
              JSON Export
            </Button>
          </a>
        </div>
      </div>

      <Card>
        <CardHeader className="flex-col lg:flex-row lg:items-center items-stretch gap-3">
          {/* Sub-navigation Tabs */}
          <div className="flex items-center gap-1 bg-secondary/60 p-1 rounded-lg border border-border self-start">
            <button
              onClick={() => {
                setActiveTab('updates');
                setStatusFilter('ALL');
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'updates'
                  ? 'bg-card text-foreground shadow-sm border border-border/60'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              Update Jobs ({data.updates.length})
            </button>
            <button
              onClick={() => {
                setActiveTab('scans');
                setStatusFilter('ALL');
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'scans'
                  ? 'bg-card text-foreground shadow-sm border border-border/60'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              Scan Runs ({data.scans.length})
            </button>
            <button
              onClick={() => {
                setActiveTab('audit');
                setStatusFilter('ALL');
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'audit'
                  ? 'bg-card text-foreground shadow-sm border border-border/60'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              Audit Trail ({data.auditEvents.length})
            </button>
          </div>

          {/* Search & Status Filter */}
          <div className="flex items-center gap-2 flex-1 lg:justify-end">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter logs by app, actor, or ID..."
                className="w-full h-8 pl-8 pr-3 rounded-lg bg-secondary/70 border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            {activeTab !== 'audit' && (
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                aria-label="Filter by status"
                className="h-8 px-2.5 rounded-lg bg-secondary/70 border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="ALL">All Statuses</option>
                <option value="COMPLETED">Completed</option>
                <option value="FAILED">Failed</option>
                {activeTab === 'updates' && <option value="DISPATCHED">Dispatched</option>}
                {activeTab === 'updates' && <option value="RUNNING">Running</option>}
                {activeTab === 'updates' && <option value="VERIFYING">Verifying</option>}
                {activeTab === 'updates' && <option value="REQUIRES_RESTART">Restart Required</option>}
                {activeTab === 'updates' && <option value="REBOOT_REQUIRED">Reboot Required (Legacy)</option>}
                {activeTab === 'updates' && <option value="TIMED_OUT">Timed Out</option>}
                {activeTab === 'updates' && <option value="CANCELLED">Cancelled</option>}
              </select>
            )}
          </div>
        </CardHeader>

        {loading ? (
          <div className="p-10 text-center text-xs text-muted-foreground">Loading operational logs...</div>
        ) : activeTab === 'updates' ? (
          filteredUpdates.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={<History className="w-5 h-5" />}
                title="No update job history found"
                description="Executed software updates and verification outcomes will be logged here automatically."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-secondary/35 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="py-3 px-4">Application</th>
                    <th className="py-3 px-4">Version Delta</th>
                    <th className="py-3 px-4">Outcome</th>
                    <th className="py-3 px-4">Exit Code</th>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4 text-right">Inspect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-xs">
                  {filteredUpdates.map((job) => (
                    <tr key={job.id} className="hover:bg-secondary/30 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-foreground">{job.applicationName || job.application?.name || job.applicationId}</div>
                        <div className="text-[11px] font-mono text-muted-foreground truncate max-w-[220px]">
                          {job.packageId || job.application?.packageId || 'Local Package'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono whitespace-nowrap">
                        <span className="text-muted-foreground">{job.installedVersion || job.previousVersion || '—'}</span>
                        <ArrowRight className="inline w-3 h-3 mx-1.5 text-[#009F91] dark:text-[#19C6B4]" />
                        <span className="font-medium text-foreground">{job.targetVersion || 'Latest'}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={job.status} size="sm" />
                      </td>
                      <td className="py-3.5 px-4 font-mono text-muted-foreground">
                        {job.exitCode !== null && job.exitCode !== undefined ? `0x${Number(job.exitCode).toString(16)} (${job.exitCode})` : '—'}
                      </td>
                      <td className="py-3.5 px-4 text-muted-foreground whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5">
                          <Clock className="w-3 h-3" />
                          {new Date(job.startedAt || job.completedAt || job.createdAt).toLocaleString()}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedEntry({ type: 'update', item: job })}
                          leftIcon={<Info className="w-3.5 h-3.5" />}
                        >
                          Details
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : activeTab === 'scans' ? (
          filteredScans.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={<Terminal className="w-5 h-5" />}
                title="No discovery scan runs match your filter"
                description="Trigger a full system scan from the top bar to capture an inventory snapshot."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-secondary/35 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="py-3 px-4">Device / Host</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Discovered Apps</th>
                    <th className="py-3 px-4">Updates Found</th>
                    <th className="py-3 px-4">Started At</th>
                    <th className="py-3 px-4 text-right">Trigger</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-xs">
                  {filteredScans.map((scan) => (
                    <tr key={scan.id} className="hover:bg-secondary/30 transition-colors">
                      <td className="py-3.5 px-4 font-medium text-foreground">
                        {scan.device?.name || 'Windows Endpoint'}
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={scan.status} size="sm" />
                      </td>
                      <td className="py-3.5 px-4 font-mono text-foreground">{scan.totalFound ?? 0}</td>
                      <td className="py-3.5 px-4 font-mono text-[#B45309] dark:text-[#F5B942] font-semibold">
                        {scan.updatesFound ?? 0}
                      </td>
                      <td className="py-3.5 px-4 text-muted-foreground whitespace-nowrap">
                        {new Date(scan.startedAt || scan.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span className="px-2 py-0.5 rounded bg-secondary text-muted-foreground font-mono text-[11px] border border-border">
                          {scan.triggeredBy || 'manual'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : filteredAudit.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={<Shield className="w-5 h-5" />}
              title="No audit events found"
              description="System actions such as agent pairing, pinning, and update approvals are audited here."
            />
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredAudit.map((ev) => (
              <div
                key={ev.id}
                className="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-secondary/25 transition-colors text-xs"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <span className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded bg-[#009F91]/10 dark:bg-[#19C6B4]/10 text-[#009F91] dark:text-[#19C6B4] border border-[#009F91]/20 dark:border-[#19C6B4]/20 shrink-0">
                    {ev.eventType || ev.action}
                  </span>
                  <div className="min-w-0">
                    <div className="text-foreground font-medium">
                      Actor: <span className="font-mono">{ev.actor}</span>
                      {(ev.target || ev.targetType) && (
                        <span className="text-muted-foreground"> • Target: {ev.target || ev.targetType}</span>
                      )}
                    </div>
                    {(ev.details || ev.detailsJson) && (
                      <p className="font-mono text-[11px] text-muted-foreground mt-1 truncate max-w-2xl">
                        {ev.details || ev.detailsJson}
                      </p>
                    )}
                  </div>
                </div>
                <span className="text-[11px] text-muted-foreground shrink-0">
                  {new Date(ev.timestamp || ev.createdAt).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Log Details Modal */}
      <Modal
        isOpen={Boolean(selectedEntry)}
        onClose={() => setSelectedEntry(null)}
        title={selectedEntry?.item?.applicationName || selectedEntry?.item?.application?.name || 'Update Operation Details'}
        subtitle={selectedEntry?.item?.id}
        icon={<History className="w-4 h-4" />}
        footer={
          <div className="flex justify-end w-full">
            <Button variant="secondary" size="sm" onClick={() => setSelectedEntry(null)}>
              Close
            </Button>
          </div>
        }
      >
        {selectedEntry?.type === 'update' && (
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <StatusBadge status={selectedEntry.item.status} />
              <span className="font-mono text-muted-foreground">
                Exit Code: {selectedEntry.item.exitCode ?? 'N/A'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-secondary/40 border border-border">
              <div>
                <span className="text-[11px] text-muted-foreground block">Previous Version</span>
                <span className="font-mono text-foreground">{selectedEntry.item.installedVersion || selectedEntry.item.previousVersion || '—'}</span>
              </div>
              <div>
                <span className="text-[11px] text-muted-foreground block">Target Version</span>
                <span className="font-mono text-[#009F91] dark:text-[#19C6B4]">{selectedEntry.item.targetVersion || 'Latest'}</span>
              </div>
            </div>
            {selectedEntry.item.verificationResult && (
              <div className="p-3 rounded-lg bg-[#22C55E]/10 border border-[#22C55E]/30">
                <span className="font-semibold text-[#15803D] dark:text-[#22C55E] block mb-1">Verification Output</span>
                <p className="font-mono text-[11px] text-foreground whitespace-pre-wrap">{selectedEntry.item.verificationResult}</p>
              </div>
            )}
            {selectedEntry.item.errorSummary && (
              <div className="p-3 rounded-lg bg-[#EF5350]/10 border border-[#EF5350]/30">
                <span className="font-semibold text-[#B91C1C] dark:text-[#EF5350] block mb-1">Error Summary</span>
                <p className="font-mono text-[11px] text-foreground whitespace-pre-wrap">{selectedEntry.item.errorSummary}</p>
              </div>
            )}
            {(selectedEntry.item.command || selectedEntry.item.stdoutLog || selectedEntry.item.stderrLog) && (
              <div className="space-y-2 p-3 rounded-lg bg-secondary/40 border border-border">
                {selectedEntry.item.command && (
                  <div>
                    <span className="text-[11px] text-muted-foreground block mb-0.5">Command Executed</span>
                    <code className="font-mono text-[11px] text-foreground break-all">{selectedEntry.item.command}</code>
                  </div>
                )}
                {selectedEntry.item.stdoutLog && (
                  <div>
                    <span className="text-[11px] text-muted-foreground block mb-0.5">WinGet Output (stdout)</span>
                    <pre className="font-mono text-[10px] text-foreground whitespace-pre-wrap max-h-40 overflow-y-auto bg-background/60 p-2 rounded border border-border/60">
                      {selectedEntry.item.stdoutLog}
                    </pre>
                  </div>
                )}
                {selectedEntry.item.stderrLog && (
                  <div>
                    <span className="text-[11px] text-[#EF5350] block mb-0.5">Error Output (stderr)</span>
                    <pre className="font-mono text-[10px] text-[#EF5350] whitespace-pre-wrap max-h-32 overflow-y-auto bg-background/60 p-2 rounded border border-[#EF5350]/30">
                      {selectedEntry.item.stderrLog}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};
