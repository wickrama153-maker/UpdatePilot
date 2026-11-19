'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { StatusBadge } from './StatusBadge';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import { Button } from './ui/Button';
import {
  Palette,
  Sliders,
  Bell,
  Cpu,
  Monitor,
  Info,
  KeyRound,
  Copy,
  Check,
  Trash2,
  Sun,
  Moon,
  RefreshCw,
  Download,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Terminal,
  Laptop,
  Radio,
  AlertTriangle,
} from 'lucide-react';

interface SettingsViewProps {
  currentTheme: string;
  onThemeChange: (theme: string) => void;
  onRefreshMetrics: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentTheme,
  onThemeChange,
  onRefreshMetrics,
}) => {
  const [activeTab, setActiveTab] = useState<'agent' | 'preferences' | 'appearance' | 'diagnostics'>('agent');
  const [devices, setDevices] = useState<any[]>([]);
  const [settings, setSettings] = useState({
    scanIntervalHours: 12,
    autoCheckUpdates: true,
    notifyOnUpdate: true,
    telemetryEnabled: false,
    retentionDays: 90,
  });
  const [pairingToken, setPairingToken] = useState<{ token: string; expiresAt: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [generatingToken, setGeneratingToken] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [sysInfo, setSysInfo] = useState<any | null>(null);
  const [appVersion, setAppVersion] = useState<string>('1.0.0');
  const [installerInfo, setInstallerInfo] = useState<{
    version: string;
    filename: string;
    targetOs: string;
    architecture: string;
    sizeFormatted: string;
    releaseDate: string;
    available: boolean;
  }>({
    version: '1.0.0',
    filename: 'UpdatePilot-Agent-Setup-1.0.0.exe',
    targetOs: 'Windows 10 / Windows 11 (x64)',
    architecture: 'x64',
    sizeFormatted: '22.06 MB',
    releaseDate: '2026-11-18',
    available: true,
  });
  const [downloading, setDownloading] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [devData, setData, instData] = await Promise.allSettled([
        api.getDevices(),
        api.getSettings(),
        api.getAgentInstallerInfo(),
      ]);

      if (devData.status === 'fulfilled') {
        setDevices(devData.value || []);
      }
      if (setData.status === 'fulfilled' && setData.value) {
        setSettings({
          scanIntervalHours: setData.value.scanIntervalHours ?? 12,
          autoCheckUpdates: setData.value.autoCheckUpdates ?? true,
          notifyOnUpdate: setData.value.notifyOnUpdate ?? true,
          telemetryEnabled: setData.value.telemetryEnabled ?? false,
          retentionDays: setData.value.retentionDays ?? 90,
        });
      }
      if (instData.status === 'fulfilled' && instData.value?.data) {
        setInstallerInfo(instData.value.data);
      }
    } catch (err) {
      console.error('Failed to load settings data:', err);
    }
  };

  useEffect(() => {
    loadData();
    const apiElectron = (window as any)?.electronAPI;
    if (apiElectron?.isDesktop) {
      apiElectron.getSystemInfo?.().then((info: any) => setSysInfo(info)).catch(() => {});
      apiElectron.getVersion?.().then((v: string) => v && setAppVersion(v)).catch(() => {});
    }
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveNotice(null);
    try {
      await api.updateSettings({
        ...settings,
        theme: currentTheme,
      });
      setSaveNotice('Preferences successfully persisted to UpdatePilot configuration.');
      setTimeout(() => setSaveNotice(null), 4000);
    } catch (err: any) {
      setSaveNotice(err.message || 'Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateToken = async () => {
    setGeneratingToken(true);
    try {
      const res = await api.generatePairingToken();
      const expiresAt = new Date(Date.now() + (res.expiresInSeconds ?? 600) * 1000).toISOString();
      setPairingToken({ token: res.pairingToken, expiresAt });
      setCopied(false);
    } catch (err: any) {
      console.error('Failed to generate pairing token:', err);
      alert(err.message || 'Failed to generate pairing token. Please try again.');
    } finally {
      setGeneratingToken(false);
    }
  };

  const handleCopyToken = () => {
    if (!pairingToken) return;
    navigator.clipboard?.writeText(pairingToken.token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRevokeDevice = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to revoke "${name}"? The agent will immediately lose access and stop reporting updates.`)) {
      return;
    }
    setRevokingId(id);
    try {
      await api.revokeDevice(id);
      await loadData();
      onRefreshMetrics();
    } catch (err: any) {
      console.error('Failed to revoke device:', err);
      alert(err.message || 'Failed to revoke device');
    } finally {
      setRevokingId(null);
    }
  };

  const handleDownloadInstaller = () => {
    setDownloading(true);
    try {
      // Direct binary download link served by Express backend / Next.js static downloads
      const link = document.createElement('a');
      link.href = '/api/v1/devices/installer/download';
      link.setAttribute('download', installerInfo.filename || 'UpdatePilot-Agent-Setup-1.0.0.exe');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => setDownloading(false), 2000);
    } catch (err) {
      console.error('Download initiation failed:', err);
      setDownloading(false);
    }
  };

  const onlineDevicesCount = devices.filter((d) => d.status === 'ONLINE').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200 max-w-5xl">
      {/* Page Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-foreground">Settings & Windows Agent Management</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Manage Windows Local Agents, secure device pairing, automated update policies, and platform appearance.
        </p>
      </div>

      {saveNotice && (
        <div className="rounded-xl border border-[#22C55E]/30 bg-[#22C55E]/10 px-4 py-3 text-xs text-[#15803D] dark:text-[#22C55E] flex items-center justify-between">
          <span>{saveNotice}</span>
          <button onClick={() => setSaveNotice(null)} className="text-muted-foreground hover:text-foreground">
            Dismiss
          </button>
        </div>
      )}

      {/* Settings Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-3 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('agent')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'agent'
              ? 'bg-[#009F91] text-[#0B111C] dark:bg-[#19C6B4] shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
          }`}
        >
          <Cpu className="w-4 h-4" />
          <span>Windows Agent Management</span>
          {onlineDevicesCount > 0 && (
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === 'agent' ? 'bg-[#0B111C]/20 text-[#0B111C]' : 'bg-[#22C55E]/15 text-[#22C55E]'}`}>
              {onlineDevicesCount} online
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('preferences')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'preferences'
              ? 'bg-[#009F91] text-[#0B111C] dark:bg-[#19C6B4] shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Scan & Policies</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('appearance')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'appearance'
              ? 'bg-[#009F91] text-[#0B111C] dark:bg-[#19C6B4] shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
          }`}
        >
          <Palette className="w-4 h-4" />
          <span>Appearance & Themes</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('diagnostics')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'diagnostics'
              ? 'bg-[#009F91] text-[#0B111C] dark:bg-[#19C6B4] shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
          }`}
        >
          <Monitor className="w-4 h-4" />
          <span>System Diagnostics</span>
        </button>
      </div>

      {/* ==================================================================== */}
      {/* TAB 1: WINDOWS AGENT MANAGEMENT                                      */}
      {/* ==================================================================== */}
      {activeTab === 'agent' && (
        <div className="space-y-6">
          {/* 1. Official Installer Download Card */}
          <Card className="border-[#009F91]/30 dark:border-[#19C6B4]/30 overflow-hidden">
            <div className="bg-gradient-to-r from-[#009F91]/10 via-transparent to-transparent dark:from-[#19C6B4]/10 p-5 border-b border-border">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-[#009F91]/15 dark:bg-[#19C6B4]/15 border border-[#009F91]/30 dark:border-[#19C6B4]/30 text-[#009F91] dark:text-[#19C6B4] flex items-center justify-center shrink-0">
                    <Laptop className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h3 className="text-sm font-bold text-foreground">UpdatePilot Windows Local Agent</h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30">
                        v{installerInfo.version} Official Release
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Lightweight Windows service powered by Microsoft WinGet. Discovers installed software, executes verified upgrades, and reports real-time health metrics.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <Button
                    variant="primary"
                    size="md"
                    onClick={handleDownloadInstaller}
                    isLoading={downloading}
                    leftIcon={<Download className="w-4 h-4" />}
                  >
                    <span>Download Windows Agent (.exe)</span>
                  </Button>
                </div>
              </div>
            </div>

            <CardContent className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-secondary/15 text-xs">
              <div className="p-2.5 rounded-lg border border-border bg-card/60">
                <span className="text-[11px] text-muted-foreground block">Operating System</span>
                <span className="font-semibold text-foreground">{installerInfo.targetOs}</span>
              </div>
              <div className="p-2.5 rounded-lg border border-border bg-card/60">
                <span className="text-[11px] text-muted-foreground block">Architecture</span>
                <span className="font-semibold text-foreground">x64 (64-bit Intel/AMD)</span>
              </div>
              <div className="p-2.5 rounded-lg border border-border bg-card/60">
                <span className="text-[11px] text-muted-foreground block">Package Size</span>
                <span className="font-semibold text-foreground">{installerInfo.sizeFormatted}</span>
              </div>
              <div className="p-2.5 rounded-lg border border-border bg-card/60">
                <span className="text-[11px] text-muted-foreground block">Update Engine</span>
                <span className="font-semibold text-foreground">Microsoft WinGet CLI</span>
              </div>
            </CardContent>
          </Card>

          {/* 2. Step-by-Step Installation Instructions */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-[#009F91] dark:text-[#19C6B4]" />
                <CardTitle>Quick Step-by-Step Installation & Pairing Guide</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-3.5 rounded-xl border border-border bg-secondary/20 relative">
                  <div className="flex items-center gap-2 font-bold text-xs text-foreground mb-1.5">
                    <span className="w-5 h-5 rounded-full bg-[#009F91] dark:bg-[#19C6B4] text-[#0B111C] flex items-center justify-center text-[11px]">1</span>
                    <span>Download & Install</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Download <code className="text-foreground font-mono">UpdatePilot-Agent-Setup-1.0.0.exe</code> above and run it on your Windows 10/11 workstation.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-border bg-secondary/20 relative">
                  <div className="flex items-center gap-2 font-bold text-xs text-foreground mb-1.5">
                    <span className="w-5 h-5 rounded-full bg-[#009F91] dark:bg-[#19C6B4] text-[#0B111C] flex items-center justify-center text-[11px]">2</span>
                    <span>Generate Pairing Code</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Click &ldquo;Generate Pairing Code&rdquo; below to receive a secure, 10-minute temporary pairing key linked to your account.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-border bg-secondary/20 relative">
                  <div className="flex items-center gap-2 font-bold text-xs text-foreground mb-1.5">
                    <span className="w-5 h-5 rounded-full bg-[#009F91] dark:bg-[#19C6B4] text-[#0B111C] flex items-center justify-center text-[11px]">3</span>
                    <span>Authorize & Manage</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Enter the code into the Agent prompt. The agent pairs securely and streams live inventory and updates into your dashboard.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 3. Secure Pairing Code Generator */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-[#009F91] dark:text-[#19C6B4]" />
                <CardTitle>Secure Device Pairing</CardTitle>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={handleGenerateToken}
                isLoading={generatingToken}
                leftIcon={<KeyRound className="w-3.5 h-3.5" />}
              >
                Generate 10-Minute Pairing Code
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {pairingToken ? (
                <div className="p-4 rounded-xl border border-[#009F91]/40 dark:border-[#19C6B4]/40 bg-[#009F91]/5 dark:bg-[#19C6B4]/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[#009F91] dark:text-[#19C6B4]" />
                      <span className="text-xs font-semibold text-[#009F91] dark:text-[#19C6B4]">
                        Temporary Pairing Code (Single-Use • Expires {new Date(pairingToken.expiresAt).toLocaleTimeString()})
                      </span>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleCopyToken}
                      leftIcon={copied ? <Check className="w-3.5 h-3.5 text-[#22C55E]" /> : <Copy className="w-3.5 h-3.5" />}
                    >
                      {copied ? 'Copied' : 'Copy Code'}
                    </Button>
                  </div>
                  <div className="flex items-center gap-3">
                    <code className="text-lg font-mono font-bold px-4 py-2 rounded-lg bg-background border border-border text-foreground tracking-widest select-all">
                      {pairingToken.token}
                    </code>
                    <span className="text-[11px] text-muted-foreground">
                      Run <code className="bg-secondary px-1.5 py-0.5 rounded text-foreground font-mono">updatepilot-agent --pair {pairingToken.token}</code> on target machine.
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    This temporary code is valid for exactly 10 minutes. Once consumed by an agent, a permanent hardware-keyed token is generated, hashed with SHA-256 on the backend, and never shown in plain text again.
                  </p>
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-border bg-secondary/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="font-semibold text-foreground">Ready to connect a new computer?</div>
                    <p className="text-muted-foreground text-[11px] mt-0.5">
                      Generate a time-limited one-time authorization code to safely bind an agent to your account.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateToken}
                    isLoading={generatingToken}
                    leftIcon={<KeyRound className="w-3.5 h-3.5" />}
                  >
                    Generate Code
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 4. Connected Devices Management Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-[#009F91] dark:text-[#19C6B4]" />
                <CardTitle>Registered Windows Computers & Heartbeats ({devices.length})</CardTitle>
              </div>
              <Button variant="outline" size="sm" onClick={loadData} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
                Refresh Status
              </Button>
            </CardHeader>
            <CardContent>
              {devices.length === 0 ? (
                <div className="py-8 text-center space-y-2">
                  <Laptop className="w-8 h-8 mx-auto text-muted-foreground/50" />
                  <p className="text-xs font-semibold text-foreground">No Windows Computers Paired Yet</p>
                  <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
                    Download the agent above and generate a pairing code to connect your first Windows machine.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border border border-border rounded-xl overflow-hidden text-xs">
                  {devices.map((d) => (
                    <div
                      key={d.id}
                      className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-secondary/15 hover:bg-secondary/30 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center shrink-0 mt-0.5">
                          <Laptop className="w-4 h-4 text-[#009F91] dark:text-[#19C6B4]" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground text-xs">{d.name}</span>
                            <StatusBadge status={d.status} size="sm" />
                          </div>
                          <div className="text-[11px] text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                            <span>OS: {d.osName || 'Windows'} {d.osVersion || ''} ({d.architecture || 'x64'})</span>
                            <span>•</span>
                            <span>Agent: v{d.agentVersion || '1.0.0'}</span>
                            <span>•</span>
                            <span>
                              Last Heartbeat:{' '}
                              {d.lastSeenAt ? new Date(d.lastSeenAt).toLocaleTimeString() : 'Never'}
                            </span>
                            <span>•</span>
                            <span>
                              Registered: {d.createdAt ? new Date(d.createdAt).toLocaleDateString() : 'N/A'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end md:self-center">
                        <Button
                          variant="danger"
                          size="sm"
                          isLoading={revokingId === d.id}
                          onClick={() => handleRevokeDevice(d.id, d.name)}
                          leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                        >
                          Revoke Device
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 2: SCAN & POLICIES                                               */}
      {/* ==================================================================== */}
      {activeTab === 'preferences' && (
        <form onSubmit={handleSaveSettings} className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#009F91] dark:text-[#19C6B4]" />
                <CardTitle>Automated Scan & Update Cadence</CardTitle>
              </div>
              <Button type="submit" variant="primary" size="sm" isLoading={saving}>
                Save Preferences
              </Button>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">
                    Automated Inventory Scan Cadence
                  </label>
                  <select
                    value={settings.scanIntervalHours}
                    onChange={(e) => setSettings({ ...settings, scanIntervalHours: Number(e.target.value) })}
                    className="w-full h-9 px-3 rounded-lg bg-secondary/70 border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value={1}>Every 1 hour</option>
                    <option value={6}>Every 6 hours</option>
                    <option value={12}>Every 12 hours (Recommended)</option>
                    <option value={24}>Every 24 hours</option>
                    <option value={168}>Weekly</option>
                  </select>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Controls periodic WinGet and Registry reconciliation cycles across paired agents.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-foreground mb-1.5">
                    Audit & History Log Retention (Days)
                  </label>
                  <input
                    type="number"
                    min={7}
                    max={3650}
                    value={settings.retentionDays}
                    onChange={(e) => setSettings({ ...settings, retentionDays: Math.max(7, Number(e.target.value)) })}
                    className="w-full h-9 px-3 rounded-lg bg-secondary/70 border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Minimum 7 days. Older scan records can be pruned automatically.
                  </p>
                </div>
              </div>

              <div className="divide-y divide-border border border-border rounded-xl overflow-hidden">
                <label className="flex items-center justify-between p-3.5 bg-secondary/20 cursor-pointer hover:bg-secondary/35 transition-colors">
                  <div>
                    <div className="text-xs font-semibold text-foreground">Automatic Update Checking</div>
                    <p className="text-[11px] text-muted-foreground">
                      Automatically compare local Registry versions against WinGet manifests during scans.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.autoCheckUpdates}
                    onChange={(e) => setSettings({ ...settings, autoCheckUpdates: e.target.checked })}
                    className="w-4 h-4 accent-[#19C6B4] rounded"
                  />
                </label>

                <label className="flex items-center justify-between p-3.5 bg-secondary/20 cursor-pointer hover:bg-secondary/35 transition-colors">
                  <div className="flex items-start gap-2.5">
                    <Bell className="w-4 h-4 text-[#009F91] dark:text-[#19C6B4] mt-0.5 shrink-0" />
                    <div>
                      <div className="text-xs font-semibold text-foreground">Desktop & Alert Center Notifications</div>
                      <p className="text-[11px] text-muted-foreground">
                        Emit notifications when new upgrades, exit-3010 reboots, or OSV advisories occur.
                      </p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.notifyOnUpdate}
                    onChange={(e) => setSettings({ ...settings, notifyOnUpdate: e.target.checked })}
                    className="w-4 h-4 accent-[#19C6B4] rounded"
                  />
                </label>

                <label className="flex items-center justify-between p-3.5 bg-secondary/20 cursor-pointer hover:bg-secondary/35 transition-colors">
                  <div>
                    <div className="text-xs font-semibold text-foreground">Local Diagnostic Telemetry</div>
                    <p className="text-[11px] text-muted-foreground">
                      Record detailed execution timing inside database for troubleshooting.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.telemetryEnabled}
                    onChange={(e) => setSettings({ ...settings, telemetryEnabled: e.target.checked })}
                    className="w-4 h-4 accent-[#19C6B4] rounded"
                  />
                </label>
              </div>
            </CardContent>
          </Card>
        </form>
      )}

      {/* ==================================================================== */}
      {/* TAB 3: APPEARANCE & THEMES                                           */}
      {/* ==================================================================== */}
      {activeTab === 'appearance' && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <Palette className="w-4 h-4 text-[#009F91] dark:text-[#19C6B4]" />
              <CardTitle>Appearance & Workspace Theme</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => onThemeChange('dark')}
              className={`p-4 rounded-xl border text-left transition-all flex items-start gap-3 ${
                currentTheme === 'dark'
                  ? 'border-[#19C6B4] bg-[#19C6B4]/10 ring-1 ring-[#19C6B4]'
                  : 'border-border bg-secondary/30 hover:bg-secondary/60'
              }`}
            >
              <div className="w-9 h-9 rounded-lg bg-[#101827] border border-[#2D3B4D] text-[#19C6B4] flex items-center justify-center shrink-0">
                <Moon className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-foreground">Midnight Navy (Primary Dark)</div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Low-glare dark workspace (#101827) with crisp electric teal highlights.
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onThemeChange('light')}
              className={`p-4 rounded-xl border text-left transition-all flex items-start gap-3 ${
                currentTheme === 'light'
                  ? 'border-[#009F91] bg-[#009F91]/10 ring-1 ring-[#009F91]'
                  : 'border-border bg-secondary/30 hover:bg-secondary/60'
              }`}
            >
              <div className="w-9 h-9 rounded-lg bg-[#F4F7FA] border border-[#E2E8F0] text-[#009F91] flex items-center justify-center shrink-0">
                <Sun className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-foreground">Clean Daylight (Light)</div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  High-contrast light workspace (#F4F7FA) suited for bright office environments.
                </p>
              </div>
            </button>
          </CardContent>
        </Card>
      )}

      {/* ==================================================================== */}
      {/* TAB 4: SYSTEM & DIAGNOSTICS                                          */}
      {/* ==================================================================== */}
      {activeTab === 'diagnostics' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Monitor className="w-4 h-4 text-[#009F91] dark:text-[#19C6B4]" />
                <CardTitle>System & Runtime Diagnostics</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1.5 border-b border-border">
                <span className="text-muted-foreground">Runtime Environment</span>
                <span className="font-mono text-foreground">{sysInfo ? 'Windows Desktop (Electron)' : 'Web Client'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border">
                <span className="text-muted-foreground">Connected Computers</span>
                <span className="font-mono text-foreground">{devices.length} registered</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border">
                <span className="text-muted-foreground">Active Workstations Online</span>
                <span className="font-mono text-[#22C55E]">{onlineDevicesCount} active</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-muted-foreground">Database Engine</span>
                <span className="font-mono text-foreground">SQLite / PostgreSQL Ready</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-[#009F91] dark:text-[#19C6B4]" />
                <CardTitle>About UpdatePilot</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1.5 border-b border-border">
                <span className="text-muted-foreground">Product Edition</span>
                <span className="font-semibold text-foreground">UpdatePilot Cloud & Desktop Platform</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border">
                <span className="text-muted-foreground">Platform Version</span>
                <span className="font-mono text-[#009F91] dark:text-[#19C6B4]">v{appVersion}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border">
                <span className="text-muted-foreground">Windows Agent Release</span>
                <span className="text-foreground">v{installerInfo.version} (x64)</span>
              </div>
              <p className="text-[11px] text-muted-foreground pt-1 leading-relaxed">
                Designed for deterministic, operator-approved Windows patch governance with real binary verification and OSV vulnerability intelligence.
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};