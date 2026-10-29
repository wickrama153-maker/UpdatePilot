import React, { useState, useEffect } from 'react';
import {
  Menu,
  RefreshCw,
  Bell,
  Check,
  X,
  ArrowUpCircle,
  ShieldAlert,
  Layers,
  Minus,
  Square,
  Copy,
} from 'lucide-react';
import { api } from '../lib/api';

interface NavbarProps {
  title: string;
  onToggleMobile: () => void;
  onTriggerScan: () => void;
  isScanning: boolean;
  agentConnected: boolean;
  lastScanTimestamp: string | null;
  onNavigateTab?: (tab: any) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  title,
  onToggleMobile,
  onTriggerScan,
  isScanning,
  agentConnected,
  lastScanTimestamp,
  onNavigateTab,
}) => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isDesktopApp, setIsDesktopApp] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).electronAPI?.isDesktop) {
      setIsDesktopApp(true);
    }
  }, []);

  const handleMinimize = () => {
    if (typeof window !== 'undefined' && (window as any).electronAPI?.minimize) {
      (window as any).electronAPI.minimize();
    }
  };

  const handleMaximize = () => {
    if (typeof window !== 'undefined' && (window as any).electronAPI?.maximize) {
      (window as any).electronAPI.maximize();
    }
  };

  const handleClose = () => {
    if (typeof window !== 'undefined' && (window as any).electronAPI?.close) {
      (window as any).electronAPI.close();
    }
  };

  const loadNotifications = async () => {
    try {
      const res = await api.getNotifications();
      if (res) {
        setNotifications(res.items || []);
        setUnreadCount(res.unreadCount || 0);
      }
    } catch {}
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {}
  };

  const handleNotificationClick = async (notif: any) => {
    try {
      if (!notif.isRead) {
        await api.markNotificationRead(notif.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      }
      if (notif.link && onNavigateTab) {
        if (notif.link.includes('update')) onNavigateTab('updates');
        else if (notif.link.includes('history')) onNavigateTab('history');
        else if (notif.link.includes('security')) onNavigateTab('security');
        setShowDropdown(false);
      }
    } catch {}
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 md:px-8 border-b border-border bg-card/90 backdrop-blur-md select-none">
      {/* Title & Section Tag */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobile}
          className="p-1.5 -ml-1 rounded border border-border text-muted-foreground hover:text-foreground hover:bg-muted lg:hidden"
          aria-label="Open navigation menu"
        >
          <Menu className="w-4 h-4" />
        </button>

        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] font-bold text-[#F06435] uppercase tracking-wider">
              [VIEW]
            </span>
            <h1 className="text-base font-bold tracking-tight text-foreground uppercase font-mono">
              {title}
            </h1>
          </div>
          {lastScanTimestamp && (
            <p className="text-[10px] font-mono text-muted-foreground mt-0.5">
              LAST AUDITED: {new Date(lastScanTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
          )}
        </div>
      </div>

      {/* Control Actions & Diagnostics */}
      <div className="flex items-center gap-3">
        {/* Agent Subsystem Status Tag */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded border border-border bg-background text-[11px] font-mono">
          <span
            className={`w-2 h-2 rounded-full ${
              agentConnected ? 'bg-[#34785A] animate-pulse' : 'bg-[#B8433D]'
            }`}
          />
          <span className="text-muted-foreground">NODE:</span>
          <span
            className={`font-bold ${
              agentConnected ? 'text-[#34785A] dark:text-[#4AA880]' : 'text-[#B8433D] dark:text-[#D95F59]'
            }`}
          >
            {agentConnected ? 'WINGET ACTIVE' : 'DISCONNECTED'}
          </span>
        </div>

        {/* Notifications Popover */}
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="p-2 rounded border border-border bg-background hover:border-[#F06435]/50 hover:bg-muted text-muted-foreground hover:text-foreground relative transition-colors"
            title="Telemetry and system alerts"
            aria-label="View notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-[#F06435] text-white font-mono text-[9px] font-bold flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showDropdown && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded border border-border bg-card shadow-2xl overflow-hidden z-50 animate-in fade-in duration-100">
              <div className="flex items-center justify-between p-3.5 border-b border-border bg-background/80">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-xs uppercase tracking-wider text-foreground">
                    Audit Log Feed
                  </span>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded bg-[#F06435] text-white font-mono text-[10px] font-bold">
                      {unreadCount} NEW
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[11px] font-mono font-semibold text-[#F06435] hover:underline flex items-center gap-1"
                  >
                    <Check className="w-3 h-3" /> ACK ALL
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-border text-xs">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground font-mono text-xs">
                    [NO UNACKNOWLEDGED ALERTS]
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => handleNotificationClick(n)}
                      className={`p-3.5 hover:bg-muted/60 cursor-pointer transition-colors ${
                        !n.isRead ? 'bg-[#F06435]/5' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {n.type === 'UPDATE' && <ArrowUpCircle className="w-3.5 h-3.5 text-[#F06435] shrink-0" />}
                          {n.type === 'SECURITY' && <ShieldAlert className="w-3.5 h-3.5 text-[#B8433D] shrink-0" />}
                          {n.type === 'SCAN' && <Layers className="w-3.5 h-3.5 text-[#34785A] shrink-0" />}
                          <span className={`font-mono text-xs ${!n.isRead ? 'text-foreground font-bold' : 'text-foreground/80'}`}>
                            {n.title}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                          {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1 pl-5.5">{n.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Primary Action Button: Scan Applications with Signal Orange accent */}
        <button
          onClick={onTriggerScan}
          disabled={isScanning || !agentConnected}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-mono font-bold uppercase tracking-wider rounded border border-[#F06435] bg-[#F06435] text-white hover:bg-[#D95528] active:translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
          <span>{isScanning ? 'AUDITING...' : 'SCAN PACKAGES'}</span>
        </button>

        {/* Desktop-Only Window Controls */}
        {isDesktopApp && (
          <div className="hidden lg:flex items-center pl-2 ml-1 border-l border-border gap-1">
            <button
              onClick={handleMinimize}
              className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="Minimize Window"
              aria-label="Minimize"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleMaximize}
              className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="Maximize Window"
              aria-label="Maximize"
            >
              <Square className="w-3 h-3" />
            </button>
            <button
              onClick={handleClose}
              className="p-1.5 rounded hover:bg-[#B8433D] hover:text-white text-muted-foreground transition-colors"
              title="Close Application"
              aria-label="Close"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
