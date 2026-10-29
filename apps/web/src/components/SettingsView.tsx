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
      <div className="p-4 rounded border border-border bg-card">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            [SYS.CONFIG // SETTINGS & AGENTS]
          </span>
          <h2 className="text-sm font-mono font-bold uppercase tracking-wide text-foreground">
            Platform Configuration & Node Access
          </h2>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          Manage local Windows agents, pairing credentials, theme preferences, and data privacy.
        </p>
      </div>

      {/* Paired Agents Section */}
      <div className="p-4 rounded border border-border bg-card space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-2.5">
          <div className="flex items-center gap-2">
            <Laptop className="w-4 h-4 text-[#F06435]" />
            <h3 className="font-mono font-bold text-xs uppercase tracking-wider text-foreground">
              Paired Windows Agent Nodes
            </h3>
          </div>
          <button
            onClick={handleGenerateToken}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold uppercase rounded border border-[#F06435] bg-[#F06435] hover:bg-[#D95528] text-white shadow-sm transition-colors"
          >
            <Key className="w-3.5 h-3.5" />
            <span>GENERATE PAIRING TOKEN</span>
          </button>
        </div>

        {/* Pairing token instructions modal/card if active */}
        {generatedToken && (
          <div className="p-3.5 rounded border border-[#F06435]/40 bg-[#F06435]/5 space-y-2 animate-in fade-in duration-100 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-[#F06435]/20 pb-1.5">
              <span className="font-bold text-[#F06435] uppercase text-[10px] tracking-wider">
                [ONE-TIME PAIRING TOKEN GENERATED]
              </span>
              <span className="text-[10px] text-muted-foreground">EXPIRES: 15 MINUTES</span>
            </div>
            <p className="text-xs text-foreground font-sans">
              Run this command in your local Windows agent directory to pair this computer:
            </p>
            <div className="flex items-center gap-2 p-2.5 rounded bg-background border border-border font-mono text-xs">
              <span className="text-foreground flex-1 select-all font-bold">
                node dist/index.js --pair {generatedToken}
              </span>
              <button
                onClick={handleCopyCommand}
                className="p-1 rounded hover:bg-muted text-foreground transition-colors"
                title="Copy pairing command to clipboard"
              >
                {tokenCopied ? (
                  <Check className="w-4 h-4 text-[#34785A] dark:text-[#4AA880]" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        )}

        {/* Device list */}
        <div className="space-y-2.5">
          {devices.map((dev) => (
            <div
              key={dev.id}
              className="p-3.5 rounded border border-border bg-background flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 font-mono text-xs"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <span className="font-bold text-sm text-foreground">{dev.name}</span>
                  <StatusBadge status={dev.status} size="sm" />
                </div>
                <div className="text-[10px] text-muted-foreground flex items-center gap-3">
                  <span>OS: {dev.osVersion} ({dev.architecture})</span>
                  <span>AGENT: v{dev.agentVersion}</span>
                  <span>LAST SEEN: {new Date(dev.lastSeenAt).toLocaleTimeString()}</span>
                </div>
              </div>

              {dev.status !== 'REVOKED' && (
                <button
                  onClick={() => handleRevokeDevice(dev.id)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-[#B8433D]/30 hover:bg-[#B8433D]/10 text-[#B8433D] dark:text-[#D95F59] text-[11px] font-bold uppercase transition-colors"
                >
                  <Trash2 className="w-3 h-3" /> REVOKE
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Preferences Form */}
      <form onSubmit={handleSaveSettings} className="p-4 rounded border border-border bg-card space-y-4">
        <div className="border-b border-border pb-2">
          <h3 className="font-mono font-bold text-xs uppercase tracking-wider text-foreground">
            Operational Parameters & Preferences
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          {/* Theme */}
          <div className="space-y-1.5">
            <label className="font-bold text-foreground uppercase text-[10px] tracking-wider">
              INTERFACE PALETTE
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onThemeChange('dark')}
                className={`flex items-center justify-center gap-2 py-2 rounded border text-xs font-bold uppercase transition-colors ${
                  currentTheme === 'dark'
                    ? 'border-[#F06435] bg-[#F06435]/10 text-foreground'
                    : 'border-border bg-background text-muted-foreground hover:bg-muted'
                }`}
              >
                <Moon className="w-3.5 h-3.5" /> GRAPHITE
              </button>
              <button
                type="button"
                onClick={() => onThemeChange('light')}
                className={`flex items-center justify-center gap-2 py-2 rounded border text-xs font-bold uppercase transition-colors ${
                  currentTheme === 'light'
                    ? 'border-[#F06435] bg-[#F06435]/10 text-foreground'
                    : 'border-border bg-background text-muted-foreground hover:bg-muted'
                }`}
              >
                <Sun className="w-3.5 h-3.5" /> WARM IVORY
              </button>
            </div>
          </div>

          {/* Scan Interval */}
          <div className="space-y-1.5">
            <label className="font-bold text-foreground uppercase text-[10px] tracking-wider">
              SCAN FREQUENCY
            </label>
            <select
              value={settings.scanIntervalHours}
              onChange={(e) => setSettings({ ...settings, scanIntervalHours: Number(e.target.value) })}
              className="w-full px-3 py-2 rounded border border-border bg-background text-foreground focus:outline-none focus:border-[#F06435]"
            >
              <option value={6}>Every 6 Hours</option>
              <option value={12}>Every 12 Hours</option>
              <option value={24}>Every 24 Hours (Standard)</option>
              <option value={48}>Every 48 Hours</option>
            </select>
          </div>

          {/* Data Retention */}
          <div className="space-y-1.5 md:col-span-2">
            <label className="font-bold text-foreground uppercase text-[10px] tracking-wider">
              AUDIT LOG RETENTION
            </label>
            <select
              value={settings.retentionDays}
              onChange={(e) => setSettings({ ...settings, retentionDays: Number(e.target.value) })}
              className="w-full px-3 py-2 rounded border border-border bg-background text-foreground focus:outline-none focus:border-[#F06435]"
            >
              <option value={30}>Retain logs for 30 Days</option>
              <option value={90}>Retain logs for 90 Days (Recommended)</option>
              <option value={180}>Retain logs for 180 Days</option>
              <option value={365}>Retain logs for 1 Year</option>
            </select>
          </div>
        </div>

        {/* Privacy & Safety checkboxes */}
        <div className="pt-2 border-t border-border space-y-2.5 text-xs font-sans">
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.autoCheckUpdates}
              onChange={(e) => setSettings({ ...settings, autoCheckUpdates: e.target.checked })}
              className="mt-0.5 rounded border-border text-[#F06435] focus:ring-[#F06435]"
            />
            <span className="text-foreground">
              <strong>Automated WinGet verification:</strong> Query upstream package manifests automatically during system scans.
            </span>
          </label>

          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.telemetryEnabled}
              onChange={(e) => setSettings({ ...settings, telemetryEnabled: e.target.checked })}
              className="mt-0.5 rounded border-border text-[#F06435] focus:ring-[#F06435]"
            />
            <span className="text-foreground">
              <strong>Anonymous diagnostics:</strong> Maintain strict air-gapped local-only operation by disabling outbound telemetry.
            </span>
          </label>
        </div>

        <div className="pt-3 border-t border-border flex items-center justify-between font-mono">
          {saveSuccess ? (
            <span className="text-xs font-bold text-[#34785A] dark:text-[#4AA880]">
              [CONFIGURATION SAVED SUCCESSFULLY]
            </span>
          ) : (
            <span />
          )}
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase rounded bg-[#F06435] hover:bg-[#D95528] text-white shadow-sm transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            <span>SAVE CONFIGURATION</span>
          </button>
        </div>
      </form>
    </div>
  );
};
