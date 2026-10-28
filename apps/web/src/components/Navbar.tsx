import React, { useState, useEffect } from 'react';
import { Menu, RefreshCw, Bell, Check, X, ArrowUpCircle, ShieldAlert, Layers } from 'lucide-react';
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
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 md:px-8 border-b border-border bg-card/80 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobile}
          className="p-2 -ml-2 rounded-md text-muted-foreground hover:bg-accent lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-lg font-bold tracking-tight text-foreground">{title}</h1>
          {lastScanTimestamp && (
            <p className="text-[11px] text-muted-foreground">
              Last scanned: {new Date(lastScanTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-background text-xs font-medium">
          <span className={`w-2 h-2 rounded-full ${agentConnected ? 'bg-emerald-500' : 'bg-rose-500'}`} />
          <span className="text-muted-foreground">Agent:</span>
          <span className={agentConnected ? 'text-emerald-500 font-semibold' : 'text-rose-500 font-semibold'}>
            {agentConnected ? 'Connected (WinGet)' : 'Disconnected'}
          </span>
        </div>

        {/* Notifications Popover */}
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="p-2 rounded-lg border border-border bg-background hover:bg-accent text-muted-foreground hover:text-foreground relative transition-colors"
            title="Notifications"
            aria-label="View notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showDropdown && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-border bg-card shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between p-3.5 border-b border-border bg-muted/40">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-foreground">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-blue-600 text-white text-[10px] font-semibold">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[11px] font-medium text-blue-500 hover:underline flex items-center gap-1"
                  >
                    <Check className="w-3 h-3" /> Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-border text-xs">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground text-xs">
                    No notifications yet.
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => handleNotificationClick(n)}
                      className={`p-3.5 hover:bg-accent/50 cursor-pointer transition-colors ${
                        !n.isRead ? 'bg-blue-500/5' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {n.type === 'UPDATE' && <ArrowUpCircle className="w-4 h-4 text-amber-500 shrink-0" />}
                          {n.type === 'SECURITY' && <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0" />}
                          {n.type === 'SCAN' && <Layers className="w-4 h-4 text-blue-500 shrink-0" />}
                          <span className={`font-semibold ${!n.isRead ? 'text-foreground font-bold' : 'text-foreground/80'}`}>
                            {n.title}
                          </span>
                        </div>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1 pl-6">{n.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={onTriggerScan}
          disabled={isScanning || !agentConnected}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
          {isScanning ? 'Scanning...' : 'Scan Applications'}
        </button>
      </div>
    </header>
  );
};
