'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { KeyRound, Copy, Check, Download, Terminal, X, Shield, RefreshCw } from 'lucide-react';

interface PairDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPaired?: () => void;
}

export const PairDeviceModal: React.FC<PairDeviceModalProps> = ({ isOpen, onClose, onPaired }) => {
  const [token, setToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [expiresIn, setExpiresIn] = useState<number>(600);

  const fetchToken = async () => {
    setLoading(true);
    try {
      const res = await api.generatePairingToken();
      setToken(res.pairingToken);
      setExpiresIn(res.expiresInSeconds || 600);
      setCopied(false);
    } catch (err) {
      console.error('Failed to generate pairing token:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchToken();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !expiresIn) return;
    const interval = setInterval(() => {
      setExpiresIn((sec) => (sec > 0 ? sec - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, expiresIn]);

  if (!isOpen) return null;

  const handleCopy = (text: string) => {
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const minutes = Math.floor(expiresIn / 60);
  const seconds = expiresIn % 60;
  const timeStr = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B111C]/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-enterprise-dark overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-border bg-secondary/30">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#009F91]/15 dark:bg-[#19C6B4]/15 border border-[#009F91]/30 dark:border-[#19C6B4]/30 text-[#009F91] dark:text-[#19C6B4] flex items-center justify-center">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Pair Windows Workstation</h3>
              <p className="text-[11px] text-muted-foreground">
                Connect your Windows PC to this UpdatePilot account
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* Step 1: Download Agent */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-secondary text-foreground text-[10px] flex items-center justify-center font-bold">1</span>
                Download & Install Local Agent
              </span>
            </div>
            <p className="text-xs text-muted-foreground pl-7">
              Run the standalone Windows setup on the computer you want to manage:
            </p>
            <div className="pl-7 pt-1">
              <a
                href="/downloads/UpdatePilot-Agent-Setup-1.0.0.exe"
                download
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#009F91] hover:bg-[#008A7E] dark:bg-[#19C6B4] dark:hover:bg-[#15A898] text-[#0B111C] font-semibold text-xs transition-colors shadow-sm"
              >
                <Download className="w-4 h-4" />
                <span>Download UpdatePilot-Agent-Setup-1.0.0.exe</span>
              </a>
            </div>
          </div>

          {/* Step 2: Pairing Token */}
          <div className="space-y-2 pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-secondary text-foreground text-[10px] flex items-center justify-center font-bold">2</span>
                Your One-Time Pairing Token
              </span>
              <span className="text-[10px] text-muted-foreground">
                Expires in {timeStr}
              </span>
            </div>

            <div className="pl-7">
              <div className="flex items-center gap-2">
                <div className="flex-1 px-4 py-2.5 rounded-lg border border-border bg-secondary/60 text-center font-mono text-base font-bold tracking-widest text-[#009F91] dark:text-[#19C6B4]">
                  {loading ? 'GENERATING...' : token || '--------'}
                </div>
                <button
                  type="button"
                  onClick={() => token && handleCopy(token)}
                  disabled={!token}
                  className="px-3 py-2.5 rounded-lg border border-border bg-card hover:bg-secondary text-foreground text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  {copied ? <Check className="w-4 h-4 text-[#22C55E]" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
                <button
                  type="button"
                  onClick={fetchToken}
                  disabled={loading}
                  title="Generate new token"
                  className="p-2.5 rounded-lg border border-border bg-card hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
          </div>

          {/* Step 3: Terminal Command */}
          <div className="space-y-2 pt-2 border-t border-border">
            <span className="text-xs font-semibold text-foreground flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-secondary text-foreground text-[10px] flex items-center justify-center font-bold">3</span>
              Pair via Command Line or Setup Prompt
            </span>
            <p className="text-xs text-muted-foreground pl-7">
              In PowerShell or Command Prompt, run:
            </p>
            <div className="pl-7">
              <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#0B111C] border border-[#19C6B4]/20 text-[11px] font-mono text-[#19C6B4]">
                <div className="flex items-center gap-2 truncate">
                  <Terminal className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="truncate">updatepilot-agent --pair {token || 'UP-XXXXXX'}</span>
                </div>
                <button
                  onClick={() => handleCopy(`updatepilot-agent --pair ${token || ''}`)}
                  className="text-muted-foreground hover:text-foreground ml-2 p-1"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between p-4 border-t border-border bg-secondary/30">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Shield className="w-3.5 h-3.5 text-[#22C55E]" />
            <span>Strict Hardware GUID Isolation Enforced</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-border bg-card hover:bg-secondary text-foreground text-xs font-medium transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
