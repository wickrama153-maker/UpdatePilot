import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  ExternalLink,
  RefreshCw,
  AlertOctagon,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../lib/api';

export const SecurityView: React.FC = () => {
  const [findings, setFindings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanStats, setScanStats] = useState<any | null>(null);

  const fetchFindings = async () => {
    try {
      setLoading(true);
      const data = await api.getSecurityFindings();
      setFindings(data || []);
    } catch (err) {
      console.error('Failed to fetch security findings', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFindings();
  }, []);

  const handleScanSecurity = async () => {
    try {
      setScanning(true);
      const res = await api.triggerSecurityScan();
      setScanStats(res);
      fetchFindings();
    } catch (err) {
      console.error('Security scan error', err);
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-5 rounded-xl border border-border bg-card shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-foreground">Security & Advisory Insights</h2>
            <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[10px] font-semibold">
              OSV Database
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Verified public vulnerability disclosures (CVE / GHSA) mapped to detected local software.
          </p>
        </div>

        <button
          onClick={handleScanSecurity}
          disabled={scanning}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${scanning ? 'animate-spin' : ''}`} />
          {scanning ? 'Auditing with OSV...' : 'Audit Packages'}
        </button>
      </div>

      {scanStats && (
        <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>
            Scanned {scanStats.scannedCount} package identities. Found {scanStats.advisoriesFound} verified advisories.
          </span>
        </div>
      )}

      {/* Findings List */}
      {loading ? (
        <div className="py-20 text-center text-muted-foreground text-xs">
          Loading security intelligence data...
        </div>
      ) : findings.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-dashed border-border bg-card">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 mx-auto flex items-center justify-center mb-3">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-foreground">No Verified Security Advisories Found</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
            None of the audited packages on this computer have known unpatched CVEs listed in the Open Source Vulnerabilities database. Click "Audit Packages" to run a scan.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {findings.map((item) => {
            const isHigh = item.severity === 'CRITICAL' || item.severity === 'HIGH';
            return (
              <div
                key={item.id}
                className="p-4 rounded-xl border border-border bg-card hover:border-border/80 transition-colors flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        isHigh ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30' : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {item.severity}
                    </span>
                    <span className="font-mono text-xs font-semibold text-foreground">{item.advisoryId}</span>
                    <span className="text-xs font-bold text-blue-400">({item.applicationName})</span>
                  </div>

                  <p className="text-xs text-foreground font-medium">{item.title}</p>

                  <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                    <span>Source: {item.source}</span>
                    <span>Affected: {item.affectedVersionRange}</span>
                    <span>Verified: {new Date(item.lastVerifiedAt).toLocaleDateString()}</span>
                  </div>
                </div>

                {item.advisoryUrl && (
                  <a
                    href={item.advisoryUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-accent text-xs font-medium text-foreground transition-colors shrink-0"
                  >
                    View Advisory <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Advisory Verification Policy */}
      <div className="p-4 rounded-xl border border-border bg-background/50 text-xs text-muted-foreground space-y-1">
        <div className="flex items-center gap-2 font-semibold text-foreground">
          <Info className="w-4 h-4 text-blue-500" />
          <span>Security Integrity Guarantee</span>
        </div>
        <p>
          UpdatePilot only surfaces vulnerability notices when trusted package identifiers can be matched against public, authoritative databases (e.g., OSV). We do not guess or generate synthetic CVE disclosures.
        </p>
      </div>
    </div>
  );
};
