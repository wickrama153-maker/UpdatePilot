import React from 'react';
import {
  LayoutDashboard,
  Layers,
  ArrowUpCircle,
  SlidersHorizontal,
  History,
  BarChart3,
  ShieldAlert,
  Bell,
  Settings,
  Laptop,
  X,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { Tooltip } from './ui/Tooltip';

export type TabId =
  | 'overview'
  | 'applications'
  | 'updates'
  | 'management'
  | 'history'
  | 'analytics'
  | 'security'
  | 'notifications'
  | 'settings';

interface SidebarProps {
  currentTab: TabId;
  onSelectTab: (tab: TabId) => void;
  updatesCount: number;
  unreadNotificationsCount: number;
  activeJobsCount?: number;
  agentConnected: boolean;
  deviceName: string | null;
  collapsed: boolean;
  onToggleCollapse: () => void;
  isOpenMobile: boolean;
  onToggleMobile: () => void;
  onOpenPairModal?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  updatesCount,
  unreadNotificationsCount,
  activeJobsCount = 0,
  agentConnected,
  deviceName,
  collapsed,
  onToggleCollapse,
  isOpenMobile,
  onToggleMobile,
  onOpenPairModal,
}) => {
  const navGroups: Array<{
    section: string;
    items: Array<{ id: TabId; label: string; icon: React.ReactNode; badge?: number }>;
  }> = [
    {
      section: 'Core',
      items: [
        { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-[18px] h-[18px]" /> },
        { id: 'applications', label: 'Software Inventory', icon: <Layers className="w-[18px] h-[18px]" /> },
        {
          id: 'updates',
          label: 'Available Updates',
          icon: <ArrowUpCircle className="w-[18px] h-[18px]" />,
          badge: updatesCount > 0 ? updatesCount : undefined,
        },
        {
          id: 'management',
          label: 'Update Management',
          icon: <SlidersHorizontal className="w-[18px] h-[18px]" />,
          badge: activeJobsCount > 0 ? activeJobsCount : undefined,
        },
      ],
    },
    {
      section: 'Intelligence',
      items: [
        { id: 'history', label: 'Update History', icon: <History className="w-[18px] h-[18px]" /> },
        { id: 'analytics', label: 'Analytics & Reports', icon: <BarChart3 className="w-[18px] h-[18px]" /> },
        { id: 'security', label: 'Security Advisories', icon: <ShieldAlert className="w-[18px] h-[18px]" /> },
      ],
    },
    {
      section: 'System',
      items: [
        {
          id: 'notifications',
          label: 'Notifications',
          icon: <Bell className="w-[18px] h-[18px]" />,
          badge: unreadNotificationsCount > 0 ? unreadNotificationsCount : undefined,
        },
        { id: 'settings', label: 'Settings', icon: <Settings className="w-[18px] h-[18px]" /> },
      ],
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-[#0B111C]/75 backdrop-blur-sm lg:hidden"
          onClick={onToggleMobile}
          aria-hidden="true"
        />
      )}

      {/* Enterprise Desktop Sidebar */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col border-r border-border bg-card transition-all duration-200 ease-in-out lg:translate-x-0 ${
          collapsed ? 'lg:w-[72px]' : 'lg:w-64'
        } w-64 ${isOpenMobile ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-border shrink-0">
          <div className={`flex items-center gap-3 overflow-hidden ${collapsed ? 'lg:justify-center lg:w-full' : ''}`}>
            {/* UpdatePilot Enterprise Mark */}
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-[#009F91]/10 dark:bg-[#19C6B4]/10 border border-[#009F91]/30 dark:border-[#19C6B4]/30 text-[#009F91] dark:text-[#19C6B4] shrink-0">
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="2.2">
                <path d="M12 3L20 18.5L12 15.5L4 18.5L12 3Z" strokeLinejoin="round" />
                <circle cx="12" cy="12" r="1.5" fill="currentColor" />
              </svg>
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <span className="font-bold text-sm tracking-tight text-foreground block truncate">
                  UpdatePilot
                </span>
                <span className="text-[11px] font-medium text-muted-foreground block truncate">
                  Windows Intelligence
                </span>
              </div>
            )}
          </div>

          <button
            onClick={onToggleMobile}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary lg:hidden"
            aria-label="Close navigation menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Connected Workstation Status Card */}
        <div className="px-3 pt-3 pb-2 shrink-0">
          <Tooltip
            label={`${deviceName || 'Local Windows PC'} • ${agentConnected ? 'Agent Online' : 'Agent Offline'} (Click to pair/manage)`}
            enabled={collapsed}
          >
            <div
              onClick={onOpenPairModal}
              role={onOpenPairModal ? 'button' : undefined}
              className={`w-full flex items-center rounded-lg border border-border bg-secondary/40 hover:bg-secondary/70 cursor-pointer transition-all ${
                collapsed ? 'lg:justify-center p-2.5' : 'justify-between px-3 py-2.5'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative shrink-0">
                  <Laptop className="w-4 h-4 text-muted-foreground" />
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full ring-2 ring-card ${
                      agentConnected ? 'bg-[#22C55E]' : 'bg-[#EF5350]'
                    }`}
                  />
                </div>
                {!collapsed && (
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">
                      {deviceName || 'Local Workstation'}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {agentConnected ? 'Agent Connected' : 'Agent Offline'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </Tooltip>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-2 space-y-5 overflow-y-auto overflow-x-hidden" aria-label="Main navigation">
          {navGroups.map((group) => (
            <div key={group.section} className="space-y-1">
              {!collapsed && (
                <p className="px-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">
                  {group.section}
                </p>
              )}
              {group.items.map((item) => {
                const active = currentTab === item.id;
                return (
                  <Tooltip key={item.id} label={item.label} enabled={collapsed}>
                    <button
                      onClick={() => {
                        onSelectTab(item.id);
                        if (isOpenMobile) onToggleMobile();
                      }}
                      aria-current={active ? 'page' : undefined}
                      className={`relative w-full flex items-center rounded-lg text-xs font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                        collapsed ? 'lg:justify-center lg:px-2 lg:py-2.5 px-3 py-2.5 justify-between' : 'justify-between px-3 py-2.5'
                      } ${
                        active
                          ? 'bg-[#009F91]/10 dark:bg-[#19C6B4]/12 text-[#008A7E] dark:text-[#63D9D0] font-semibold'
                          : 'text-muted-foreground hover:text-foreground hover:bg-secondary/70'
                      }`}
                    >
                      {/* Active left rail indicator */}
                      {active && (
                        <span
                          className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-[#009F91] dark:bg-[#19C6B4]"
                          aria-hidden="true"
                        />
                      )}

                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`shrink-0 ${active ? 'text-[#009F91] dark:text-[#19C6B4]' : ''}`}>
                          {item.icon}
                        </span>
                        {!collapsed && <span className="truncate">{item.label}</span>}
                      </div>

                      {!collapsed && item.badge !== undefined && (
                        <span
                          className={`px-1.5 py-0.5 min-w-[20px] text-center text-[10px] font-semibold rounded-full ${
                            active
                              ? 'bg-[#009F91] dark:bg-[#19C6B4] text-white dark:text-[#0B141D]'
                              : 'bg-secondary text-foreground border border-border'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}

                      {collapsed && item.badge !== undefined && (
                        <span className="hidden lg:block absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#009F91] dark:bg-[#19C6B4]" />
                      )}
                    </button>
                  </Tooltip>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Collapse Sidebar Control */}
        <div className="p-3 border-t border-border hidden lg:flex items-center justify-between shrink-0">
          {!collapsed && (
            <span className="text-[11px] font-mono text-muted-foreground pl-1">
              v1.0.0 Enterprise
            </span>
          )}
          <button
            onClick={onToggleCollapse}
            className={`p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              collapsed ? 'mx-auto' : ''
            }`}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <PanelLeftOpen className="w-4 h-4" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </button>
        </div>
      </aside>
    </>
  );
};
