import React, { useState, useEffect } from 'react';
import {
  Laptop,
  Key,
  Shield,
  Trash2,
  RefreshCw,
  Copy,
  Check,
  Save,
  Sun,
  Moon,
  Info,
} from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { api } from '../lib/api';

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
  const [devices, setDevices] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({
    scanIntervalHours: 24,
    autoCheckUpdates: true,
    notifyOnUpdate: true,
    telemetryEnabled: false,
    retentionDays: 90,
  });

  const [loading, setLoading] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Pairing Token Generation
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [tokenCopied, setTokenCopied] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [devList, sets] = await Promise.all([api.getDevices(), api.getSettings()]);
      setDevices(devList || []);
      if (sets) setSettings(sets);
    } catch (err) {
      console.error('Error loading settings', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateToken = async () => {
    try {
      const res = await api.generatePairingToken();
      setGeneratedToken(res.pairingToken);
      setTokenCopied(false);
    } catch (err) {
      console.error('Failed to generate token', err);
    }
  };

  const handleCopyCommand = () => {
    if (!generatedToken) return;
    const cmd = `node dist/index.js --pair ${generatedToken}`;
    navigator.clipboard.writeText(cmd);
    setTokenCopied(true);
    setTimeout(() => setTokenCopied(false), 3000);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.updateSettings(settings);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save settings', err);
    }
  };

  const handleRevokeDevice = async (id: string) => {
    if (!confirm('Are you sure you want to revoke this agent? It will disconnect from the platform.')) {
      return;
    }
    try {
      await api.revokeDevice(id);
      loadData();
      onRefreshMetrics();
    } catch (err) {
      console.error('Revoke failed', err);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="p-5 rounded-xl border border-border bg-card shadow-sm">
        <h2 className="text-base font-bold text-foreground">Settings & Agent Management</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Manage local Windows agents, pairing credentials, theme preferences, and data privacy.
        </p>
      </div>

      {/* Paired Agents Section */}
      <div className="p-5 rounded-xl border border-border bg-card shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Laptop className="w-5 h-5 text-blue-500" />
            <h3 className="text-sm font-bold text-foreground">Paired Windows Agents</h3>
          </div>
          <button
            onClick={handleGenerateToken}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white shadow-sm transition-colors"
          >
            <Key className="w-3.5 h-3.5" />
            Generate Pairing Token
          </button>
        </div>

        {/* Pairing token instructions modal/card if active */}
        {generatedToken && (
          <div className="p-4 rounded-xl border border-blue-500/30 bg-blue-500/10 space-y-2 animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-400">One-Time Pairing Token Generated</span>
              <span className="text-[11px] text-muted-foreground">Expires in 15 minutes</span>
            </div>
            <p className="text-xs text-foreground">
              Run this command in the agent directory on your Windows computer:
            </p>
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-background border border-border font-mono text-xs">
              <span className="text-foreground flex-1 select-all">
                node dist/index.js --pair {generatedToken}
              </span>
              <button
                onClick={handleCopyCommand}
                className="p-1 rounded hover:bg-accent text-foreground transition-colors"
                title="Copy command"
              >
                {tokenCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}

        {/* Device list */}
        <div className="space-y-3">
          {devices.map((dev) => (
            <div
              key={dev.id}
              className="p-4 rounded-xl border border-border bg-background flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <span className="font-bold text-sm text-foreground">{dev.name}</span>
                  <StatusBadge status={dev.status} size="sm" />
                </div>
                <div className="text-[11px] text-muted-foreground flex items-center gap-3">
                  <span>OS: {dev.osVersion} ({dev.architecture})</span>
                  <span>Agent: v{dev.agentVersion}</span>
                  <span>Last Seen: {new Date(dev.lastSeenAt).toLocaleTimeString()}</span>
                </div>
              </div>

              {dev.status !== 'REVOKED' && (
                <button
                  onClick={() => handleRevokeDevice(dev.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-500/30 hover:bg-rose-500/10 text-rose-400 text-xs font-semibold transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Revoke
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Preferences Form */}
      <form onSubmit={handleSaveSettings} className="p-5 rounded-xl border border-border bg-card shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-foreground">Application Preferences</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Theme */}
          <div className="space-y-1.5">
            <label className="font-medium text-foreground">Interface Theme</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onThemeChange('dark')}
                className={`flex items-center justify-center gap-2 py-2 rounded-lg border text-xs font-semibold ${
                  currentTheme === 'dark' ? 'border-blue-500 bg-blue-500/10 text-blue-400' : 'border-border bg-background text-muted-foreground'
                }`}
              >
                <Moon className="w-3.5 h-3.5" /> Dark Mode
              </button>
              <button
                type="button"
                onClick={() => onThemeChange('light')}
                className={`flex items-center justify-center gap-2 py-2 rounded-lg border text-xs font-semibold ${
                  currentTheme === 'light' ? 'border-blue-500 bg-blue-500/10 text-blue-400' : 'border-border bg-background text-muted-foreground'
                }`}
              >
                <Sun className="w-3.5 h-3.5" /> Light Mode
              </button>
            </div>
          </div>

          {/* Scan Interval */}
          <div className="space-y-1.5">
            <label className="font-medium text-foreground">Background Scan Frequency</label>
            <select
              value={settings.scanIntervalHours}
              onChange={(e) => setSettings({ ...settings, scanIntervalHours: Number(e.target.value) })}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground"
            >
              <option value={6}>Every 6 Hours</option>
              <option value={12}>Every 12 Hours</option>
              <option value={24}>Every 24 Hours (Recommended)</option>
              <option value={48}>Every 48 Hours</option>
            </select>
          </div>

          {/* Data Retention */}
          <div className="space-y-1.5">
            <label className="font-medium text-foreground">History Retention Policy</label>
            <select
              value={settings.retentionDays}
              onChange={(e) => setSettings({ ...settings, retentionDays: Number(e.target.value) })}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground"
            >
              <option value={30}>Retain logs for 30 Days</option>
              <option value={90}>Retain logs for 90 Days (Recommended)</option>
              <option value={180}>Retain logs for 180 Days</option>
              <option value={365}>Retain logs for 1 Year</option>
            </select>
          </div>
        </div>

        {/* Privacy & Safety checkboxes */}
        <div className="pt-2 border-t border-border space-y-3 text-xs">
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.autoCheckUpdates}
              onChange={(e) => setSettings({ ...settings, autoCheckUpdates: e.target.checked })}
              className="mt-0.5 rounded border-border text-blue-600 focus:ring-blue-500"
            />
            <span className="text-foreground">
              <strong>Check trusted package sources:</strong> Automatically verify available versions via WinGet during scans.
            </span>
          </label>

          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.telemetryEnabled}
              onChange={(e) => setSettings({ ...settings, telemetryEnabled: e.target.checked })}
              className="mt-0.5 rounded border-border text-blue-600 focus:ring-blue-500"
            />
            <span className="text-foreground">
              <strong>Anonymous diagnostics:</strong> Keep disabled for strict local-only network operation.
            </span>
          </label>
        </div>

        <div className="pt-3 border-t border-border flex items-center justify-between">
          {saveSuccess ? (
            <span className="text-xs font-semibold text-emerald-400">Settings saved successfully!</span>
          ) : (
            <span />
          )}
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white shadow-sm transition-colors"
          >
            <Save className="w-3.5 h-3.5" /> Save Preferences
          </button>
        </div>
      </form>
    </div>
  );
};
