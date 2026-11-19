import React, { useMemo } from 'react';
import {
  Layers,
  ArrowUpCircle,
  CheckCircle2,
  ShieldAlert,
  Laptop,
  Clock,
  ArrowRight,
  RefreshCw,
  Activity,
  Bell,
  Server,
  Download,
  KeyRound,
  Plus,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/Card';
import { Button } from './ui/Button';
import { StatusBadge } from './StatusBadge';
import { EmptyState } from './ui/EmptyState';
import { TabId } from './Sidebar';

interface OverviewViewProps {
  metrics: any;
  allAppsRaw: any[];
  notifications: any[];
  securityFindings: any[];
  onNavigate: (tab: TabId) => void;
  onTriggerScan: () => void;
  isScanning: boolean;
  onOpenPairModal?: () => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  metrics,
  allAppsRaw,
  notifications,
  securityFindings,
  onNavigate,
  onTriggerScan,
  isScanning,
  onOpenPairModal,
}) => {
  const totalApps = metrics?.totalApplications ?? 0;
  const updatesAvailable = metrics?.updatesAvailable ?? 0;
  const upToDate = metrics?.upToDate ?? 0;
  const unmatched = metrics?.unmatched ?? 0;
  const unsupported = metrics?.unsupported ?? 0;
  const securityCount = metrics?.securityAdvisoriesCount ?? securityFindings.length;
  const device = metrics?.activeDevice;

  // Real critical advisories count
  const criticalUpdatesCount = useMemo(() => {
    return securityFindings.filter(
      (f) => f.severity === 'CRITICAL' || f.severity === 'HIGH'
    ).length;
  }, [securityFindings]);

  // A. Real Donut Chart Distribution
  const statusChartData = useMemo(() => {
    return [
      { name: 'Up-to-Date', value: upToDate, color: '#22C55E' },
      { name: 'Update Available', value: updatesAvailable, color: '#F5B942' },
      { name: 'Registry / Unmatched', value: unmatched, color: '#60A5FA' },
      { name: 'Unsupported', value: unsupported, color: '#EF5350' },
    ].filter((d) => d.value > 0);
  }, [upToDate, updatesAvailable, unmatched, unsupported]);

  // B. Real Horizontal Publisher Bar Chart computed from real SQLite inventory
  const publisherChartData = useMemo(() => {
    if (!allAppsRaw || allAppsRaw.length === 0) return [];
    const counts = new Map<string, number>();
    for (const app of allAppsRaw) {
      const pub = (app.publisher || 'Unknown Publisher').trim() || 'Unknown Publisher';
      // Keep clean short label for axis readability
      const shortPub = pub.length > 22 ? `${pub.slice(0, 20)}…` : pub;
      counts.set(shortPub, (counts.get(shortPub) || 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 7);
  }, [allAppsRaw]);

  // C. Real Recent Activity Timeline (combining recentUpdates and recentScans)
  const recentActivity = useMemo(() => {
    const items: Array<{
      id: string;
      kind: 'UPDATE' | 'SCAN';
      title: string;
      subtitle: string;
      status: string;
      timestamp: string;
    }> = [];

    for (const upd of metrics?.recentUpdates || []) {
      items.push({
        id: `upd-${upd.id}`,
        kind: 'UPDATE',
        title: `${upd.applicationName}`,
        subtitle: `${upd.installedVersion} → ${upd.targetVersion}`,
        status: upd.status,
        timestamp: upd.completedAt || upd.startedAt,
      });
    }

    for (const scan of metrics?.recentScans || []) {
      items.push({
        id: `scan-${scan.id}`,
        kind: 'SCAN',
        title: `System Scan (${scan.device?.name || 'Local Host'})`,
        subtitle: `${scan.totalFound} packages • ${scan.updatesFound} updates found`,
        status: scan.status,
        timestamp: scan.completedAt || scan.startedAt,
      });
    }

    return items
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 6);
  }, [metrics]);

  // E. Real Update Alerts (combining high-severity findings & unread alerts)
  const alertItems = useMemo(() => {
    const alerts: Array<{
      id: string;
      severity: 'CRITICAL' | 'WARNING' | 'INFO';
      title: string;
      message: string;
      targetTab: TabId;
    }> = [];

    for (const finding of securityFindings.slice(0, 3)) {
      alerts.push({
        id: `sec-${finding.id}`,
        severity: finding.severity === 'CRITICAL' || finding.severity === 'HIGH' ? 'CRITICAL' : 'WARNING',
        title: `${finding.advisoryId} • ${finding.applicationName}`,
        message: finding.title,
        targetTab: 'security',
      });
    }

    for (const notif of notifications.filter((n) => !n.isRead).slice(0, 4)) {
      alerts.push({
        id: `notif-${notif.id}`,
        severity: notif.type === 'SECURITY' ? 'CRITICAL' : notif.type === 'UPDATE' ? 'WARNING' : 'INFO',
        title: notif.title,
        message: notif.message,
        targetTab: notif.type === 'UPDATE' ? 'updates' : notif.type === 'SECURITY' ? 'security' : 'notifications',
      });
    }

    return alerts.slice(0, 5);
  }, [securityFindings, notifications]);

  return (
    <div className="space-y-6">
      {/* Contextual Alert Strip when Updates are Pending */}
      {updatesAvailable > 0 && (
        <div className="p-4 rounded-xl border border-[#F5B942]/30 bg-[#F5B942]/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 rounded-lg bg-[#F5B942]/20 text-[#B45309] dark:text-[#F5B942] shrink-0">
              <ArrowUpCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                {updatesAvailable} software {updatesAvailable === 1 ? 'update is' : 'updates are'} available for review
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                All packages are verified against trusted WinGet sources and require your explicit confirmation before installation.
              </p>
            </div>
          </div>
          <Button
            variant="primary"
            onClick={() => onNavigate('updates')}
            rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            className="shrink-0"
          >
            Review Available Updates
          </Button>
        </div>
      )}

      {/* Onboarding Banner: When No Device Paired or No Inventory */}
      {(!device || totalApps === 0) && (
        <div className="rounded-2xl border border-[#009F91]/30 dark:border-[#19C6B4]/30 bg-gradient-to-r from-[#009F91]/10 via-card to-card p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#009F91]/20 dark:bg-[#19C6B4]/20 border border-[#009F91]/40 dark:border-[#19C6B4]/40 text-[#009F91] dark:text-[#19C6B4] flex items-center justify-center shrink-0">
              <Laptop className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">
                Connect Your Windows Workstation
              </h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-xl">
                Install the lightweight UpdatePilot Local Agent on your PC to automatically scan installed software and manage verified updates.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto">
            <a
              href="/downloads/UpdatePilot-Agent-Setup-1.0.0.exe"
              download
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-card border border-border hover:bg-secondary text-foreground font-medium text-xs transition-colors shadow-sm"
            >
              <Download className="w-4 h-4 text-[#009F91] dark:text-[#19C6B4]" />
              <span>Download Agent (.exe)</span>
            </a>
            {onOpenPairModal && (
              <button
                type="button"
                onClick={onOpenPairModal}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#009F91] hover:bg-[#008A7E] dark:bg-[#19C6B4] dark:hover:bg-[#15A898] text-[#0B111C] font-semibold text-xs transition-colors shadow-sm"
              >
                <KeyRound className="w-4 h-4" />
                <span>Pair Computer</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* KPI Cards Grid (Real Backend Metrics Only) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Total Installed Applications</span>
            <div className="p-2 rounded-lg bg-secondary text-[#009F91] dark:text-[#19C6B4]">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-3xl font-bold tracking-tight text-foreground tabular-nums">{totalApps}</p>
            <p className="text-xs text-muted-foreground mt-1">Discovered on local Windows host</p>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Available Updates</span>
            <div className="p-2 rounded-lg bg-[#F5B942]/15 text-[#B45309] dark:text-[#F5B942]">
              <ArrowUpCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-3xl font-bold tracking-tight text-[#B45309] dark:text-[#F5B942] tabular-nums">
              {updatesAvailable}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Packages with verified upgrades</p>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Up-to-Date Applications</span>
            <div className="p-2 rounded-lg bg-[#22C55E]/15 text-[#15803D] dark:text-[#22C55E]">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-3xl font-bold tracking-tight text-[#15803D] dark:text-[#22C55E] tabular-nums">
              {upToDate}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Running latest verified release</p>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Critical / Advisory Alerts</span>
            <div className="p-2 rounded-lg bg-[#EF5350]/15 text-[#B91C1C] dark:text-[#EF5350]">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-3xl font-bold tracking-tight text-[#B91C1C] dark:text-[#EF5350] tabular-nums">
              {criticalUpdatesCount > 0 ? criticalUpdatesCount : securityCount}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {securityCount === 0 ? 'No verified CVEs detected' : `${securityCount} total OSV advisories`}
            </p>
          </div>
        </Card>
      </div>

      {/* Section A & B: Software Update Overview Donut & Publisher Horizontal Bar Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* A. Software Update Overview */}
        <Card className="lg:col-span-5 flex flex-col">
          <CardHeader>
            <div>
              <CardTitle>Software Update Overview</CardTitle>
              <CardDescription>Real-time package status distribution</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onNavigate('analytics')}>
              Analytics
            </Button>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-between">
            {statusChartData.length === 0 ? (
              <EmptyState
                icon={<Layers className="w-5 h-5" />}
                title="No Inventory Scanned Yet"
                description="Trigger a system scan to inspect installed Windows software packages."
              />
            ) : (
              <>
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={58}
                        outerRadius={82}
                        paddingAngle={3}
                        dataKey="value"
                        stroke="none"
                      >
                        {statusChartData.map((entry, idx) => (
                          <Cell key={`cell-${idx}`} fill={entry.color} />
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

                <div className="grid grid-cols-2 gap-2.5 pt-3 border-t border-border">
                  {statusChartData.map((d) => (
                    <div key={d.name} className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-secondary/40 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                        <span className="text-muted-foreground truncate">{d.name}</span>
                      </div>
                      <span className="font-semibold text-foreground tabular-nums ml-2">{d.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* B. Software Publisher Analytics (Horizontal Bar Chart) */}
        <Card className="lg:col-span-7 flex flex-col">
          <CardHeader>
            <div>
              <CardTitle>Software Publisher Analytics</CardTitle>
              <CardDescription>Installed applications grouped by verified publisher</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onNavigate('applications')}>
              View Inventory
            </Button>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-between">
            {publisherChartData.length === 0 ? (
              <EmptyState
                icon={<Layers className="w-5 h-5" />}
                title="No Publisher Metrics Available"
                description="Publisher analytics populate automatically after software discovery completes."
              />
            ) : (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={publisherChartData}
                    layout="vertical"
                    margin={{ top: 5, right: 24, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={130}
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={11}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        borderColor: 'hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px',
                        color: 'hsl(var(--foreground))',
                      }}
                    />
                    <Bar dataKey="count" name="Installed Apps" fill="#19C6B4" radius={[0, 4, 4, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sections C, D, E: Recent Activity, System Information, Update Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* C. Recent Update Activity */}
        <Card className="lg:col-span-5 flex flex-col">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#009F91] dark:text-[#19C6B4]" />
              <div>
                <CardTitle>Recent Update Activity</CardTitle>
                <CardDescription>Latest discovery scans and update operations</CardDescription>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onNavigate('history')}>
              History
            </Button>
          </CardHeader>
          <CardContent className="flex-1">
            {recentActivity.length === 0 ? (
              <EmptyState
                icon={<Clock className="w-5 h-5" />}
                title="No Recent Activity"
                description="Discovery scans and confirmed updates will be logged here."
              />
            ) : (
              <div className="space-y-3">
                {recentActivity.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start justify-between gap-3 p-3 rounded-lg border border-border/70 bg-secondary/30"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">{item.title}</p>
                      <p className="text-[11px] text-muted-foreground font-mono mt-0.5 truncate">{item.subtitle}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {new Date(item.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <StatusBadge status={item.status} size="sm" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* D. System Information */}
        <Card className="lg:col-span-3 flex flex-col">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-[#009F91] dark:text-[#19C6B4]" />
              <div>
                <CardTitle>System Information</CardTitle>
                <CardDescription>Managed Windows node</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-between space-y-4">
            <div className="divide-y divide-border text-xs">
              <div className="py-2.5 flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Device Name</span>
                <span className="font-medium text-foreground font-mono truncate">{device?.name || 'Local Host'}</span>
              </div>
              <div className="py-2.5 flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Windows Version</span>
                <span className="font-medium text-foreground text-right">{device?.osVersion || 'Windows 10/11'}</span>
              </div>
              <div className="py-2.5 flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Architecture</span>
                <span className="font-mono font-medium text-foreground">{device?.architecture || 'x64'}</span>
              </div>
              <div className="py-2.5 flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Agent Connection</span>
                <StatusBadge status={metrics?.agentConnected ? 'ONLINE' : 'OFFLINE'} size="sm" />
              </div>
              <div className="py-2.5 flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Agent Version</span>
                <span className="font-mono text-foreground">v{device?.agentVersion || '1.0.0'}</span>
              </div>
              <div className="py-2.5 flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Last Synchronization</span>
                <span className="text-foreground text-right">
                  {metrics?.lastScanTimestamp
                    ? new Date(metrics.lastScanTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : 'Pending'}
                </span>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={onTriggerScan}
              isLoading={isScanning}
              disabled={!metrics?.agentConnected}
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              Synchronize Inventory
            </Button>
          </CardContent>
        </Card>

        {/* E. Update & Security Alerts */}
        <Card className="lg:col-span-4 flex flex-col">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#F5B942]" />
              <div>
                <CardTitle>Update Alerts</CardTitle>
                <CardDescription>Priority advisories & unread notices</CardDescription>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onNavigate('notifications')}>
              All Alerts
            </Button>
          </CardHeader>
          <CardContent className="flex-1">
            {alertItems.length === 0 ? (
              <EmptyState
                icon={<CheckCircle2 className="w-5 h-5" />}
                title="No Active Alerts"
                description="All systems are healthy with no unread update alerts or security warnings."
              />
            ) : (
              <div className="space-y-2.5">
                {alertItems.map((alert) => {
                  const borderTone =
                    alert.severity === 'CRITICAL'
                      ? 'border-[#EF5350]/35 bg-[#EF5350]/5'
                      : alert.severity === 'WARNING'
                      ? 'border-[#F5B942]/35 bg-[#F5B942]/5'
                      : 'border-[#60A5FA]/35 bg-[#60A5FA]/5';
                  return (
                    <button
                      key={alert.id}
                      onClick={() => onNavigate(alert.targetTab)}
                      className={`w-full text-left p-3 rounded-lg border ${borderTone} hover:opacity-90 transition-opacity`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-foreground truncate">{alert.title}</span>
                        <span
                          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                            alert.severity === 'CRITICAL'
                              ? 'bg-[#EF5350]/15 text-[#B91C1C] dark:text-[#EF5350]'
                              : alert.severity === 'WARNING'
                              ? 'bg-[#F5B942]/15 text-[#B45309] dark:text-[#F5B942]'
                              : 'bg-[#60A5FA]/15 text-[#1D4ED8] dark:text-[#60A5FA]'
                          }`}
                        >
                          {alert.severity}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{alert.message}</p>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
