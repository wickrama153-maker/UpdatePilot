'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Sidebar, TabId } from '../components/Sidebar';
import { Navbar } from '../components/Navbar';
import { OverviewView } from '../components/OverviewView';
import { ApplicationsView } from '../components/ApplicationsView';
import { UpdatesView } from '../components/UpdatesView';
import { UpdateManagementView } from '../components/UpdateManagementView';
import { HistoryView } from '../components/HistoryView';
import { AnalyticsView } from '../components/AnalyticsView';
import { SecurityView } from '../components/SecurityView';
import { NotificationsView } from '../components/NotificationsView';
import { SettingsView } from '../components/SettingsView';
import { AuthModal } from '../components/AuthModal';
import { PairDeviceModal } from '../components/PairDeviceModal';
import { api, getAuthUser, getAuthToken, clearAuth } from '../lib/api';

const TAB_TITLES: Record<TabId, string> = {
  overview: 'System Overview',
  applications: 'Software Inventory',
  updates: 'Available Updates',
  management: 'Update Management',
  history: 'Update History & Logs',
  analytics: 'Analytics & Reports',
  security: 'Security Advisories',
  notifications: 'Notifications Center',
  settings: 'System Settings',
};

export default function UpdatePilotApp() {
  const [currentTab, setCurrentTab] = useState<TabId>('overview');
  const [metrics, setMetrics] = useState<any>(null);
  const [allAppsRaw, setAllAppsRaw] = useState<any[]>([]);
  const [securityFindings, setSecurityFindings] = useState<any[]>([]);
  const [historyUpdates, setHistoryUpdates] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState<number>(0);

  // Multi-Device & Account State
  const [authUser, setAuthUser] = useState<any | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isPairModalOpen, setIsPairModalOpen] = useState(false);
  const [devices, setDevices] = useState<any[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);

  const [isScanning, setIsScanning] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [targetUpdateAppId, setTargetUpdateAppId] = useState<string | null>(null);
  const [globalSearchQuery, setGlobalSearchQuery] = useState<string>('');
  const [scanToast, setScanToast] = useState<string | null>(null);

  // Sync theme class on <html>
  const applyThemeClass = useCallback((nextTheme: string) => {
    setTheme(nextTheme);
    if (typeof document !== 'undefined') {
      if (nextTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, []);

  // Load persisted theme setting on startup
  useEffect(() => {
    api
      .getSettings()
      .then((s) => {
        if (s?.theme === 'light' || s?.theme === 'dark') {
          applyThemeClass(s.theme);
        } else {
          applyThemeClass('dark');
        }
      })
      .catch(() => applyThemeClass('dark'));
  }, [applyThemeClass]);

  // Auth Initialization Check
  useEffect(() => {
    const storedUser = getAuthUser();
    const token = getAuthToken();
    if (storedUser && token) {
      setAuthUser(storedUser);
      api
        .getMe()
        .then((res) => {
          if (res?.user) setAuthUser(res.user);
        })
        .catch(() => {
          // Token expired or invalid
          clearAuth();
          setAuthUser(null);
          setIsAuthModalOpen(true);
        });
    } else {
      // If running inside desktop electron app, don't block by default; else show auth modal
      const isDesktop = typeof window !== 'undefined' && (window as any).electronAPI?.isDesktop;
      if (!isDesktop) {
        setIsAuthModalOpen(true);
      }
    }
  }, []);

  const handleThemeChange = useCallback(
    async (nextTheme: string) => {
      applyThemeClass(nextTheme);
      try {
        await api.updateSettings({ theme: nextTheme });
      } catch {
        // Non-blocking UI preference fallback if backend unreachable
      }
    },
    [applyThemeClass]
  );

  const fetchAllData = useCallback(async () => {
    try {
      const [dashRes, appsRes, secRes, notifRes, histRes, devRes] = await Promise.allSettled([
        api.getDashboard(selectedDeviceId || undefined),
        api.getAllApplicationsRaw(selectedDeviceId || undefined),
        api.getSecurityFindings(),
        api.getNotifications(),
        api.getHistory('updates', selectedDeviceId || undefined),
        api.getDevices(),
      ]);

      if (dashRes.status === 'fulfilled') setMetrics(dashRes.value);
      if (appsRes.status === 'fulfilled') setAllAppsRaw(appsRes.value || []);
      if (secRes.status === 'fulfilled') setSecurityFindings(secRes.value || []);
      if (notifRes.status === 'fulfilled' && notifRes.value) {
        setNotifications(notifRes.value.items || []);
        setUnreadNotificationsCount(notifRes.value.unreadCount || 0);
      }
      if (histRes.status === 'fulfilled' && histRes.value) {
        setHistoryUpdates(histRes.value.updates || []);
      }
      if (devRes.status === 'fulfilled') {
        setDevices(devRes.value || []);
      }
    } catch (err) {
      console.error('Dashboard polling error:', err);
    }
  }, [selectedDeviceId]);

  useEffect(() => {
    fetchAllData();
    const interval = setInterval(fetchAllData, 10000);
    return () => clearInterval(interval);
  }, [fetchAllData]);

  const activeJobsCount = useMemo(() => {
    const activeStates = ['PENDING', 'QUEUED', 'PREVIEWED', 'APPROVED', 'DISPATCHED', 'RUNNING', 'EXECUTING', 'VERIFYING'];
    return historyUpdates.filter((j) => activeStates.includes(j.status)).length;
  }, [historyUpdates]);

  const handleTriggerScan = async () => {
    if (!metrics?.activeDevice && metrics?.totalApplications === 0 && devices.length === 0) {
      setScanToast('No paired Windows agent detected. Pair a computer to begin scanning.');
      setTimeout(() => setScanToast(null), 5000);
      return;
    }

    setIsScanning(true);
    try {
      const targetDevice = selectedDeviceId
        ? devices.find((d) => d.id === selectedDeviceId)
        : devices.find((d: any) => d.status === 'ONLINE') || devices[0];

      if (!targetDevice) {
        setScanToast('No paired agent found. Click "Pair New Workstation" to connect your computer.');
        setIsScanning(false);
        return;
      }

      await api.triggerScan(targetDevice.id);
      setScanToast(`Scan requested for ${targetDevice.name}. Refreshing inventory as results arrive.`);
      setTimeout(() => setScanToast(null), 4500);
      setTimeout(() => fetchAllData(), 2500);
    } catch (err: any) {
      setScanToast(err.message || 'Failed to trigger scan');
    } finally {
      setTimeout(() => setIsScanning(false), 1800);
    }
  };

  const handleNavigateToUpdate = (appId: string) => {
    setTargetUpdateAppId(appId);
    setCurrentTab('updates');
  };

  const handleGlobalSearch = (query: string) => {
    setGlobalSearchQuery(query);
    if (query.trim().length > 0) {
      setCurrentTab('applications');
    }
  };

  const handleLogout = () => {
    clearAuth();
    setAuthUser(null);
    setMetrics(null);
    setAllAppsRaw([]);
    setDevices([]);
    setSelectedDeviceId(null);
    setIsAuthModalOpen(true);
  };

  const handleAuthSuccess = (user: any) => {
    setAuthUser(user);
    setIsAuthModalOpen(false);
    fetchAllData();
  };

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Collapsible Enterprise Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          if (tab !== 'updates') setTargetUpdateAppId(null);
        }}
        updatesCount={metrics?.updatesAvailable || 0}
        unreadNotificationsCount={unreadNotificationsCount}
        activeJobsCount={activeJobsCount}
        agentConnected={metrics?.agentConnected || false}
        deviceName={metrics?.activeDevice?.name || null}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
        isOpenMobile={mobileMenuOpen}
        onToggleMobile={() => setMobileMenuOpen((o) => !o)}
        onOpenPairModal={() => setIsPairModalOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar
          title={TAB_TITLES[currentTab]}
          onToggleMobile={() => setMobileMenuOpen((o) => !o)}
          onTriggerScan={handleTriggerScan}
          isScanning={isScanning}
          agentConnected={metrics?.agentConnected || false}
          lastScanTimestamp={metrics?.lastScanTimestamp || null}
          deviceName={metrics?.activeDevice?.name || null}
          osVersion={metrics?.activeDevice?.osVersion || null}
          theme={theme}
          onToggleTheme={() => handleThemeChange(theme === 'dark' ? 'light' : 'dark')}
          onNavigateTab={(tab) => setCurrentTab(tab)}
          onGlobalSearch={handleGlobalSearch}
          notifications={notifications}
          unreadCount={unreadNotificationsCount}
          onRefreshNotifications={fetchAllData}
          devices={devices}
          selectedDeviceId={selectedDeviceId}
          onSelectDevice={(id) => setSelectedDeviceId(id)}
          onOpenPairModal={() => setIsPairModalOpen(true)}
          authUser={authUser}
          onLogout={handleLogout}
        />

        <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 scroll-smooth">
          {scanToast && (
            <div className="max-w-7xl mx-auto mb-4 rounded-xl border border-[#009F91]/35 dark:border-[#19C6B4]/35 bg-[#009F91]/10 dark:bg-[#19C6B4]/10 px-4 py-3 text-xs text-foreground flex items-center justify-between animate-in fade-in duration-150">
              <span>{scanToast}</span>
              <button
                onClick={() => setScanToast(null)}
                className="text-muted-foreground hover:text-foreground font-medium ml-4"
              >
                Dismiss
              </button>
            </div>
          )}

          <div className="max-w-7xl mx-auto pb-8">
            {currentTab === 'overview' && (
              <OverviewView
                metrics={metrics}
                allAppsRaw={allAppsRaw}
                notifications={notifications}
                securityFindings={securityFindings}
                onNavigate={(tab) => setCurrentTab(tab)}
                onTriggerScan={handleTriggerScan}
                isScanning={isScanning}
                onOpenPairModal={() => setIsPairModalOpen(true)}
              />
            )}

            {currentTab === 'applications' && (
              <ApplicationsView
                onSelectUpdate={handleNavigateToUpdate}
                externalSearchQuery={globalSearchQuery}
                selectedDeviceId={selectedDeviceId}
              />
            )}

            {currentTab === 'updates' && (
              <UpdatesView
                initialSelectedAppId={targetUpdateAppId}
                onClearInitialSelected={() => setTargetUpdateAppId(null)}
                onRefreshMetrics={fetchAllData}
                securityFindings={securityFindings}
                upToDateCount={metrics?.upToDate || 0}
                onNavigateTab={(tab) => setCurrentTab(tab)}
                selectedDeviceId={selectedDeviceId}
              />
            )}

            {currentTab === 'management' && (
              <UpdateManagementView
                onRefreshMetrics={fetchAllData}
                onNavigateTab={(tab) => setCurrentTab(tab)}
              />
            )}

            {currentTab === 'history' && <HistoryView selectedDeviceId={selectedDeviceId} />}

            {currentTab === 'analytics' && (
              <AnalyticsView
                metrics={metrics}
                allAppsRaw={allAppsRaw}
                securityFindings={securityFindings}
                historyUpdates={historyUpdates}
              />
            )}

            {currentTab === 'security' && <SecurityView />}

            {currentTab === 'notifications' && (
              <NotificationsView
                notifications={notifications}
                unreadCount={unreadNotificationsCount}
                onRefresh={fetchAllData}
                onNavigateTab={(tab) => setCurrentTab(tab)}
              />
            )}

            {currentTab === 'settings' && (
              <SettingsView
                currentTheme={theme}
                onThemeChange={handleThemeChange}
                onRefreshMetrics={fetchAllData}
              />
            )}
          </div>
        </main>
      </div>

      {/* Auth Modal for Login / Account Creation */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onSuccess={handleAuthSuccess}
      />

      {/* Pair Workstation Modal */}
      <PairDeviceModal
        isOpen={isPairModalOpen}
        onClose={() => {
          setIsPairModalOpen(false);
          fetchAllData();
        }}
        onPaired={fetchAllData}
      />
    </div>
  );
}
