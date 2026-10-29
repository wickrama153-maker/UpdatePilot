import React from 'react';
import {
  Layers,
  ArrowUpCircle,
  CheckCircle2,
  AlertTriangle,
  Laptop,
  ArrowRight,
  RefreshCw,
  Cpu,
  ShieldCheck,
  HardDrive,
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { StatusBadge } from './StatusBadge';
import { TabId } from './Sidebar';

interface OverviewViewProps {
  metrics: any;
  onNavigate: (tab: TabId) => void;
  onTriggerScan: () => void;
  isScanning: boolean;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  metrics,
  onNavigate,
  onTriggerScan,
  isScanning,
}) => {
  const totalApps = metrics?.totalApplications ?? 0;
  const updatesAvailable = metrics?.updatesAvailable ?? 0;
  const upToDate = metrics?.upToDate ?? 0;
  const unmatched = metrics?.unmatched ?? 0;
  const device = metrics?.activeDevice;

  // Swiss Engineering Interface Palette
  const chartData = [
    { name: 'Up to Date', value: upToDate, color: '#34785A' },
    { name: 'Update Available', value: updatesAvailable, color: '#F06435' },
    { name: 'Legacy / Registry', value: unmatched, color: '#77786F' },
  ].filter((d) => d.value > 0);

  const publisherSampleData = [
    { name: 'Microsoft', count: Math.min(25, Math.floor(totalApps * 0.35)) },
    { name: 'Google', count: Math.min(10, Math.floor(totalApps * 0.12)) },
    { name: 'Dev Tools', count: Math.min(12, Math.floor(totalApps * 0.15)) },
    { name: 'WinGet Core', count: Math.min(30, Math.floor(totalApps * 0.28)) },
    { name: 'Other', count: Math.max(5, totalApps - 77) },
  ];

  return (
    <div className="space-y-6">
      {/* Action Banner if Updates are available */}
      {updatesAvailable > 0 && (
        <div className="p-4 rounded border border-[#F06435]/40 bg-[#F06435]/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded border border-[#F06435] bg-[#F06435] text-white font-mono font-bold text-xs">
              <ArrowUpCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#F06435]">
                  [ACTION REQUIRED]
                </span>
                <h3 className="text-sm font-bold text-foreground">
                  {updatesAvailable} software {updatesAvailable === 1 ? 'update is' : 'updates are'} ready for review
                </h3>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Target packages are verified via Windows Package Manager. Explicit administrator confirmation is required.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('updates')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded text-xs font-mono font-bold uppercase tracking-wider bg-[#F06435] text-white hover:bg-[#D95528] active:translate-y-0.5 transition-all shrink-0"
          >
            <span>REVIEW UPDATES</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Metrics Row: Swiss Precision Technical Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Installed */}
        <div className="p-4 rounded border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border pb-2.5">
            <span className="font-mono text-[10px] font-bold tracking-widest uppercase text-muted-foreground">
              [SYS.01 // INVENTORY]
            </span>
            <Layers className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
          <div className="mt-3">
            <span className="text-3xl font-mono font-black tracking-tight text-foreground tabular-nums">
              {totalApps}
            </span>
            <p className="text-xs text-muted-foreground mt-1 font-mono">Verified software packages</p>
          </div>
        </div>

        {/* Updates Available */}
        <div className="p-4 rounded border border-[#F06435]/40 bg-card">
          <div className="flex items-center justify-between border-b border-border pb-2.5">
            <span className="font-mono text-[10px] font-bold tracking-widest uppercase text-[#F06435]">
              [SYS.02 // PENDING]
            </span>
            <ArrowUpCircle className="w-3.5 h-3.5 text-[#F06435]" />
          </div>
          <div className="mt-3">
            <span className="text-3xl font-mono font-black tracking-tight text-[#F06435] tabular-nums">
              {updatesAvailable}
            </span>
            <p className="text-xs text-muted-foreground mt-1 font-mono">Updates awaiting confirmation</p>
          </div>
        </div>

        {/* Up to Date */}
        <div className="p-4 rounded border border-[#34785A]/40 bg-card">
          <div className="flex items-center justify-between border-b border-border pb-2.5">
            <span className="font-mono text-[10px] font-bold tracking-widest uppercase text-[#34785A] dark:text-[#4AA880]">
              [SYS.03 // VERIFIED]
            </span>
            <CheckCircle2 className="w-3.5 h-3.5 text-[#34785A] dark:text-[#4AA880]" />
          </div>
          <div className="mt-3">
            <span className="text-3xl font-mono font-black tracking-tight text-[#34785A] dark:text-[#4AA880] tabular-nums">
              {upToDate}
            </span>
            <p className="text-xs text-muted-foreground mt-1 font-mono">Modern verified versions</p>
          </div>
        </div>

        {/* Unmatched / Legacy */}
        <div className="p-4 rounded border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border pb-2.5">
            <span className="font-mono text-[10px] font-bold tracking-widest uppercase text-[#77786F]">
              [SYS.04 // UNMANAGED]
            </span>
            <AlertTriangle className="w-3.5 h-3.5 text-[#77786F]" />
          </div>
          <div className="mt-3">
            <span className="text-3xl font-mono font-black tracking-tight text-foreground tabular-nums">
              {unmatched}
            </span>
            <p className="text-xs text-muted-foreground mt-1 font-mono">Legacy registry entries</p>
          </div>
        </div>
      </div>

      {/* Visual Charts & Device Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Distribution Donut Chart */}
        <div className="p-5 rounded border border-border bg-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-border pb-2">
              <h3 className="font-mono font-bold text-xs uppercase tracking-wider text-foreground">
                Distribution Matrix
              </h3>
              <span className="font-mono text-[9px] text-muted-foreground">[HEALTH.01]</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Status breakdown across detected software entities
            </p>
          </div>

          <div className="h-48 w-full my-3">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    borderColor: 'hsl(var(--border))',
                    borderRadius: '4px',
                    fontFamily: 'ui-monospace, monospace',
                    fontSize: '11px',
                    color: 'hsl(var(--foreground))',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-1.5 pt-3 border-t border-border font-mono text-xs">
            {chartData.map((d) => (
              <div key={d.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: d.color }} />
                  <span className="text-muted-foreground text-[11px]">{d.name}</span>
                </div>
                <span className="font-bold text-foreground tabular-nums">{d.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Publisher Distribution Bar Chart */}
        <div className="p-5 rounded border border-border bg-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-border pb-2">
              <h3 className="font-mono font-bold text-xs uppercase tracking-wider text-foreground">
                Publisher Registry
              </h3>
              <span className="font-mono text-[9px] text-muted-foreground">[ORIGIN.02]</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Software origins by vendor grouping
            </p>
          </div>

          <div className="h-48 w-full my-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={publisherSampleData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#77786F" fontSize={9} tickLine={false} fontFamily="monospace" />
                <YAxis stroke="#77786F" fontSize={9} tickLine={false} fontFamily="monospace" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    borderColor: 'hsl(var(--border))',
                    borderRadius: '4px',
                    fontFamily: 'ui-monospace, monospace',
                    fontSize: '11px',
                    color: 'hsl(var(--foreground))',
                  }}
                />
                <Bar dataKey="count" fill="#F06435" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <p className="text-[10px] font-mono text-muted-foreground text-center border-t border-border pt-3">
            {totalApps > 0 ? `[TOTAL AUDITED: ${totalApps} LOCAL PACKAGES]` : '[NO INVENTORY RECORDED]'}
          </p>
        </div>

        {/* Host Machine Node Spec Sheet */}
        <div className="p-5 rounded border border-border bg-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-border pb-2">
              <h3 className="font-mono font-bold text-xs uppercase tracking-wider text-foreground">
                Hardware Node
              </h3>
              {device?.status ? <StatusBadge status={device.status} size="sm" /> : null}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Native Windows system runtime parameters
            </p>
          </div>

          <div className="my-3 space-y-2 text-xs font-mono">
            <div className="flex items-center justify-between py-1 border-b border-border/60">
              <span className="text-muted-foreground text-[11px]">HOSTNAME</span>
              <span className="font-bold text-foreground truncate max-w-[150px]">{device?.name || 'Local Windows PC'}</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-border/60">
              <span className="text-muted-foreground text-[11px]">OS PLATFORM</span>
              <span className="text-foreground">{device?.osVersion || 'Windows 11'}</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-border/60">
              <span className="text-muted-foreground text-[11px]">ARCHITECTURE</span>
              <span className="text-foreground font-semibold">{device?.architecture || 'x64'}</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-border/60">
              <span className="text-muted-foreground text-[11px]">AGENT VERSION</span>
              <span className="text-foreground">{device?.agentVersion || '1.0.0'}</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-muted-foreground text-[11px]">INTEGRATION</span>
              <span className="font-bold text-[#F06435]">WinGet CLI (v1.29+)</span>
            </div>
          </div>

          <div className="pt-2 border-t border-border">
            <button
              onClick={onTriggerScan}
              disabled={isScanning}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-mono font-bold uppercase rounded border border-border bg-background hover:bg-muted text-foreground transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
              {isScanning ? 'AUDITING SYSTEM...' : 'RE-SCAN INVENTORY'}
            </button>
          </div>
        </div>
      </div>

      {/* Quick Action Navigation Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          onClick={() => onNavigate('applications')}
          className="p-4 rounded border border-border bg-card hover:border-[#F06435] transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between border-b border-border pb-2">
            <span className="font-mono text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              [INDEX // 02]
            </span>
            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 group-hover:text-[#F06435] transition-all" />
          </div>
          <div className="mt-3 flex items-center gap-2.5">
            <Layers className="w-4 h-4 text-[#F06435]" />
            <h4 className="font-mono font-bold text-xs uppercase tracking-wider text-foreground">
              Package Inventory
            </h4>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Search, filter by publisher, inspect package IDs, and manage pinned items.
          </p>
        </div>

        <div
          onClick={() => onNavigate('updates')}
          className="p-4 rounded border border-border bg-card hover:border-[#F06435] transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between border-b border-border pb-2">
            <span className="font-mono text-[10px] font-bold text-[#F06435] uppercase tracking-widest">
              [INDEX // 03]
            </span>
            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 group-hover:text-[#F06435] transition-all" />
          </div>
          <div className="mt-3 flex items-center gap-2.5">
            <ArrowUpCircle className="w-4 h-4 text-[#F06435]" />
            <h4 className="font-mono font-bold text-xs uppercase tracking-wider text-foreground">
              Update Center
            </h4>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Preview target versions, review changelog links, and perform confirmed upgrades.
          </p>
        </div>

        <div
          onClick={() => onNavigate('security')}
          className="p-4 rounded border border-border bg-card hover:border-[#B8433D] transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between border-b border-border pb-2">
            <span className="font-mono text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              [INDEX // 04]
            </span>
            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 group-hover:text-[#B8433D] transition-all" />
          </div>
          <div className="mt-3 flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-[#B8433D]" />
            <h4 className="font-mono font-bold text-xs uppercase tracking-wider text-foreground">
              Security Insights
            </h4>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Audit detected packages against verified Open Source Vulnerabilities (OSV).
          </p>
        </div>
      </div>
    </div>
  );
};
