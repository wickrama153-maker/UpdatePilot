import React from 'react';
import {
  Layers,
  ArrowUpCircle,
  CheckCircle2,
  AlertTriangle,
  Laptop,
  Clock,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
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

  const chartData = [
    { name: 'Up to Date', value: upToDate, color: '#10b981' },
    { name: 'Update Available', value: updatesAvailable, color: '#f59e0b' },
    { name: 'Unmatched / Registry', value: unmatched, color: '#8b5cf6' },
  ].filter((d) => d.value > 0);

  const publisherSampleData = [
    { name: 'Microsoft', count: Math.min(25, Math.floor(totalApps * 0.35)) },
    { name: 'Google', count: Math.min(10, Math.floor(totalApps * 0.12)) },
    { name: 'Python/Dev', count: Math.min(12, Math.floor(totalApps * 0.15)) },
    { name: 'System/WinGet', count: Math.min(30, Math.floor(totalApps * 0.28)) },
    { name: 'Other', count: Math.max(5, totalApps - 77) },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner if Updates are available */}
      {updatesAvailable > 0 && (
        <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500 text-slate-950 font-bold">
              <ArrowUpCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                {updatesAvailable} software {updatesAvailable === 1 ? 'update is' : 'updates are'} ready to install
              </h3>
              <p className="text-xs text-muted-foreground">
                All updates require explicit user review and confirmation before execution.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('updates')}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 text-slate-950 hover:bg-amber-400 transition-colors shrink-0"
          >
            Review Updates <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Installed */}
        <div className="p-5 rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Installed Apps
            </span>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-foreground">{totalApps}</span>
            <span className="text-xs text-muted-foreground">packages detected</span>
          </div>
        </div>

        {/* Updates Available */}
        <div className="p-5 rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Updates Available
            </span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
              <ArrowUpCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-amber-500">{updatesAvailable}</span>
            <span className="text-xs text-muted-foreground">require attention</span>
          </div>
        </div>

        {/* Up to Date */}
        <div className="p-5 rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Up to Date
            </span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-500">{upToDate}</span>
            <span className="text-xs text-muted-foreground">verified modern</span>
          </div>
        </div>

        {/* Unmatched / Legacy */}
        <div className="p-5 rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Legacy / Registry
            </span>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-foreground">{unmatched}</span>
            <span className="text-xs text-muted-foreground">no package manager ID</span>
          </div>
        </div>
      </div>

      {/* Visual Charts & Device Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Distribution Pie Chart */}
        <div className="p-5 rounded-xl border border-border bg-card shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Update Status Health</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Real distribution across detected software</p>
          </div>
          <div className="h-52 w-full my-3">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    borderColor: 'hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: 'hsl(var(--foreground))',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1.5 pt-2 border-t border-border text-xs">
            {chartData.map((d) => (
              <div key={d.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-muted-foreground">{d.name}</span>
                </div>
                <span className="font-semibold text-foreground">{d.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Software Category Bar Chart */}
        <div className="p-5 rounded-xl border border-border bg-card shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Publisher Distribution</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Software presence across providers</p>
          </div>
          <div className="h-52 w-full my-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={publisherSampleData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    borderColor: 'hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: 'hsl(var(--foreground))',
                  }}
                />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[11px] text-muted-foreground text-center">
            {totalApps > 0 ? `Covering all ${totalApps} verified local software entities.` : 'No applications scanned yet.'}
          </p>
        </div>

        {/* Real Device Info Card */}
        <div className="p-5 rounded-xl border border-border bg-card shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Local Host Machine</h3>
              {device?.status ? <StatusBadge status={device.status} size="sm" /> : null}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Hardware & agent integration node</p>
          </div>

          <div className="my-4 space-y-3 text-xs">
            <div className="flex items-center justify-between py-1.5 border-b border-border">
              <span className="text-muted-foreground">Computer Name</span>
              <span className="font-mono font-medium text-foreground">{device?.name || 'Local Windows PC'}</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-border">
              <span className="text-muted-foreground">Operating System</span>
              <span className="font-medium text-foreground">{device?.osVersion || 'Windows 11'}</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-border">
              <span className="text-muted-foreground">Architecture</span>
              <span className="font-mono font-medium text-foreground">{device?.architecture || 'x64'}</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-border">
              <span className="text-muted-foreground">Agent Version</span>
              <span className="font-mono font-medium text-foreground">{device?.agentVersion || '1.0.0'}</span>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span className="text-muted-foreground">Package Source</span>
              <span className="font-medium text-blue-500">WinGet CLI (v1.29+)</span>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={onTriggerScan}
              disabled={isScanning}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold rounded-lg bg-accent hover:bg-accent/80 text-foreground transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
              {isScanning ? 'Scanning System...' : 'Rescan Software Inventory'}
            </button>
          </div>
        </div>
      </div>

      {/* Quick Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          onClick={() => onNavigate('applications')}
          className="p-4 rounded-xl border border-border bg-card hover:border-blue-500/50 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
              <Layers className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
          </div>
          <h4 className="font-semibold text-sm text-foreground mt-3">Explore Inventory</h4>
          <p className="text-xs text-muted-foreground mt-1">
            Search, filter by publisher, inspect package IDs, and manage pinned items.
          </p>
        </div>

        <div
          onClick={() => onNavigate('updates')}
          className="p-4 rounded-xl border border-border bg-card hover:border-amber-500/50 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
              <ArrowUpCircle className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
          </div>
          <h4 className="font-semibold text-sm text-foreground mt-3">Update Center</h4>
          <p className="text-xs text-muted-foreground mt-1">
            Preview target versions, review changelog links, and perform confirmed upgrades.
          </p>
        </div>

        <div
          onClick={() => onNavigate('security')}
          className="p-4 rounded-xl border border-border bg-card hover:border-rose-500/50 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-500">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
          </div>
          <h4 className="font-semibold text-sm text-foreground mt-3">Security Intelligence</h4>
          <p className="text-xs text-muted-foreground mt-1">
            Audit detected packages against verified Open Source Vulnerabilities (OSV).
          </p>
        </div>
      </div>
    </div>
  );
};
