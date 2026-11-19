import React, { useState, useEffect, useRef } from 'react';
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
  Search,
  Sun,
  Moon,
  ChevronRight,
  Monitor,
  Settings,
  UserCheck,
  LogOut,
  KeyRound,
  Download,
} from 'lucide-react';
import { api } from '../lib/api';
import { TabId } from './Sidebar';
import { DeviceSelector } from './DeviceSelector';

interface NavbarProps {
  title: string;
  onToggleMobile: () => void;
  onTriggerScan: () => void;
  isScanning: boolean;
  agentConnected: boolean;
  lastScanTimestamp: string | null;
  deviceName?: string | null;
  osVersion?: string | null;
  theme: string;
  onToggleTheme: () => void;
  onNavigateTab: (tab: TabId) => void;
  onGlobalSearch: (query: string) => void;
  notifications: any[];
  unreadCount: number;
  onRefreshNotifications: () => void;
  devices?: any[];
  selectedDeviceId?: string | null;
  onSelectDevice?: (deviceId: string | null) => void;
  onOpenPairModal?: () => void;
  authUser?: any;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  title,
  onToggleMobile,
  onTriggerScan,
  isScanning,
  agentConnected,
  lastScanTimestamp,
  deviceName,
  osVersion,
  theme,
  onToggleTheme,
  onNavigateTab,
  onGlobalSearch,
  notifications,
  unreadCount,
  onRefreshNotifications,
  devices = [],
  selectedDeviceId = null,
  onSelectDevice,
  onOpenPairModal,
  authUser,
  onLogout,
}) => {
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [isDesktopApp, setIsDesktopApp] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).electronAPI?.isDesktop) {
      setIsDesktopApp(true);
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifDropdown(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMinimize = () => {
    (window as any)?.electronAPI?.minimize?.();
  };

  const handleMaximize = () => {
    (window as any)?.electronAPI?.maximize?.();
  };

  const handleClose = () => {
    (window as any)?.electronAPI?.close?.();
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGlobalSearch(searchInput.trim());
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      onRefreshNotifications();
    } catch {}
  };

  const handleNotificationClick = async (notif: any) => {
    try {
      if (!notif.isRead) {
        await api.markNotificationRead(notif.id);
        onRefreshNotifications();
      }
      if (notif.link) {
        if (notif.link.includes('update')) onNavigateTab('updates');
        else if (notif.link.includes('history')) onNavigateTab('history');
        else if (notif.link.includes('security')) onNavigateTab('security');
        else onNavigateTab('notifications');
        setShowNotifDropdown(false);
      }
    } catch {}
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 md:px-6 border-b border-border bg-card/95 backdrop-blur-md gap-4">
      {/* Left: Mobile toggle + Breadcrumb & Title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onToggleMobile}
          className="p-2 -ml-1 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-secondary lg:hidden"
          aria-label="Open navigation menu"
        >
          <Menu className="w-4 h-4" />
        </button>

        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <button
              onClick={() => onNavigateTab('overview')}
              className="hover:text-[#009F91] dark:hover:text-[#19C6B4] transition-colors font-medium"
            >
              UpdatePilot
            </button>
            <ChevronRight className="w-3 h-3 shrink-0" />
            <span className="truncate text-foreground/80 font-medium">{title}</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-sm md:text-base font-semibold tracking-tight text-foreground truncate">
              {title}
            </h1>
            {lastScanTimestamp && (
              <span className="hidden xl:inline-block text-[11px] text-muted-foreground">
                • Synced {new Date(lastScanTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Center: Global Search Bar & Workstation Switcher */}
      <div className="hidden md:flex items-center gap-3 flex-1 max-w-xl">
        <form onSubmit={handleSearchSubmit} className="flex-1">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search installed software or package ID..."
              aria-label="Global software search"
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-border bg-secondary/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#009F91] dark:focus:border-[#19C6B4] focus:bg-card transition-colors"
            />
          </div>
        </form>

        {onSelectDevice && onOpenPairModal && (
          <DeviceSelector
            devices={devices}
            selectedDeviceId={selectedDeviceId}
            onSelectDevice={onSelectDevice}
            onOpenPairModal={onOpenPairModal}
          />
        )}
      </div>

      {/* Right: Status, Actions, Theme, Notifications, Profile, Desktop Controls */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Agent Status Indicator */}
        <div
          className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-border bg-secondary/40 text-xs"
          title={agentConnected ? 'Local Windows Agent Connected' : 'Local Windows Agent Offline'}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              agentConnected ? 'bg-[#22C55E]' : 'bg-[#EF5350]'
            }`}
          />
          <span className="text-muted-foreground hidden xl:inline">Agent:</span>
          <span
            className={`font-medium ${
              agentConnected ? 'text-[#15803D] dark:text-[#22C55E]' : 'text-[#B91C1C] dark:text-[#EF5350]'
            }`}
          >
            {agentConnected ? 'Online' : 'Offline'}
          </span>
        </div>

        {/* Scan Action */}
        <button
          onClick={onTriggerScan}
          disabled={isScanning || !agentConnected}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#009F91] dark:bg-[#19C6B4] text-white dark:text-[#0B141D] hover:bg-[#008A7E] dark:hover:bg-[#63D9D0] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          title="Scan local Windows applications and check for updates"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">{isScanning ? 'Scanning...' : 'Scan Now'}</span>
        </button>

        {/* Theme Switcher */}
        <button
          onClick={onToggleTheme}
          className="p-2 rounded-lg border border-border bg-card hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Theme`}
          aria-label="Toggle color theme"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-[#F5B942]" />
          ) : (
            <Moon className="w-4 h-4 text-[#64748B]" />
          )}
        </button>

        {/* Notifications Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifDropdown(!showNotifDropdown)}
            className="p-2 rounded-lg border border-border bg-card hover:bg-secondary text-muted-foreground hover:text-foreground relative transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            title="Notifications"
            aria-label="Open notifications panel"
            aria-expanded={showNotifDropdown}
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-[#EF5350] text-white text-[10px] font-bold flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifDropdown && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-border bg-card shadow-enterprise-dark overflow-hidden z-50 animate-in fade-in duration-100">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-secondary/40">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-xs text-foreground">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-[#009F91]/15 dark:bg-[#19C6B4]/15 text-[#008A7E] dark:text-[#63D9D0] text-[10px] font-semibold">
                      {unreadCount} unread
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[11px] font-medium text-[#009F91] dark:text-[#19C6B4] hover:underline flex items-center gap-1"
                  >
                    <Check className="w-3 h-3" /> Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-border text-xs">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    No notifications yet.
                  </div>
                ) : (
                  notifications.slice(0, 8).map((n) => (
                    <div
                      key={n.id}
                      onClick={() => handleNotificationClick(n)}
                      className={`px-4 py-3 hover:bg-secondary/60 cursor-pointer transition-colors ${
                        !n.isRead ? 'bg-[#009F91]/5 dark:bg-[#19C6B4]/5' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {n.type === 'UPDATE' && <ArrowUpCircle className="w-4 h-4 text-[#F5B942] shrink-0" />}
                          {n.type === 'SECURITY' && <ShieldAlert className="w-4 h-4 text-[#EF5350] shrink-0" />}
                          {n.type === 'SCAN' && <Layers className="w-4 h-4 text-[#60A5FA] shrink-0" />}
                          <span className={`truncate ${!n.isRead ? 'text-foreground font-semibold' : 'text-foreground/80 font-medium'}`}>
                            {n.title}
                          </span>
                        </div>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1 pl-6 line-clamp-2">{n.message}</p>
                    </div>
                  ))
                )}
              </div>

              <div className="px-4 py-2.5 border-t border-border bg-secondary/30 text-center">
                <button
                  onClick={() => {
                    setShowNotifDropdown(false);
                    onNavigateTab('notifications');
                  }}
                  className="text-xs font-medium text-[#009F91] dark:text-[#19C6B4] hover:underline"
                >
                  Open Notification Center
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User / System Profile Menu */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2 p-1.5 pr-2.5 rounded-lg border border-border bg-card hover:bg-secondary text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            title="System Profile"
            aria-label="System profile menu"
            aria-expanded={showProfileMenu}
          >
            <div className="w-6 h-6 rounded-md bg-[#009F91]/15 dark:bg-[#19C6B4]/15 text-[#009F91] dark:text-[#19C6B4] flex items-center justify-center">
              <Monitor className="w-3.5 h-3.5" />
            </div>
            <span className="hidden xl:inline text-xs font-medium max-w-[110px] truncate">
              {authUser?.name || deviceName || 'Administrator'}
            </span>
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-64 rounded-xl border border-border bg-card shadow-enterprise-dark overflow-hidden z-50 animate-in fade-in duration-100">
              <div className="px-4 py-3 border-b border-border bg-secondary/40">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-[#009F91] dark:text-[#19C6B4]" />
                  <span className="text-xs font-semibold text-foreground truncate">
                    {authUser?.name || 'Administrator Account'}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                  {authUser?.email || 'admin@updatepilot.local'}
                </p>
                <div className="mt-2 pt-2 border-t border-border/50 text-[10px] text-muted-foreground flex items-center justify-between">
                  <span>Host: {deviceName || 'Local PC'}</span>
                  <span>{isDesktopApp ? 'Desktop' : 'Web'}</span>
                </div>
              </div>

              <div className="p-1.5 space-y-0.5 text-xs">
                {onOpenPairModal && (
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      onOpenPairModal();
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-secondary text-foreground flex items-center gap-2"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-[#009F91] dark:text-[#19C6B4]" />
                    <span>Pair New Workstation</span>
                  </button>
                )}

                <a
                  href="/downloads/UpdatePilot-Agent-Setup-1.0.0.exe"
                  download
                  onClick={() => setShowProfileMenu(false)}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-secondary text-foreground flex items-center gap-2"
                >
                  <Download className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Download Windows Agent</span>
                </a>

                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    onNavigateTab('analytics');
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-secondary text-foreground flex items-center justify-between"
                >
                  <span>Analytics & Reports</span>
                </button>

                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    onNavigateTab('settings');
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-secondary text-foreground flex items-center gap-2"
                >
                  <Settings className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Platform Settings</span>
                </button>

                {onLogout && (
                  <div className="pt-1 mt-1 border-t border-border">
                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        onLogout();
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#EF5350]/10 text-[#B91C1C] dark:text-[#EF5350] flex items-center gap-2 transition-colors font-medium"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Desktop Electron Window Controls */}
        {isDesktopApp && (
          <div className="hidden lg:flex items-center pl-2 ml-1 border-l border-border gap-1">
            <button
              onClick={handleMinimize}
              className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              title="Minimize"
              aria-label="Minimize window"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleMaximize}
              className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              title="Maximize / Restore"
              aria-label="Maximize or restore window"
            >
              <Square className="w-3 h-3" />
            </button>
            <button
              onClick={handleClose}
              className="p-1.5 rounded-md hover:bg-[#EF5350] hover:text-white text-muted-foreground transition-colors"
              title="Close"
              aria-label="Close application"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
