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
  X,
  Radio,
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
  const navItems: Array<{
    id: TabId;
    index: string;
    label: string;
    icon: React.ReactNode;
    badge?: number;
  }> = [
    { id: 'overview', index: '01', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'applications', index: '02', label: 'Inventory', icon: <Layers className="w-4 h-4" /> },
    {
      id: 'updates',
      index: '03',
      label: 'Update Center',
      icon: <ArrowUpCircle className="w-4 h-4" />,
      badge: updatesCount > 0 ? updatesCount : undefined,
    },
    { id: 'security', index: '04', label: 'Security Insights', icon: <ShieldAlert className="w-4 h-4" /> },
    { id: 'history', index: '05', label: 'Audit & History', icon: <History className="w-4 h-4" /> },
    { id: 'settings', index: '06', label: 'Settings & Node', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
          onClick={onToggleMobile}
          aria-hidden="true"
        />
      )}

      {/* Main Swiss Engineering Sidebar */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col w-64 border-r border-border bg-card transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between h-16 px-5 border-b border-border bg-background/50">
          <div className="flex items-center gap-3">
            {/* Swiss Precision Logo Glyph */}
            <div className="relative flex items-center justify-center w-8 h-8 rounded border border-[#F06435] bg-[#F06435]/10 text-[#F06435]">
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 3L20 19H4L12 3Z" strokeLinejoin="miter" />
                <path d="M12 9V15" strokeLinecap="square" />
                <circle cx="12" cy="18" r="0.5" fill="currentColor" strokeWidth="1" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-black text-sm tracking-widest text-foreground uppercase">
                  UpdatePilot
                </span>
              </div>
              <span className="block text-[9px] font-mono tracking-widest uppercase text-muted-foreground">
                [SYS.CORE // v1.0]
              </span>
            </div>
          </div>

          <button
            onClick={onToggleMobile}
            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted lg:hidden"
            aria-label="Close menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Telemetry / Device State Strip */}
        <div className="p-3 mx-3 my-3 rounded border border-border bg-background/60">
          <div className="flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-2 overflow-hidden">
              <Laptop className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="font-mono font-semibold text-foreground truncate max-w-[110px]" title={deviceName || 'Local Windows PC'}>
                {deviceName || 'Local Host'}
              </span>
            </div>

            {agentConnected ? (
              <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold text-[#34785A] dark:text-[#4AA880]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#34785A] animate-pulse" />
                LIVE
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold text-[#B8433D] dark:text-[#D95F59]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#B8433D]" />
                DISCONNECTED
              </span>
            )}
          </div>
        </div>

        {/* Section Heading */}
        <div className="px-5 pt-2 pb-1">
          <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-muted-foreground">
            Navigation Index
          </span>
        </div>

        {/* Navigation Items */}
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
                className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded border transition-colors group ${
                  active
                    ? 'border-[#F06435] bg-[#F06435]/10 text-foreground font-bold shadow-sm'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={`font-mono text-[10px] ${
                      active ? 'text-[#F06435] font-bold' : 'text-muted-foreground/60 group-hover:text-muted-foreground'
                    }`}
                  >
                    {item.index}
                  </span>
                  <span className={active ? 'text-[#F06435]' : 'text-muted-foreground group-hover:text-foreground'}>
                    {item.icon}
                  </span>
                  <span className="tracking-tight">{item.label}</span>
                </div>

                {item.badge !== undefined && (
                  <span
                    className={`px-1.5 py-0.5 text-[10px] font-mono font-bold rounded ${
                      active
                        ? 'bg-[#F06435] text-white'
                        : 'bg-[#F06435]/20 text-[#F06435] dark:text-[#F37B52]'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Hardware Status & Engine Footnote */}
        <div className="p-3 mx-3 my-2 rounded border border-border bg-background/40 font-mono text-[10px] space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span>ENGINE</span>
            <span className="text-foreground font-semibold">WinGet 1.29+</span>
          </div>
          <div className="flex items-center justify-between text-muted-foreground">
            <span>INTERFACE</span>
            <span className="text-foreground font-semibold">Swiss Rev. 2</span>
          </div>
        </div>

        {/* Footer with Theme Toggle */}
        <div className="p-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground bg-background/30">
          <span className="font-mono text-[10px]">VER: 1.0.0-PRO</span>
          <button
            onClick={onToggleTheme}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-border hover:bg-muted text-foreground transition-colors font-mono text-[11px]"
            title={`Switch to ${theme === 'dark' ? 'Light Ivory' : 'Dark Graphite'} Theme`}
            aria-label="Toggle visual theme"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-3.5 h-3.5 text-[#C88B24]" />
                <span>IVORY</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-[#77786F]" />
                <span>GRAPHITE</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  );
};
