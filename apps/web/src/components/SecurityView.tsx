'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { api } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import { Button } from './ui/Button';
import { EmptyState } from './ui/EmptyState';
import {
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  AlertTriangle,
  Search,
} from 'lucide-react';

export const SecurityView: React.FC = () => {
  const [findings, setFindings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState<'ALL' | 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'>('ALL');
  const [scanResultMsg, setScanResultMsg] = useState<string | null>(null);

  const loadFindings = async () => {
    setLoading(true);
    try {
      const data = await api.getSecurityFindings();
      setFindings(data || []);
    } catch (err) {
      console.error('Failed to fetch security findings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFindings();
  }, []);

  const handleRunScan = async () => {
    setScanning(true);
    setScanResultMsg(null);
    try {
      const res = await api.triggerSecurityScan();
      setScanResultMsg(
        `OSV vulnerability audit completed (${res?.scannedCount ?? 0} tracked applications scanned, ${res?.advisoriesFound ?? 0} advisories found).`
      );
      await loadFindings();
    } catch (err: any) {
      setScanResultMsg(err.message || 'Vulnerability audit failed');
    } finally {
      setScanning(false);
    }
  };

  const counts = useMemo(() => {
    const c = { critical: 0, high: 0, medium: 0, low: 0 };
    for (const f of findings) {
      const s = (f.severity || '').toUpperCase();
      if (s === 'CRITICAL') c.critical++;
      else if (s === 'HIGH') c.high++;
      else if (s === 'MEDIUM') c.medium++;
      else c.low++;
    }
    return c;
  }, [findings]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return findings.filter((f) => {
      if (severityFilter !== 'ALL' && (f.severity || '').toUpperCase() !== severityFilter) return false;
      if (!q) return true;
      return (
        (f.advisoryId || '').toLowerCase().includes(q) ||
        (f.packageId || '').toLowerCase().includes(q) ||
        (f.title || '').toLowerCase().includes(q) ||
        (f.applicationName || '').toLowerCase().includes(q)
      );
    });
  }, [findings, search, severityFilter]);

  const getSeverityBadge = (severity: string) => {
    const s = (severity || 'MEDIUM').toUpperCase();
    switch (s) {
      case 'CRITICAL':
        return 'bg-[#EF5350]/15 text-[#B91C1C] dark:text-[#EF5350] border-[#EF5350]/30';
      case 'HIGH':
        return 'bg-[#F5B942]/15 text-[#B45309] dark:text-[#F5B942] border-[#F5B942]/30';
      case 'MEDIUM':
        return 'bg-[#60A5FA]/15 text-[#1D4ED8] dark:text-[#60A5FA] border-[#60A5FA]/30';
      default:
        return 'bg-secondary text-muted-foreground border-border';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">Security Advisories & Vulnerability Audit</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Live OSV (Open Source Vulnerabilities) advisory matching against installed application versions.
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={handleRunScan}
          isLoading={scanning}
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
        >
          {scanning ? 'Auditing Inventory...' : 'Run OSV Security Scan'}
        </Button>
      </div>

      {scanResultMsg && (
        <div className="rounded-xl border border-[#009F91]/30 dark:border-[#19C6B4]/30 bg-[#009F91]/10 dark:bg-[#19C6B4]/10 px-4 py-3 text-xs text-foreground flex items-center justify-between">
          <span>{scanResultMsg}</span>
          <button onClick={() => setScanResultMsg(null)} className="text-muted-foreground hover:text-foreground">
            Dismiss
          </button>
        </div>
      )}

      {/* Severity Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Critical', val: counts.critical, tone: 'text-[#B91C1C] dark:text-[#EF5350]', filter: 'CRITICAL' as const },
          { label: 'High', val: counts.high, tone: 'text-[#B45309] dark:text-[#F5B942]', filter: 'HIGH' as const },
          { label: 'Medium', val: counts.medium, tone: 'text-[#1D4ED8] dark:text-[#60A5FA]', filter: 'MEDIUM' as const },
          { label: 'Low', val: counts.low, tone: 'text-foreground', filter: 'LOW' as const },
        ].map((item) => (
          <Card
            key={item.label}
            hoverable
            className="cursor-pointer"
            onClick={() => setSeverityFilter(severityFilter === item.filter ? 'ALL' : item.filter)}
          >
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-medium text-muted-foreground">{item.label} Severity</span>
                <div className={`text-2xl font-bold mt-1 tabular-nums ${item.tone}`}>{item.val}</div>
              </div>
              <AlertTriangle className={`w-5 h-5 ${item.tone} opacity-80`} />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Findings List */}
      <Card>
        <CardHeader className="flex-col sm:flex-row sm:items-center items-stretch gap-3">
          <div className="flex items-center gap-2">
            <CardTitle>Detected Advisories ({filtered.length})</CardTitle>
            {severityFilter !== 'ALL' && (
              <button
                onClick={() => setSeverityFilter('ALL')}
                className="text-[11px] px-2 py-0.5 rounded bg-secondary text-muted-foreground hover:text-foreground border border-border"
              >
                Clear: {severityFilter} ×
              </button>
            )}
          </div>
          <div className="relative sm:w-72">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search CVE, advisory ID, or package..."
              className="w-full h-8 pl-8 pr-3 rounded-lg bg-secondary/70 border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </CardHeader>

        {loading ? (
          <div className="p-10 text-center text-xs text-muted-foreground">Loading security advisories...</div>
        ) : filtered.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={<ShieldCheck className="w-5 h-5 text-[#22C55E]" />}
              title={findings.length === 0 ? 'No Known Vulnerabilities Detected' : 'No Matching Advisories'}
              description={
                findings.length === 0
                  ? 'All scanned packages currently match clean OSV security records. Run a fresh OSV audit periodically or after installing new packages.'
                  : 'Clear or adjust your severity filter and search keywords to view remaining advisories.'
              }
              action={
                findings.length === 0 ? (
                  <Button variant="outline" size="sm" onClick={handleRunScan} isLoading={scanning}>
                    Run Fresh OSV Audit
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((finding) => (
              <div key={finding.id} className="p-4 sm:px-5 hover:bg-secondary/25 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md border ${getSeverityBadge(
                          finding.severity
                        )}`}
                      >
                        {finding.severity || 'MEDIUM'}
                      </span>
                      <span className="font-mono text-xs font-semibold text-foreground">
                        {finding.advisoryId}
                      </span>
                      {finding.applicationName && (
                        <span className="text-xs text-[#009F91] dark:text-[#19C6B4] font-medium">
                          {finding.applicationName} ({finding.packageId})
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {finding.title || 'Security advisory affecting installed package version.'}
                    </p>
                    <div className="flex items-center gap-4 text-[11px] text-muted-foreground pt-1 flex-wrap">
                      {finding.affectedVersionRange && (
                        <span>
                          Affected: <code className="font-mono text-foreground">{finding.affectedVersionRange}</code>
                        </span>
                      )}
                      {finding.source && <span>Source: {finding.source}</span>}
                      <span>Verified: {new Date(finding.lastVerifiedAt || finding.publishedAt || Date.now()).toLocaleDateString()}</span>
                    </div>
                  </div>
                  {finding.advisoryUrl && (
                    <a
                      href={finding.advisoryUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-[#009F91] dark:text-[#19C6B4] hover:underline shrink-0"
                    >
                      Advisory
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
