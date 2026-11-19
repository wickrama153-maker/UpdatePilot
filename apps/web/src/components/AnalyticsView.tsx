'use client';

import React, { useMemo } from 'react';
import { api } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import { Button } from './ui/Button';
import { EmptyState } from './ui/EmptyState';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  AreaChart,
  Area,
} from 'recharts';
import { Download, FileJson, BarChart3, ShieldCheck, CheckCircle2, Package } from 'lucide-react';

interface AnalyticsViewProps {
  metrics: any;
  allAppsRaw: any[];
  securityFindings: any[];
  historyUpdates?: any[];
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  metrics,
  allAppsRaw,
  securityFindings,
  historyUpdates = [],
}) => {
  const statusData = useMemo(() => {
    const upToDate = metrics?.upToDate || 0;
    const updatesAvailable = metrics?.updatesAvailable || 0;
    const unmatched = (metrics?.unmatched || 0) + (metrics?.unsupported || 0);
    return [
      { name: 'Up to Date', value: upToDate, color: '#22C55E' },
      { name: 'Update Available', value: updatesAvailable, color: '#F5B942' },
      { name: 'Registry / Unmatched', value: unmatched, color: '#64748B' },
    ].filter((d) => d.value > 0);
  }, [metrics]);

  const publisherData = useMemo(() => {
    const map = new Map<string, { publisher: string; total: number; updates: number }>();
    for (const app of allAppsRaw) {
      const pub = (app.publisher || 'Unknown Publisher').trim();
      const short = pub.length > 22 ? `${pub.slice(0, 20)}..` : pub;
      const entry = map.get(short) || { publisher: short, total: 0, updates: 0 };
      entry.total += 1;
      if (app.updateStatus === 'UPDATE_AVAILABLE') entry.updates += 1;
      map.set(short, entry);
    }
    return Array.from(map.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [allAppsRaw]);

  const sourceData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const app of allAppsRaw) {
      const src = app.source || 'REGISTRY';
      counts[src] = (counts[src] || 0) + 1;
    }
    const palette: Record<string, string> = {
      WINGET: '#19C6B4',
      REGISTRY: '#60A5FA',
      BOTH: '#22C55E',
      STORE: '#F5B942',
    };
    return Object.entries(counts).map(([name, value]) => ({
      name,
      value,
      color: palette[name] || '#9AAABD',
    }));
  }, [allAppsRaw]);

  const updateTrendData = useMemo(() => {
    const sourceJobs = historyUpdates.length > 0 ? historyUpdates : metrics?.recentUpdates || [];
    if (!sourceJobs || sourceJobs.length === 0) return [];
    const byDate = new Map<string, { date: string; succeeded: number; failed: number }>();
    for (const job of [...sourceJobs].reverse()) {
      const ts = job.startedAt || job.completedAt || job.createdAt;
      if (!ts) continue;
      const d = new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      const curr = byDate.get(d) || { date: d, succeeded: 0, failed: 0 };
      if (job.status === 'COMPLETED' || job.status === 'REBOOT_REQUIRED') curr.succeeded += 1;
      else if (job.status === 'FAILED') curr.failed += 1;
      byDate.set(d, curr);
    }
    return Array.from(byDate.values());
  }, [historyUpdates, metrics]);

  const compliancePct = useMemo(() => {
    const manageable = (metrics?.upToDate || 0) + (metrics?.updatesAvailable || 0);
    if (manageable === 0) return 0;
    return Math.round(((metrics?.upToDate || 0) / manageable) * 100);
  }, [metrics]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header + Export Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">Inventory Analytics & Compliance Reports</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time statistical breakdown across {metrics?.totalApplications ?? allAppsRaw.length} discovered Windows packages.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <a href={api.exportInventoryCsvUrl()} download="updatepilot-inventory.csv">
            <Button variant="outline" size="sm" leftIcon={<Download className="w-3.5 h-3.5" />}>
              Export CSV Report
            </Button>
          </a>
          <a href={api.exportInventoryJsonUrl()} download="updatepilot-inventory.json">
            <Button variant="primary" size="sm" leftIcon={<FileJson className="w-3.5 h-3.5" />}>
              Export JSON Snapshot
            </Button>
          </a>
        </div>
      </div>

      {/* Top Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-medium text-muted-foreground">Patch Compliance (WinGet Tracked)</span>
              <div className="text-2xl font-bold text-foreground mt-1 tabular-nums">{compliancePct}%</div>
              <span className="text-[11px] text-muted-foreground">
                {metrics?.upToDate || 0} of {(metrics?.upToDate || 0) + (metrics?.updatesAvailable || 0)} current
              </span>
            </div>
            <div className="w-10 h-10 rounded-lg bg-[#22C55E]/10 text-[#15803D] dark:text-[#22C55E] flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-medium text-muted-foreground">Tracked Publishers</span>
              <div className="text-2xl font-bold text-foreground mt-1 tabular-nums">
                {new Set(allAppsRaw.map((a) => a.publisher).filter(Boolean)).size}
              </div>
              <span className="text-[11px] text-muted-foreground">Unique software vendors indexed</span>
            </div>
            <div className="w-10 h-10 rounded-lg bg-[#009F91]/10 dark:bg-[#19C6B4]/10 text-[#009F91] dark:text-[#19C6B4] flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-medium text-muted-foreground">Open OSV Advisories</span>
              <div className="text-2xl font-bold text-foreground mt-1 tabular-nums">
                {securityFindings.length}
              </div>
              <span className="text-[11px] text-muted-foreground">
                {securityFindings.filter((f) => f.severity === 'CRITICAL' || f.severity === 'HIGH').length} critical or high severity
              </span>
            </div>
            <div className="w-10 h-10 rounded-lg bg-[#F5B942]/15 text-[#B45309] dark:text-[#F5B942] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top Software Publishers (Installed vs. Pending Updates)</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {publisherData.length === 0 ? (
              <EmptyState
                icon={<BarChart3 className="w-5 h-5" />}
                title="No publisher inventory yet"
                description="Run a software discovery scan to populate vendor distribution metrics."
              />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={publisherData} layout="vertical" margin={{ top: 4, right: 16, left: 10, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.15)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#9AAABD' }} />
                  <YAxis dataKey="publisher" type="category" width={120} tick={{ fontSize: 11, fill: '#9AAABD' }} />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: '#182334',
                      borderColor: '#2D3B4D',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: '#F1F5F9',
                    }}
                  />
                  <Bar dataKey="total" name="Installed Packages" fill="#19C6B4" radius={[0, 4, 4, 0]} barSize={12} />
                  <Bar dataKey="updates" name="Updates Pending" fill="#F5B942" radius={[0, 4, 4, 0]} barSize={12} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Patch & Discovery Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="h-72 flex flex-col sm:flex-row items-center gap-4">
            {statusData.length === 0 ? (
              <div className="w-full">
                <EmptyState
                  icon={<BarChart3 className="w-5 h-5" />}
                  title="No status breakdown available"
                  description="Trigger a scan to measure version currency."
                />
              </div>
            ) : (
              <>
                <div className="w-full sm:w-1/2 h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={52}
                        outerRadius={78}
                        paddingAngle={3}
                      >
                        {statusData.map((entry, idx) => (
                          <Cell key={idx} fill={entry.color} stroke="transparent" />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: '#182334',
                          borderColor: '#2D3B4D',
                          borderRadius: '8px',
                          fontSize: '12px',
                          color: '#F1F5F9',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-full sm:w-1/2 space-y-2.5">
                  {statusData.map((item) => (
                    <div key={item.name} className="flex items-center justify-between text-xs p-2 rounded-lg bg-secondary/40 border border-border">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="text-foreground font-medium">{item.name}</span>
                      </div>
                      <span className="font-mono font-semibold text-foreground">{item.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2: Discovery Sources & Update Execution History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Discovery Source Attribution (WinGet vs. Registry)</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {sourceData.length === 0 ? (
              <EmptyState
                icon={<Package className="w-5 h-5" />}
                title="No package source data"
                description="Discovery source metrics will appear once an agent scan finishes."
              />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sourceData} margin={{ top: 10, right: 20, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.15)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9AAABD' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#9AAABD' }} />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: '#182334',
                      borderColor: '#2D3B4D',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: '#F1F5F9',
                    }}
                  />
                  <Bar dataKey="value" name="Applications" radius={[6, 6, 0, 0]} barSize={42}>
                    {sourceData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Update Execution Trend Over Time</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {updateTrendData.length === 0 ? (
              <EmptyState
                icon={<BarChart3 className="w-5 h-5" />}
                title="No update execution history yet"
                description="Execute updates from the Available Updates screen to track upgrade success and failure trends over time."
              />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={updateTrendData} margin={{ top: 10, right: 20, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.15)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9AAABD' }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#9AAABD' }} />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: '#182334',
                      borderColor: '#2D3B4D',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: '#F1F5F9',
                    }}
                  />
                  <Area type="monotone" dataKey="succeeded" name="Succeeded" stroke="#22C55E" fill="#22C55E" fillOpacity={0.18} />
                  <Area type="monotone" dataKey="failed" name="Failed" stroke="#EF5350" fill="#EF5350" fillOpacity={0.18} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
