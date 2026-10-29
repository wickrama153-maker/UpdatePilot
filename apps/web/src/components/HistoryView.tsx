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
      <div className="p-4 rounded border border-border bg-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              [AUDIT.LOG // HISTORICAL DISPATCH]
            </span>
            <h2 className="text-sm font-mono font-bold uppercase tracking-wide text-foreground">
              Operations & Event Ledger
            </h2>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Tamper-evident logs of scans, verified updates, exit codes, and administrator actions.
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-mono font-bold uppercase rounded border border-[#34785A] bg-[#34785A] hover:bg-[#2C664C] text-white shadow-sm transition-colors shrink-0"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>EXPORT INVENTORY CSV</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-mono">
        <button
          onClick={() => setActiveTab('updates')}
          className={`px-3 py-1.5 rounded uppercase font-bold transition-colors ${
            activeTab === 'updates'
              ? 'border border-[#F06435] bg-[#F06435] text-white'
              : 'border border-border bg-background hover:bg-muted text-muted-foreground'
          }`}
        >
          UPDATE EXECUTIONS ({historyData.updates?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('scans')}
          className={`px-3 py-1.5 rounded uppercase font-bold transition-colors ${
            activeTab === 'scans'
              ? 'border border-[#F06435] bg-[#F06435] text-white'
              : 'border border-border bg-background hover:bg-muted text-muted-foreground'
          }`}
        >
          DISCOVERY SCANS ({historyData.scans?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-3 py-1.5 rounded uppercase font-bold transition-colors ${
            activeTab === 'audit'
              ? 'border border-[#F06435] bg-[#F06435] text-white'
              : 'border border-border bg-background hover:bg-muted text-muted-foreground'
          }`}
        >
          SECURITY AUDIT EVENTS ({historyData.auditEvents?.length || 0})
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-20 text-center text-muted-foreground font-mono text-xs">
          [QUERYING AUDIT HISTORY ARCHIVE...]
        </div>
      ) : activeTab === 'updates' ? (
        <div className="rounded border border-border bg-card overflow-hidden">
          {historyData.updates?.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground font-mono text-xs">
              [NO EXECUTED UPDATE OPERATIONS LOGGED YET]
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border bg-background/80 text-muted-foreground font-mono text-[10px] uppercase tracking-wider">
                    <th className="py-2.5 px-4 font-bold">Application</th>
                    <th className="py-2.5 px-4 font-bold">Progression</th>
                    <th className="py-2.5 px-4 font-bold">Outcome</th>
                    <th className="py-2.5 px-4 font-bold">Exit Code</th>
                    <th className="py-2.5 px-4 font-bold">Diagnostics</th>
                    <th className="py-2.5 px-4 text-right font-bold">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border font-mono text-xs">
                  {historyData.updates.map((job: any) => (
                    <tr key={job.id} className="hover:bg-muted/40 transition-colors">
                      <td className="py-2.5 px-4 font-semibold text-foreground">{job.applicationName}</td>
                      <td className="py-2.5 px-4 text-xs">
                        <span className="text-muted-foreground">{job.installedVersion}</span>
                        <span className="mx-1.5 text-[#F06435]">→</span>
                        <span className="text-[#F06435] font-bold">{job.targetVersion}</span>
                      </td>
                      <td className="py-2.5 px-4">
                        <StatusBadge status={job.status} size="sm" />
                      </td>
                      <td className="py-2.5 px-4 text-xs font-bold text-foreground">
                        {job.exitCode !== null ? job.exitCode : '—'}
                      </td>
                      <td className="py-2.5 px-4 text-muted-foreground max-w-xs truncate font-sans text-xs">
                        {job.verificationResult || job.errorSummary || '—'}
                      </td>
                      <td className="py-2.5 px-4 text-right text-muted-foreground text-[11px]">
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
        <div className="rounded border border-border bg-card overflow-hidden">
          {historyData.scans?.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground font-mono text-xs">
              [NO SCAN HISTORIES RECORDED]
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border bg-background/80 text-muted-foreground font-mono text-[10px] uppercase tracking-wider">
                    <th className="py-2.5 px-4 font-bold">Device Node</th>
                    <th className="py-2.5 px-4 font-bold">Status</th>
                    <th className="py-2.5 px-4 font-bold">Discovered</th>
                    <th className="py-2.5 px-4 font-bold">Updates Identified</th>
                    <th className="py-2.5 px-4 text-right font-bold">Completed At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border font-mono text-xs">
                  {historyData.scans.map((scan: any) => (
                    <tr key={scan.id} className="hover:bg-muted/40 transition-colors">
                      <td className="py-2.5 px-4 font-semibold text-foreground">{scan.device?.name || 'Local Host'}</td>
                      <td className="py-2.5 px-4">
                        <StatusBadge status={scan.status} size="sm" />
                      </td>
                      <td className="py-2.5 px-4">{scan.totalFound}</td>
                      <td className="py-2.5 px-4 font-bold text-[#F06435]">{scan.updatesFound}</td>
                      <td className="py-2.5 px-4 text-right text-muted-foreground text-[11px]">
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
        <div className="rounded border border-border bg-card overflow-hidden">
          <div className="divide-y divide-border font-mono text-xs">
            {historyData.auditEvents?.map((evt: any) => (
              <div key={evt.id} className="p-3 flex items-center justify-between hover:bg-muted/40">
                <div className="flex items-center gap-3">
                  <span className="px-1.5 py-0.5 rounded bg-background border border-border text-[9px] uppercase font-bold text-[#F06435]">
                    {evt.eventType}
                  </span>
                  <span className="font-semibold text-foreground">{evt.target || evt.actor}</span>
                  {evt.details && (
                    <span className="text-muted-foreground text-[11px] truncate max-w-md hidden md:inline">
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
