import React from 'react';
import {
  LayoutDashboard,
  Layers,
  ArrowUpCircle,
  ShieldAlert,
  History,
  Settings,
  Sun,
  Moon,
  Laptop,
  CheckCircle2,
  XCircle,
  Menu,
  X,
} from 'lucide-react';

export type TabId = 'overview' | 'applications' | 'updates' | 'security' | 'history' | 'settings';

interface SidebarProps {
  currentTab: TabId;
  onSelectTab: (tab: TabId) => void;
  updatesCount: number;
  agentConnected: boolean;
  deviceName: string | null;
  theme: string;
  onToggleTheme: () => void;
  isOpenMobile: boolean;
  onToggleMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  updatesCount,
  agentConnected,
  deviceName,
  theme,
  onToggleTheme,
  isOpenMobile,
  onToggleMobile,
}) => {
  const navItems: Array<{ id: TabId; label: string; icon: React.ReactNode; badge?: number }> = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'applications', label: 'Applications', icon: <Layers className="w-5 h-5" /> },
    {
      id: 'updates',
      label: 'Update Center',
      icon: <ArrowUpCircle className="w-5 h-5" />,
      badge: updatesCount > 0 ? updatesCount : undefined,
    },
    { id: 'security', label: 'Security Insights', icon: <ShieldAlert className="w-5 h-5" /> },
    { id: 'history', label: 'History & Logs', icon: <History className="w-5 h-5" /> },
    { id: 'settings', label: 'Settings & Agent', icon: <Settings className="w-5 h-5" /> },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onToggleMobile}
          aria-hidden="true"
        />
      )}

      {/* Main Sidebar */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col w-64 border-r border-border bg-card transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-600 text-white shadow-md shadow-blue-500/20">
              <ArrowUpCircle className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-base tracking-tight text-foreground">UpdatePilot</span>
              <span className="block text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">
                Enterprise MVP
              </span>
            </div>
          </div>
          <button
            onClick={onToggleMobile}
            className="p-1.5 rounded-md text-muted-foreground hover:bg-accent lg:hidden"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Device Status Header */}
        <div className="p-3 mx-3 my-3 rounded-lg border border-border bg-background/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 overflow-hidden">
              <Laptop className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-xs font-medium text-foreground truncate">
                {deviceName || 'No Device Paired'}
              </span>
            </div>
            {agentConnected ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-500">
                <CheckCircle2 className="w-3.5 h-3.5" /> Online
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-500">
                <XCircle className="w-3.5 h-3.5" /> Offline
              </span>
            )}
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const active = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTab(item.id);
                  if (isOpenMobile) onToggleMobile();
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                }`}
              >
                <div className="flex items-center gap-3">
                  {item.icon}
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span
                    className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                      active ? 'bg-white text-blue-600' : 'bg-blue-500/20 text-blue-400'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer with theme toggle */}
        <div className="p-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
          <span>v1.0.0 (WinGet Core)</span>
          <button
            onClick={onToggleTheme}
            className="p-2 rounded-md hover:bg-accent text-foreground transition-colors"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            aria-label="Toggle color theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </aside>
    </>
  );
};
