'use client';

import React, { useState, useMemo } from 'react';
import { api } from '@/lib/api';
import { Card, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { EmptyState } from './ui/EmptyState';
import {
  Bell,
  CheckCheck,
  Trash2,
  Check,
  AlertTriangle,
  ShieldAlert,
  Info,
  CheckCircle2,
} from 'lucide-react';

interface NotificationsViewProps {
  notifications: any[];
  unreadCount: number;
  onRefresh: () => void;
  onNavigateTab?: (tab: 'updates' | 'management' | 'security') => void;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({
  notifications,
  unreadCount,
  onRefresh,
  onNavigateTab,
}) => {
  const [filter, setFilter] = useState<'ALL' | 'UNREAD'>('ALL');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  const visibleItems = useMemo(() => {
    if (filter === 'UNREAD') return notifications.filter((n) => !n.isRead);
    return notifications;
  }, [notifications, filter]);

  const handleMarkRead = async (id: string) => {
    setBusyId(id);
    try {
      await api.markNotificationRead(id);
      onRefresh();
    } catch (err) {
      console.error('Failed to mark read:', err);
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id: string) => {
    setBusyId(id);
    try {
      await api.deleteNotification(id);
      onRefresh();
    } catch (err) {
      console.error('Failed to delete notification:', err);
    } finally {
      setBusyId(null);
    }
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      await api.markAllNotificationsRead();
      onRefresh();
    } catch (err) {
      console.error('Failed to mark all read:', err);
    } finally {
      setMarkingAll(false);
    }
  };

  const getSeverityBadge = (severity?: string) => {
    const s = (severity || 'INFO').toUpperCase();
    if (s === 'CRITICAL' || s === 'ERROR') {
      return {
        icon: <ShieldAlert className="w-4 h-4 text-[#B91C1C] dark:text-[#EF5350]" />,
        bg: 'bg-[#EF5350]/10 border-[#EF5350]/30',
        label: s,
      };
    }
    if (s === 'WARNING') {
      return {
        icon: <AlertTriangle className="w-4 h-4 text-[#B45309] dark:text-[#F5B942]" />,
        bg: 'bg-[#F5B942]/15 border-[#F5B942]/30',
        label: s,
      };
    }
    if (s === 'SUCCESS') {
      return {
        icon: <CheckCircle2 className="w-4 h-4 text-[#15803D] dark:text-[#22C55E]" />,
        bg: 'bg-[#22C55E]/10 border-[#22C55E]/30',
        label: s,
      };
    }
    return {
      icon: <Info className="w-4 h-4 text-[#1D4ED8] dark:text-[#60A5FA]" />,
      bg: 'bg-[#60A5FA]/10 border-[#60A5FA]/30',
      label: s,
    };
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">Notification Center</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            System alerts, completed upgrade verifications, reboot notices, and OSV vulnerability warnings.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              isLoading={markingAll}
              onClick={handleMarkAllRead}
              leftIcon={<CheckCheck className="w-3.5 h-3.5" />}
            >
              Mark All Read ({unreadCount})
            </Button>
          )}
          {onNavigateTab && (
            <Button variant="primary" size="sm" onClick={() => onNavigateTab('updates')}>
              Available Updates
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle>Alert Stream</CardTitle>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#009F91]/10 dark:bg-[#19C6B4]/15 text-[#009F91] dark:text-[#19C6B4]">
                {unreadCount} unread
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 bg-secondary/60 p-1 rounded-lg border border-border">
            <button
              onClick={() => setFilter('ALL')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                filter === 'ALL' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('UNREAD')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                filter === 'UNREAD' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>
        </CardHeader>

        {visibleItems.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={<Bell className="w-5 h-5" />}
              title={filter === 'UNREAD' ? 'All caught up' : 'No notifications recorded'}
              description={
                filter === 'UNREAD'
                  ? 'Every notification in your inbox has been marked as read.'
                  : 'Events from scans, update executions, and security advisories will appear here.'
              }
            />
          </div>
        ) : (
          <div className="divide-y divide-border">
            {visibleItems.map((n) => {
              const sev = getSeverityBadge(n.type === 'SECURITY' ? 'CRITICAL' : n.type === 'WARNING' ? 'WARNING' : n.type === 'UPDATE' ? 'SUCCESS' : 'INFO');
              return (
                <div
                  key={n.id}
                  className={`p-4 sm:px-5 flex items-start justify-between gap-4 transition-colors ${
                    !n.isRead ? 'bg-[#009F91]/[0.03] dark:bg-[#19C6B4]/[0.04]' : 'hover:bg-secondary/20'
                  }`}
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 ${sev.bg}`}>
                      {sev.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className={`text-xs font-semibold ${!n.isRead ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {n.title}
                        </h4>
                        {!n.isRead && (
                          <span className="w-2 h-2 rounded-full bg-[#19C6B4]" title="Unread" />
                        )}
                        <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-secondary text-muted-foreground border border-border">
                          {n.type || sev.label}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        {n.message}
                      </p>
                      <span className="text-[11px] text-muted-foreground/80 mt-1.5 block">
                        {new Date(n.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {!n.isRead && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={busyId === n.id}
                        onClick={() => handleMarkRead(n.id)}
                        title="Mark as read"
                        leftIcon={<Check className="w-3.5 h-3.5" />}
                      >
                        Read
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={busyId === n.id}
                      onClick={() => handleDelete(n.id)}
                      title="Delete notification"
                      className="text-muted-foreground hover:text-[#EF5350]"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};
