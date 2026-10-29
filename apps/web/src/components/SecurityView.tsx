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
      <div className="p-4 rounded border border-border bg-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] font-bold text-[#B8433D] uppercase tracking-wider">
              [SECURITY // OSV DATABASE]
            </span>
            <h2 className="text-sm font-mono font-bold uppercase tracking-wide text-foreground">
              Vulnerability & CVE Intelligence
            </h2>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Verified public vulnerability disclosures (CVE / GHSA) mapped against detected local desktop software packages.
          </p>
        </div>

        <button
          onClick={handleScanSecurity}
          disabled={scanning}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-mono font-bold uppercase rounded border border-[#F06435] bg-[#F06435] text-white hover:bg-[#D95528] disabled:opacity-40 transition-colors shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${scanning ? 'animate-spin' : ''}`} />
          <span>{scanning ? 'AUDITING PACKAGES...' : 'AUDIT ADVISORIES'}</span>
        </button>
      </div>

      {scanStats && (
        <div className="p-3.5 rounded border border-[#34785A]/40 bg-[#34785A]/10 text-[#34785A] dark:text-[#4AA880] text-xs font-mono flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>
            AUDIT COMPLETED: {scanStats.scannedCount} PACKAGES INSPECTED // {scanStats.advisoriesFound} ADVISORIES IDENTIFIED.
          </span>
        </div>
      )}

      {/* Findings List */}
      {loading ? (
        <div className="py-20 text-center text-muted-foreground font-mono text-xs">
          [QUERYING SECURITY ADVISORY REPOSITORIES...]
        </div>
      ) : findings.length === 0 ? (
        <div className="p-12 text-center rounded border border-border bg-card">
          <div className="w-10 h-10 rounded border border-[#34785A] bg-[#34785A]/10 text-[#34785A] dark:text-[#4AA880] mx-auto flex items-center justify-center mb-3">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-foreground">
            No Vulnerability Advisories Reported
          </h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto font-mono">
            None of the audited packages on this computer have known unpatched CVEs listed in the Open Source Vulnerabilities database. Click "Audit Advisories" to refresh.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {findings.map((item) => {
            const isHigh = item.severity === 'CRITICAL' || item.severity === 'HIGH';
            return (
              <div
                key={item.id}
                className="p-4 rounded border border-border bg-card hover:border-border/80 transition-colors flex flex-col md:flex-row items-start md:items-center justify-between gap-4 font-mono text-xs"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                        isHigh
                          ? 'bg-[#B8433D]/10 text-[#B8433D] dark:text-[#D95F59] border-[#B8433D]/30'
                          : 'bg-[#C88B24]/10 text-[#C88B24] dark:text-[#E0A238] border-[#C88B24]/30'
                      }`}
                    >
                      {item.severity}
                    </span>
                    <span className="font-bold text-foreground">{item.advisoryId}</span>
                    <span className="text-[#F06435] font-semibold">[{item.applicationName}]</span>
                  </div>

                  <p className="text-xs text-foreground font-sans font-medium">{item.title}</p>

                  <div className="flex items-center gap-4 text-[10px] text-muted-foreground pt-1 border-t border-border/50">
                    <span>SRC: {item.source}</span>
                    <span>RANGE: {item.affectedVersionRange}</span>
                    <span>VERIFIED: {new Date(item.lastVerifiedAt).toLocaleDateString()}</span>
                  </div>
                </div>

                {item.advisoryUrl && (
                  <a
                    href={item.advisoryUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-border bg-background hover:bg-muted text-xs font-semibold text-foreground transition-colors shrink-0"
                  >
                    <span>ADVISORY LINK</span>
                    <ExternalLink className="w-3.5 h-3.5 text-[#F06435]" />
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
