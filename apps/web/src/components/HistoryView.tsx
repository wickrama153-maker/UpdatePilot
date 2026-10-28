import React, { useState, useEffect } from 'react';
import {
  History,
  Download,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Clock,
  Layers,
  Shield,
  FileSpreadsheet,
} from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { api } from '../lib/api';

export const HistoryView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'updates' | 'scans' | 'audit'>('updates');
  const [historyData, setHistoryData] = useState<any>({ updates: [], scans: [], auditEvents: [] });
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const data = await api.getHistory();
      setHistoryData(data || { updates: [], scans: [], auditEvents: [] });
    } catch (err) {
      console.error('Failed to fetch history', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleExportCsv = () => {
    window.open(api.exportInventoryCsvUrl(), '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Export Action */}
      <div className="p-5 rounded-xl border border-border bg-card shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-foreground">Operational History & Audit Log</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Tamper-evident logs of scans, verified updates, exit codes, and administrator actions.
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-colors"
        >
          <FileSpreadsheet className="w-4 h-4" />
          Export Inventory CSV
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-2 text-xs">
        <button
          onClick={() => setActiveTab('updates')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
            activeTab === 'updates' ? 'bg-blue-600 text-white' : 'hover:bg-accent text-muted-foreground'
          }`}
        >
          Update Executions ({historyData.updates?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('scans')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
            activeTab === 'scans' ? 'bg-blue-600 text-white' : 'hover:bg-accent text-muted-foreground'
          }`}
        >
          Discovery Scans ({historyData.scans?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
            activeTab === 'audit' ? 'bg-blue-600 text-white' : 'hover:bg-accent text-muted-foreground'
          }`}
        >
          Security Audit Events ({historyData.auditEvents?.length || 0})
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-20 text-center text-muted-foreground text-xs">Loading operational history...</div>
      ) : activeTab === 'updates' ? (
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
          {historyData.updates?.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground text-xs">
              No update executions recorded yet. Confirmed updates will appear here.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-muted-foreground font-semibold">
                    <th className="py-3 px-4">Application</th>
                    <th className="py-3 px-4">Version Progression</th>
                    <th className="py-3 px-4">Outcome</th>
                    <th className="py-3 px-4">Exit Code</th>
                    <th className="py-3 px-4">Verification Diagnostic</th>
                    <th className="py-3 px-4 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {historyData.updates.map((job: any) => (
                    <tr key={job.id} className="hover:bg-accent/40 transition-colors">
                      <td className="py-3 px-4 font-semibold text-foreground">{job.applicationName}</td>
                      <td className="py-3 px-4 font-mono text-xs">
                        <span className="text-muted-foreground">{job.installedVersion}</span>
                        <span className="mx-1.5 text-blue-500">→</span>
                        <span className="text-amber-500 font-bold">{job.targetVersion}</span>
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={job.status} size="sm" />
                      </td>
                      <td className="py-3 px-4 font-mono text-xs">
                        {job.exitCode !== null ? job.exitCode : '—'}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground max-w-xs truncate">
                        {job.verificationResult || job.errorSummary || '—'}
                      </td>
                      <td className="py-3 px-4 text-right text-muted-foreground">
                        {new Date(job.startedAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : activeTab === 'scans' ? (
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
          {historyData.scans?.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground text-xs">
              No scan history found. Run a scan to discover applications.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-muted-foreground font-semibold">
                    <th className="py-3 px-4">Device</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Packages Discovered</th>
                    <th className="py-3 px-4">Updates Found</th>
                    <th className="py-3 px-4 text-right">Completed At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {historyData.scans.map((scan: any) => (
                    <tr key={scan.id} className="hover:bg-accent/40 transition-colors">
                      <td className="py-3 px-4 font-semibold text-foreground">{scan.device?.name || 'Local Host'}</td>
                      <td className="py-3 px-4">
                        <StatusBadge status={scan.status} size="sm" />
                      </td>
                      <td className="py-3 px-4 font-mono">{scan.totalFound}</td>
                      <td className="py-3 px-4 font-mono font-bold text-amber-500">{scan.updatesFound}</td>
                      <td className="py-3 px-4 text-right text-muted-foreground">
                        {scan.completedAt ? new Date(scan.completedAt).toLocaleString() : 'In Progress'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
          <div className="divide-y divide-border text-xs">
            {historyData.auditEvents?.map((evt: any) => (
              <div key={evt.id} className="p-3.5 flex items-center justify-between hover:bg-accent/40">
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 rounded bg-muted font-mono text-[10px] uppercase font-bold text-blue-400">
                    {evt.eventType}
                  </span>
                  <span className="font-medium text-foreground">{evt.target || evt.actor}</span>
                  {evt.details && (
                    <span className="text-muted-foreground font-mono text-[11px] truncate max-w-md">
                      {evt.details}
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-muted-foreground shrink-0">
                  {new Date(evt.timestamp).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
