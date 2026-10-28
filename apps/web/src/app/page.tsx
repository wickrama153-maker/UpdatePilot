'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar, TabId } from '../components/Sidebar';
import { Navbar } from '../components/Navbar';
import { OverviewView } from '../components/OverviewView';
import { ApplicationsView } from '../components/ApplicationsView';
import { UpdatesView } from '../components/UpdatesView';
import { SecurityView } from '../components/SecurityView';
import { HistoryView } from '../components/HistoryView';
import { SettingsView } from '../components/SettingsView';
import { api } from '../lib/api';

export default function DashboardPage() {
  const [currentTab, setCurrentTab] = useState<TabId>('overview');
  const [metrics, setMetrics] = useState<any | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [targetUpdateAppId, setTargetUpdateAppId] = useState<string | null>(null);

  // Load metrics from backend
  const loadMetrics = async () => {
    try {
      const data = await api.getDashboard();
      setMetrics(data);
    } catch (err) {
      console.error('Failed to load dashboard metrics', err);
    }
  };

  useEffect(() => {
    loadMetrics();
    // Refresh dashboard metrics periodically (every 10s)
    const interval = setInterval(loadMetrics, 10000);
    return () => clearInterval(interval);
  }, []);

  // Theme synchronization
  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    if (next === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleTriggerScan = async () => {
    if (!metrics?.activeDevice?.id || isScanning) return;
    try {
      setIsScanning(true);
      const scanJob = await api.triggerScan(metrics.activeDevice.id);

      // Poll scan job progress
      const poll = setInterval(async () => {
        try {
          const job = await api.getScanJob(scanJob.id);
          if (job.status === 'COMPLETED' || job.status === 'FAILED') {
            clearInterval(poll);
            setIsScanning(false);
            loadMetrics();
          }
        } catch {
          clearInterval(poll);
          setIsScanning(false);
        }
      }, 3000);
    } catch (err) {
      console.error('Scan trigger error', err);
      setIsScanning(false);
    }
  };

  const handleNavigateToUpdate = (appId: string) => {
    setTargetUpdateAppId(appId);
    setCurrentTab('updates');
  };

  const getSectionTitle = () => {
    switch (currentTab) {
      case 'overview':
        return 'Overview Dashboard';
      case 'applications':
        return 'Application Inventory';
      case 'updates':
        return 'Update Center';
      case 'security':
        return 'Security Insights';
      case 'history':
        return 'History & Audit Logs';
      case 'settings':
        return 'Settings & Agent Management';
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Navigation Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        updatesCount={metrics?.updatesAvailable || 0}
        agentConnected={metrics?.agentConnected || false}
        deviceName={metrics?.activeDevice?.name || null}
        theme={theme}
        onToggleTheme={toggleTheme}
        isOpenMobile={mobileMenuOpen}
        onToggleMobile={() => setMobileMenuOpen(!mobileMenuOpen)}
      />

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        <Navbar
          title={getSectionTitle()}
          onToggleMobile={() => setMobileMenuOpen(true)}
          onTriggerScan={handleTriggerScan}
          isScanning={isScanning}
          agentConnected={metrics?.agentConnected || false}
          lastScanTimestamp={metrics?.lastScanTimestamp || null}
          onNavigateTab={setCurrentTab}
        />

        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
          {currentTab === 'overview' && (
            <OverviewView
              metrics={metrics}
              onNavigate={setCurrentTab}
              onTriggerScan={handleTriggerScan}
              isScanning={isScanning}
            />
          )}

          {currentTab === 'applications' && (
            <ApplicationsView onSelectUpdate={handleNavigateToUpdate} />
          )}

          {currentTab === 'updates' && (
            <UpdatesView
              initialSelectedAppId={targetUpdateAppId}
              onClearInitialSelected={() => setTargetUpdateAppId(null)}
              onRefreshMetrics={loadMetrics}
            />
          )}

          {currentTab === 'security' && <SecurityView />}

          {currentTab === 'history' && <HistoryView />}

          {currentTab === 'settings' && (
            <SettingsView
              currentTheme={theme}
              onThemeChange={(t) => {
                setTheme(t);
                if (t === 'dark') document.documentElement.classList.add('dark');
                else document.documentElement.classList.remove('dark');
              }}
              onRefreshMetrics={loadMetrics}
            />
          )}
        </main>
      </div>
    </div>
  );
}
